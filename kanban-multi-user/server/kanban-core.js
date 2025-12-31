// Shared Dafny kernel loading and conversion helpers for KanbanMultiUser
// Used by both the Express server and integration tests

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import BigNumber from 'bignumber.js';

// Configure BigNumber as Dafny expects
BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

// Load Dafny-generated code
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const kanbanCode = readFileSync(join(__dirname, 'KanbanMultiUser.cjs'), 'utf-8');

const require = (mod) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(`Unknown module: ${mod}`);
};

const initDafny = new Function('require', `
  ${kanbanCode}
  return { _dafny, KanbanDomain, KanbanMultiUserDomain, KanbanMultiUser, KanbanMultiUserAppCore };
`);

export const { _dafny, KanbanDomain, KanbanMultiUserDomain, KanbanMultiUser, KanbanMultiUserAppCore } = initDafny(require);

// Helper to convert Dafny Seq (string) to JS string
export const dafnyStringToJs = (seq) => {
  if (typeof seq === 'string') return seq;
  if (seq.toVerbatimString) return seq.toVerbatimString(false);
  return Array.from(seq).join('');
};

// Helper to convert Dafny seq to JS array
export const seqToArray = (seq) => {
  const arr = [];
  for (let i = 0; i < seq.length; i++) {
    arr.push(seq[i]);
  }
  return arr;
};

// Helper to convert Dafny set to JS array
export const setToArray = (set) => {
  const arr = [];
  if (set && set.Elements) {
    for (const elem of set.Elements) {
      arr.push(elem);
    }
  }
  return arr;
};

// Helper to convert BigNumber to JS number
export const toNumber = (bn) => {
  if (bn && typeof bn.toNumber === 'function') {
    return bn.toNumber();
  }
  return bn;
};

// Convert inner Kanban Model to JS object
const innerModelToJs = (m) => {
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
      const cardIds = lanesMap.get(key);
      lanes[colName] = seqToArray(cardIds).map(id => toNumber(id));
    }
  }

  if (wipMap && wipMap.Keys) {
    for (const key of wipMap.Keys.Elements) {
      const colName = dafnyStringToJs(key);
      wip[colName] = toNumber(wipMap.get(key));
    }
  }

  if (cardsMap && cardsMap.Keys) {
    for (const key of cardsMap.Keys.Elements) {
      const cardId = toNumber(key);
      const card = cardsMap.get(key);
      const title = card.dtor_title !== undefined ? card.dtor_title : card;
      cards[cardId] = { title: dafnyStringToJs(title) };
    }
  }

  return { cols, lanes, wip, cards, nextId };
};

// Convert MultiUser Model (with inner, owner, members) to JS object
export const modelToJs = (m) => {
  const inner = m.dtor_inner;
  const owner = dafnyStringToJs(m.dtor_owner);
  const members = setToArray(m.dtor_members).map(dafnyStringToJs);

  return {
    ...innerModelToJs(inner),
    owner,
    members
  };
};

// Helper to parse Place from JSON
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

