// App-specific convenience wrappers for clear-split-supabase
// This file adds aliases and helpers on top of the generated app.js

import GeneratedApp from './app.js';
import BigNumber from 'bignumber.js';

const { _dafny, ClearSplit, ClearSplitEffectStateMachine } = GeneratedApp._internal;

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
  // ClientState aliases
  // -------------------------------------------------------------------------

  ClientModel: (client) => GeneratedApp.ClientModel(client),
  ClientVersion: (client) => GeneratedApp.ClientVersion(client),
  PendingCount: (client) => GeneratedApp.PendingCount(client),

  GetPendingActions: (client) => {
    return seqToArray(client.dtor_pending);
  },

  // -------------------------------------------------------------------------
  // Model accessors (return plain JS)
  // -------------------------------------------------------------------------

  Members: (m) => seqToArray(m.dtor_memberList).map(dafnyStringToJs),

  Expenses: (m) => seqToArray(m.dtor_expenses).map(e => ({
    paidBy: dafnyStringToJs(e.dtor_paidBy),
    amount: toNumber(e.dtor_amount),
    shares: (() => {
      const s = {};
      if (e.dtor_shares && e.dtor_shares.Keys) {
        for (const k of e.dtor_shares.Keys.Elements) {
          s[dafnyStringToJs(k)] = toNumber(e.dtor_shares.get(k));
        }
      }
      return s;
    })(),
    shareKeys: seqToArray(e.dtor_shareKeys).map(dafnyStringToJs)
  })),

  Settlements: (m) => seqToArray(m.dtor_settlements).map(s => ({
    from: dafnyStringToJs(s.dtor_from),
    to: dafnyStringToJs(s.dtor_to),
    amount: toNumber(s.dtor_amount)
  })),

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

  // -------------------------------------------------------------------------
  // Action constructors
  // -------------------------------------------------------------------------

  MakeExpense: (paidBy, amount, shares, shareKeys) => {
    let sharesMap = _dafny.Map.Empty;
    for (const [k, v] of Object.entries(shares || {})) {
      sharesMap = sharesMap.update(_dafny.Seq.UnicodeFromString(k), new BigNumber(v));
    }
    return ClearSplit.Expense.create_Expense(
      _dafny.Seq.UnicodeFromString(paidBy),
      new BigNumber(amount),
      sharesMap,
      _dafny.Seq.of(...(shareKeys || []).map(x => _dafny.Seq.UnicodeFromString(x)))
    );
  },

  MakeSettlement: (from, to, amount) => {
    return ClearSplit.Settlement.create_Settlement(
      _dafny.Seq.UnicodeFromString(from),
      _dafny.Seq.UnicodeFromString(to),
      new BigNumber(amount)
    );
  },

  AddExpense: (e) => GeneratedApp.AddExpense(e),
  AddSettlement: (s) => GeneratedApp.AddSettlement(s),

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
