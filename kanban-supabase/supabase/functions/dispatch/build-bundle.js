#!/usr/bin/env node
// Build script to bundle compiled Dafny code for Deno Edge Function
// Run: node build-bundle.js

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read the compiled Dafny code
const dafnyCodePath = join(__dirname, '../../../src/dafny/KanbanMulti.cjs');
let dafnyCode;
try {
  dafnyCode = readFileSync(dafnyCodePath, 'utf-8');
} catch (e) {
  console.error(`Error: Could not read ${dafnyCodePath}`);
  console.error('Run ./compile.sh from project root first.');
  process.exit(1);
}

// Escape backticks and $ for template literal
const escapedCode = dafnyCode
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$/g, '\\$');

// Generate the Deno-compatible bundle
const bundle = `// Dafny Kanban Domain Bundle for Deno Edge Function
// AUTO-GENERATED - DO NOT EDIT
// Regenerate with: node build-bundle.js

import BigNumber from 'https://esm.sh/bignumber.js@9.1.2';

BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

// Dafny runtime mock for require
const require = (mod: string) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(\`Unknown module: \${mod}\`);
};

// deno-lint-ignore no-unused-vars
const exports = {};
// deno-lint-ignore no-unused-vars
const module = { exports };

// Evaluate Dafny code
const initDafny = new Function('require', 'exports', 'module', \`
${escapedCode}
  return { _dafny, KanbanDomain, KanbanMultiCollaboration, KanbanAppCore };
\`);

const { _dafny, KanbanDomain, KanbanMultiCollaboration, KanbanAppCore } = initDafny(require, exports, module);

export { _dafny, KanbanDomain, KanbanMultiCollaboration, KanbanAppCore, BigNumber };

// ============================================================================
// Helper functions
// ============================================================================

// deno-lint-ignore no-explicit-any
const seqToArray = (seq: any): any[] => {
  const arr = [];
  for (let i = 0; i < seq.length; i++) {
    arr.push(seq[i]);
  }
  return arr;
};

// deno-lint-ignore no-explicit-any
const toNumber = (bn: any): number => {
  if (bn && typeof bn.toNumber === 'function') {
    return bn.toNumber();
  }
  return bn;
};

// deno-lint-ignore no-explicit-any
const dafnyStringToJs = (seq: any): string => {
  if (typeof seq === 'string') return seq;
  if (seq.toVerbatimString) return seq.toVerbatimString(false);
  return Array.from(seq).join('');
};

// ============================================================================
// Model conversion
// ============================================================================

interface Model {
  cols: string[];
  lanes: Record<string, number[]>;
  wip: Record<string, number>;
  cards: Record<number, { title: string }>;
  nextId: number;
}

interface Place {
  type: 'AtEnd' | 'Before' | 'After';
  anchor?: number;
}

interface Action {
  type: string;
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

// deno-lint-ignore no-explicit-any
export const modelFromJson = (json: Model): any => {
  const cols = _dafny.Seq.of(
    ...(json.cols || []).map((c: string) => _dafny.Seq.UnicodeFromString(c))
  );

  let lanesMap = _dafny.Map.Empty;
  for (const [colName, cardIds] of Object.entries(json.lanes || {})) {
    const key = _dafny.Seq.UnicodeFromString(colName);
    const value = _dafny.Seq.of(...(cardIds as number[]).map((id: number) => new BigNumber(id)));
    lanesMap = lanesMap.update(key, value);
  }

  let wipMap = _dafny.Map.Empty;
  for (const [colName, limit] of Object.entries(json.wip || {})) {
    const key = _dafny.Seq.UnicodeFromString(colName);
    wipMap = wipMap.update(key, new BigNumber(limit as number));
  }

  let cardsMap = _dafny.Map.Empty;
  for (const [cardId, card] of Object.entries(json.cards || {})) {
    const key = new BigNumber(cardId);
    const value = _dafny.Seq.UnicodeFromString((card as { title: string }).title);
    cardsMap = cardsMap.update(key, value);
  }

  return KanbanDomain.Model.create_Model(
    cols,
    lanesMap,
    wipMap,
    cardsMap,
    new BigNumber(json.nextId || 0)
  );
};

// deno-lint-ignore no-explicit-any
export const modelToJson = (m: any): Model => {
  const cols = seqToArray(m.dtor_cols).map((c: unknown) => dafnyStringToJs(c));

  const lanes: Record<string, number[]> = {};
  const wip: Record<string, number> = {};
  const cards: Record<number, { title: string }> = {};

  if (m.dtor_lanes && m.dtor_lanes.Keys) {
    for (const key of m.dtor_lanes.Keys.Elements) {
      const colName = dafnyStringToJs(key);
      const cardIds = m.dtor_lanes.get(key);
      lanes[colName] = seqToArray(cardIds).map((id: unknown) => toNumber(id));
    }
  }

  if (m.dtor_wip && m.dtor_wip.Keys) {
    for (const key of m.dtor_wip.Keys.Elements) {
      wip[dafnyStringToJs(key)] = toNumber(m.dtor_wip.get(key));
    }
  }

  if (m.dtor_cards && m.dtor_cards.Keys) {
    for (const key of m.dtor_cards.Keys.Elements) {
      const card = m.dtor_cards.get(key);
      const title = card.dtor_title !== undefined
        ? dafnyStringToJs(card.dtor_title)
        : dafnyStringToJs(card);
      cards[toNumber(key)] = { title };
    }
  }

  return {
    cols,
    lanes,
    wip,
    cards,
    nextId: toNumber(m.dtor_nextId)
  };
};

// ============================================================================
// Action conversion
// ============================================================================

// deno-lint-ignore no-explicit-any
export const actionFromJson = (json: Action): any => {
  switch (json.type) {
    case 'NoOp':
      return KanbanDomain.Action.create_NoOp();
    case 'AddColumn':
      return KanbanDomain.Action.create_AddColumn(
        _dafny.Seq.UnicodeFromString(json.col),
        new BigNumber(json.limit)
      );
    case 'SetWip':
      return KanbanDomain.Action.create_SetWip(
        _dafny.Seq.UnicodeFromString(json.col),
        new BigNumber(json.limit)
      );
    case 'AddCard':
      return KanbanDomain.Action.create_AddCard(
        _dafny.Seq.UnicodeFromString(json.col),
        _dafny.Seq.UnicodeFromString(json.title)
      );
    case 'MoveCard': {
      const place = json.place?.type === 'Before'
        ? KanbanDomain.Place.create_Before(new BigNumber(json.place.anchor))
        : json.place?.type === 'After'
        ? KanbanDomain.Place.create_After(new BigNumber(json.place.anchor))
        : KanbanDomain.Place.create_AtEnd();
      return KanbanDomain.Action.create_MoveCard(
        new BigNumber(json.id),
        _dafny.Seq.UnicodeFromString(json.toCol),
        place
      );
    }
    case 'EditTitle':
      return KanbanDomain.Action.create_EditTitle(
        new BigNumber(json.id),
        _dafny.Seq.UnicodeFromString(json.title)
      );
    default:
      return KanbanDomain.Action.create_NoOp();
  }
};

// deno-lint-ignore no-explicit-any
export const actionToJson = (action: any): Action => {
  if (action.is_NoOp) {
    return { type: 'NoOp' };
  }
  if (action.is_AddColumn) {
    return {
      type: 'AddColumn',
      col: dafnyStringToJs(action.dtor_col),
      limit: toNumber(action.dtor_limit)
    };
  }
  if (action.is_SetWip) {
    return {
      type: 'SetWip',
      col: dafnyStringToJs(action.dtor_col),
      limit: toNumber(action.dtor_limit)
    };
  }
  if (action.is_AddCard) {
    return {
      type: 'AddCard',
      col: dafnyStringToJs(action.dtor_col),
      title: dafnyStringToJs(action.dtor_title)
    };
  }
  if (action.is_MoveCard) {
    const place = action.dtor_place;
    let placeJson: Place;
    if (place.is_AtEnd) {
      placeJson = { type: 'AtEnd' };
    } else if (place.is_Before) {
      placeJson = { type: 'Before', anchor: toNumber(place.dtor_anchor) };
    } else {
      placeJson = { type: 'After', anchor: toNumber(place.dtor_anchor) };
    }
    return {
      type: 'MoveCard',
      id: toNumber(action.dtor_id),
      toCol: dafnyStringToJs(action.dtor_toCol),
      place: placeJson
    };
  }
  if (action.is_EditTitle) {
    return {
      type: 'EditTitle',
      id: toNumber(action.dtor_id),
      title: dafnyStringToJs(action.dtor_title)
    };
  }
  return { type: 'NoOp' };
};

// ============================================================================
// Domain operations using actual Dafny code
// ============================================================================

export const tryStep = (modelJson: Model, actionJson: Action): { ok: boolean; value?: Model } => {
  const model = modelFromJson(modelJson);
  const action = actionFromJson(actionJson);
  const result = KanbanDomain.__default.TryStep(model, action);

  if (result.is_Ok) {
    return { ok: true, value: modelToJson(result.dtor_value) };
  }
  return { ok: false };
};

export const rebaseAction = (remoteJson: Action, localJson: Action): Action => {
  const remote = actionFromJson(remoteJson);
  const local = actionFromJson(localJson);
  const rebased = KanbanDomain.__default.Rebase(remote, local);
  return actionToJson(rebased);
};

export const getCandidates = (modelJson: Model, actionJson: Action): Action[] => {
  const model = modelFromJson(modelJson);
  const action = actionFromJson(actionJson);
  const candidates = KanbanDomain.__default.Candidates(model, action);
  return seqToArray(candidates).map(actionToJson);
};

export const rebaseThroughSuffix = (suffix: Action[], actionJson: Action): Action => {
  let action = actionFromJson(actionJson);
  for (let i = suffix.length - 1; i >= 0; i--) {
    const remote = actionFromJson(suffix[i]);
    action = KanbanDomain.__default.Rebase(remote, action);
  }
  return actionToJson(action);
};

// ============================================================================
// Dispatch (MultiCollaboration pattern using Dafny code)
// ============================================================================

export interface DispatchResult {
  status: 'accepted' | 'rejected';
  state?: Model;
  appliedAction?: Action;
  reason?: string;
}

export function dispatch(
  stateJson: Model,
  appliedLog: Action[],
  baseVersion: number,
  actionJson: Action
): DispatchResult {
  // 1. Rebase through suffix using Dafny's Rebase
  const suffix = appliedLog.slice(baseVersion);
  const rebased = rebaseThroughSuffix(suffix, actionJson);

  // 2. Get candidates using Dafny's Candidates
  const model = modelFromJson(stateJson);
  const rebasedAction = actionFromJson(rebased);
  const candidatesDafny = KanbanDomain.__default.Candidates(model, rebasedAction);
  const candidates = seqToArray(candidatesDafny);

  // 3. Try each candidate using Dafny's TryStep
  for (const candidate of candidates) {
    const result = KanbanDomain.__default.TryStep(model, candidate);
    if (result.is_Ok) {
      return {
        status: 'accepted',
        state: modelToJson(result.dtor_value),
        appliedAction: actionToJson(candidate)
      };
    }
  }

  // 4. All candidates failed
  return {
    status: 'rejected',
    reason: 'No valid interpretation of action'
  };
}
`;

// Write the bundle
const outputPath = join(__dirname, 'dafny-bundle.ts');
writeFileSync(outputPath, bundle);
console.log(`Generated ${outputPath}`);
console.log('The bundle uses the actual compiled Dafny code for:');
console.log('  - KanbanDomain.TryStep');
console.log('  - KanbanDomain.Rebase');
console.log('  - KanbanDomain.Candidates');
