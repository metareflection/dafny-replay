// Dafny Kanban Domain Adapter with VERIFIED Realtime Handling
// Uses KanbanRealtimeCollaboration for flush/realtime coordination
// The key theorem: realtime events during flush don't affect final state

import BigNumber from 'bignumber.js';

// Configure BigNumber as Dafny expects
BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

// Import the generated code as raw text
import kanbanCode from './KanbanRealtime.cjs?raw';

// Set up the environment and evaluate the Dafny code
const require = (mod) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(`Unknown module: ${mod}`);
};

// Create a function that evaluates the code with proper scope
const initDafny = new Function('require', `
  ${kanbanCode}
  return { _dafny, KanbanDomain, KanbanMultiCollaboration, KanbanRealtimeCollaboration };
`);

const { _dafny, KanbanDomain, KanbanRealtimeCollaboration } = initDafny(require);

// ============================================================================
// Helpers
// ============================================================================

const seqToArray = (seq) => {
  const arr = [];
  for (let i = 0; i < seq.length; i++) {
    arr.push(seq[i]);
  }
  return arr;
};

const toNumber = (bn) => {
  if (bn && typeof bn.toNumber === 'function') {
    return bn.toNumber();
  }
  return bn;
};

const dafnyStringToJs = (seq) => {
  if (typeof seq === 'string') return seq;
  if (seq.toVerbatimString) return seq.toVerbatimString(false);
  return Array.from(seq).join('');
};

// ============================================================================
// Model Conversion
// ============================================================================

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
  TryStep: (model, action) => {
    const result = KanbanDomain.__default.TryStep(model, action);
    return {
      is_Ok: result.is_Ok,
      dtor_value: result.is_Ok ? result.dtor_value : null
    };
  },
  modelFromJson,
  modelToJson,
  actionToJson,
  actionFromJson,
};

// ============================================================================
// Client-Side API with VERIFIED Realtime Handling
// Uses KanbanRealtimeCollaboration - the flush/realtime fix is PROVEN correct
// ============================================================================

const RC = KanbanRealtimeCollaboration;

const App = {
  // -------------------------------------------------------------------------
  // ClientState management with VERIFIED mode handling
  // ClientState now has 4 fields: baseVersion, present, pending, mode
  // -------------------------------------------------------------------------

  // Initialize a new client state (mode = Normal)
  InitClient: (version, modelJson) => {
    const model = modelFromJson(modelJson);
    return RC.__default.InitClient(new BigNumber(version), model);
  },

  // Client-side local dispatch (optimistic update)
  LocalDispatch: (client, action) => {
    return RC.__default.LocalDispatch(client, action);
  },

  // -------------------------------------------------------------------------
  // VERIFIED Realtime Handling - The key fix is now in Dafny!
  // -------------------------------------------------------------------------

  // Handle a realtime update from the server
  // KEY: Skips updates when mode == Flushing (proven equivalent to processing them)
  HandleRealtimeUpdate: (client, serverVersion, serverModelJson) => {
    const serverModel = modelFromJson(serverModelJson);
    return RC.__default.HandleRealtimeUpdate(client, new BigNumber(serverVersion), serverModel);
  },

  // Enter flushing mode (before starting flush loop)
  EnterFlushMode: (client) => {
    return RC.__default.EnterFlushMode(client);
  },

  // Sync client to server state (call at end of flush)
  Sync: (version, modelJson) => {
    const model = modelFromJson(modelJson);
    return RC.__default.InitClient(new BigNumber(version), model);
  },

  // Check if client is in flushing mode
  IsFlushing: (client) => {
    return client.dtor_mode.is_Flushing;
  },

  // -------------------------------------------------------------------------
  // State accessors
  // -------------------------------------------------------------------------

  GetPendingCount: (client) => toNumber(client.dtor_pending.length),

  GetBaseVersion: (client) => toNumber(client.dtor_baseVersion),

  GetPresent: (client) => client.dtor_present,

  GetPendingActions: (client) => seqToArray(client.dtor_pending),

  GetMode: (client) => client.dtor_mode.is_Flushing ? 'flushing' : 'normal',

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