// Parse action JSON to Dafny Action (inner Kanban action, no actor)
const innerActionFromJson = (action) => {
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

// Create a wrapped action with actor (used by server to inject authenticated userId)
export const actionFromJson = (action, actor) => {
  const actorDafny = _dafny.Seq.UnicodeFromString(actor);

  switch (action.type) {
    // Membership actions
    case 'InviteMember':
      return KanbanMultiUserDomain.Action.create_InviteMember(
        actorDafny,
        _dafny.Seq.UnicodeFromString(action.user)
      );
    case 'RemoveMember':
      return KanbanMultiUserDomain.Action.create_RemoveMember(
        actorDafny,
        _dafny.Seq.UnicodeFromString(action.user)
      );

    // Board actions (wrapped with actor)
    default:
      const innerAction = innerActionFromJson(action);
      return KanbanMultiUserDomain.Action.create_InnerAction(actorDafny, innerAction);
  }
};

// =====================================================
// Serialization: Dafny state → JSON (for persistence)
// =====================================================

// Convert Place to JSON
const placeToJson = (place) => {
  if (place.is_AtEnd) return { type: 'AtEnd' };
  if (place.is_Before) return { type: 'Before', anchor: toNumber(place.dtor_anchor) };
  if (place.is_After) return { type: 'After', anchor: toNumber(place.dtor_anchor) };
  return { type: 'AtEnd' };
};

// Convert inner Kanban action to JSON
const innerActionToJson = (action) => {
  if (action.is_NoOp) return { type: 'NoOp' };
  if (action.is_AddColumn) {
    return { type: 'AddColumn', col: dafnyStringToJs(action.dtor_col), limit: toNumber(action.dtor_limit) };
  }
  if (action.is_SetWip) {
    return { type: 'SetWip', col: dafnyStringToJs(action.dtor_col), limit: toNumber(action.dtor_limit) };
  }
  if (action.is_AddCard) {
    return { type: 'AddCard', col: dafnyStringToJs(action.dtor_col), title: dafnyStringToJs(action.dtor_title) };
  }
  if (action.is_MoveCard) {
    return {
      type: 'MoveCard',
      id: toNumber(action.dtor_id),
      toCol: dafnyStringToJs(action.dtor_toCol),
      place: placeToJson(action.dtor_place)
    };
  }
  if (action.is_EditTitle) {
    return { type: 'EditTitle', id: toNumber(action.dtor_id), title: dafnyStringToJs(action.dtor_title) };
  }
  return { type: 'NoOp' };
};

// Convert multi-user action to JSON
const multiUserActionToJson = (action) => {
  if (action.is_InnerAction) {
    return {
      type: 'InnerAction',
      actor: dafnyStringToJs(action.dtor_actor),
      action: innerActionToJson(action.dtor_action)
    };
  }
  if (action.is_InviteMember) {
    return {
      type: 'InviteMember',
      actor: dafnyStringToJs(action.dtor_actor),
      user: dafnyStringToJs(action.dtor_user)
    };
  }
  if (action.is_RemoveMember) {
    return {
      type: 'RemoveMember',
      actor: dafnyStringToJs(action.dtor_actor),
      user: dafnyStringToJs(action.dtor_user)
    };
  }
  return { type: 'InnerAction', actor: '', action: { type: 'NoOp' } };
};

// Convert full ServerState to JSON
export const serverStateToJson = (serverState) => {
  const present = serverState.dtor_present;
  const appliedLog = seqToArray(serverState.dtor_appliedLog);

  return {
    present: {
      inner: innerModelToJs(present.dtor_inner),
      owner: dafnyStringToJs(present.dtor_owner),
      members: setToArray(present.dtor_members).map(dafnyStringToJs)
    },
    appliedLog: appliedLog.map(multiUserActionToJson),
    version: appliedLog.length
  };
};

// =====================================================
// Deserialization: JSON → Dafny state (for loading)
// =====================================================

// Create Dafny Seq from array of strings
const seqFromStrings = (arr) => {
  return _dafny.Seq.of(...arr.map(s => _dafny.Seq.UnicodeFromString(s)));
};

// Create Dafny Map from JS object { string: seq<BigNumber> }
const lanesMapFromJson = (lanes) => {
  let m = _dafny.Map.Empty;
  for (const [col, cardIds] of Object.entries(lanes)) {
    const key = _dafny.Seq.UnicodeFromString(col);
    const value = _dafny.Seq.of(...cardIds.map(id => new BigNumber(id)));
    m = m.update(key, value);
  }
  return m;
};

// Create Dafny Map from JS object { string: number }
const wipMapFromJson = (wip) => {
  let m = _dafny.Map.Empty;
  for (const [col, limit] of Object.entries(wip)) {
    m = m.update(_dafny.Seq.UnicodeFromString(col), new BigNumber(limit));
  }
  return m;
};

// Create Dafny Map from JS object { number: { title: string } }
const cardsMapFromJson = (cards) => {
  let m = _dafny.Map.Empty;
  for (const [id, card] of Object.entries(cards)) {
    m = m.update(new BigNumber(id), _dafny.Seq.UnicodeFromString(card.title));
  }
  return m;
};

// Create Dafny Set from array of strings
const setFromStrings = (arr) => {
  return _dafny.Set.fromElements(...arr.map(s => _dafny.Seq.UnicodeFromString(s)));
};

// Create inner Kanban Model from JSON
const innerModelFromJson = (json) => {
  return KanbanDomain.Model.create_Model(
    seqFromStrings(json.cols),
    lanesMapFromJson(json.lanes),
    wipMapFromJson(json.wip),
    cardsMapFromJson(json.cards),
    new BigNumber(json.nextId)
  );
};

// Create multi-user Model from JSON
const multiUserModelFromJson = (json) => {
  return KanbanMultiUserDomain.Model.create_Model(
    innerModelFromJson(json.inner),
    _dafny.Seq.UnicodeFromString(json.owner),
    setFromStrings(json.members)
  );
};

// Create multi-user Action from JSON (with actor already included)
const multiUserActionFromJson = (json) => {
  const actor = _dafny.Seq.UnicodeFromString(json.actor);

  if (json.type === 'InviteMember') {
    return KanbanMultiUserDomain.Action.create_InviteMember(
      actor,
      _dafny.Seq.UnicodeFromString(json.user)
    );
  }
  if (json.type === 'RemoveMember') {
    return KanbanMultiUserDomain.Action.create_RemoveMember(
      actor,
      _dafny.Seq.UnicodeFromString(json.user)
    );
  }
  // InnerAction
  const innerAction = innerActionFromJson(json.action);
  return KanbanMultiUserDomain.Action.create_InnerAction(actor, innerAction);
};

// Create full ServerState from JSON
export const serverStateFromJson = (json) => {
  const present = multiUserModelFromJson(json.present);
  const appliedLog = _dafny.Seq.of(...json.appliedLog.map(multiUserActionFromJson));
  const auditLog = _dafny.Seq.of(); // We don't persist audit log

  return KanbanMultiUser.ServerState.create_ServerState(present, appliedLog, auditLog);
};

export { BigNumber };
