// Dafny Kanban Domain Adapter
// Wraps compiled Dafny code with JSON conversion helpers

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

const { _dafny, KanbanDomain, KanbanAppCore } = initDafny(require);

// ============================================================================
// Helpers
// ============================================================================

// Convert Dafny seq to JS array
const seqToArray = (seq) => {
  const arr = [];
  for (let i = 0; i < seq.length; i++) {
    arr.push(seq[i]);
  }
  return arr;
};

// Convert BigNumber to JS number
const toNumber = (bn) => {
  if (bn && typeof bn.toNumber === 'function') {
    return bn.toNumber();
  }
  return bn;
};

// Convert Dafny string to JS string
const dafnyStringToJs = (seq) => {
  if (typeof seq === 'string') return seq;
  if (seq.toVerbatimString) return seq.toVerbatimString(false);
  return Array.from(seq).join('');
};

// ============================================================================
// Model Conversion
// ============================================================================

// Convert JSON model to Dafny Model
const modelFromJson = (json) => {
  const cols = _dafny.Seq.of(
    ...(json.cols || []).map(c => _dafny.Seq.UnicodeFromString(c))
  );

  let lanesMap = _dafny.Map.Empty;
  for (const [colName, cardIds] of Object.entries(json.lanes || {})) {
    const key = _dafny.Seq.UnicodeFromString(colName);
    const value = _dafny.Seq.of(...cardIds.map(id => new BigNumber(id)));
    lanesMap = lanesMap.update(key, value);
  }

  let wipMap = _dafny.Map.Empty;
  for (const [colName, limit] of Object.entries(json.wip || {})) {
    const key = _dafny.Seq.UnicodeFromString(colName);
    wipMap = wipMap.update(key, new BigNumber(limit));
  }

  let cardsMap = _dafny.Map.Empty;
  for (const [cardId, card] of Object.entries(json.cards || {})) {
    const key = new BigNumber(cardId);
    const value = _dafny.Seq.UnicodeFromString(card.title);
    cardsMap = cardsMap.update(key, value);
  }

  return KanbanDomain.Model.create_Model(
    cols,
    lanesMap,
    wipMap,
    cardsMap,
    new BigNumber(json.nextId || 0)
  );
};

// Convert Dafny Model to JSON
const modelToJson = (m) => {
  const cols = seqToArray(m.dtor_cols).map(c => dafnyStringToJs(c));

  const lanes = {};
  const wip = {};
  const cards = {};

  if (m.dtor_lanes && m.dtor_lanes.Keys) {
    for (const key of m.dtor_lanes.Keys.Elements) {
      const colName = dafnyStringToJs(key);
      const cardIds = m.dtor_lanes.get(key);
      lanes[colName] = seqToArray(cardIds).map(id => toNumber(id));
    }
  }

  if (m.dtor_wip && m.dtor_wip.Keys) {
    for (const key of m.dtor_wip.Keys.Elements) {
      wip[dafnyStringToJs(key)] = toNumber(m.dtor_wip.get(key));
    }
  }

  if (m.dtor_cards && m.dtor_cards.Keys) {
    for (const key of m.dtor_cards.Keys.Elements) {
      const card = m.dtor_cards.get(key);
      const title = card.dtor_title !== undefined
        ? dafnyStringToJs(card.dtor_title)
        : dafnyStringToJs(card);
      cards[toNumber(key)] = { title };
    }
  }

  return {
    cols,
    lanes,
    wip,
    cards,
    nextId: toNumber(m.dtor_nextId)
  };
};

// ============================================================================
// Action Conversion
// ============================================================================

// Convert JSON action to Dafny Action
const actionFromJson = (json) => {
  switch (json.type) {
    case 'NoOp':
      return KanbanDomain.Action.create_NoOp();
    case 'AddColumn':
      return KanbanDomain.Action.create_AddColumn(
        _dafny.Seq.UnicodeFromString(json.col),
        new BigNumber(json.limit)
      );
    case 'SetWip':
      return KanbanDomain.Action.create_SetWip(
        _dafny.Seq.UnicodeFromString(json.col),
        new BigNumber(json.limit)
      );
    case 'AddCard':
      return KanbanDomain.Action.create_AddCard(
        _dafny.Seq.UnicodeFromString(json.col),
        _dafny.Seq.UnicodeFromString(json.title)
      );
    case 'MoveCard':
      const place = json.place?.type === 'Before'
        ? KanbanDomain.Place.create_Before(new BigNumber(json.place.anchor))
        : json.place?.type === 'After'
        ? KanbanDomain.Place.create_After(new BigNumber(json.place.anchor))
        : KanbanDomain.Place.create_AtEnd();
      return KanbanDomain.Action.create_MoveCard(
        new BigNumber(json.id),
        _dafny.Seq.UnicodeFromString(json.toCol),
        place
      );
    case 'EditTitle':
      return KanbanDomain.Action.create_EditTitle(
        new BigNumber(json.id),
        _dafny.Seq.UnicodeFromString(json.title)
      );
    default:
      return KanbanDomain.Action.create_NoOp();
  }
};

