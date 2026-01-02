// App-specific convenience wrappers for kanban-supabase
// This file adds aliases and helpers on top of the generated app.js

import GeneratedApp from './app.js';
import BigNumber from 'bignumber.js';

const { _dafny, KanbanDomain, KanbanAppCore } = GeneratedApp._internal;

// Helper to convert seq to array
const seqToArray = (seq) => {
  const arr = [];
  for (let i = 0; i < seq.length; i++) {
    arr.push(seq[i]);
  }
  return arr;
};

// Helper to convert Dafny string to JS string
const dafnyStringToJs = (seq) => {
  if (typeof seq === 'string') return seq;
  if (seq.toVerbatimString) return seq.toVerbatimString(false);
  return Array.from(seq).join('');
};

// Re-export everything from generated app, plus extras
const App = {
  ...GeneratedApp,

  // -------------------------------------------------------------------------
  // ClientState aliases
  // -------------------------------------------------------------------------

  GetPresent: (client) => GeneratedApp.ClientModel(client),
  GetBaseVersion: (client) => GeneratedApp.ClientVersion(client),
  GetPendingCount: (client) => GeneratedApp.PendingCount(client),

  GetPendingActions: (client) => {
    return seqToArray(client.dtor_pending);
  },

  // -------------------------------------------------------------------------
  // Convenience wrappers that take JSON
  // -------------------------------------------------------------------------

  // InitClient: create client state from JSON model
  InitClient: (version, modelJson) => {
    const model = GeneratedApp.modelFromJson(modelJson);
    return KanbanAppCore.__default.MakeClientState(
      new BigNumber(version),
      model,
      _dafny.Seq.of()
    );
  },

  // LocalDispatch: alias for ClientLocalDispatch
  LocalDispatch: (client, action) => GeneratedApp.ClientLocalDispatch(client, action),

  // HandleRealtimeUpdate: takes JSON model
  HandleRealtimeUpdate: (client, serverVersion, serverModelJson) => {
    const serverModel = GeneratedApp.modelFromJson(serverModelJson);
    return KanbanAppCore.__default.HandleRealtimeUpdate(
      client,
      new BigNumber(serverVersion),
      serverModel
    );
  },

  // -------------------------------------------------------------------------
  // Model accessors
  // -------------------------------------------------------------------------

  GetLane: (m, col) => {
    const lane = KanbanDomain.__default.Lane(m, _dafny.Seq.UnicodeFromString(col));
    return seqToArray(lane).map(id => id.toNumber());
  },

  GetWip: (m, col) => {
    const wip = KanbanDomain.__default.Wip(m, _dafny.Seq.UnicodeFromString(col));
    return wip.toNumber();
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
};

export default App;
