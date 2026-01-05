# TodoMultiCollaboration Verification Status

**Final Result: 120 verified, 0 errors** (TodoMultiCollaboration.dfy)

Additional verifications:
- TodoMultiProjectDomain.dfy: 34 verified, 0 errors
- TodoMultiCollaborationSanity.dfy: 29 verified, 0 errors

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

| Lemma | Helper Lemmas Used |
|-------|-------------------|
| `AddListPreservesInv` | Sequence helpers |
| `RenameListPreservesInv` | None |
| `DeleteListPreservesInv` | `DeleteListPreservesInvF` |
| `MoveListPreservesInv` | `MoveListPreservesInvCount`, `MoveListPreservesInvF` |
| `AddTaskPreservesInv` | Counting helpers |
| `EditTaskPreservesInv` | None |
| `DeleteTaskPreservesInv` | Counting helpers |
| `RestoreTaskPreservesInv` | Counting helpers |
| `MoveTaskPreservesInv` | Counting helpers |
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

## Helper Lemmas (fully verified)

These lemmas handle complex map comprehension and counting reasoning:

| Lemma | Purpose |
|-------|---------|
| `CountInListsHelper_RemoveFirst` | Removing list from sequence reduces count by its contribution |
| `CountInListsHelper_InsertAt` | Inserting list into sequence adds its contribution |
| `CountInListsHelper_MovePreserves` | Moving a list (remove+insert) preserves counts |
| `DeleteListPreservesInvF` | List IDs < nextListId after delete |
| `MoveListPreservesInvCount` | Task counts preserved after MoveList |
| `MoveListPreservesInvF` | List IDs < nextListId after move |
| `MoveListPreservesInvF_Helper` | Helper for list ID bounds after move |

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
| `CandidatesComplete` | Meaning-preservation for conflict resolution (candidates sequence contains valid fallback) |
| Generated JS matches Dafny semantics | Dafny-to-JS translation trusted, not formally verified |
| UI correctly calls spec functions | Runtime integration not verified |
| Edge function authorization | `CheckAuthorization` logic verified, but network layer trusted |

## Proof Strategy

Unlike ColorWheel which uses a `Normalize` repair function, TodoDomain's `TryStep`:
- Validates preconditions and returns `Err` on failure
- Directly produces valid output (no post-normalization)
- Idempotent operations return `Ok(m)` unchanged

The invariant is preserved by construction in each action case. Complex proofs for `CountInLists` reasoning use helper lemmas to guide Dafny's SMT solver through map comprehension and sequence reasoning.

### Invariant D Proof Approach

The counting invariant (each task appears in exactly one list) is proven via:
1. **Addition**: Fresh IDs ensure new tasks start with count=1
2. **Deletion**: `CountInListsHelper_HasTwo` proves contradiction if task were in two lists
3. **Movement**: Remove from source + insert at destination preserves count=1

### Multi-Project Domain (34 verified, 0 errors)

TodoMultiProjectDomain.dfy verifies cross-project operations with no axioms:

| Lemma | Description |
|-------|-------------|
| `MultiStepPreservesInv` | MoveTaskTo, CopyTaskTo, MoveListTo preserve invariant |
| `RemoveTaskFromProjectPreservesInv` | Delegates to single-project DeleteTask proof |
| `AddTaskToProjectPreservesInv` | Chain of AddTask, EditTask, Star, Complete, SetDueDate |
| `AddTasksToListPreservesInv` | Recursive proof for adding multiple tasks |
| `AddListWithTasksPreservesInv` | AddList + AddTasksToList combined |
