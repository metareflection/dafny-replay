// ESM wrapper for Dafny-generated KanbanAppCore (client-side)
// Uses anchor-based Place for moves instead of positional index

import BigNumber from 'bignumber.js';

// Configure BigNumber as Dafny expects
BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

// Import the generated code as raw text
import kanbanCode from './KanbanMulti.cjs?raw';

// Set up the environment and evaluate the Dafny code
const require = (mod) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(`Unknown module: ${mod}`);
};

// Create a function that evaluates the code with proper scope
const initDafny = new Function('require', `
  ${kanbanCode}
  return { _dafny, KanbanDomain, KanbanMultiCollaboration, KanbanAppCore };
`);

const { _dafny, KanbanDomain, KanbanMultiCollaboration, KanbanAppCore } = initDafny(require);

// Helper to convert Dafny seq to JS array
const seqToArray = (seq) => {
  const arr = [];
  for (let i = 0; i < seq.length; i++) {
    arr.push(seq[i]);
  }
  return arr;
};

// Helper to convert BigNumber to JS number
const toNumber = (bn) => {
  if (bn && typeof bn.toNumber === 'function') {
    return bn.toNumber();
  }
  return bn;
};

// Helper to convert Dafny string to JS string
const dafnyStringToJs = (seq) => {
  if (typeof seq === 'string') return seq;
  if (seq.toVerbatimString) return seq.toVerbatimString(false);
  return Array.from(seq).join('');
};

