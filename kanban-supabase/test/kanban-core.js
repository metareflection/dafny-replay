// Node-compatible Dafny kernel loader for tests
// Loads KanbanEffect.cjs without Vite's ?raw import

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import BigNumber from 'bignumber.js';

// Configure BigNumber as Dafny expects
BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

// Load Dafny-generated code
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const kanbanCode = readFileSync(join(__dirname, '../src/dafny/KanbanEffect.cjs'), 'utf-8');

const require = (mod) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(`Unknown module: ${mod}`);
};

const initDafny = new Function('require', `
  ${kanbanCode}
  return { _dafny, KanbanDomain, KanbanMultiCollaboration, KanbanEffectStateMachine, KanbanEffectAppCore };
`);

export const { _dafny, KanbanDomain, KanbanMultiCollaboration, KanbanEffectStateMachine, KanbanEffectAppCore } = initDafny(require);

// ============================================================================
// Helpers
// ============================================================================

export const dafnyStringToJs = (seq) => {
  if (typeof seq === 'string') return seq;
  if (seq.toVerbatimString) return seq.toVerbatimString(false);
  return Array.from(seq).join('');
};

export const seqToArray = (seq) => {
  const arr = [];
  for (let i = 0; i < seq.length; i++) {
    arr.push(seq[i]);
  }
  return arr;
};

export const toNumber = (bn) => {
  if (bn && typeof bn.toNumber === 'function') {
    return bn.toNumber();
  }
  return bn;
};

// ============================================================================
// Model Conversions
// ============================================================================

export const modelToJs = (m) => {
  const cols = seqToArray(m.dtor_cols).map(c => dafnyStringToJs(c));
  const lanesMap = m.dtor_lanes;
  const wipMap = m.dtor_wip;
  const cardsMap = m.dtor_cards;
  const nextId = toNumber(m.dtor_nextId);

  const lanes = {};
  const wip = {};
  const cards = {};

  if (lanesMap && lanesMap.Keys) {
    for (const key of lanesMap.Keys.Elements) {
      const colName = dafnyStringToJs(key);
      lanes[colName] = seqToArray(lanesMap.get(key)).map(id => toNumber(id));
    }
  }

  if (wipMap && wipMap.Keys) {
    for (const key of wipMap.Keys.Elements) {
      wip[dafnyStringToJs(key)] = toNumber(wipMap.get(key));
    }
  }

  if (cardsMap && cardsMap.Keys) {
    for (const key of cardsMap.Keys.Elements) {
      const card = cardsMap.get(key);
      const title = card.dtor_title !== undefined ? card.dtor_title : card;
      cards[toNumber(key)] = { title: dafnyStringToJs(title) };
    }
  }

  return { cols, lanes, wip, cards, nextId };
};

export const modelFromJson = (json) => {
  let __lanes = _dafny.Map.Empty;
  for (const [k, v] of Object.entries(json.lanes || {})) {
    __lanes = __lanes.update(
      _dafny.Seq.UnicodeFromString(k),
      _dafny.Seq.of(...(v || []).map(x => new BigNumber(x)))
    );
  }
  let __wip = _dafny.Map.Empty;
  for (const [k, v] of Object.entries(json.wip || {})) {
    __wip = __wip.update(_dafny.Seq.UnicodeFromString(k), new BigNumber(v));
  }
  let __cards = _dafny.Map.Empty;
  for (const [k, v] of Object.entries(json.cards || {})) {
    __cards = __cards.update(
      new BigNumber(k),
      KanbanDomain.Card.create_Card(_dafny.Seq.UnicodeFromString(v.title))
    );
  }
  return KanbanDomain.Model.create_Model(
    _dafny.Seq.of(...(json.cols || []).map(x => _dafny.Seq.UnicodeFromString(x))),
    __lanes,
    __wip,
    __cards,
    new BigNumber(json.nextId)
  );
};

// ============================================================================
// Action/Place Conversions
// ============================================================================

export const placeFromJson = (placeJson) => {
  if (!placeJson || placeJson.type === 'AtEnd') {
    return KanbanDomain.Place.create_AtEnd();
  } else if (placeJson.type === 'Before') {
    return KanbanDomain.Place.create_Before(new BigNumber(placeJson.anchor));
  } else if (placeJson.type === 'After') {
    return KanbanDomain.Place.create_After(new BigNumber(placeJson.anchor));
  }
  return KanbanDomain.Place.create_AtEnd();
};

