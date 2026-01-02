// App-specific convenience wrappers for clear-split-supabase
// This file adds aliases and helpers on top of the generated app.js

import GeneratedApp from './app.js';

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

// Helper to convert BigNumber to JS number
const toNumber = (bn) => {
  if (bn && typeof bn.toNumber === 'function') {
    return bn.toNumber();
  }
  return bn;
};

// Re-export everything from generated app, plus extras
const App = {
  ...GeneratedApp,

  // -------------------------------------------------------------------------
  // ClientState extras (ClientModel, ClientVersion, PendingCount inherited)
  // -------------------------------------------------------------------------

  GetPendingActions: (client) => {
    return seqToArray(client.dtor_pending);
  },

  // -------------------------------------------------------------------------
  // Model accessors
  // Members, Expenses, Settlements are inherited from GeneratedApp
  // (they call verified Dafny functions and convert to JS)
  // -------------------------------------------------------------------------

  // Convert verified Dafny Balances map to plain JS object
  Balances: (m) => {
    const dafnyBalances = GeneratedApp.Balances(m);
    const result = {};
    if (dafnyBalances && dafnyBalances.Keys) {
      for (const k of dafnyBalances.Keys.Elements) {
        result[dafnyStringToJs(k)] = toNumber(dafnyBalances.get(k));
      }
    }
    return result;
  },

  // Action constructors (MakeExpense, MakeSettlement, AddExpense, AddSettlement)
  // all inherited from GeneratedApp

  // -------------------------------------------------------------------------
  // JSON-accepting wrappers
  // -------------------------------------------------------------------------

  InitClient: (version, modelJson) =>
    GeneratedApp.InitClient(version, GeneratedApp.modelFromJson(modelJson)),

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

  // Command inspection
  EffectCommand: {
    isNoOp: (cmd) => GeneratedApp.EffectIsNoOp(cmd),
    isSendDispatch: (cmd) => GeneratedApp.EffectIsSendDispatch(cmd),
    getBaseVersion: (cmd) => GeneratedApp.EffectGetBaseVersion(cmd),
    getAction: (cmd) => GeneratedApp.EffectGetAction(cmd),
  },

  // EffectState accessors
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
