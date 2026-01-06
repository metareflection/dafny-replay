// App-specific convenience wrappers for clear-split-supabase
// This file adds aliases and helpers on top of the generated app.ts

import GeneratedApp from './app.ts';

// Helper to convert seq to array
const seqToArray = <T>(seq: any): T[] => {
  const arr: T[] = [];
  for (let i = 0; i < seq.length; i++) {
    arr.push(seq[i]);
  }
  return arr;
};

// Helper to convert Dafny string to JS string
const dafnyStringToJs = (seq: any): string => {
  if (typeof seq === 'string') return seq;
  if (seq.toVerbatimString) return seq.toVerbatimString(false);
  return Array.from(seq).join('');
};

// Helper to convert BigNumber to JS number
const toNumber = (bn: any): number => {
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

  GetPendingActions: (client: any) => {
    return seqToArray(client.dtor_pending);
  },

  // -------------------------------------------------------------------------
  // Model accessors
  // Members, Expenses, Settlements are inherited from GeneratedApp
  // (they call verified Dafny functions and convert to JS)
  // -------------------------------------------------------------------------

  // Convert verified Dafny Balances map to plain JS object
  Balances: (m: any) => {
    const dafnyBalances = GeneratedApp.Balances(m);
    const result: Record<string, number> = {};
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

  InitClient: (version: number, modelJson: any) =>
    GeneratedApp.InitClient(version, GeneratedApp.modelFromJson(modelJson)),

  LocalDispatch: (client: any, action: any) =>
    GeneratedApp.ClientLocalDispatch(client, action),

  HandleRealtimeUpdate: (client: any, serverVersion: number, serverModelJson: any) =>
    GeneratedApp.HandleRealtimeUpdate(client, serverVersion, GeneratedApp.modelFromJson(serverModelJson)),

  ClientAcceptReply: (client: any, newVersion: number, newPresentJson: any) =>
    GeneratedApp.ClientAcceptReply(client, newVersion, GeneratedApp.modelFromJson(newPresentJson)),

  // -------------------------------------------------------------------------
  // Effect State Machine - JSON-accepting wrappers
  // -------------------------------------------------------------------------

  EffectInit: (version: number, modelJson: any) =>
    GeneratedApp.EffectInit(version, GeneratedApp.modelFromJson(modelJson)),

  EffectStep: (effectState: any, event: any) => {
    const result = GeneratedApp.EffectStep(effectState, event);
    return [result[0], result[1]];
  },

  // Event constructors - JSON-accepting variants
  EffectEvent: {
    UserAction: (action: any) => GeneratedApp.EffectUserAction(action),
    DispatchAccepted: (version: number, modelJson: any) =>
      GeneratedApp.EffectDispatchAccepted(version, GeneratedApp.modelFromJson(modelJson)),
    DispatchConflict: (version: number, modelJson: any) =>
      GeneratedApp.EffectDispatchConflict(version, GeneratedApp.modelFromJson(modelJson)),
    DispatchRejected: (version: number, modelJson: any) =>
      GeneratedApp.EffectDispatchRejected(version, GeneratedApp.modelFromJson(modelJson)),
    NetworkError: () => GeneratedApp.EffectNetworkError(),
    NetworkRestored: () => GeneratedApp.EffectNetworkRestored(),
    ManualGoOffline: () => GeneratedApp.EffectManualGoOffline(),
    ManualGoOnline: () => GeneratedApp.EffectManualGoOnline(),
    Tick: () => GeneratedApp.EffectTick(),
  },

  // Command inspection
  EffectCommand: {
    isNoOp: (cmd: any) => GeneratedApp.EffectIsNoOp(cmd),
    isSendDispatch: (cmd: any) => GeneratedApp.EffectIsSendDispatch(cmd),
    getBaseVersion: (cmd: any) => GeneratedApp.EffectGetBaseVersion(cmd),
    getAction: (cmd: any) => GeneratedApp.EffectGetAction(cmd),
  },

  // EffectState accessors
  EffectState: {
    getClient: (es: any) => GeneratedApp.EffectGetClient(es),
    getServerVersion: (es: any) => GeneratedApp.EffectGetServerVersion(es),
    isOnline: (es: any) => GeneratedApp.EffectIsOnline(es),
    isIdle: (es: any) => GeneratedApp.EffectIsIdle(es),
    isDispatching: (es: any) => es.dtor_mode.is_Dispatching,
    hasPending: (es: any) => GeneratedApp.EffectHasPending(es),
    getPendingCount: (es: any) => GeneratedApp.EffectPendingCount(es),
  },
};

export default App;