export const actionFromJson = (action) => {
  switch (action.type) {
    case 'NoOp':
      return KanbanDomain.Action.create_NoOp();
    case 'AddColumn':
      return KanbanDomain.Action.create_AddColumn(
        _dafny.Seq.UnicodeFromString(action.col),
        new BigNumber(action.limit)
      );
    case 'SetWip':
      return KanbanDomain.Action.create_SetWip(
        _dafny.Seq.UnicodeFromString(action.col),
        new BigNumber(action.limit)
      );
    case 'AddCard':
      return KanbanDomain.Action.create_AddCard(
        _dafny.Seq.UnicodeFromString(action.col),
        _dafny.Seq.UnicodeFromString(action.title)
      );
    case 'MoveCard':
      return KanbanDomain.Action.create_MoveCard(
        new BigNumber(action.id),
        _dafny.Seq.UnicodeFromString(action.toCol),
        placeFromJson(action.place)
      );
    case 'EditTitle':
      return KanbanDomain.Action.create_EditTitle(
        new BigNumber(action.id),
        _dafny.Seq.UnicodeFromString(action.title)
      );
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
};

export const actionToJson = (value) => {
  if (value.is_NoOp) return { type: 'NoOp' };
  if (value.is_AddColumn) {
    return { type: 'AddColumn', col: dafnyStringToJs(value.dtor_col), limit: toNumber(value.dtor_limit) };
  }
  if (value.is_SetWip) {
    return { type: 'SetWip', col: dafnyStringToJs(value.dtor_col), limit: toNumber(value.dtor_limit) };
  }
  if (value.is_AddCard) {
    return { type: 'AddCard', col: dafnyStringToJs(value.dtor_col), title: dafnyStringToJs(value.dtor_title) };
  }
  if (value.is_MoveCard) {
    return { type: 'MoveCard', id: toNumber(value.dtor_id), toCol: dafnyStringToJs(value.dtor_toCol) };
  }
  if (value.is_EditTitle) {
    return { type: 'EditTitle', id: toNumber(value.dtor_id), title: dafnyStringToJs(value.dtor_title) };
  }
  return { type: 'Unknown' };
};

// ============================================================================
// EffectState Helpers
// ============================================================================

export const EffectInit = (version, modelJson) => {
  return KanbanEffectAppCore.__default.EffectInit(new BigNumber(version), modelFromJson(modelJson));
};

export const EffectStep = (es, event) => {
  const result = KanbanEffectAppCore.__default.EffectStep(es, event);
  return [result[0], result[1]];
};

export const EffectEvent = {
  UserAction: (actionJson) => KanbanEffectAppCore.__default.EffectUserAction(actionFromJson(actionJson)),
  DispatchAccepted: (version, modelJson) =>
    KanbanEffectAppCore.__default.EffectDispatchAccepted(new BigNumber(version), modelFromJson(modelJson)),
  DispatchConflict: (version, modelJson) =>
    KanbanEffectAppCore.__default.EffectDispatchConflict(new BigNumber(version), modelFromJson(modelJson)),
  DispatchRejected: (version, modelJson) =>
    KanbanEffectAppCore.__default.EffectDispatchRejected(new BigNumber(version), modelFromJson(modelJson)),
  NetworkError: () => KanbanEffectAppCore.__default.EffectNetworkError(),
  NetworkRestored: () => KanbanEffectAppCore.__default.EffectNetworkRestored(),
  ManualGoOffline: () => KanbanEffectAppCore.__default.EffectManualGoOffline(),
  ManualGoOnline: () => KanbanEffectAppCore.__default.EffectManualGoOnline(),
  Tick: () => KanbanEffectAppCore.__default.EffectTick(),
};

export const EffectState = {
  getClient: (es) => KanbanEffectAppCore.__default.EffectGetClient(es),
  getServerVersion: (es) => toNumber(KanbanEffectAppCore.__default.EffectGetServerVersion(es)),
  isOnline: (es) => KanbanEffectAppCore.__default.EffectIsOnline(es),
  isIdle: (es) => KanbanEffectAppCore.__default.EffectIsIdle(es),
  isDispatching: (es) => es.dtor_mode.is_Dispatching,
  hasPending: (es) => KanbanEffectAppCore.__default.EffectHasPending(es),
  getPendingCount: (es) => toNumber(KanbanEffectAppCore.__default.EffectPendingCount(es)),
};

export const EffectCommand = {
  isNoOp: (cmd) => KanbanEffectAppCore.__default.EffectIsNoOp(cmd),
  isSendDispatch: (cmd) => KanbanEffectAppCore.__default.EffectIsSendDispatch(cmd),
  getBaseVersion: (cmd) => toNumber(KanbanEffectAppCore.__default.EffectGetBaseVersion(cmd)),
  getAction: (cmd) => KanbanEffectAppCore.__default.EffectGetAction(cmd),
};

// ============================================================================
// Server State Helpers (for testing server-side logic)
// ============================================================================

export const ServerInit = () => KanbanEffectAppCore.__default.Init();

export const ServerVersion = (server) => toNumber(KanbanEffectAppCore.__default.ServerVersion(server));

export const ServerModel = (server) => KanbanEffectAppCore.__default.ServerModel(server);

export const ServerDispatch = (server, baseVersion, actionJson) => {
  const result = KanbanMultiCollaboration.__default.Dispatch(
    server,
    new BigNumber(baseVersion),
    actionFromJson(actionJson)
  );
  return { newServer: result[0], reply: result[1] };
};

export const IsAccepted = (reply) => KanbanEffectAppCore.__default.IsAccepted(reply);

export const IsRejected = (reply) => KanbanEffectAppCore.__default.IsRejected(reply);

export { BigNumber };
