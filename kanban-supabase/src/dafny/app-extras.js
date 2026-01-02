// App-specific convenience wrappers for kanban-supabase
// This file adds aliases and helpers on top of the generated app.js

import GeneratedApp from './app.js';
import BigNumber from 'bignumber.js';

const { _dafny, KanbanDomain, KanbanEffectStateMachine } = GeneratedApp._internal;

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

    // -------------------------------------------------------------------------
    // JSON-accepting wrappers (only addition over generated app.js)
    // -------------------------------------------------------------------------
  
    InitClient: (version, modelJson) =>
      GeneratedApp.MakeClientState(version, GeneratedApp.modelFromJson(modelJson), _dafny.Seq.of()),
  
    LocalDispatch: (client, action) =>
      GeneratedApp.ClientLocalDispatch(client, action),
  
    HandleRealtimeUpdate: (client, serverVersion, serverModelJson) =>
      GeneratedApp.HandleRealtimeUpdate(client, serverVersion, GeneratedApp.modelFromJson(serverModelJson)),
  
    ClientAcceptReply: (client, newVersion, newPresentJson) =>
      GeneratedApp.ClientAcceptReply(client, newVersion, GeneratedApp.modelFromJson(newPresentJson)),
  
    // -------------------------------------------------------------------------
    // Effect State Machine - JSON-accepting wrappers
    // -------------------------------------------------------------------------
  
    EffectInit: (version, modelJson) =>
      GeneratedApp.EffectInit(version, GeneratedApp.modelFromJson(modelJson)),
  
    // Step returns tuple, convert to array for JS
    EffectStep: (effectState, event) => {
      const result = GeneratedApp.EffectStep(effectState, event);
      return [result[0], result[1]];
    },
  
    // Event constructors - JSON-accepting variants
    EffectEvent: {
      UserAction: (action) => GeneratedApp.EffectUserAction(action),
      DispatchAccepted: (version, modelJson) =>
        GeneratedApp.EffectDispatchAccepted(version, GeneratedApp.modelFromJson(modelJson)),
      DispatchConflict: (version, modelJson) =>
        GeneratedApp.EffectDispatchConflict(version, GeneratedApp.modelFromJson(modelJson)),
      DispatchRejected: (version, modelJson) =>
        GeneratedApp.EffectDispatchRejected(version, GeneratedApp.modelFromJson(modelJson)),
      NetworkError: () => GeneratedApp.EffectNetworkError(),
      NetworkRestored: () => GeneratedApp.EffectNetworkRestored(),
      ManualGoOffline: () => GeneratedApp.EffectManualGoOffline(),
      ManualGoOnline: () => GeneratedApp.EffectManualGoOnline(),
      Tick: () => GeneratedApp.EffectTick(),
    },
  
    // Command inspection - just aliases
    EffectCommand: {
      isNoOp: (cmd) => GeneratedApp.EffectIsNoOp(cmd),
      isSendDispatch: (cmd) => GeneratedApp.EffectIsSendDispatch(cmd),
      getBaseVersion: (cmd) => GeneratedApp.EffectGetBaseVersion(cmd),
      getAction: (cmd) => GeneratedApp.EffectGetAction(cmd),
    },
  
    // EffectState accessors - just aliases
    EffectState: {
      getClient: (es) => GeneratedApp.EffectGetClient(es),
      getServerVersion: (es) => GeneratedApp.EffectGetServerVersion(es),
      isOnline: (es) => GeneratedApp.EffectIsOnline(es),
      isIdle: (es) => GeneratedApp.EffectIsIdle(es),
      isDispatching: (es) => es.dtor_mode.is_Dispatching,
      hasPending: (es) => GeneratedApp.EffectHasPending(es),
      getPendingCount: (es) => GeneratedApp.EffectPendingCount(es),
    },
};

export default App;
