# docflow

Gradual verification demo: two independently verified Dafny modules compiled to JS, connected by a thin unverified TypeScript glue layer, driving a React UI.

## Architecture

```
Workflow.dfy ──compile──→ Workflow.cjs ──dafny2js──→ workflow.ts (JSON API)
                                                          ↓
Validation.dfy ──compile──→ Validation.cjs ──dafny2js──→ validation.ts (JSON API)
                                                          ↓
                                              docflow.ts (unverified glue)
                                                          ↓
                                                     React UI
```

The verified modules don't know about each other. The glue connects them. The UI is presentational only.

## Verified Modules

**`Workflow.dfy`** — Document review state machine
- States: Draft → Submitted → InReview → Approved/Rejected → Published
- Rejected → Draft (revision cycle), Published is terminal
- Guards: InReview requires at least one reviewer
- `TryTransition(doc, t) → OK | Blocked(reason)` — verified consistent with `CanTransition`
- Lemmas: invariant preservation, terminal state, no-skip, invalid transitions are no-ops

**`Validation.dfy`** — Field constraint validation
- 5 constraint types: Required, MinLength, MaxLength, OneOf, DependsOn (cross-field)
- `Validate(form, rules) → errors`, `IsValid(form, rules) → bool`
- Lemmas: ValidIffNoErrors, RequiredFieldOnEmptyForm, FewerConstraintsFewerErrors, FewerRulesStillValid, DependsOnAbsentTrigger

## Glue Layer

**`docflow.ts`** — unverified boundary connecting both modules

- `DocFlow` bundles `{ doc, form, rules }` as combined state
- `transition(flow, t)` — checks workflow guards via `TryTransition`, then validates form for configured transitions
- `setField(flow, "title", "Hello")` / `getField(flow, "title")` — form fields are `string | null`, mapped to Dafny's `Option<string>` by `--null-options`
- Error reasons come from the verified spec, not the glue

## Running

```sh
npm install
npm run dev
```

## Recompiling from Dafny

From the repo root:

```sh
./compile.sh docflow
```

Uses `--app-core Workflow` / `--app-core Validation` (the module IS the AppCore), `--json-api` for full JSON marshalling, and `--null-options` so `Option<string>` maps to `string | null` at the boundary.
