# TodoMultiCollaboration Verification Status

## Proven (Dafny-verified)

| Property | Location | Description |
|----------|----------|-------------|
| `InitSatisfiesInv` | TodoMultiCollaborationProof.dfy | `Inv(Init())` - empty model satisfies invariant |
| `NoDupSeqAppend` | TodoMultiCollaborationProof.dfy | Appending fresh element preserves no-duplicates |
| `RemoveFirstPreservesNoDup` | TodoMultiCollaborationProof.dfy | Removing element preserves no-duplicates |
| `RemoveFirstSeqContains` | TodoMultiCollaborationProof.dfy | SeqContains behavior after RemoveFirst |
| `InsertAtPreservesNoDup` | TodoMultiCollaborationProof.dfy | Inserting fresh element preserves no-duplicates |
| `CheckNoOps` | TodoMultiCollaborationSanity.dfy | All NoOp cases are enumerated (completeness) |
| `NoOpImpliesUnchanged` | TodoMultiCollaborationSanity.dfy | Enumerated cases are indeed NoOps (soundness) |

## Partially Proven (with axiom stubs)

| Property | Location | Proven Parts | Stubbed Parts |
|----------|----------|--------------|---------------|
| `AddListPreservesInv` | Proof.dfy | Fresh ID, NoDup preserved | Map domain reasoning |
| `DeleteListPreservesInv` | Proof.dfy | NoDup preserved, map domain | Task counting invariant D |
| `MoveListPreservesInv` | Proof.dfy | NoDup after remove+insert | Set equality reasoning |
| `AddTaskPreservesInv` | Proof.dfy | Fresh ID, NoDup in list | CountInLists invariant D |
| `DeleteTaskPreservesInv` | Proof.dfy | NoDup preserved in lists | Other tasks still count=1 |
| `RestoreTaskPreservesInv` | Proof.dfy | Idempotent case | Deleted tasks not in lists |
| `MoveTaskPreservesInv` | Proof.dfy | NoDup after remove | CountInLists invariant D |

## Trivially Preserved (no axiom needed)

| Action | Reason |
|--------|--------|
| `NoOp` | Model unchanged |
| `RenameList` | Only listNames map value changes |
| `EditTask` | Only task title/notes change |
| `CompleteTask` | Only completed flag changes |
| `UncompleteTask` | Only completed flag changes |
| `StarTask` | Only starred flag changes |
| `UnstarTask` | Only starred flag changes |
| `SetDueDate` | Only dueDate changes (validated) |
| `AssignTask` | Adds to assignees (member check in TryStep) |
| `UnassignTask` | Removes from assignees |
| `AddTagToTask` | Adds to tags (tag exists check in TryStep) |
| `RemoveTagFromTask` | Removes from tags |
| `CreateTag` | Fresh ID, no tasks reference it yet |
| `RenameTag` | Only tag name changes |
| `DeleteTag` | Removes from all tasks via helper |
| `MakeCollaborative` | Mode change, members unchanged |
| `AddMember` | Adds to members set |
| `RemoveMember` | Removes from members, clears assignments |

## Not Proven (shipped as-is)

| Property | Reason |
|----------|--------|
| Invariant D (`CountInLists == 1`) | Complex induction over list structure |
| Invariant B (map domains match lists) | Set comprehension reasoning |
| `CandidatesComplete` | Partial - meaning-preservation for Move actions |
| Generated JS matches Dafny semantics | Translation trusted, not verified |
| UI correctly calls spec functions | Runtime integration not verified |

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

## Key Axiom Dependencies

The stubbed proofs rely on these unproven properties:

1. **CountInLists reasoning**: After add/remove operations, counting tasks across lists changes predictably
2. **Set/map domain equality**: `forall l :: l in map <==> SeqContains(seq, l)` after sequence operations
3. **Deleted task invariant**: Deleted tasks are never in any list (implicit from DeleteTask behavior)

## Proof Strategy

Unlike ColorWheel which uses a `Normalize` repair function, TodoDomain's `TryStep`:
- Validates preconditions and returns `Err` on failure
- Directly produces valid output (no post-normalization)
- Idempotent operations return `Ok(m)` unchanged

The invariant is preserved by construction in each action case, but proving the counting invariant (D) requires induction over the list structure that Dafny needs additional helper lemmas to verify automatically.
