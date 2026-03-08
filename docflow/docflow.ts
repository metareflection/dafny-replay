// Unverified glue connecting Workflow + Validation verified modules.
// This is the boundary layer — thin, auditable, and the only unverified code.

import Workflow from './src/dafny/workflow.ts';
import Validation from './src/dafny/validation.ts';

import type { Doc, State, Transition } from './src/dafny/workflow.ts';
import type { Rule, ValidationError } from './src/dafny/validation.ts';

export type { Doc, State, Transition, Rule, ValidationError };

// With --null-options, the generated wrapper accepts string | null directly
// for Option<string> fields — no manual conversion needed.
type Form = Record<string, string | null>;

export interface DocFlow {
  doc: Doc;
  form: Form;
  rules: Rule[];
}

export type DocFlowResult =
  | { ok: true; flow: DocFlow }
  | { ok: false; errors: ValidationError[]; reason?: string };

// Transitions that require form validation before proceeding
const VALIDATION_GATED: Set<Transition> = new Set(['Submit']);

export function createDocFlow(rules: Rule[]): DocFlow {
  return {
    doc: Workflow.Init(),
    form: {},
    rules,
  };
}

export function setField(flow: DocFlow, field: string, value: string | null): DocFlow {
  return {
    ...flow,
    form: { ...flow.form, [field]: value },
  };
}

export function getField(flow: DocFlow, field: string): string | null {
  return flow.form[field] ?? null;
}

export function validate(flow: DocFlow): ValidationError[] {
  return Validation.Validate(flow.form, flow.rules);
}

export function validTransition(flow: DocFlow, t: Transition): boolean {
  return Workflow.ValidTransition(flow.doc.state, t);
}

export function transition(flow: DocFlow, t: Transition): DocFlowResult {
  const result = Workflow.TryTransition(flow.doc, t);
  if (result.type === 'Blocked') {
    return { ok: false, errors: [], reason: result.reason };
  }

  if (VALIDATION_GATED.has(t)) {
    const errors = Validation.Validate(flow.form, flow.rules);
    if (errors.length > 0) return { ok: false, errors };
  }

  return {
    ok: true,
    flow: { ...flow, doc: Workflow.Step(flow.doc, t) },
  };
}

export function addReviewer(flow: DocFlow, reviewer: string): DocFlow {
  return { ...flow, doc: Workflow.AddReviewer(flow.doc, reviewer) };
}

export function isTerminal(flow: DocFlow): boolean {
  return Workflow.IsTerminal(flow.doc.state);
}
