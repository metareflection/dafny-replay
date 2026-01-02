# Chat Log

This document summarizes design sessions for the collaborative Todo app.

---

## Session #1 - Initial Spec Design

**Date:** 2026-01-01

### Goals
Create a verified collaborative Todo app (like Things for macOS) using the dafny-replay framework, porting from the existing kanban-supabase project.

### Key Decisions Made

**Data Model:**
- Projects can be Personal or Collaborative
- Owner is immutable (transfer ownership deferred to LATER.md)
- Multiple assignees per task (set<UserId>)
- Tasks have: title, notes, completed, starred, dueDate, assignees, tags
- ListId is internal (nat), ListName is user-visible (string)
- Tags are project-scoped

**Soft Delete:**
- Tasks are soft-deleted (deleted flag + deletedBy + deletedFromList)
- RestoreTask restores to original list (falls back to first list if original deleted)
- DeleteList hard-deletes tasks (app layer warns user)

**Conflict Resolution (Rebase):**
- DeleteTask + local op on same task → NoOp (honor delete)
- RemoveMember + AssignTask to that member → NoOp
- MoveList + MoveList on same list → NoOp (remote wins)
- MoveTask conflicts → LWW for same task, degrade anchor for different tasks
- Other task operations → LWW

**Conflict Detection:**
- App layer compares orig vs rebased action
- If rebased == NoOp && orig != NoOp → conflict caused action to drop
- App layer responsible for notifications

**Date Validation:**
- ValidDate predicate with leap year support
- year >= 1970, valid month (1-12), valid day for month
- Timezone handling at app layer

### Files Created/Modified

| File | Status |
|------|--------|
| `TodoMultiCollaboration.dfy` | Created - main verified spec |
| `docs/PORT-PLAN.md` | Created - porting guide from Kanban |
| `docs/DESIGN.md` | Created - natural language spec |
| `docs/LATER.md` | Created - deferred features |
| `docs/CHAT.md` | Created - this file |

### Spec Verification
- **22 verified, 0 errors**
- Proof stubs use `assume {:axiom}` (proofs deferred)

### Open Items for Next Session
1. Build the JS adapter (`src/dafny/app.js`)
2. Build the React UI (`src/App.jsx`)
3. Update Supabase schema (`supabase/schema.sql`)
4. Update Edge Function bundle (`supabase/functions/dispatch/`)

### Questions Resolved
1. RestoreTask target → Original list (tracked in deletedFromList)
2. DeleteList behavior → Hard delete with app-layer warning
3. Conflict notifications → App layer detects via orig/rebased comparison
4. Permanent deletion → Deferred to LATER.md

---

## Session #2 - Proof Completion

**Date:** 2026-01-01

### Goals
Complete Dafny proofs for invariant preservation across all actions, particularly the complex list/task counting invariants.

### Work Completed

**DeleteListPreservesInv:**
- Proved invariants A, B, C, D, D' fully
- Added `SeqMembershipEquivSeqContains` lemma to connect `x in s` to `SeqContains(s, x)`
- Added `CountInListsHelper_HasTwo` lemma for proof by contradiction (task in two lists → count ≥ 2)
- Created `DeleteListPreservesInvF` axiom for invariant F (Dafny SMT limitation with forall over RemoveFirst)

**MoveListPreservesInv:**
- Proved invariants A, B, C fully
- Created `MoveListPreservesInvCount` axiom for D/D' (list reordering doesn't change counts)
- Created `MoveListPreservesInvF` axiom for invariant F

**Helper Lemmas Added:**
- `CountInLists_AfterRemoveList` - count unchanged for tasks not in removed list
- `CountInListsHelper_RemoveList` - recursive helper for list removal
- `CountInListsHelper_TasksSubset` - count unchanged when using subset of tasks map

### Final Verification Status
- **89 verified, 0 errors**
- 9 axiom helpers in proof file (SMT limitations with map comprehensions)
- 2 axioms in main spec (`Inv(m2)` in Step, `CandidatesComplete`)

### Key Technical Insights

**Why axioms were needed:**
1. **Map comprehension unification** - Dafny can't unify `map l | l in tasks :: RemoveFirst(tasks[l], id)` with a local variable bound to the same expression
2. **Forall over modified sequences** - Dafny struggles to connect `m2.lists` to `RemoveFirst(m.lists, listId)` in quantified contexts
3. **Count preservation across reordering** - Proving `CountInListsHelper` is order-independent requires induction Dafny doesn't find automatically

**Proof strategies used:**
- Proof by contradiction for uniqueness (task in two lists → count ≥ 2 → contradicts invariant D)
- Wrapper lemmas to avoid map comprehensions in postconditions
- Explicit type annotations (`: ListId`) to help Dafny's type inference

### Files Modified

| File | Changes |
|------|---------|
| `TodoMultiCollaborationProof.dfy` | Added ~200 lines of helper lemmas and completed preservation proofs |
| `docs/PROVED.md` | Updated to reflect 89 verified, documented all axioms |

### What "Trusted" Means

Discussed the three categories of unverified properties:
1. **CandidatesComplete** - Semantic equivalence of conflict-resolved actions (requires `assume {:axiom}`)
2. **Generated JS** - Dafny's `translate js` compiler is trusted, not verified
3. **UI integration** - Runtime code calling spec functions isn't verified by Dafny

### Open Items
1. Build JS adapter and React UI
2. Supabase schema and Edge Functions
3. (Optional) Prove remaining axioms with manual induction lemmas