// Convert Dafny Action to JSON
const actionToJson = (action) => {
  if (action.is_NoOp) {
    return { type: 'NoOp' };
  }
  if (action.is_AddColumn) {
    return {
      type: 'AddColumn',
      col: dafnyStringToJs(action.dtor_col),
      limit: toNumber(action.dtor_limit)
    };
  }
  if (action.is_SetWip) {
    return {
      type: 'SetWip',
      col: dafnyStringToJs(action.dtor_col),
      limit: toNumber(action.dtor_limit)
    };
  }
  if (action.is_AddCard) {
    return {
      type: 'AddCard',
      col: dafnyStringToJs(action.dtor_col),
      title: dafnyStringToJs(action.dtor_title)
    };
  }
  if (action.is_MoveCard) {
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
  }
  if (action.is_EditTitle) {
    return {
      type: 'EditTitle',
      id: toNumber(action.dtor_id),
      title: dafnyStringToJs(action.dtor_title)
    };
  }
  return { type: 'NoOp' };
};

// ============================================================================
// Domain Adapter (for useCollaborativeProject hook)
// ============================================================================

export const kanbanDomain = {
  // Try applying an action to a model
  TryStep: (model, action) => {
    const result = KanbanDomain.__default.TryStep(model, action);
    return {
      is_Ok: result.is_Ok,
      dtor_value: result.is_Ok ? result.dtor_value : null
    };
  },

  // JSON conversion
  modelFromJson,
  modelToJson,
  actionToJson,
  actionFromJson,
};

// ============================================================================
// Client-Side API (for optimistic updates and UI)
// ============================================================================

const App = {
  // -------------------------------------------------------------------------
  // ClientState management (for offline support)
  // Uses Dafny-verified KanbanAppCore.ClientState
  // -------------------------------------------------------------------------

  // Initialize a new client state from server sync response
  // Model structure: { cols: [], lanes: {}, wip: {}, cards: {}, nextId }
  InitClient: (version, modelJson) => {
    const model = modelFromJson(modelJson);
    return KanbanAppCore.__default.MakeClientState(
      new BigNumber(version),
      model,
      _dafny.Seq.of()  // Empty pending queue
    );
  },

  // Client-side local dispatch (optimistic update)
  // Adds action to pending queue and applies optimistically
  LocalDispatch: (client, action) => {
    return KanbanAppCore.__default.ClientLocalDispatch(client, action);
  },

  // Handle realtime update from server - preserves pending actions
  // Uses VERIFIED Dafny code for pending preservation
  HandleRealtimeUpdate: (client, serverVersion, serverModelJson) => {
    const serverModel = modelFromJson(serverModelJson);
    return KanbanAppCore.__default.HandleRealtimeUpdate(client, new BigNumber(serverVersion), serverModel);
  },

  // Get pending actions count
  GetPendingCount: (client) => toNumber(KanbanAppCore.__default.PendingCount(client)),

  // Get client base version
  GetBaseVersion: (client) => toNumber(KanbanAppCore.__default.ClientVersion(client)),

  // Get client present model (with pending actions applied)
  GetPresent: (client) => KanbanAppCore.__default.ClientModel(client),

  // Get pending actions as array
  GetPendingActions: (client) => {
    const pending = client.dtor_pending;
    return seqToArray(pending);
  },

  // -------------------------------------------------------------------------
  // Place constructors
  // -------------------------------------------------------------------------

  AtEnd: () => KanbanDomain.Place.create_AtEnd(),
  Before: (anchorId) => KanbanDomain.Place.create_Before(new BigNumber(anchorId)),
  After: (anchorId) => KanbanDomain.Place.create_After(new BigNumber(anchorId)),

  // -------------------------------------------------------------------------
  // Action constructors
  // -------------------------------------------------------------------------

  NoOp: () => KanbanDomain.Action.create_NoOp(),

  AddColumn: (col, limit) => KanbanDomain.Action.create_AddColumn(
    _dafny.Seq.UnicodeFromString(col),
    new BigNumber(limit)
  ),

  SetWip: (col, limit) => KanbanDomain.Action.create_SetWip(
    _dafny.Seq.UnicodeFromString(col),
    new BigNumber(limit)
  ),

  AddCard: (col, title) => KanbanDomain.Action.create_AddCard(
    _dafny.Seq.UnicodeFromString(col),
    _dafny.Seq.UnicodeFromString(title)
  ),

  MoveCard: (id, toCol, place) => KanbanDomain.Action.create_MoveCard(
    new BigNumber(id),
    _dafny.Seq.UnicodeFromString(toCol),
    place
  ),

  EditTitle: (id, title) => KanbanDomain.Action.create_EditTitle(
    new BigNumber(id),
    _dafny.Seq.UnicodeFromString(title)
  ),

  // -------------------------------------------------------------------------
  // Model accessors
  // -------------------------------------------------------------------------

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
      if (card && card.dtor_title !== undefined) {
        return dafnyStringToJs(card.dtor_title);
      } else {
        return dafnyStringToJs(card);
      }
    }
    return '';
  },

  GetNextId: (m) => toNumber(m.dtor_nextId),

  // -------------------------------------------------------------------------
  // Action serialization
  // -------------------------------------------------------------------------

  actionToJson,
  actionFromJson,
};

export default App;
