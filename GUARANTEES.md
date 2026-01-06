# GUARANTEES

This document states **exactly what is proved, what is assumed, and what is trusted** in `dafny-replay`.

It is written to avoid a common ambiguity in systems with formal components:

> **Verified code often runs inside unverified systems.**

Throughout this document:
- **Verified** means *proved in Dafny*.
- **Assumed / obligated** means *must be proved by each concrete domain* to instantiate a kernel.
- **Trusted (integration boundary)** means *not modeled or proved*, even though verified code may execute inside it.

The goal is to make clear **where proofs apply** and **where they stop**, without underselling the verified core.

---

## Notation

- `Model`, `Action` vary by domain
- `Inv : Model → bool` — domain invariant
- `Init : () → Model` — initial state constructor
- `Ok(_)` / `Err(_)` — result constructors
- `History = { past, present, future }`
- `ServerState = { version, present }`

---

## How to read the guarantees

For each kernel below we list:

1. **Domain obligations** — properties that *each concrete domain must prove* to use the kernel
2. **Kernel theorems** — properties proved *once* by the generic kernel, assuming the obligations
3. **Integration boundary (trusted)** — system-level behavior not modeled or proved

When something appears under “trusted,” it does **not** mean that the Dafny-generated logic inside it is unverified — only that the *end-to-end system behavior* of that component is not proved.

---

## Replay Kernel

**State space:** `History` over `Model`

### Domain obligations

Each domain must prove:

- (R1) `Inv(Init())`
- (R2) `Inv(m) ⇒ Inv(Normalize(Apply(m, a)))`

### Kernel theorems (proved once)

Assuming (R1–R2):

- (RK1) For all reachable histories `h`, `Inv(Present(h))` holds
- (RK2) `Do`, `Undo`, and `Redo` preserve `Inv` on the present state

In other words, **undo/redo and time travel cannot violate the invariant** once the domain obligations are discharged.

### Integration boundary (trusted)

- JavaScript runtime and Dafny → JS compilation
- UI wiring and rendering
- Persistence, serialization, and I/O

---

## Authority Kernel

**State space:** `ServerState = { version, present }`

### Domain obligations

Each domain must prove:

- (A1) `Inv(Init())`
- (A2) `Inv(m) ∧ TryStep(m, a) = Ok(m′) ⇒ Inv(m′)`

### Kernel theorems

Assuming (A1–A2):

- (AK1) For any protocol trace (arbitrary client behavior), the authoritative server state always satisfies `Inv`
- (AK2) Rejected requests leave server state unchanged

The kernel proves **server-side safety independent of client correctness**.

### Integration boundary (trusted)

- Networking, authentication, authorization
- Database persistence
- Concurrency beyond the modeled protocol
- JS/edge wiring

---

## Multi-Collaboration Kernel

**State space:** server-authoritative model + operation log + client state

### Domain obligations

Each domain must provide and prove:

- (MC1) `Inv(Init())`
- (MC2) `Inv(m) ∧ TryStep(m, a) = Ok(m′) ⇒ Inv(m′)`
- (MC3) Total rebasing and candidate interface:
  - `Rebase`
  - `Candidates`
  - `Explains`
  - `CandidatesComplete`

### Kernel theorems

Assuming (MC1–MC3):

- (MCK1) **Safety:** all accepted server states satisfy `Inv`
- (MCK2) **Intent-relative minimal rejection:**
  - if a request is rejected, then there exists no action `aGood` such that:
    - `Explains(rebased, aGood)` and
    - `TryStep(present, aGood) = Ok(_)`

This guarantee is **relative to the domain-defined intent envelope (`Explains`)**.

### Integration boundary (trusted)

- Ordering and delivery of realtime updates
- Database atomicity and transactions
- Edge / server orchestration *around* verified transitions
- Liveness beyond the modeled protocol

---

## Effect State Machine

**State space:**

```
EffectState = { network, mode, client, serverVersion }
```

### Assumptions

- The embedded `client` component itself satisfies the obligations of the client protocol kernel it instantiates

### Kernel theorems

