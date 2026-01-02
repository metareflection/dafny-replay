#!/usr/bin/env node
// Build script to bundle compiled Dafny code for Deno Edge Function
// Run: node build-bundle.js

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read the compiled Dafny code
const dafnyCodePath = join(__dirname, '../../../src/dafny/ClearSplitEffect.cjs');
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
const bundle = `// Dafny ClearSplit Domain Bundle for Deno Edge Function
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
  return { _dafny, ClearSplit, ClearSplitDomain, ClearSplitMultiCollaboration, ClearSplitMultiAppCore };
\`);

const { _dafny, ClearSplit, ClearSplitDomain, ClearSplitMultiCollaboration, ClearSplitMultiAppCore } = initDafny(require, exports, module);

export { _dafny, ClearSplit, ClearSplitDomain, ClearSplitMultiCollaboration, ClearSplitMultiAppCore, BigNumber };

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

interface Expense {
  paidBy: string;
  amount: number;
  shares: Record<string, number>;
  shareKeys: string[];
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

interface Model {
  members: string[];
  memberList: string[];
  expenses: Expense[];
  settlements: Settlement[];
}

interface Action {
  type: string;
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

// deno-lint-ignore no-explicit-any
export const expenseFromJson = (json: Expense): any => {
  let shares = _dafny.Map.Empty;
  for (const [k, v] of Object.entries(json.shares || {})) {
    shares = shares.update(_dafny.Seq.UnicodeFromString(k), new BigNumber(v));
  }
  return ClearSplit.Expense.create_Expense(
    _dafny.Seq.UnicodeFromString(json.paidBy),
    new BigNumber(json.amount),
    shares,
    _dafny.Seq.of(...(json.shareKeys || []).map((x: string) => _dafny.Seq.UnicodeFromString(x)))
  );
};

// deno-lint-ignore no-explicit-any
export const expenseToJson = (value: any): Expense => {
  const shares: Record<string, number> = {};
  if (value.dtor_shares && value.dtor_shares.Keys) {
    for (const k of value.dtor_shares.Keys.Elements) {
      shares[dafnyStringToJs(k)] = toNumber(value.dtor_shares.get(k));
    }
  }
  return {
    paidBy: dafnyStringToJs(value.dtor_paidBy),
    amount: toNumber(value.dtor_amount),
    shares,
    shareKeys: seqToArray(value.dtor_shareKeys).map(dafnyStringToJs)
  };
};

// deno-lint-ignore no-explicit-any
export const settlementFromJson = (json: Settlement): any => {
  return ClearSplit.Settlement.create_Settlement(
    _dafny.Seq.UnicodeFromString(json.from),
    _dafny.Seq.UnicodeFromString(json.to),
    new BigNumber(json.amount)
  );
};

// deno-lint-ignore no-explicit-any
export const settlementToJson = (value: any): Settlement => {
  return {
    from: dafnyStringToJs(value.dtor_from),
    to: dafnyStringToJs(value.dtor_to),
    amount: toNumber(value.dtor_amount)
  };
};

// deno-lint-ignore no-explicit-any
export const modelFromJson = (json: Model): any => {
  const members = _dafny.Set.fromElements(
    ...(json.members || []).map((x: string) => _dafny.Seq.UnicodeFromString(x))
  );
  const memberList = _dafny.Seq.of(
    ...(json.memberList || []).map((x: string) => _dafny.Seq.UnicodeFromString(x))
  );
  const expenses = _dafny.Seq.of(
    ...(json.expenses || []).map(expenseFromJson)
  );
  const settlements = _dafny.Seq.of(
    ...(json.settlements || []).map(settlementFromJson)
  );
  return ClearSplit.Model.create_Model(members, memberList, expenses, settlements);
};

// deno-lint-ignore no-explicit-any
export const modelToJson = (m: any): Model => {
  return {
    members: Array.from(m.dtor_members.Elements).map(dafnyStringToJs),
    memberList: seqToArray(m.dtor_memberList).map(dafnyStringToJs),
    expenses: seqToArray(m.dtor_expenses).map(expenseToJson),
    settlements: seqToArray(m.dtor_settlements).map(settlementToJson)
  };
};

// ============================================================================
// Action conversion
// ============================================================================

// deno-lint-ignore no-explicit-any
export const actionFromJson = (json: Action): any => {
  switch (json.type) {
    case 'AddExpense':
      return ClearSplitDomain.Action.create_AddExpense(expenseFromJson(json.e));
    case 'AddSettlement':
      return ClearSplitDomain.Action.create_AddSettlement(settlementFromJson(json.s));
    default:
      throw new Error(\`Unknown action type: \${json.type}\`);
  }
};

// deno-lint-ignore no-explicit-any
export const actionToJson = (action: any): Action => {
  if (action.is_AddExpense) {
    return { type: 'AddExpense', e: expenseToJson(action.dtor_e) };
  }
  if (action.is_AddSettlement) {
    return { type: 'AddSettlement', s: settlementToJson(action.dtor_s) };
  }
  return { type: 'Unknown' };
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
  const appliedActions = (json.appliedLog || []).map(actionFromJson);
  const appliedLog = _dafny.Seq.of(...appliedActions);

  const auditRecords = (json.auditLog || []).map((rec: AuditRecord) => {
    const outcome = rec.outcome.type === 'accepted'
      ? ClearSplitMultiCollaboration.RequestOutcome.create_AuditAccepted(
          actionFromJson(rec.outcome.applied!),
          rec.outcome.noChange || false
        )
      : ClearSplitMultiCollaboration.RequestOutcome.create_AuditRejected(
          ClearSplitMultiCollaboration.RejectReason.create_DomainInvalid(),
          actionFromJson(rec.outcome.applied || rec.rebased)
        );

    return ClearSplitMultiCollaboration.RequestRecord.create_Req(
      new BigNumber(rec.baseVersion),
      actionFromJson(rec.orig),
      actionFromJson(rec.rebased),
      actionFromJson(rec.chosen),
      outcome
    );
  });
  const auditLog = _dafny.Seq.of(...auditRecords);

  return ClearSplitMultiCollaboration.ServerState.create_ServerState(present, appliedLog, auditLog);
};

// deno-lint-ignore no-explicit-any
export const serverStateToJson = (s: any): ServerStateJson => {
  const present = modelToJson(s.dtor_present);
  const appliedLog = seqToArray(s.dtor_appliedLog).map(actionToJson);

  // deno-lint-ignore no-explicit-any
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
// Verified Dispatch
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

export function dispatch(
  stateJson: Model,
  appliedLog: Action[],
  baseVersion: number,
  actionJson: Action,
  auditLog?: AuditRecord[]
): DispatchResult {
  const serverState = serverStateFromJson({
    present: stateJson,
    appliedLog: appliedLog,
    auditLog: auditLog || []
  });

  const action = actionFromJson(actionJson);
  const result = ClearSplitMultiCollaboration.__default.Dispatch(
    serverState,
    new BigNumber(baseVersion),
    action
  );

  const newServerState = result[0];
  const reply = result[1];
  const newStateJson = serverStateToJson(newServerState);

  if (ClearSplitMultiAppCore.__default.IsAccepted(reply)) {
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
    return {
      status: 'rejected',
      reason: 'DomainInvalid',
      appliedAction: actionToJson(reply.dtor_rebased)
    };
  }
}
`;

// Write the bundle
const outputPath = join(__dirname, 'dafny-bundle.ts');
writeFileSync(outputPath, bundle);
console.log(`Generated ${outputPath}`);
console.log('');
console.log('The bundle uses VERIFIED Dafny code:');
console.log('  - ClearSplitMultiCollaboration.Dispatch (full verified reconciliation)');
console.log('  - ClearSplitMultiAppCore.IsAccepted/IsRejected (reply inspection)');
console.log('');
console.log('Trust boundary: Only JSON conversion is unverified.');
