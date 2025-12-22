// ESM wrapper for Dafny-generated KanbanAppCore (client-side)
// Provides a clean API for React without modifying generated code

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
  InitClient: (version, model) => {
    // Build Dafny Model from JS object
    // Use .update() instead of .updateUnsafe() to avoid mutating shared Empty singleton
    let columnsMap = _dafny.Map.Empty;
    let wipMap = _dafny.Map.Empty;
    let cardsMap = _dafny.Map.Empty;

    for (const [colName, cardIds] of Object.entries(model.columns || {})) {
      const key = _dafny.Seq.UnicodeFromString(colName);
      const value = _dafny.Seq.of(...cardIds.map(id => new BigNumber(id)));
      columnsMap = columnsMap.update(key, value);
    }

    for (const [colName, limit] of Object.entries(model.wip || {})) {
      const key = _dafny.Seq.UnicodeFromString(colName);
      wipMap = wipMap.update(key, new BigNumber(limit));
    }

    for (const [cardId, card] of Object.entries(model.cards || {})) {
      const key = new BigNumber(cardId);
      // Dafny optimizes Card datatype to just the title string
      const value = _dafny.Seq.UnicodeFromString(card.title);
      cardsMap = cardsMap.update(key, value);
    }

    const dafnyModel = KanbanDomain.Model.create_Model(columnsMap, wipMap, cardsMap);
    return KanbanAppCore.ClientState.create_ClientState(
      new BigNumber(version),
      dafnyModel,
      _dafny.Seq.of()
    );
  },

  // Action constructors (for client-side optimistic updates)
  NoOp: () => KanbanAppCore.__default.NoOp(),

  AddColumn: (col, limit) => KanbanAppCore.__default.AddColumn(
    _dafny.Seq.UnicodeFromString(col),
    new BigNumber(limit)
  ),

  DeleteColumn: (col) => KanbanAppCore.__default.DeleteColumn(
    _dafny.Seq.UnicodeFromString(col)
  ),

  SetWip: (col, limit) => KanbanAppCore.__default.SetWip(
    _dafny.Seq.UnicodeFromString(col),
    new BigNumber(limit)
  ),

  AddCard: (col, id, pos, title) => KanbanAppCore.__default.AddCard(
    _dafny.Seq.UnicodeFromString(col),
    new BigNumber(id),
    new BigNumber(pos),
    _dafny.Seq.UnicodeFromString(title)
  ),

  DeleteCard: (id) => KanbanAppCore.__default.DeleteCard(new BigNumber(id)),

  MoveCard: (id, toCol, pos) => KanbanAppCore.__default.MoveCard(
    new BigNumber(id),
    _dafny.Seq.UnicodeFromString(toCol),
    new BigNumber(pos)
  ),

  EditTitle: (id, title) => KanbanAppCore.__default.EditTitle(
    new BigNumber(id),
    _dafny.Seq.UnicodeFromString(title)
  ),

  // Client-side local dispatch (optimistic update)
  LocalDispatch: (client, action) => KanbanAppCore.__default.LocalDispatch(client, action),

  // Get pending actions count
  GetPendingCount: (client) => toNumber(KanbanAppCore.__default.GetClientPendingLen(client)),

  // Get client base version
  GetBaseVersion: (client) => toNumber(KanbanAppCore.__default.GetClientBaseVersion(client)),

  // Get client present model
  GetPresent: (client) => client.dtor_present,

  // Model accessors
  GetCols: (m) => {
    const columnsMap = m.dtor_columns;
    if (!columnsMap || !columnsMap.Keys) return [];
    return Array.from(columnsMap.Keys.Elements).map(key => dafnyStringToJs(key));
  },

  GetLane: (m, col) => {
    const lane = KanbanAppCore.__default.GetLane(m, _dafny.Seq.UnicodeFromString(col));
    return seqToArray(lane).map(id => toNumber(id));
  },

  GetWip: (m, col) => {
    const wip = KanbanAppCore.__default.GetWip(m, _dafny.Seq.UnicodeFromString(col));
    return toNumber(wip);
  },

  GetCardTitle: (m, id) => {
    const title = KanbanAppCore.__default.GetCardTitle(m, new BigNumber(id));
    return dafnyStringToJs(title);
  },

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
    } else if (action.is_DeleteColumn) {
      return {
        type: 'DeleteColumn',
        col: dafnyStringToJs(action.dtor_col)
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
        id: toNumber(action.dtor_id),
        pos: toNumber(action.dtor_pos),
        title: dafnyStringToJs(action.dtor_title)
      };
    } else if (action.is_DeleteCard) {
      return {
        type: 'DeleteCard',
        id: toNumber(action.dtor_id)
      };
    } else if (action.is_MoveCard) {
      return {
        type: 'MoveCard',
        id: toNumber(action.dtor_id),
        toCol: dafnyStringToJs(action.dtor_toCol),
        pos: toNumber(action.dtor_pos)
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

  // Get pending actions as array
  GetPendingActions: (client) => {
    const pending = client.dtor_pending;
    return seqToArray(pending);
  },
};

export default App;