- (ESM1) `StepPreservesInv` — all effect-state transitions preserve the invariant
- (ESM2) **Bounded retries** (`RetriesAreBounded`)
- (ESM3) **FIFO processing** of pending actions
- (ESM4) **Pending preservation**:
  - `pending' == pending` or
  - `pending' == pending[1..]` (exact sequence preservation)

### System-level properties (proved)

- `NoSilentDataLoss`
- `UserActionEntersPending`
- `FIFOProcessing`
- `OnlineIdlePendingMakesProgress`

### Integration boundary (trusted)

- Mapping browser/network events to effect-machine events
- Actual I/O execution of commands
- End-to-end liveness assumptions

---

## Multi-Project Kernel

**State space:** multi-project model + per-project client state + effect orchestration

### Domain obligations

Each concrete multi-project domain must prove:

```
MultiInv(mm) ∧ MultiStep(mm, a) = Ok(mm′) ⇒ MultiInv(mm′)
```

where:

```
MultiInv(mm) ≜ ∀pid ∈ dom(mm.projects). Inv(mm.projects[pid])
```

### Kernel theorems

Assuming the obligation above:

- (MPK1) All effect-state invariants proved for the single-project Effect State Machine lift to the multi-project setting
- (MPK2) **Pending preservation across projects**:
  - pending actions are never silently lost
  - accept/reject removes exactly one action
  - conflicts preserve pending exactly
- (MPK3) **Bounded retries** and mode consistency

### Integration boundary (trusted)

- Atomic application of verified multi-project transitions to storage
- Realtime skew (partial arrival of multi-project updates)
- Edge-function orchestration *around* verified transitions
- Semantics of `TouchedProjects` beyond what is proved in the concrete domain

---

## Domain- and application-level guarantees (examples)

Kernels are generic: they prove *how* invariants are preserved.
Concrete domains determine *what* invariants mean by discharging the kernel obligations.

The table below summarizes representative domains in this repository and the
key invariants they prove, which are then preserved by the kernels that use them.

| Domain / App | Primary invariants proved by the domain | Kernels lifting these invariants |
|-------------|------------------------------------------|----------------------------------|
| **Counter** | Non-negativity (`m ≥ 0`) | Replay, Authority |
| **Kanban** | Exact card partition (no duplication or loss); per-column WIP limits | Replay, Multi-Collaboration, Effect State Machine |
| **Canon** | Referential integrity of nodes/edges/constraints; allocator freshness | Replay |
| **ColorWheel** | Mood bounds (S/L ranges); harmony coherence; graceful degradation to `Custom` | Replay |
| **ClearSplit** | Conservation of money (sum of balances = 0); delta laws for expenses and settlements | Replay, Multi-Collaboration, Effect State Machine |
| **Delegation Auth** | Referential integrity of grants/delegations; freshness of delegation IDs | Replay |
| **CollabTodo** | Exact task partition; unique list names; membership constraints; referential integrity; soft-delete semantics | Multi-Project, Effect State Machine |

In all cases, these invariants are **proved at the domain level** and then
**preserved automatically** by the kernels listed, assuming the corresponding
domain obligations are discharged.

---

## How to interpret these guarantees

This document draws a **precise boundary** around what is proved and what is not.

**What *is* claimed:**

> If a concrete domain discharges the stated obligations, then **all kernel theorems apply to the Dafny-generated transition logic**, independent of where that logic executes (CLI, browser, server, or edge function).

In particular:
- invariants proved at the domain level are preserved by kernel transitions,
- protocol and effect-machine properties hold for the verified state machines,
- rejection and retry guarantees are exactly those stated by the kernels.

**What is *not* claimed:**

- that the entire application or deployment is verified end-to-end,
- that networking, databases, realtime delivery, or authentication are correct,
- that the specifications themselves are complete or free of modeling error.

Verified transition logic may run inside larger unverified systems; the guarantees apply **to the logic itself**, not to the surrounding infrastructure.

This separation is intentional: it keeps the verified core small, reusable, and auditable, while making the trust boundary explicit.
