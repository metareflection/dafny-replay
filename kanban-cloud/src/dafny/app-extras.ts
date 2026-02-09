// App-specific convenience wrappers for kanban-cloud
// This file adds aliases and helpers on top of the generated app.ts

import GeneratedApp from './app.ts';
import BigNumber from 'bignumber.js';

// Cast _internal for access to Dafny runtime modules
const { _dafny, KanbanDomain, KanbanEffectStateMachine } = GeneratedApp._internal as any;

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

// Re-export everything from generated app, plus extras
const App = {
  ...GeneratedApp,

  // -------------------------------------------------------------------------
  // ClientState aliases
  // -------------------------------------------------------------------------

  GetPresent: (client: any) => GeneratedApp.ClientModel(client),
  GetBaseVersion: (client: any) => GeneratedApp.ClientVersion(client),
  GetPendingCount: (client: any) => GeneratedApp.PendingCount(client),

  GetPendingActions: (client: any) => {
    return seqToArray(client.dtor_pending);
  },

  // -------------------------------------------------------------------------
  // Model accessors
  // -------------------------------------------------------------------------

  GetLane: (m: any, col: string) => {
    const lane = KanbanDomain.__default.Lane(m, _dafny.Seq.UnicodeFromString(col));
    return seqToArray<any>(lane).map((id: any) => id.toNumber());
  },

  GetWip: (m: any, col: string) => {
    const wip = KanbanDomain.__default.Wip(m, _dafny.Seq.UnicodeFromString(col));
    return wip.toNumber();
  },

  GetCardTitle: (m: any, id: number) => {
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
    // JSON-accepting wrappers (only addition over generated app.ts)
    // -------------------------------------------------------------------------

    InitClient: (version: number, modelJson: any) =>
      GeneratedApp.MakeClientState(version, GeneratedApp.modelFromJson(modelJson), _dafny.Seq.of()),

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

    // Step returns tuple, convert to array for JS
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

    // Command inspection - just aliases
    EffectCommand: {
      isNoOp: (cmd: any) => GeneratedApp.EffectIsNoOp(cmd),
      isSendDispatch: (cmd: any) => GeneratedApp.EffectIsSendDispatch(cmd),
      getBaseVersion: (cmd: any) => GeneratedApp.EffectGetBaseVersion(cmd),
      getAction: (cmd: any) => GeneratedApp.EffectGetAction(cmd),
    },

    // EffectState accessors - just aliases
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
