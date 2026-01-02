# TodoMultiCollaboration Verification Status

**Final Result: 89 verified, 0 errors**

## Proven (Dafny-verified)

### Core Lemmas

| Property | Location | Description |
|----------|----------|-------------|
| `InitSatisfiesInv` | TodoMultiCollaborationProof.dfy | `Inv(Init())` - empty model satisfies invariant |
| `StepPreservesInv` | TodoMultiCollaborationProof.dfy | Main theorem: all actions preserve invariant |

### Sequence Helper Lemmas

| Property | Description |
|----------|-------------|
| `NoDupSeqAppend` | Appending fresh element preserves no-duplicates |
| `RemoveFirstPreservesNoDup` | Removing element preserves no-duplicates |
| `RemoveFirstSeqContains` | SeqContains behavior after RemoveFirst |
| `InsertAtPreservesNoDup` | Inserting fresh element preserves no-duplicates |
| `SeqMembershipEquivSeqContains` | Connects `x in s` to `SeqContains(s, x)` |
| `CountInListsHelper_HasTwo` | Task in two distinct lists implies count >= 2 |

### Sanity Proofs

| Property | Location | Description |
|----------|----------|-------------|
| `CheckNoOps` | TodoMultiCollaborationSanity.dfy | All NoOp cases are enumerated (completeness) |
| `NoOpImpliesUnchanged` | TodoMultiCollaborationSanity.dfy | Enumerated cases are indeed NoOps (soundness) |

### Preservation Lemmas (all verified)

| Lemma | Axiom Helpers Used |
|-------|-------------------|
| `AddListPreservesInv` | None |
| `RenameListPreservesInv` | None |
| `DeleteListPreservesInv` | `DeleteListPreservesInvF` |
| `MoveListPreservesInv` | `MoveListPreservesInvCount`, `MoveListPreservesInvF` |
| `AddTaskPreservesInv` | None |
| `EditTaskPreservesInv` | None |
| `DeleteTaskPreservesInv` | `CountUnchangedAfterRemove_Wrapper`, `CountAfterRemoveAll_Wrapper` |
| `RestoreTaskPreservesInv` | None |
| `MoveTaskPreservesInv` | `CountAfterMoveTask_Wrapper`, `CountUnchangedAfterMoveTask_Wrapper` |
| `CompleteTaskPreservesInv` | None |
| `UncompleteTaskPreservesInv` | None |
| `StarTaskPreservesInv` | None |
| `UnstarTaskPreservesInv` | None |
| `SetDueDatePreservesInv` | None |
| `AssignTaskPreservesInv` | None |
| `UnassignTaskPreservesInv` | None |
| `AddTagToTaskPreservesInv` | None |
| `RemoveTagFromTaskPreservesInv` | None |
| `CreateTagPreservesInv` | None |
| `RenameTagPreservesInv` | None |
| `DeleteTagPreservesInv` | None |
| `MakeCollaborativePreservesInv` | None |
| `AddMemberPreservesInv` | None |
| `RemoveMemberPreservesInv` | None |

## Axiom Helpers (trusted)

These 9 lemmas are marked `{:axiom}` due to Dafny SMT limitations with map comprehensions and counting:

| Axiom | Purpose |
|-------|---------|
| `CountAfterRemoveAll` | After removing all occurrences of a task, count becomes 0 |
| `CountUnchangedAfterRemove` | Removing task from one list doesn't affect other task counts |
| `CountUnchangedAfterRemove_Wrapper` | Wrapper for map comprehension unification |
| `CountAfterRemoveAll_Wrapper` | Wrapper for map comprehension unification |
| `CountAfterMoveTask_Wrapper` | Task count unchanged after move (remove+insert) |
| `CountUnchangedAfterMoveTask_Wrapper` | Other task counts unchanged after move |
| `DeleteListPreservesInvF` | List IDs < nextListId after delete |
| `MoveListPreservesInvCount` | Task counts preserved after MoveList |
| `MoveListPreservesInvF` | List IDs < nextListId after move |

## Main Spec Axioms

These remain in `TodoMultiCollaboration.dfy`:

| Axiom | Location | Purpose |
|-------|----------|---------|
| `assume {:axiom} Inv(m2)` | Line 902 | Step function preserves invariant (proven in Proof.dfy) |
| `assume {:axiom} aGood in Candidates` | Line 907 | Candidates completeness for conflict resolution |

## NoOp Enumeration (Fully Verified)

The sanity file proves completeness of NoOp detection:

**Idempotent by Design:**
- DeleteList/Task/Tag on missing items
- RestoreTask on non-deleted task
- MakeCollaborative when already collaborative
- AddMember when already member
- RemoveMember when not member

**Zero-Effect Operations:**
- RenameList/Tag to same name
- EditTask with same title/notes
- SetDueDate with same date
- Complete/Uncomplete/Star/Unstar when already in that state
- Assign/Unassign when already assigned/unassigned
- AddTag/RemoveTag when already present/absent
- MoveList/MoveTask to same position

## Not Verified (trusted)

| Property | Reason |
|----------|--------|
| `CandidatesComplete` | Meaning-preservation for conflict resolution |
| Generated JS matches Dafny semantics | Translation trusted, not verified |
| UI correctly calls spec functions | Runtime integration not verified |

## Proof Strategy

Unlike ColorWheel which uses a `Normalize` repair function, TodoDomain's `TryStep`:
- Validates preconditions and returns `Err` on failure
- Directly produces valid output (no post-normalization)
- Idempotent operations return `Ok(m)` unchanged

The invariant is preserved by construction in each action case. Complex proofs for `CountInLists` reasoning use axiom helpers where Dafny's SMT solver cannot automatically unify map comprehensions.

### Invariant D Proof Approach

The counting invariant (each task appears in exactly one list) is proven via:
1. **Addition**: Fresh IDs ensure new tasks start with count=1
2. **Deletion**: `CountInListsHelper_HasTwo` proves contradiction if task were in two lists
3. **Movement**: Remove from source + insert at destination preserves count=1