// Create a clean API wrapper for client-side use
const App = {
  // Initialize a new client state from server sync response
  // Model v2: { cols: [], lanes: {}, wip: {}, cards: {}, nextId }
  InitClient: (version, model) => {
    // Build Dafny Model from JS object
    const cols = _dafny.Seq.of(...(model.cols || []).map(c => _dafny.Seq.UnicodeFromString(c)));

    let lanesMap = _dafny.Map.Empty;
    for (const [colName, cardIds] of Object.entries(model.lanes || {})) {
      const key = _dafny.Seq.UnicodeFromString(colName);
      const value = _dafny.Seq.of(...cardIds.map(id => new BigNumber(id)));
      lanesMap = lanesMap.update(key, value);
    }

    let wipMap = _dafny.Map.Empty;
    for (const [colName, limit] of Object.entries(model.wip || {})) {
      const key = _dafny.Seq.UnicodeFromString(colName);
      wipMap = wipMap.update(key, new BigNumber(limit));
    }

    let cardsMap = _dafny.Map.Empty;
    for (const [cardId, card] of Object.entries(model.cards || {})) {
      const key = new BigNumber(cardId);
      // Dafny optimizes Card datatype: store title directly (not wrapped in Card)
      const value = _dafny.Seq.UnicodeFromString(card.title);
      cardsMap = cardsMap.update(key, value);
    }

    const dafnyModel = KanbanDomain.Model.create_Model(
      cols,
      lanesMap,
      wipMap,
      cardsMap,
      new BigNumber(model.nextId || 0)
    );

    return KanbanAppCore.ClientState.create_ClientState(
      new BigNumber(version),
      dafnyModel,
      _dafny.Seq.of()
    );
  },

  // --- Place constructors ---
  AtEnd: () => KanbanDomain.Place.create_AtEnd(),
  Before: (anchorId) => KanbanDomain.Place.create_Before(new BigNumber(anchorId)),
  After: (anchorId) => KanbanDomain.Place.create_After(new BigNumber(anchorId)),

  // --- Action constructors ---
  NoOp: () => KanbanDomain.Action.create_NoOp(),

  AddColumn: (col, limit) => KanbanDomain.Action.create_AddColumn(
    _dafny.Seq.UnicodeFromString(col),
    new BigNumber(limit)
  ),

  SetWip: (col, limit) => KanbanDomain.Action.create_SetWip(
    _dafny.Seq.UnicodeFromString(col),
    new BigNumber(limit)
  ),

  // AddCard in v2: server allocates id, just specify col and title
  AddCard: (col, title) => KanbanDomain.Action.create_AddCard(
    _dafny.Seq.UnicodeFromString(col),
    _dafny.Seq.UnicodeFromString(title)
  ),

  // MoveCard in v2: uses Place (AtEnd, Before, After) instead of position
  MoveCard: (id, toCol, place) => KanbanDomain.Action.create_MoveCard(
    new BigNumber(id),
    _dafny.Seq.UnicodeFromString(toCol),
    place  // Already a Dafny Place
  ),

  EditTitle: (id, title) => KanbanDomain.Action.create_EditTitle(
    new BigNumber(id),
    _dafny.Seq.UnicodeFromString(title)
  ),

  // Client-side local dispatch (optimistic update)
  LocalDispatch: (client, action) => KanbanAppCore.__default.ClientLocalDispatch(client, action),

  // Get pending actions count
  GetPendingCount: (client) => toNumber(KanbanAppCore.__default.PendingCount(client)),

  // Get client base version
  GetBaseVersion: (client) => toNumber(KanbanAppCore.__default.ClientVersion(client)),

  // Get client present model
  GetPresent: (client) => KanbanAppCore.__default.ClientModel(client),

  // Model accessors (v2 structure)
  GetCols: (m) => seqToArray(m.dtor_cols).map(c => dafnyStringToJs(c)),

  GetLane: (m, col) => {
    const lane = KanbanDomain.__default.Lane(m, _dafny.Seq.UnicodeFromString(col));
    return seqToArray(lane).map(id => toNumber(id));
  },

  GetWip: (m, col) => {
    const wip = KanbanDomain.__default.Wip(m, _dafny.Seq.UnicodeFromString(col));
    return toNumber(wip);
  },

  GetCardTitle: (m, id) => {
    const cardsMap = m.dtor_cards;
    const key = new BigNumber(id);
    if (cardsMap.contains(key)) {
      const card = cardsMap.get(key);
      // Dafny optimizes Card datatype: may be unwrapped to just the title string
      // Check if it's a Card object or directly the title
      if (card && card.dtor_title !== undefined) {
        return dafnyStringToJs(card.dtor_title);
      } else {
        // Unwrapped: card IS the title
        return dafnyStringToJs(card);
      }
    }
    return '';
  },

  GetNextId: (m) => toNumber(m.dtor_nextId),

  // Convert action to JSON for API
  actionToJson: (action) => {
    if (action.is_NoOp) {
      return { type: 'NoOp' };
    } else if (action.is_AddColumn) {
      return {
        type: 'AddColumn',
        col: dafnyStringToJs(action.dtor_col),
        limit: toNumber(action.dtor_limit)
      };
    } else if (action.is_SetWip) {
      return {
        type: 'SetWip',
        col: dafnyStringToJs(action.dtor_col),
        limit: toNumber(action.dtor_limit)
      };
    } else if (action.is_AddCard) {
      return {
        type: 'AddCard',
        col: dafnyStringToJs(action.dtor_col),
        title: dafnyStringToJs(action.dtor_title)
      };
    } else if (action.is_MoveCard) {
      const place = action.dtor_place;
      let placeJson;
      if (place.is_AtEnd) {
        placeJson = { type: 'AtEnd' };
      } else if (place.is_Before) {
        placeJson = { type: 'Before', anchor: toNumber(place.dtor_anchor) };
      } else if (place.is_After) {
        placeJson = { type: 'After', anchor: toNumber(place.dtor_anchor) };
      }
      return {
        type: 'MoveCard',
        id: toNumber(action.dtor_id),
        toCol: dafnyStringToJs(action.dtor_toCol),
        place: placeJson
      };
    } else if (action.is_EditTitle) {
      return {
        type: 'EditTitle',
        id: toNumber(action.dtor_id),
        title: dafnyStringToJs(action.dtor_title)
      };
    }
    return { type: 'Unknown' };
  },

  // Convert JSON place to Dafny Place
  placeFromJson: (placeJson) => {
    if (!placeJson || placeJson.type === 'AtEnd') {
      return KanbanDomain.Place.create_AtEnd();
    } else if (placeJson.type === 'Before') {
      return KanbanDomain.Place.create_Before(new BigNumber(placeJson.anchor));
    } else if (placeJson.type === 'After') {
      return KanbanDomain.Place.create_After(new BigNumber(placeJson.anchor));
    }
    return KanbanDomain.Place.create_AtEnd();
  },

  // Get pending actions as array
  GetPendingActions: (client) => {
    const pending = client.dtor_pending;
    return seqToArray(pending);
  },
};

export default App;
