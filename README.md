# dafny-replay

[![CI](https://github.com/metareflection/dafny-replay/actions/workflows/ci.yml/badge.svg)](https://github.com/metareflection/dafny-replay/actions/workflows/ci.yml)

**Verified kernels, written in Dafny and compiled to JavaScript, for correct-by-construction state in interactive web applications.**

**Check out our blog post**:
[_From Intent to Proof: Dafny Verification for Web Apps_](https://midspiral.com/blog/from-intent-to-proof-dafny-verification-for-web-apps/)

This project started as a verified replay (undo/redo) kernel for UI state—hence the name—and has grown into a broader exploration of verified state evolution across both local and client–server settings.

`dafny-replay` provides small, reusable **verified kernels for application state**—including replayable (undo/redo, time-travel) state and experimental client–server authority kernels—where **global invariants are proved once and preserved by construction**.

The core idea is simple:

> If every state transition preserves an invariant (and the initial state satisfies it), then *every* state reachable through the system
> (including via replay or protocol interaction) also satisfies that invariant — by construction.


This repository contains:

* a **generic replay kernel** proved once,
* a **generic authority kernel** for server-authoritative client–server protocols,
* a **generic multi-collaboration kernel** for server-authoritative protocols with offline clients,
* a **generic effect state machine** for client-side effect orchestration with bounded retries,
* a **generic multi-project kernel** for cross-project operations with per-project invariants,
* multiple **concrete domains** proved against these kernels,
* a **React demo pipeline** using the compiled JavaScript.

It also doubles as a **benchmark for Dafny + LLM proof assistance**, exercising non-local invariants and sequence/map reasoning.

### List of Kernels

| Kernel                 | Setting                        | Guarantees |
|------------------------|--------------------------------|------------|
| Replay                 | Local UI state                 | Undo/redo preserves global invariants |
| Authority              | Client–server                  | State always satisfies invariants |
| Multi-Collaboration    | Client–server, offline clients | State satisfies invariants; Anchor-based moves, candidate fallback, minimal rejection |
| Effect State Machine   | Client-side effect orchestration | Bounded retries, mode consistency, pending preservation, no silent data loss |
| Multi-Project          | Cross-project operations         | Per-project invariant preservation, pending preservation, bounded retries |

### List of Apps

| App         | Domain                    | Key Guarantees |
|-------------|---------------------------|----------------|
| Kanban      | Task board                | Exact card partition (no duplication/loss), WIP limits respected |
| Canon       | Diagram constraint solver | Valid node/edge references, constraint integrity, undo/redo support |
| ColorWheel  | Color palette generator   | Colors satisfy mood constraints (S/L bounds), hues follow harmony patterns |
| ClearSplit  | Expense splitting         | Conservation of money (sum of balances = 0), delta laws for expenses/settlements |
| CollabTodo  | Collaborative task lists  | Task uniqueness per list, exact partition, membership constraints, soft delete semantics |

---

## List of Kernels

### The Replay Kernel

Architecture:
```
Abstract Domain (spec)
        ↓ refined by
Concrete Domain (Model, Action, Inv, Apply, Normalize)
        ↓ plugged into
Replay Kernel (generic, proved once)
        ↓ compiled to JS
AppCore (React-facing API)
```

The kernel maintains:

```text
History = { past, present, future }
```

and provides:

* `Do(action)`
* `Undo`
* `Redo`

It is proved *once* that replay preserves the domain invariant.

### Domain obligation (the only proofs you owe)

For a given domain, you must prove:

```text
Inv(Init())
Inv(m) ⇒ Inv(Normalize(Apply(m, action)))
```

After that, **undo/redo correctness is automatic**.

---

## The Authority Kernel

<details>
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

This kernel is intentionally minimal: it models a single authoritative state and versioned protocol. The Multi-Collaboration kernel generalizes it with rebasing and candidate fallback for handling stale clients.
</details>

---

## The Multi-Collaboration Kernel

<details>
<summary>A kernel for server-authoritative collaboration with offline clients.</summary>

See also the [MULTICOLLAB](MULTICOLLAB.md) design note.
See also the [SUPABASE](SUPABASE.md) design note for how this kernel can contribute the project model and the server reconciliation in a setup where Supabase contributes user management, database, and realtime.

Clients may submit actions based on stale versions. The server reconciles each action against the intervening history using a domain-defined function, then either accepts it (updating the authoritative log) or rejects it.

All accepted states are proved to satisfy the domain invariant.

The multi-collaboration kernel (`MultiCollaboration.dfy`) provides:

* **Anchor-based placement**: Instead of positional indices, moves use `Place` (AtEnd, Before, After) to express intent relative to other cards. This is more robust to concurrent edits.

* **Candidate fallback**: When an anchor is missing (e.g., moved or deleted by another client), the server tries a list of fallback candidates (e.g., AtEnd) before rejecting.

* **Minimal rejection**: The server rejects a request only if no interpretation within the domain's declared intent envelope would succeed. For MoveCard, the server tries three candidates: original placement, AtEnd, and Before(first). Lemma `BeforeFirstImpliesAtEnd` proves Before(first) is redundant—if it succeeds, AtEnd also succeeds. This justifies defining `Explains` to cover only origPlace and AtEnd, and the kernel proves dispatch rejects only when both would fail.

* **Server-allocated IDs**: Card IDs are allocated by the server (via `nextId`), eliminating client-side ID conflicts.

* **Real invariants**: A comprehensive 7-part invariant covering column uniqueness, lane/WIP consistency, card existence, no duplicates, WIP limits, and allocator freshness.

The kernel is designed for domains where "intent" matters more than exact positioning, mirroring a common pattern in collaborative editors (e.g. Google Docs): preserve intent when possible, fall back deterministically, and reject only when no reasonable interpretation exists.

- See the app kanban-multi-collaboration/ for an example with a non-persistent server.
- See the app kanban-supabase/ for an example with user management and database persistence via Supabase.
</details>

---

## The Effect State Machine

<details>
<summary>A verified model of client-side effect orchestration.</summary>

See also the [SUPABASE](SUPABASE.md) design note for how this kernel integrates with Supabase.

The Effect State Machine (`EffectStateMachine.dfy`) models the client-side logic that governs:

* **When to flush** pending actions to the server
* **How to handle responses** (accept, conflict, reject)
* **Offline/online transitions** with automatic retry on reconnection
* **Bounded retry logic** to prevent infinite loops

The state machine maintains:

```text
EffectState = { network, mode, client, serverVersion }
```

where `network` is `Online | Offline`, `mode` is `Idle | Dispatching(retries)`, and `client` is the verified `ClientState` from MultiCollaboration.

Events include user actions, dispatch responses, network errors, and manual offline toggles. Each event produces a new state and an optional command (e.g., `SendDispatch`, `FetchFreshState`).

**Key invariants:**

1. **Mode consistency**
   If dispatching, there must be pending actions.

2. **Bounded retries with eventual retry**
   Immediate retries bounded by `MaxRetries` (default 5). After max retries, goes idle; next Tick retries with fresh count. This provides bounded hammering + persistent eventual success.

3. **Invariant preservation**
   All state transitions preserve the invariant.

4. **Pending preservation**
   Pending actions are never lost. On accept/reject, exactly one action is removed and the rest are preserved in order (`pending' == pending[1..]`).

**Key properties proved:**

* `RetriesAreBounded` — retries never exceed the maximum
* `TickStartsDispatch` — if online, idle, and has pending, a Tick starts dispatch
* `MaxRetriesLeadsToIdle` — exceeding max retries transitions to Idle
* `StepPreservesInv` — all transitions preserve the invariant
* `PendingNeverLost` — pending actions are never arbitrarily lost; at most one removed per event
* `PendingSequencePreserved` — on accept/reject: `pending' == pending[1..]` (exact sequence equality)
* `ConflictPreservesPendingExactly` — on conflict: `pending' == pending` (nothing lost)
* `UserActionAppendsExact` — on user action: `pending' == pending + [action]`

**System properties proved** (in `EffectSystemProperties.dfy`):

* `NoSilentDataLoss` — every action in pending either stays in pending or is explicitly processed (accepted/rejected); actions never silently disappear
* `UserActionEntersPending` — user actions are guaranteed to enter the pending queue
* `FIFOProcessing` — actions are processed in order; only the first pending action can leave
* `OnlineIdlePendingMakesProgress` — system makes progress when online with pending actions

The JS layer only handles I/O (network calls, browser events) and converts responses to events that feed back into the verified `Step` function.

See kanban-supabase/ for a complete example using the Effect State Machine with Supabase.
</details>

---

## The Multi-Project Kernel

<details>
<summary>A kernel for cross-project operations that builds on Multi-Collaboration.</summary>

See the [MULTIPROJECT](MULTIPROJECT.md) design note and [MULTIPROJECT_SUPABASE](MULTIPROJECT_SUPABASE.md) for Supabase integration details.

The Multi-Project kernel (`MultiProject.dfy`) is an abstract module that extends the Multi-Collaboration kernel to support operations spanning multiple projects (e.g., MoveTaskTo, CopyTaskTo). Concrete domains refine this module to add domain-specific cross-project actions.

**Key insight:** The action itself declares which projects it touches via `TouchedProjects(action)`.

**Data structures:**
* `MultiModel` — map from project IDs to individual project models
* `MultiAction` — actions that can span projects (Single, MoveTaskTo, CopyTaskTo)
* `MultiClientState` — tracks versions per-project, not globally

**Core functions:**
* `TouchedProjects(action)` — returns set of project IDs the action affects
* `MultiStep(mm, action)` — applies action; returns `Ok(newModel)` or `Err`
* `MultiRebase` — rebases action through concurrent changes per project

**Domain obligation (must be proved by each concrete multi-project domain):**

```text
MultiInv(mm) ∧ MultiStep(mm, a) = Ok(mm′) ⇒ MultiInv(mm′)
```

Where `MultiInv(mm)` means every project in `mm` satisfies its individual invariant.

**Kernel-proved properties (assuming the domain discharges its obligation):**

*MultiProjectEffectStateMachine.dfy* proves:
* `StepPreservesInv` — all state transitions preserve the effect state invariant
* `PendingNeverLost` — pending actions are never arbitrarily lost
* `RealtimeUpdatePreservesPendingExactly` — realtime updates preserve pending exactly
* `ConflictPreservesPendingExactly` — conflicts preserve pending exactly
* `PendingSequencePreserved` — on accept/reject: `pending' == pending[1..]`
* `RetriesAreBounded` — retries never exceed MaxRetries
* `UserActionAppendsExact` — user actions append exactly the action to pending

**Architectural properties (unverified, trusted):**

The architecture uses the verified functions but adds unverified components:

* **Server atomicity**: The database layer (`save_multi_update`) wraps updates in a single PostgreSQL transaction with optimistic locking. If any version check fails, the entire transaction rolls back.

* **Realtime propagation**: Supabase Realtime sends per-row notifications separately. A cross-project operation updating two projects produces two events that arrive independently—clients may briefly see inconsistent state until both arrive.

* **Edge function glue**: The edge function calls `MultiStep` and writes results to the database. This orchestration code is unverified.

See collab-todo/ for a complete example using the Multi-Project kernel with Supabase.
</details>

---

## List of Apps/Domains

### Toy domain (counter)

<details>
<summary>A minimal sanity check:</summary>

* `Model = int`
* invariant: `m ≥ 0`

>Useful for bootstrapping the pipeline.

See counter/ and counter-authority/.
</details>

### Kanban board (non-trivial)

<details>
<summary>A realistic, non-local domain with:</summary>

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

See kanban/ (replay kernel) and kanban-multi-collaboration/ and kanban-supabase/ (both multi-collaboration kernel).
</details>

### Delegation Auth (capability delegation)

<details>
<summary>A permission system with transitive capability delegation:</summary>

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
</details>

### Canon (diagram constraint solver)

<details>
<summary>A visual diagram editor with geometric constraints:</summary>

* nodes with (x, y) positions,
* directed edges between nodes,
* alignment constraints (horizontal/vertical),
* even-spacing constraints,
* automatic constraint solver (canonicalization).

**Key invariants:**

1. **Referential integrity**
   All constraints and edges reference only existing nodes.
2. **Constraint ID freshness**
   Constraint IDs are always less than the allocator counter.
</details>

### ColorWheel (color palette generator)

<details>
<summary>A verified color palette generator that enforces mood and harmony constraints by construction.</summary>

**Of note**:
* This app separates the spec from the proof for the purpose of ensuring that the LLM is not independently making edits to the spec in order for the proof to go through. A change to the spec was made so that proofs could complete, but it was approved by the user first. 
* This app includes a helpful file `PROVED.md` which shows what implementations were actually proven and which were shipped as is. 

**Model:**
* Base hue (0-359, the anchor for harmony calculations)
* Mood (Vibrant, SoftMuted, Pastel, DeepJewel, Earth, Neon, or Custom)
* Harmony (Complementary, Triadic, Analogous, SplitComplement, Square, or Custom)
* Colors (always exactly 5 HSL colors)
* Adjustment mode (Linked or Independent) —
* Contrast pair (foreground/background indices) — *incomplete in UI*

**Key invariants:**

1. **Mood Satisfaction**
   All 5 colors satisfy the current mood's saturation/lightness bounds (e.g., Vibrant requires S >= 70, 40 <= L <= 60). When a color violates bounds, the system auto-transitions to Custom mood.

2. **Harmony Coherence**
   Hues follow the selected harmony pattern relative to the base hue (e.g., Complementary produces hues at H and H+180). When a hue deviates, the system auto-transitions to Custom harmony.

3. **Graceful Degradation**
   Adjustments that would break constraints automatically fall back to Custom mode rather than failing—the palette always remains valid.
</details>

### ClearSplit (expense splitting)

<details>
<summary>A verified expense-splitting application with mathematically guaranteed conservation of money.</summary>

**Model:**
* Members (group participants)
* Expenses (payer, amount, shares per participant)
* Settlements (payments between members)

**Key invariants and theorems:**

1. **Conservation Theorem**
   The sum of all balances is always zero—money cannot appear or disappear.

2. **AddExpense Delta Law**
   When an expense is added:
   * Payer's balance increases by amount (minus their share if they're a participant)
   * Each participant's balance decreases by their share
   * All other balances unchanged

3. **AddSettlement Delta Law**
   When a settlement is recorded:
   * Payer's balance increases by amount (they owe less)
   * Recipient's balance decreases by amount (they are owed less)
   * All other balances unchanged

4. **ExplainSumsToBalance**
   A person's balance equals the sum of all their transaction deltas—providing an auditable history.

**Architecture:**

The code is structured as an abstract specification module (`ClearSplitSpec`) containing user-facing types, predicates, and theorem signatures, refined by an implementation module (`ClearSplit`) containing all helper lemmas and proofs.
</details>

### CollabTodo (collaborative task lists)

<details>
<summary>A verified collaborative todo application with projects, lists, and tasks.</summary>

**Model:**
* Projects (Personal or Collaborative mode)
* Lists (ordered, unique names per project)
* Tasks (belong to exactly one list, unique titles per list)
* Tags (project-scoped, attachable to tasks)
* Soft delete with restore capability

**Key invariants:**

1. **Exact partition**
   Every non-deleted task exists in exactly one list (no orphans, no duplicates).

2. **Unique list names**
   List names are unique within a project (case-insensitive).

3. **Unique task titles per list**
   Task titles are unique within each list (case-insensitive).

4. **Membership constraints**
   Task assignees must be project members; owner always in members; personal projects have exactly one member.

5. **Referential integrity**
   Tags referenced by tasks must exist; allocators are fresh.

6. **Valid dates**
   All due dates are valid calendar dates.

**Conflict resolution:**
Uses anchor-based placement with candidate fallback for concurrent edits. DeleteTask conflicts honor the delete, with soft-delete enabling restore.

**Architecture:**
Uses the Multi-Project kernel (see [MULTIPROJECT.md](MULTIPROJECT.md)) for cross-project operations (MoveTaskTo, CopyTaskTo). Integrates with Supabase for user management, database persistence, and realtime updates (see [MULTIPROJECT_SUPABASE.md](MULTIPROJECT_SUPABASE.md)).

See collab-todo/ for the full implementation.
</details>

---

## Why this is interesting

Using AI for code generation today means choosing between blind trust and heavy supervision. We want a third option: reduce the surface area of human review while increasing trust in correctness. `dafny-replay` demonstrates this approach with UI state:

* The human expresses intent in natural language
* The LLM generates a formal spec
* The human reviews and approves the spec (the only review required)
* The LLM writes implementations, automatically verified against the spec
* All final implementations are mathematically guaranteed to satisfy the spec

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
cd counter           # counter
cd kanban            # Kanban board
cd delegation-auth   # capability delegation
cd counter-authority # counter with client-server protocol
cd kanban-multi-collaboration  # kanban with multi-collaboration
cd kanban-supabase   # kanban with supabase (requires setup)
cd canon             # Canon diagram builder
cd colorwheel        # color wheel app
cd clear-split       # ClearSplit app
cd clear-split-supabase # clear-split with supabase (requires setup)
cd collab-todo       # CollabTodo app (requires supabase setup)
npm install
npm run dev
```

---

See [HOWTO.md](HOWTO.md) for a walkthrough of how to build a Dafny-verified React app.

See [INTEGRATION.md](INTEGRATION.md) for notes on integrating Dafny-compiled JavaScript into a JavaScript codebase.

---

## What this is not

* Not a UI framework
* Not a CRDT library
* Not a security or authentication framework
* Not optimized for performance

This is an experimental methodology that ensures **correctness by construction** for application state.

---

## Status

* ✔ Generic replay kernel proved
* ✔ Generic authority kernel for client–server architectures proved
* ✔ Generic multi-collaboration kernel for client–server architectures proved
* ✔ Generic effect state machine for client-side orchestration proved
* ✔ JavaScript compilation
* ✔ React integration
* ✔ Supabase integration (experimental)

