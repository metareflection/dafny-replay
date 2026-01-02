// App-specific convenience wrappers for kanban-supabase
// This file adds aliases and helpers on top of the generated app.js

import GeneratedApp from './app.js';
import BigNumber from 'bignumber.js';

const { _dafny, KanbanDomain, KanbanEffectAppCore, KanbanEffectStateMachine } = GeneratedApp._internal;

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
    return KanbanEffectAppCore.__default.MakeClientState(
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
    return KanbanEffectAppCore.__default.HandleRealtimeUpdate(
      client,
      new BigNumber(serverVersion),
      serverModel
    );
  },

  // ClientAcceptReply: handle accepted server reply while preserving pending actions
  // Removes the first pending action (the dispatched one) and re-applies the rest
  ClientAcceptReply: (client, newVersion, newPresentJson) => {
    const newPresent = GeneratedApp.modelFromJson(newPresentJson);
    return KanbanEffectAppCore.__default.ClientAcceptReply(
      client,
      new BigNumber(newVersion),
      newPresent
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

  // =========================================================================
  // Effect State Machine (VERIFIED)
  // =========================================================================

  // Initialize effect state from server response
  EffectInit: (version, modelJson) => {
    const model = GeneratedApp.modelFromJson(modelJson);
    return KanbanEffectAppCore.__default.EffectInit(new BigNumber(version), model);
  },

  // Step function - the core verified state machine
  // Returns [newEffectState, command]
  EffectStep: (effectState, event) => {
    const result = KanbanEffectAppCore.__default.EffectStep(effectState, event);
    return [result[0], result[1]];
  },

  // Event constructors (using AppCore wrappers)
  EffectEvent: {
    UserAction: (action) =>
      KanbanEffectAppCore.__default.EffectUserAction(action),

    DispatchAccepted: (version, modelJson) => {
      const model = GeneratedApp.modelFromJson(modelJson);
      return KanbanEffectAppCore.__default.EffectDispatchAccepted(
        new BigNumber(version), model
      );
    },

    DispatchConflict: (version, modelJson) => {
      const model = GeneratedApp.modelFromJson(modelJson);
      return KanbanEffectAppCore.__default.EffectDispatchConflict(
        new BigNumber(version), model
      );
    },

    DispatchRejected: (version, modelJson) => {
      const model = GeneratedApp.modelFromJson(modelJson);
      return KanbanEffectAppCore.__default.EffectDispatchRejected(
        new BigNumber(version), model
      );
    },

    NetworkError: () => KanbanEffectAppCore.__default.EffectNetworkError(),
    NetworkRestored: () => KanbanEffectAppCore.__default.EffectNetworkRestored(),
    ManualGoOffline: () => KanbanEffectAppCore.__default.EffectManualGoOffline(),
    ManualGoOnline: () => KanbanEffectAppCore.__default.EffectManualGoOnline(),
    Tick: () => KanbanEffectAppCore.__default.EffectTick(),
  },

  // Command inspection (using AppCore wrappers)
  EffectCommand: {
    isNoOp: (cmd) => KanbanEffectAppCore.__default.EffectIsNoOp(cmd),
    isSendDispatch: (cmd) => KanbanEffectAppCore.__default.EffectIsSendDispatch(cmd),
    getBaseVersion: (cmd) => KanbanEffectAppCore.__default.EffectGetBaseVersion(cmd).toNumber(),
    getAction: (cmd) => KanbanEffectAppCore.__default.EffectGetAction(cmd),
  },

  // EffectState accessors (using AppCore wrappers)
  EffectState: {
    getClient: (es) => KanbanEffectAppCore.__default.EffectGetClient(es),
    getServerVersion: (es) => KanbanEffectAppCore.__default.EffectGetServerVersion(es).toNumber(),
    isOnline: (es) => KanbanEffectAppCore.__default.EffectIsOnline(es),
    isIdle: (es) => KanbanEffectAppCore.__default.EffectIsIdle(es),
    isDispatching: (es) => es.dtor_mode.is_Dispatching,
    hasPending: (es) => KanbanEffectAppCore.__default.EffectHasPending(es),
    getPendingCount: (es) => KanbanEffectAppCore.__default.EffectPendingCount(es).toNumber(),
  },
};

export default App;
