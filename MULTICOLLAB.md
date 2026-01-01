# Intent-Relative Reconciliation with Verified Minimal Rejection

## Motivation

Server-authoritative collaborative apps often accept requests from **stale clients** (offline edits, delayed sync). A client action may be incompatible with the server’s current state:

* the referenced anchor moved or disappeared,
* the exact position is no longer valid,
* global constraints (e.g., WIP limits) block the change.

A common engineering response is to **rebase** actions against the intervening history and either accept or reject. In practice, naïve rebasing can be **too coarse**, rejecting requests that could be merged by interpreting the user’s intent more flexibly.

This note describes a small verified kernel design that reduces unnecessary rejection while keeping correctness claims simple and provable.

## Setting

We focus on server-authoritative state machines with a global invariant:

* `Model` describes application state
* `Action` describes user requests
* `Inv(Model)` captures global semantic properties (e.g., partition invariants, WIP limits)
* `TryStep(Model, Action)` either succeeds with a new model or returns a domain error

We assume:

* the server maintains the canonical state and log of accepted actions,
* clients may submit actions based on stale versions,
* the server decides acceptance/rejection deterministically.

## Key idea

Separate *what the user meant* from *how it is realized* after rebasing.

Instead of requiring a single “correct” rebased action, we define:

1. **Rebasing as intent transformation**
   A total function `Rebase(remote, local)` that updates a local request assuming a remote action happened first, and a fold `RebaseThroughSuffix(historySuffix, request)`.

2. **An intent envelope (`Explains`)**
   A domain-defined relation `Explains(orig, cand)` describing which concrete actions count as meaning-preserving interpretations of a request for the purpose of correctness guarantees.

3. **A bounded candidate set (`Candidates`)**
   A small, finite list of candidate concrete actions the server will attempt in order.

The kernel tries candidates and accepts the first that succeeds; otherwise it rejects.

This design mirrors a common pattern in collaborative editors (e.g. Google Docs): preserve intent when possible, fall back deterministically, and reject only when no reasonable interpretation exists—here with a precise, verified reject boundary.

## Kernel interface

The domain provides:

* `TryStep(m,a): Result<Model,Err>`
* `Inv(m)`
* `StepPreservesInv`: success preserves invariant
* `Rebase(remote, local)` (total)
* `Candidates(m,a)` (finite)
* `Explains(orig,cand)` (ghost, semantics of "meaning-preserving")
* `CandidatesComplete`: completeness of candidates w.r.t. the intent envelope

The kernel provides both **server-side** and **client-side** operations:

**Server-side** (`ServerState`, `Dispatch`):
* `present: Model`
* `appliedLog: seq<Action>`
* `auditLog: seq<RequestRecord>`

**Client-side** (`ClientState`, verified optimistic updates):
* `ClientLocalDispatch`: optimistic update + pending queue
* `HandleRealtimeUpdate`: preserves pending actions when server updates arrive
* `ReapplyPending`: re-applies pending actions to new server model
* `FlushOne`, `FlushAll`: send pending actions to server

The server maintains:

* `present: Model`
* `appliedLog: seq<Action>`
* `auditLog: ...` (orig request, rebased request, chosen candidate, accept/reject)

Dispatch:

1. compute `rebased := RebaseThroughSuffix(appliedLog[baseVersion..], orig)`
2. compute `cs := Candidates(present, rebased)`
3. try candidates in order using `TryStep`
4. accept first success (append chosen to appliedLog), else reject

## Verified properties

### Safety (always)

If `Inv` holds in the server state before dispatch, it holds afterward.

This follows from:

* the kernel only transitions via successful `TryStep`,
* and the domain lemma `StepPreservesInv`.

### Intent-relative minimal rejection

The kernel proves a minimal rejection guarantee **relative to the domain’s intent envelope**:

> If the server rejects a request, then **no candidate within the intent envelope** would have succeeded.

Formally, for `rebased` as above:

* If there exists `aGood` such that:

  * `Explains(rebased, aGood)` and
  * `TryStep(present, aGood) = Ok(m2)`
* then `aGood` must appear in `Candidates(present, rebased)` (by `CandidatesComplete`)
* thus the candidate search will find a success and dispatch will not reject.

