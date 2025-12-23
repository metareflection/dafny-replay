# dafny-replay

**Verified kernels, written in Dafny and compiled to JavaScript, for correct-by-construction state in interactive web applications.**

This project started as a verified replay (undo/redo) kernel for UI state—hence the name—and has grown into a broader exploration of verified state evolution across both local and client–server settings.

`dafny-replay` provides small, reusable **verified kernels for application state**—including replayable (undo/redo, time-travel) state and experimental client–server authority kernels—where **global invariants are proved once and preserved by construction**.

The core idea is simple:

> If every state transition preserves an invariant, then *every* state reachable through the system
> (including via replay or protocol interaction) also satisfies that invariant — by construction.


This repository contains:

* a **generic replay kernel** proved once,
* a **generic authority kernel** for server-authoritative client–server protocols,
* a **generic multi-collaboration kernel** for server-authoritative protocols with offline clients,
* multiple **concrete domains** proved against these kernels,
* a **React demo pipeline** using the compiled JavaScript.

It also doubles as a **benchmark for Dafny + LLM proof assistance**, exercising non-local invariants and sequence/map reasoning.

### List of Kernels

| Kernel                 | Setting                        | Guarantees |
|------------------------|--------------------------------|------------|
| Replay                 | Local UI state                 | Undo/redo preserves global invariants |
| Authority              | Client–server                  | Server state always satisfies invariants |
| Multi-Collaboration v1 | Client–server, offline clients | Accepted server states satisfy invariants |
| Multi-Collaboration v2 | Client–server, offline clients | Anchor-based moves, candidate fallback, minimal rejection |

---

## What this gives you

* ✅ **Undo / redo for free**, once the domain invariant is proved
* ✅ Server-authoritative state with explicit *protocol-level rejection*
* ✅ **Impossible states ruled out**, not just tested against
* ✅ **Pure, deterministic reducers** (React-friendly)
* ✅ **Executable JavaScript**, not a model
* ✅ **A real proof stress test** (not a toy example)

No runtime checks. No post-hoc validation.
The guarantees come from Dafny verification.

---

## Architecture (Replay Kernel)

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

## The Authority Kernel

In addition to local replay, the repository includes an experimental **authority kernel** for **server-authoritative application state** with optimistic clients.

The authority kernel models a single authoritative server that maintains:

```text
ServerState = { version, present }
```

and exposes two operations:

* `Dispatch(clientVersion, action)`
* `Sync()`

Clients may optimistically apply actions locally, but the server evolves its state **only through verified transitions**.

Each request is handled as follows:

* **Stale version** → rejected (client must resync)
* **Invalid action** → rejected (domain-level failure)
* **Valid action** → applied, version incremented

On success, the server returns the updated state; on failure, the server state remains unchanged.

### Domain obligation (authority)

For a given domain, the only required proof is that **successful transitions preserve the invariant**:

```text
Inv(m) ∧ TryStep(m, action) = Ok(m′) ⇒ Inv(m′)
```

The authority kernel is proved once to preserve the invariant of the authoritative state across all protocol interactions, regardless of client behavior.

### What this gives you

* ✅ **Server-side invariants by construction**
* ✅ **Explicit separation of protocol errors vs domain errors**
* ✅ **Optimistic UI compatibility**
* ✅ **Executable JavaScript server logic**

This kernel is intentionally minimal: it models a single authoritative state and versioned protocol. More advanced scenarios (multi-client concurrency, offline synchronization, merging) are possible extensions.

---

## The Multi-Collaboration Kernel

A kernel for server-authoritative collaboration with offline clients.

Clients may submit actions based on stale versions. The server reconciles each action against the intervening history using a domain-defined function, then either accepts it (updating the authoritative log) or rejects it.

All accepted states are proved to satisfy the domain invariant.

### v1: Position-based

The original kernel uses positional indices for card placement. Actions specify exact positions, and rebasing transforms stale actions against the intervening history.

### v2: Anchor-based with candidate fallback

The v2 kernel (`MultiCollaboration2.dfy`) introduces several improvements:

* **Anchor-based placement**: Instead of positional indices, moves use `Place` (AtEnd, Before, After) to express intent relative to other cards. This is more robust to concurrent edits.

* **Candidate fallback**: When an anchor is missing (e.g., moved or deleted by another client), the server tries a list of fallback candidates (e.g., AtEnd) before rejecting.

* **Minimal rejection**: The server rejects a request only if no interpretation within the domain’s declared intent envelope would succeed. For MoveCard, the server tries three candidates: original placement, AtEnd, and Before(first). Lemma `BeforeFirstImpliesAtEnd` proves Before(first) is redundant—if it succeeds, AtEnd also succeeds. This justifies defining `Explains` to cover only origPlace and AtEnd, and the kernel proves dispatch rejects only when both would fail.

* **Server-allocated IDs**: Card IDs are allocated by the server (via `nextId`), eliminating client-side ID conflicts.

* **Real invariants**: A comprehensive 7-part invariant covering column uniqueness, lane/WIP consistency, card existence, no duplicates, WIP limits, and allocator freshness.

The v2 kernel is designed for domains where "intent" matters more than exact positioning, mirroring a common pattern in collaborative editors (e.g. Google Docs): preserve intent when possible, fall back deterministically, and reject only when no reasonable interpretation exists.

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
cd demo-authority # counter demo with client-server protocol
cd kanban-multi-collaboration  # kanban with multi-collaboration v1 (position-based)
cd kanban-multi-collaboration2 # kanban with multi-collaboration v2 (anchor-based)
npm install
npm run dev
```

---


## What this is not

* Not a UI framework
* Not a CRDT library
* Not a security or authentication framework
* Not optimized for performance

This is about **correctness by construction** for application state.

---

## Status

* ✔ Generic replay kernel proved
* ✔ Generic authority kernel for client–server architectures proved
* ✔ JavaScript compilation
* ✔ React integration
