// Integration tests for multi-client collaboration scenarios
// Uses Node's built-in test runner (node:test)
//
// These tests verify that the Dafny-verified kernel behaves correctly
// when accessed through the JS bridge in realistic multi-client scenarios.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import BigNumber from 'bignumber.js';

// Configure BigNumber as Dafny expects
BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

// Load Dafny-generated code
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const kanbanCode = readFileSync(join(__dirname, 'KanbanMulti.cjs'), 'utf-8');

const require = (mod) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(`Unknown module: ${mod}`);
};

const initDafny = new Function('require', `
  ${kanbanCode}
  return { _dafny, KanbanDomain, KanbanMultiCollaboration, KanbanAppCore };
`);

const { _dafny, KanbanDomain, KanbanMultiCollaboration, KanbanAppCore } = initDafny(require);

// ============================================================
// Test Helpers - Mirror the server's conversion functions
// ============================================================

const toNumber = (bn) => {
  if (bn && typeof bn.toNumber === 'function') return bn.toNumber();
  return bn;
};

const dafnyStringToJs = (seq) => {
  if (typeof seq === 'string') return seq;
  if (seq.toVerbatimString) return seq.toVerbatimString(false);
  return Array.from(seq).join('');
};

const seqToArray = (seq) => {
  const arr = [];
  for (let i = 0; i < seq.length; i++) arr.push(seq[i]);
  return arr;
};

const modelToJs = (m) => {
  const cols = seqToArray(m.dtor_cols).map(c => dafnyStringToJs(c));
  const lanesMap = m.dtor_lanes;
  const wipMap = m.dtor_wip;
  const cardsMap = m.dtor_cards;
  const nextId = toNumber(m.dtor_nextId);

  const lanes = {};
  const wip = {};
  const cards = {};

  if (lanesMap && lanesMap.Keys) {
    for (const key of lanesMap.Keys.Elements) {
      const colName = dafnyStringToJs(key);
      lanes[colName] = seqToArray(lanesMap.get(key)).map(id => toNumber(id));
    }
  }
  if (wipMap && wipMap.Keys) {
    for (const key of wipMap.Keys.Elements) {
      wip[dafnyStringToJs(key)] = toNumber(wipMap.get(key));
    }
  }
  if (cardsMap && cardsMap.Keys) {
    for (const key of cardsMap.Keys.Elements) {
      const card = cardsMap.get(key);
      const title = card.dtor_title !== undefined ? card.dtor_title : card;
      cards[toNumber(key)] = { title: dafnyStringToJs(title) };
    }
  }
  return { cols, lanes, wip, cards, nextId };
};

// ============================================================
// Server Simulation - Direct calls to Dafny kernel
// ============================================================

class TestServer {
  constructor() {
    this.reset();
  }

  reset() {
    const initialModel = KanbanDomain.Model.create_Model(
      _dafny.Seq.of(),
      _dafny.Map.Empty,
      _dafny.Map.Empty,
      _dafny.Map.Empty,
      _dafny.ZERO
    );
    this.state = KanbanAppCore.__default.InitServer(initialModel);
  }

  sync() {
    const version = toNumber(KanbanAppCore.__default.ServerVersion(this.state));
    const model = KanbanAppCore.__default.ServerModel(this.state);
    return { version, model: modelToJs(model) };
  }

  dispatch(baseVersion, action) {
    const baseVersionBN = new BigNumber(baseVersion);
    const dafnyAction = this._parseAction(action);

    const result = KanbanMultiCollaboration.__default.Dispatch(
      this.state, baseVersionBN, dafnyAction
    );
    this.state = result[0];
    const reply = result[1];

    if (KanbanAppCore.__default.IsAccepted(reply)) {
      return {
        status: 'accepted',
        version: toNumber(reply.dtor_newVersion),
        model: modelToJs(reply.dtor_newPresent)
      };
    } else {
      return { status: 'rejected', reason: 'DomainInvalid' };
    }
  }

