# GUARANTEES

This document precisely summarizes **what is formally proved** in `dafny-replay`, **what each kernel assumes from domains**, and **what lies outside the verified trust boundary**.

The goal is to make the obligation–guarantee structure explicit, so readers can clearly distinguish:

* properties proved *once* by generic kernels,
* obligations that *each concrete domain must discharge*, and
* architectural components that are intentionally **unverified**.

This file is intended as a reviewer-facing reference (e.g. for artifact evaluation or paper appendices).

---

## Notation

* `Model`, `Action` vary by domain
* `Inv : Model → bool` — domain invariant
* `Init : () → Model` — initial state constructor
* `Ok(_)` / `Err(_)` — result constructors
* `History = { past, present, future }`
* `ServerState = { version, present }`

---

## A. Kernel-level guarantees

Each kernel proves a generic safety theorem **assuming its domain discharges stated obligations**.

### Replay Kernel

**State space**: `History` over `Model`

**Domain obligations (must be proved by each domain):**

* (R1) `Inv(Init())`
* (R2) `Inv(m) ⇒ Inv(Normalize(Apply(m, a)))`

**Kernel theorem (proved once):**

* (RK) For all reachable histories `h`, `Inv(Present(h))` holds.
* `Do`, `Undo`, and `Redo` preserve `Inv` on the present state.

**Not proved / trusted boundary:**

* Correctness of Dafny → JavaScript compilation
* UI integration and rendering logic
* Any I/O, persistence, or serialization

---

### Authority Kernel

**State space**: `ServerState = { version, present }`

**Domain obligations:**

* (A1) `Inv(Init())`
* (A2) `Inv(m) ∧ TryStep(m, a) = Ok(m′) ⇒ Inv(m′)`

**Kernel theorem:**

* (AK) For any protocol trace (any client behavior), the server’s `present` state always satisfies `Inv`.
* Rejected requests leave server state unchanged.

**Not proved / trusted boundary:**

* Networking, authentication, persistence
* Concurrency beyond the modeled protocol
* JavaScript integration

---

### Multi-Collaboration Kernel

**State space**: server-authoritative model + log + client state (as defined by the kernel)

**Domain obligations:**

* (MC1) `Inv(Init())`
* (MC2) `Inv(m) ∧ TryStep(m, a) = Ok(m′) ⇒ Inv(m′)`
* (MC3) Total rebasing and candidate interface as required by the kernel:
  * `Rebase`
  * `Candidates`
  * `Explains`
  * `CandidatesComplete`

**Kernel theorems:**

* (MCK-Safety) All **accepted** server states satisfy `Inv`.
* (MCK-MinReject) **Intent-relative minimal rejection**:
  * If the kernel rejects a request, then there exists no `aGood` such that:
    * `Explains(rebased, aGood)` and
    * `TryStep(present, aGood) = Ok(_)`.

  (This relies on `CandidatesComplete`.)

**Not proved / trusted boundary:**

* Realtime delivery order or liveness
* Database atomicity or transactions
* Edge/orchestration code
* Any semantic claim stronger than the domain’s `Explains` envelope

---

### Effect State Machine

**State space**:

```
EffectState = { network, mode, client, serverVersion }
```

**Assumptions:**

* The embedded `client` component itself satisfies the obligations of the client protocol kernel it instantiates.

**Kernel theorems:**

* `StepPreservesInv` — all effect-state transitions preserve the invariant
* **Bounded retries** (`RetriesAreBounded`)
* **FIFO processing** of pending actions
* **Pending preservation**:
  * `pending' == pending`
  * or `pending' == pending[1..]` (exact sequence preservation)

**System-level properties (proved in `EffectSystemProperties.dfy`):**

* `NoSilentDataLoss`
* `UserActionEntersPending`
* `FIFOProcessing`
* `OnlineIdlePendingMakesProgress`

**Not proved / trusted boundary:**

* Correctness of I/O plumbing
* Mapping of browser/network events into effect-machine events
* Liveness beyond the stated progress lemmas

---

### Multi-Project Kernel

**State space**: multi-project model + per-project client state + effect orchestration

**Domain obligation (must be proved by each concrete multi-project domain):**

```
MultiInv(mm) ∧ MultiStep(mm, a) = Ok(mm′) ⇒ MultiInv(mm′)
```

where:

```
MultiInv(mm) ≜ ∀pid ∈ dom(mm.projects). Inv(mm.projects[pid])
```

**Kernel-proved properties (assuming the obligation above):**

* All effect-state invariants proven for the single-project Effect State Machine lift to the multi-project setting:
  * `PendingNeverLost`
  * `PendingSequencePreserved`
  * `ConflictPreservesPendingExactly`
  * `RealtimeUpdatePreservesPendingExactly`
  * `RetriesAreBounded`
  * `UserActionAppendsExact`

**Not proved / trusted boundary:**

* Cross-project database atomicity
* Realtime skew (partial arrival of multi-project updates)
* Edge-function orchestration
* Semantics of `TouchedProjects` beyond what is proved in the concrete domain

---

## B. Domain-level guarantees (examples)

Kernels are generic; **domains define the meaning of correctness** by discharging obligations.

| Domain | Invariants proved by the domain | Lifted by kernels to |
|------|--------------------------------|----------------------|
| Kanban | Exact card partition; WIP limits | Replay, Multi-Collaboration, Authority |
| Canon | Referential integrity; allocator freshness | Replay |
| ColorWheel | Mood bounds; harmony coherence; graceful degradation | Replay |
| ClearSplit | Conservation theorem; delta laws; explainability | Replay, Authority |
| CollabTodo | Partition; uniqueness; membership; referential integrity | Multi-Project + Effect SM |

---

## Summary

* **Kernels prove generic safety properties once**, parameterized by explicit domain obligations.
* **Domains own semantics** by proving that their transitions preserve invariants.
* **Higher-level kernels** (multi-collaboration, multi-project, effect SM) add protocol and orchestration guarantees *relative to domain-defined interfaces*.
* **Integration layers are explicitly unverified** and form a clear trust boundary.

This separation is intentional: it keeps proofs modular, reusable, and auditable.