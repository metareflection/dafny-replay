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
// ServerState conversion (for verified Dispatch)
// ============================================================================

interface ServerStateJson {
  present: Model;
  appliedLog: Action[];
  auditLog?: AuditRecord[];
}

interface AuditRecord {
  baseVersion: number;
  orig: Action;
  rebased: Action;
  chosen: Action;
  outcome: {
    type: 'accepted' | 'rejected';
    applied?: Action;
    noChange?: boolean;
    reason?: string;
  };
}

// deno-lint-ignore no-explicit-any
export const serverStateFromJson = (json: ServerStateJson): any => {
  const present = modelFromJson(json.present);

  // Convert appliedLog: Action[] -> Dafny seq<Action>
  const appliedActions = (json.appliedLog || []).map(actionFromJson);
  const appliedLog = _dafny.Seq.of(...appliedActions);

  // Convert auditLog: AuditRecord[] -> Dafny seq<RequestRecord>
  const auditRecords = (json.auditLog || []).map((rec: AuditRecord) => {
    const outcome = rec.outcome.type === 'accepted'
      ? KanbanMultiCollaboration.RequestOutcome.create_AuditAccepted(
          actionFromJson(rec.outcome.applied!),
          rec.outcome.noChange || false
        )
      : KanbanMultiCollaboration.RequestOutcome.create_AuditRejected(
          KanbanMultiCollaboration.RejectReason.create_DomainInvalid(),
          actionFromJson(rec.outcome.applied || rec.rebased)
        );

    return KanbanMultiCollaboration.RequestRecord.create_Req(
      new BigNumber(rec.baseVersion),
      actionFromJson(rec.orig),
      actionFromJson(rec.rebased),
      actionFromJson(rec.chosen),
      outcome
    );
  });
  const auditLog = _dafny.Seq.of(...auditRecords);

  return KanbanMultiCollaboration.ServerState.create_ServerState(
    present,
    appliedLog,
    auditLog
  );
};

// deno-lint-ignore no-explicit-any
export const serverStateToJson = (s: any): ServerStateJson => {
  const present = modelToJson(s.dtor_present);

  // Convert appliedLog: Dafny seq<Action> -> Action[]
  const appliedLog = seqToArray(s.dtor_appliedLog).map(actionToJson);

  // Convert auditLog: Dafny seq<RequestRecord> -> AuditRecord[]
  const auditLog = seqToArray(s.dtor_auditLog).map((rec: any) => {
    const outcome = rec.dtor_outcome;
    return {
      baseVersion: toNumber(rec.dtor_baseVersion),
      orig: actionToJson(rec.dtor_orig),
      rebased: actionToJson(rec.dtor_rebased),
      chosen: actionToJson(rec.dtor_chosen),
      outcome: outcome.is_AuditAccepted
        ? {
            type: 'accepted' as const,
            applied: actionToJson(outcome.dtor_applied),
            noChange: outcome.dtor_noChange
          }
        : {
            type: 'rejected' as const,
            reason: 'DomainInvalid',
            applied: actionToJson(outcome.dtor_rebased)
          }
    };
  });

  return { present, appliedLog, auditLog };
};

// ============================================================================
// Verified Dispatch (uses KanbanMultiCollaboration.Dispatch directly)
// ============================================================================

export interface DispatchResult {
  status: 'accepted' | 'rejected';
  state?: Model;
  appliedAction?: Action;
  newVersion?: number;
  noChange?: boolean;
  appliedLog?: Action[];
  auditLog?: AuditRecord[];
  reason?: string;
}

/**
 * Dispatch using the VERIFIED Dafny MultiCollaboration.Dispatch function.
 *
 * This replaces the previous unverified TypeScript orchestration with a single
 * call to the Dafny-verified Dispatch function, which handles:
 * - Rebasing through the suffix
 * - Generating candidates
 * - Choosing the first valid candidate
 * - Preserving invariants (proven)
 */
export function dispatch(
  stateJson: Model,
  appliedLog: Action[],
  baseVersion: number,
  actionJson: Action,
  auditLog?: AuditRecord[]
): DispatchResult {
  // Build ServerState from JSON
  const serverState = serverStateFromJson({
    present: stateJson,
    appliedLog: appliedLog,
    auditLog: auditLog || []
  });

  // Call VERIFIED Dispatch
  const action = actionFromJson(actionJson);
  const result = KanbanMultiCollaboration.__default.Dispatch(
    serverState,
    new BigNumber(baseVersion),
    action
  );

  // Result is a tuple: [newServerState, reply]
  const newServerState = result[0];
  const reply = result[1];

  // Extract new state
  const newStateJson = serverStateToJson(newServerState);

  // Check reply type using KanbanAppCore helpers
  if (KanbanAppCore.__default.IsAccepted(reply)) {
    return {
      status: 'accepted',
      state: newStateJson.present,
      newVersion: toNumber(reply.dtor_newVersion),
      appliedAction: actionToJson(reply.dtor_applied),
      noChange: reply.dtor_noChange,
      appliedLog: newStateJson.appliedLog,
      auditLog: newStateJson.auditLog
    };
  } else {
    // Rejected
    return {
      status: 'rejected',
      reason: 'DomainInvalid',
      // Include the rebased action for debugging
      appliedAction: actionToJson(reply.dtor_rebased)
    };
  }
}

// ============================================================================
// Legacy dispatch (for backwards compatibility during migration)
// Uses the same verified Dispatch but with simpler interface
// ============================================================================

export function dispatchSimple(
  stateJson: Model,
  appliedLog: Action[],
  baseVersion: number,
  actionJson: Action
): { status: 'accepted' | 'rejected'; state?: Model; appliedAction?: Action; reason?: string } {
  const result = dispatch(stateJson, appliedLog, baseVersion, actionJson);
  return {
    status: result.status,
    state: result.state,
    appliedAction: result.appliedAction,
    reason: result.reason
  };
}
`;

// Write the bundle
const outputPath = join(__dirname, 'dafny-bundle.ts');
writeFileSync(outputPath, bundle);
console.log(`Generated ${outputPath}`);
console.log('');
console.log('The bundle uses VERIFIED Dafny code:');
console.log('  - KanbanMultiCollaboration.Dispatch (full verified reconciliation)');
console.log('  - KanbanAppCore.IsAccepted/IsRejected (reply inspection)');
console.log('');
console.log('Trust boundary: Only JSON conversion is unverified.');