  _parseAction(action) {
    switch (action.type) {
      case 'NoOp':
        return KanbanDomain.Action.create_NoOp();
      case 'AddColumn':
        return KanbanDomain.Action.create_AddColumn(
          _dafny.Seq.UnicodeFromString(action.col),
          new BigNumber(action.limit)
        );
      case 'AddCard':
        return KanbanDomain.Action.create_AddCard(
          _dafny.Seq.UnicodeFromString(action.col),
          _dafny.Seq.UnicodeFromString(action.title)
        );
      case 'MoveCard':
        return KanbanDomain.Action.create_MoveCard(
          new BigNumber(action.id),
          _dafny.Seq.UnicodeFromString(action.toCol),
          this._parsePlace(action.place)
        );
      case 'EditTitle':
        return KanbanDomain.Action.create_EditTitle(
          new BigNumber(action.id),
          _dafny.Seq.UnicodeFromString(action.title)
        );
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  _parsePlace(place) {
    if (!place || place.type === 'AtEnd') {
      return KanbanDomain.Place.create_AtEnd();
    } else if (place.type === 'Before') {
      return KanbanDomain.Place.create_Before(new BigNumber(place.anchor));
    } else if (place.type === 'After') {
      return KanbanDomain.Place.create_After(new BigNumber(place.anchor));
    }
    return KanbanDomain.Place.create_AtEnd();
  }
}

// ============================================================
// Client Simulation
// ============================================================

class TestClient {
  constructor(server, name) {
    this.server = server;
    this.name = name;
    this.baseVersion = 0;
    this.model = null;
    this.pendingActions = [];
    this.isOffline = false;
  }

  sync() {
    const { version, model } = this.server.sync();
    this.baseVersion = version;
    this.model = model;
    this.pendingActions = [];
    return { version, model };
  }

  goOffline() {
    this.isOffline = true;
  }

  goOnline() {
    this.isOffline = false;
  }

  dispatch(action) {
    if (this.isOffline) {
      // Queue action for later
      this.pendingActions.push({ baseVersion: this.baseVersion, action });
      return { status: 'queued' };
    }

    const result = this.server.dispatch(this.baseVersion, action);
    if (result.status === 'accepted') {
      this.baseVersion = result.version;
      this.model = result.model;
    }
    return result;
  }

  flush() {
    const results = [];
    for (const { baseVersion, action } of this.pendingActions) {
      const result = this.server.dispatch(baseVersion, action);
      results.push({ action, result });
      if (result.status === 'accepted') {
        this.baseVersion = result.version;
        this.model = result.model;
      }
    }
    this.pendingActions = [];
    // Re-sync to get clean state
    this.sync();
    return results;
  }
}

// ============================================================
// Helper functions for common assertions
// ============================================================

function assertCardInColumn(model, cardId, colName) {
  assert.ok(
    model.lanes[colName]?.includes(cardId),
    `Expected card ${cardId} in column "${colName}", but lanes = ${JSON.stringify(model.lanes)}`
  );
}

function assertCardExists(model, cardId) {
  assert.ok(
    cardId in model.cards,
    `Expected card ${cardId} to exist, but cards = ${JSON.stringify(Object.keys(model.cards))}`
  );
}

function assertNoDuplicateCards(model) {
  const allCardIds = Object.values(model.lanes).flat();
  const uniqueIds = new Set(allCardIds);
  assert.strictEqual(
    allCardIds.length, uniqueIds.size,
    `Duplicate cards found: ${JSON.stringify(model.lanes)}`
  );
}

function assertWipRespected(model) {
  for (const col of model.cols) {
    const count = model.lanes[col]?.length || 0;
    const limit = model.wip[col];
    assert.ok(
      count <= limit,
      `WIP exceeded in "${col}": ${count} > ${limit}`
    );
  }
}

function countCards(model) {
  return Object.values(model.lanes).flat().length;
}

// ============================================================
// Tests
// ============================================================

describe('Multi-Client Collaboration Scenarios', () => {
  let server;

  beforeEach(() => {
    server = new TestServer();
  });

  describe('Scenario 1: Concurrent moves, same card', () => {
    it('should handle both clients moving the same card to different columns', () => {
      // Setup: Create columns and a card
      const clientA = new TestClient(server, 'A');
      const clientB = new TestClient(server, 'B');

      clientA.sync();
      clientA.dispatch({ type: 'AddColumn', col: 'Todo', limit: 10 });
      clientA.dispatch({ type: 'AddColumn', col: 'Review', limit: 10 });
      clientA.dispatch({ type: 'AddColumn', col: 'Done', limit: 10 });
      clientA.dispatch({ type: 'AddCard', col: 'Todo', title: 'Card X' });

      // Both clients sync
      clientA.sync();
      clientB.sync();
      const cardId = clientA.model.lanes['Todo'][0];

      // A goes offline and moves card to Done
      clientA.goOffline();
      clientA.dispatch({ type: 'MoveCard', id: cardId, toCol: 'Done', place: { type: 'AtEnd' } });

      // B (online) moves same card to Review
      const resultB = clientB.dispatch({
        type: 'MoveCard', id: cardId, toCol: 'Review', place: { type: 'AtEnd' }
      });
      assert.strictEqual(resultB.status, 'accepted');
      assertCardInColumn(clientB.model, cardId, 'Review');

      // A comes online and flushes
      clientA.goOnline();
      const flushResults = clientA.flush();

      // Verify: Card exists in exactly one column, no duplicates
      const finalModel = clientA.model;
      assertCardExists(finalModel, cardId);
      assertNoDuplicateCards(finalModel);

      // Card should be in Done (A's move was accepted after B's)
      assertCardInColumn(finalModel, cardId, 'Done');
    });
  });

  describe('Scenario 2: Stale anchor fallback', () => {
    it('should fall back to AtEnd when anchor card is moved away', () => {
      const clientA = new TestClient(server, 'A');
      const clientB = new TestClient(server, 'B');

      // Setup: Create column with cards [0, 1, 2]
      clientA.sync();
      clientA.dispatch({ type: 'AddColumn', col: 'Todo', limit: 10 });
      clientA.dispatch({ type: 'AddColumn', col: 'Done', limit: 10 });
      clientA.dispatch({ type: 'AddCard', col: 'Todo', title: 'Card 0' });
      clientA.dispatch({ type: 'AddCard', col: 'Todo', title: 'Card 1' });
      clientA.dispatch({ type: 'AddCard', col: 'Todo', title: 'Card 2' });
      clientA.dispatch({ type: 'AddCard', col: 'Done', title: 'Card 3' });

      clientA.sync();
      clientB.sync();

      const card1 = clientA.model.lanes['Todo'][1]; // anchor
      const card3 = clientA.model.lanes['Done'][0]; // card to move

      // A goes offline, wants to move card3 Before(card1)
      clientA.goOffline();
      clientA.dispatch({
        type: 'MoveCard', id: card3, toCol: 'Todo',
        place: { type: 'Before', anchor: card1 }
      });

      // B moves card1 to Done (anchor disappears from Todo)
      clientB.dispatch({
        type: 'MoveCard', id: card1, toCol: 'Done',
        place: { type: 'AtEnd' }
      });
      assert.ok(!clientB.model.lanes['Todo'].includes(card1));

      // A comes online and flushes
      clientA.goOnline();
      const flushResults = clientA.flush();

      // The action should be accepted (fallback to AtEnd)
      assert.strictEqual(flushResults[0].result.status, 'accepted');

      // Card3 should now be in Todo (at end, since anchor was missing)
      const finalModel = clientA.model;
      assertCardInColumn(finalModel, card3, 'Todo');
      assertNoDuplicateCards(finalModel);
    });
  });

  describe('Scenario 3: WIP limit conflict', () => {
    it('should reject action when WIP limit would be exceeded', () => {
      const clientA = new TestClient(server, 'A');
      const clientB = new TestClient(server, 'B');

      // Setup: Done column with WIP limit 3, currently has 2 cards
      clientA.sync();
      clientA.dispatch({ type: 'AddColumn', col: 'Todo', limit: 10 });
      clientA.dispatch({ type: 'AddColumn', col: 'Done', limit: 3 });
      clientA.dispatch({ type: 'AddCard', col: 'Done', title: 'Done 1' });
      clientA.dispatch({ type: 'AddCard', col: 'Done', title: 'Done 2' });

      clientA.sync();
      clientB.sync();
      assert.strictEqual(clientA.model.lanes['Done'].length, 2);

      // A goes offline and adds card to Done
      clientA.goOffline();
      clientA.dispatch({ type: 'AddCard', col: 'Done', title: 'A adds' });

      // B (online) adds card to Done (now at 3, the limit)
      const resultB = clientB.dispatch({ type: 'AddCard', col: 'Done', title: 'B adds' });
      assert.strictEqual(resultB.status, 'accepted');
      assert.strictEqual(clientB.model.lanes['Done'].length, 3);

      // A comes online and flushes - should be rejected (would exceed WIP)
      clientA.goOnline();
      const flushResults = clientA.flush();

      assert.strictEqual(flushResults[0].result.status, 'rejected');

      // Final state should still have exactly 3 cards in Done
      const finalModel = clientA.model;
      assert.strictEqual(finalModel.lanes['Done'].length, 3);
      assertWipRespected(finalModel);
    });
  });

  describe('Scenario 4: Offline batch flush ordering', () => {
    it('should process multiple offline actions in order', () => {
      const clientA = new TestClient(server, 'A');

      // Setup
      clientA.sync();
      clientA.dispatch({ type: 'AddColumn', col: 'Todo', limit: 10 });
      clientA.dispatch({ type: 'AddColumn', col: 'Done', limit: 10 });
      clientA.sync();

      // A goes offline and does: add card -> edit title -> move card
      clientA.goOffline();
      clientA.dispatch({ type: 'AddCard', col: 'Todo', title: 'Original Title' });
      // Note: We don't know the card ID yet (server allocates it)
      // So we'll use card ID 0 (first card)
      clientA.dispatch({ type: 'EditTitle', id: 0, title: 'Edited Title' });
      clientA.dispatch({ type: 'MoveCard', id: 0, toCol: 'Done', place: { type: 'AtEnd' } });

      assert.strictEqual(clientA.pendingActions.length, 3);

      // A comes online and flushes
      clientA.goOnline();
      const flushResults = clientA.flush();

      // All three should be accepted
      assert.strictEqual(flushResults[0].result.status, 'accepted'); // AddCard
      assert.strictEqual(flushResults[1].result.status, 'accepted'); // EditTitle
      assert.strictEqual(flushResults[2].result.status, 'accepted'); // MoveCard

      // Final state: card with edited title in Done
      const finalModel = clientA.model;
      assert.strictEqual(finalModel.lanes['Done'].length, 1);
      const cardId = finalModel.lanes['Done'][0];
      assert.strictEqual(finalModel.cards[cardId].title, 'Edited Title');
    });
  });

  describe('Invariant Preservation', () => {
    it('should maintain invariants through complex multi-client interactions', () => {
      const clients = [
        new TestClient(server, 'A'),
        new TestClient(server, 'B'),
        new TestClient(server, 'C')
      ];

      // Setup
      clients[0].sync();
      clients[0].dispatch({ type: 'AddColumn', col: 'Backlog', limit: 20 });
      clients[0].dispatch({ type: 'AddColumn', col: 'Sprint', limit: 5 });
      clients[0].dispatch({ type: 'AddColumn', col: 'Done', limit: 100 });

      // Add several cards
      for (let i = 0; i < 8; i++) {
        clients[0].dispatch({ type: 'AddCard', col: 'Backlog', title: `Task ${i}` });
      }

      // All clients sync
      clients.forEach(c => c.sync());
      const initialCardCount = countCards(clients[0].model);

      // Simulate concurrent activity
      // Client A: moves cards 0,1 to Sprint
      clients[0].dispatch({ type: 'MoveCard', id: 0, toCol: 'Sprint', place: { type: 'AtEnd' } });
      clients[0].dispatch({ type: 'MoveCard', id: 1, toCol: 'Sprint', place: { type: 'AtEnd' } });

      // Client B goes offline, tries to move cards
      clients[1].goOffline();
      clients[1].dispatch({ type: 'MoveCard', id: 2, toCol: 'Sprint', place: { type: 'AtEnd' } });
      clients[1].dispatch({ type: 'MoveCard', id: 3, toCol: 'Sprint', place: { type: 'AtEnd' } });

      // Client C (online) moves more cards
      clients[2].sync();
      clients[2].dispatch({ type: 'MoveCard', id: 4, toCol: 'Sprint', place: { type: 'AtEnd' } });
      clients[2].dispatch({ type: 'MoveCard', id: 5, toCol: 'Done', place: { type: 'AtEnd' } });

      // B comes online and flushes
      clients[1].goOnline();
      clients[1].flush();

      // All clients sync
      clients.forEach(c => c.sync());

      // Verify invariants on final state
      const finalModel = clients[0].model;

      // No duplicate cards
      assertNoDuplicateCards(finalModel);

      // WIP respected
      assertWipRespected(finalModel);

      // Card count preserved (no cards lost or gained)
      assert.strictEqual(countCards(finalModel), initialCardCount);

      // All cards that exist in lanes also exist in cards map
      for (const col of finalModel.cols) {
        for (const cardId of finalModel.lanes[col]) {
          assertCardExists(finalModel, cardId);
        }
      }
    });
  });
});
