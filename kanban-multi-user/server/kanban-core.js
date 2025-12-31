// Shared Dafny kernel loading and conversion helpers
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
const kanbanCode = readFileSync(join(__dirname, 'KanbanMulti.cjs'), 'utf-8');

const require = (mod) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(`Unknown module: ${mod}`);
};

const initDafny = new Function('require', `
  ${kanbanCode}
  return { _dafny, KanbanDomain, KanbanMultiCollaboration, KanbanAppCore };
`);

export const { _dafny, KanbanDomain, KanbanMultiCollaboration, KanbanAppCore } = initDafny(require);

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

// Helper to convert BigNumber to JS number
export const toNumber = (bn) => {
  if (bn && typeof bn.toNumber === 'function') {
    return bn.toNumber();
  }
  return bn;
};

// Convert Dafny Model to JS object for API response
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

// Parse action JSON to Dafny Action
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

export { BigNumber };