This gives a clean separation:

* the domain chooses the envelope (what “intent preserved” means),
* the kernel guarantees rejection happens only when that envelope is impossible to realize safely.

### Spec vs implementation

The candidate set may include additional heuristics beyond the intent envelope. These can improve UX (e.g., layout stability) without enlarging the proof surface.

The proof establishes a **lower bound on acceptance** (if any envelope interpretation works, the request won’t be rejected), while the implementation is free to be more permissive.

## Concrete instance: Kanban moves

In a Kanban board, “move card X to column Y” is the core intent; exact index positions are fragile under concurrency. We therefore model placement intent using anchors:

```
Place = AtEnd | Before(anchor) | After(anchor)
MoveCard(id, toCol, place)
```

A stale move is rebased against intervening accepted actions. Then the server tries a small candidate list, e.g.:

1. the rebased placement
2. a universal fallback (`AtEnd`)
3. a heuristic placement (`Before(first)`)

The **intent envelope** can be kept small and provable:

* “either the requested placement or `AtEnd` counts as meaning-preserving.”
  The third candidate is a heuristic and need not be in the envelope.

This yields a strong and understandable guarantee:

> A move request is rejected only if neither its intended placement nor a universal fallback placement (`AtEnd`) could be applied without violating invariants.

In practice, the heuristic candidate may produce a better ordering when the anchor is missing, while not affecting the proved rejection boundary.

## Design tradeoffs

* **Provability vs strength:**
  A larger intent envelope yields stronger “minimal rejection” guarantees but requires the domain to enumerate more admissible interpretations (often expensive or unbounded). A small envelope keeps specs and proofs manageable.

* **Determinism:**
  Deterministic candidate ordering yields stable canon and predictable replay, which matters for debugging and for UI state.

* **Domain-controlled semantics:**
  Global invariants remain entirely domain-defined; the kernel never encodes domain logic. The envelope mechanism exposes just enough “semantic wiggle room” for good collaboration behavior.

## Diagram

```
Client (stale)
   |
   |  (orig action, baseVersion)
   v
+------------------------------+
|        Server Dispatch       |
+------------------------------+
            |
            | rebase against intervening history
            v
     rebased intent
            |
            | enumerate finite candidates
            v
+------------------------------+
|   Candidates (ordered)       |
|                              |
|  1. rebased intent           |
|  2. universal fallback       |  <-- intent envelope
|  3. heuristic candidates     |  <-- outside proof
+------------------------------+
            |
            | try in order with TryStep
            v
     +------------------+
     |  first success?  |
     +------------------+
        |           |
       yes         no
        |           |
        v           v
+---------------+  Reject
|  Accept       |
|  - append log |
|  - update     |
|  - invariant  |
+---------------+
```

## Related Work

### Operational Transformation (OT).
OT systems rebase concurrent edits to preserve user intent, most famously in collaborative text editors such as Google Docs. While effective in practice, OT correctness arguments are typically informal, and rejection conditions are rarely specified or verified. Our work adopts a similar intent-preserving philosophy but makes the rejection boundary explicit and machine-checked.

### CRDTs.
Conflict-free Replicated Data Types guarantee convergence under concurrent updates, usually in peer-to-peer settings. They often weaken semantics (e.g. unordered sets, tombstones) to achieve commutativity. In contrast, our kernels remain server-authoritative, preserve rich global invariants, and focus on controlled reconciliation rather than symmetric convergence.

### Verified state machines and event sourcing.
Prior work on verified reducers and event-sourced systems establishes safety by proving stepwise invariant preservation. dafny-replay extends this line of work to interactive and collaborative settings, showing how intent-relative reconciliation can be layered on top of a verified core without expanding the trusted base.

## Summary

We present a small, reusable verified kernel for server-authoritative collaboration with stale clients. The kernel preserves global invariants by construction and proves **intent-relative minimal rejection**: requests are rejected only when no meaning-preserving interpretation (as defined by the domain) could succeed. This structure supports practical, editor-like reconciliation strategies while keeping verification obligations small, modular, and domain-controlled.
