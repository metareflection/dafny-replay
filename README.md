# dafny-replay

**A verified replay (undo/redo) kernel for UI state, written in Dafny and compiled to JavaScript.**

`dafny-replay` provides a small, reusable kernel for **replayable application state** (undo/redo, time-travel) with **global invariants proved once and preserved for all histories**.

The core idea is simple:

> If every state transition preserves an invariant, then *every* state reachable by replay (including undo/redo) also satisfies that invariant — by construction.

This repository contains:

* a **generic replay kernel** proved once,
* multiple **concrete domains** proved against that kernel,
* and a **React demo pipeline** using the compiled JavaScript.

It also doubles as a **benchmark for Dafny + LLM proof assistance**, exercising non-local invariants and sequence/map reasoning.

---

## What this gives you

* ✅ **Undo / redo for free**, once the domain invariant is proved
* ✅ **Impossible states ruled out**, not just tested against
* ✅ **Pure, deterministic reducers** (React-friendly)
* ✅ **Executable JavaScript**, not a model
* ✅ **A real proof stress test** (not a toy example)

No runtime checks. No post-hoc validation.
The guarantees come from Dafny verification.

---

## Architecture

```
Abstract Domain (spec)
        ↓ refined by
Concrete Domain (Model, Action, Inv, Apply, Normalize)
        ↓ plugged into
Replay Kernel (generic, proved once)
        ↓ compiled to JS
AppCore (React-facing API)
```

### The Replay Kernel

The kernel maintains:

```text
History = { past, present, future }
```

and provides:

* `Do(action)`
* `Undo`
* `Redo`

It is proved *once* that replay preserves the domain invariant.

### Domain obligation (the only proof you owe)

For a given domain, you must prove:

```text
Inv(m) ⇒ Inv(Normalize(Apply(m, action)))
```

After that, **undo/redo correctness is automatic**.

---

## Domains in this repository

### 1. Toy domain (counter)

A minimal sanity check:

* `Model = int`
* invariant: `m ≥ 0`

Useful for bootstrapping the pipeline.

### 2. Kanban board (non-trivial)

A realistic, non-local domain with:

* dynamic columns (string IDs),
* ordered cards per column,
* per-column WIP limits,
* model-allocated card IDs,
* undo/redo over drag-and-drop operations.

**Key invariants:**

1. **Exact partition**
   Every card exists in *exactly one* column
   (no disappearance, no duplication).
2. **WIP limits respected**
   Column sizes never exceed their limits.

This domain requires substantial sequence and map reasoning and serves as a **stress test** for Dafny automation and LLM-assisted proof construction.

### 3. Delegation Auth (capability delegation)

A permission system with transitive capability delegation:

* subjects (users/entities),
* direct capability grants,
* delegations (edges transferring capability access),
* revocable delegation edges with unique IDs.

**Key invariants:**

1. **Referential integrity**
   All grant subjects and delegation endpoints must exist in the subject set.
2. **Fresh edge IDs**
   Delegation IDs are always less than the allocator counter.

**Access semantics:**

A subject *can* access a capability if:
* they have a direct grant, OR
* there exists a delegation chain from a granted subject to them.

The `Reach` function computes transitive closure via bounded iteration, with a proof (`ReachCorrect`) that it matches the ghost specification `HasCap`.

---

## Why this is interesting

Undo/redo logic is deceptively subtle. Bugs typically involve:

* duplicated or lost elements,
* stale state after undo,
* partial updates that violate global constraints.

In `dafny-replay`, these bugs are **unrepresentable**:

* every reachable state is the result of replaying valid actions,
* replay is proved invariant-preserving,
* and invariants are global, not local.

This is especially relevant for UI state, where reducers are often assumed to be “simple” but are rarely specified precisely.

---

## Using it from React

The compiled JavaScript exposes a small API (via `AppCore`):

```ts
const h0 = App.Init();
const h1 = App.Dispatch(h0, action);
const h2 = App.Undo(h1);
const h3 = App.Redo(h2);

App.Present(h3);
App.CanUndo(h3);
App.CanRedo(h3);
```

React stores the **entire History** as state; rendering uses selectors over `present`.

---

## How to run

### 1. Verify the Dafny code

```bash
dafny verify *.dfy
```

All files should verify.

### 2. Compile to JavaScript

```bash
./compile.sh
```

This produces JavaScript artifacts consumed by the demo.

### 3. Run the React demos

```bash
cd demo           # counter demo
cd kanban         # kanban board
cd delegation-auth # capability delegation
npm install
npm run dev
```

---


## What this is not

* Not a UI framework
* Not a CRDT library
* Not protection against malicious clients
* Not optimized for performance

This is about **correctness by construction** for application state.

---

## Status

* ✔ Generic replay kernel proved
* ✔ JavaScript compilation
* ✔ React integration


