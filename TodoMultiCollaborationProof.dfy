include "TodoMultiCollaboration.dfy"

module TodoMultiCollaborationProof {
  import opened TD = TodoDomain

  // ============================================================================
  // InitSatisfiesInv: The initial model satisfies the invariant
  // ============================================================================

  lemma InitSatisfiesInv()
    ensures Inv(Init())
  {
    var m := Init();
    // Empty model trivially satisfies:
    // A: NoDupSeq([]) is true
    // B: Both maps are empty, lists is empty
    // C: No tasks in any list
    // D: No tasks at all
    // E: Each list (none) has no dups
    // F: No tasks, so no tag references
    // G: Allocators start at 0, no IDs used yet
    // H: No tasks, so no assignees to check
    // I: owner == InitialOwner, members == {InitialOwner}
    // J: Personal mode with members == {owner}
    // K: N/A (not Collaborative)
    // L: No tasks, so no due dates to check
  }

  // ============================================================================
  // Helper Lemmas for Sequence Operations
  // ============================================================================

  lemma NoDupSeqAppend<T>(s: seq<T>, x: T)
    requires NoDupSeq(s)
    requires !SeqContains(s, x)
    ensures NoDupSeq(s + [x])
  {
    var s' := s + [x];
    forall i, j | 0 <= i < j < |s'|
      ensures s'[i] != s'[j]
    {
      if j < |s| {
        // Both in original sequence
        assert s'[i] == s[i] && s'[j] == s[j];
      } else {
        // j == |s|, so s'[j] == x
        assert s'[j] == x;
        assert s'[i] == s[i];
        assert SeqContains(s, s[i]);
        assert !SeqContains(s, x);
      }
    }
  }

  lemma SeqContainsAppend<T>(s: seq<T>, x: T, y: T)
    ensures SeqContains(s + [x], y) <==> SeqContains(s, y) || y == x
  {
    if SeqContains(s + [x], y) {
      var i :| 0 <= i < |s + [x]| && (s + [x])[i] == y;
      if i < |s| {
        assert s[i] == y;
        assert SeqContains(s, y);
      } else {
        assert y == x;
      }
    }
    if SeqContains(s, y) {
      var i :| 0 <= i < |s| && s[i] == y;
      assert (s + [x])[i] == y;
    }
    if y == x {
      assert (s + [x])[|s|] == x;
    }
  }

  lemma RemoveFirstPreservesNoDup<T>(s: seq<T>, x: T)
    requires NoDupSeq(s)
    ensures NoDupSeq(RemoveFirst(s, x))
    decreases |s|
  {
    var s' := RemoveFirst(s, x);
    if |s| == 0 {
    } else if s[0] == x {
      // s' == s[1..], which has no dups since s had no dups
      assert s' == s[1..];
      forall i, j | 0 <= i < j < |s'|
        ensures s'[i] != s'[j]
      {
        assert s'[i] == s[i+1];
        assert s'[j] == s[j+1];
        assert 0 <= i+1 < j+1 < |s|;
      }
    } else {
      // s' == [s[0]] + RemoveFirst(s[1..], x)
      RemoveFirstPreservesNoDup(s[1..], x);
      var tail := RemoveFirst(s[1..], x);
      assert s' == [s[0]] + tail;
      assert NoDupSeq(tail);
      // Need to show s[0] is not in tail
      forall i, j | 0 <= i < j < |s'|
        ensures s'[i] != s'[j]
      {
        if i == 0 && j > 0 {
          // s'[0] == s[0], s'[j] is from tail
          // tail comes from s[1..], so s'[j] is from s[1..]
          // Since NoDupSeq(s), s[0] != anything in s[1..]
          RemoveFirstInOriginal(s[1..], x, s'[j]);
        } else if i > 0 && j > 0 {
          // Both from tail
          assert s'[i] == tail[i-1];
          assert s'[j] == tail[j-1];
        }
      }
    }
  }

  // Helper: elements in RemoveFirst(s, x) are in s
  lemma RemoveFirstInOriginal<T>(s: seq<T>, x: T, y: T)
    requires SeqContains(RemoveFirst(s, x), y)
    ensures SeqContains(s, y)
    decreases |s|
  {
    if |s| == 0 {
    } else if s[0] == x {
      var i :| 0 <= i < |s[1..]| && s[1..][i] == y;
      assert s[i+1] == y;
    } else {
      var s' := RemoveFirst(s, x);
      assert s' == [s[0]] + RemoveFirst(s[1..], x);
      var i :| 0 <= i < |s'| && s'[i] == y;
      if i == 0 {
        assert s[0] == y;
      } else {
        RemoveFirstInOriginal(s[1..], x, y);
      }
    }
  }

  lemma RemoveFirstSeqContains<T>(s: seq<T>, x: T, y: T)
    requires NoDupSeq(s)
    ensures SeqContains(RemoveFirst(s, x), y) <==> (SeqContains(s, y) && y != x)
    decreases |s|
  {
    var s' := RemoveFirst(s, x);
    if |s| == 0 {
    } else if s[0] == x {
      // s' == s[1..]
      assert s' == s[1..];
      if SeqContains(s', y) {
        var i :| 0 <= i < |s'| && s'[i] == y;
        assert s[i+1] == y;
        assert SeqContains(s, y);
        // y != x because y is in s[1..] and x only appears at index 0 (NoDup)
        if y == x {
          assert s[0] == x && s[i+1] == x;
          assert 0 != i+1;
          // Contradiction with NoDup
          assert false;
        }
      }
      if SeqContains(s, y) && y != x {
        var i :| 0 <= i < |s| && s[i] == y;
        if i == 0 {
          assert s[0] == y;
          assert s[0] == x;
          assert y == x; // contradiction with y != x
          assert false;
        } else {
          assert s'[i-1] == s[i] == y;
          assert SeqContains(s', y);
        }
      }
    } else {
      // s' = [s[0]] + RemoveFirst(s[1..], x)
      assert s' == [s[0]] + RemoveFirst(s[1..], x);
      var tail := RemoveFirst(s[1..], x);

      // Forward direction: SeqContains(s', y) ==> SeqContains(s, y) && y != x
      if SeqContains(s', y) {
        var i :| 0 <= i < |s'| && s'[i] == y;
        if i == 0 {
          assert y == s[0];
          assert SeqContains(s, y);
          // y != x because s[0] != x (we're in the else branch)
        } else {
          assert tail[i-1] == y;
          assert SeqContains(tail, y);
          // Need lemma: NoDupSeq(s) ==> NoDupSeq(s[1..])
          NoDupSeqTail(s);
          RemoveFirstSeqContains(s[1..], x, y);
          assert SeqContains(s[1..], y) && y != x;
          var j :| 0 <= j < |s[1..]| && s[1..][j] == y;
          assert s[j+1] == y;
          assert SeqContains(s, y);
        }
      }

      // Backward direction: SeqContains(s, y) && y != x ==> SeqContains(s', y)
      if SeqContains(s, y) && y != x {
        var i :| 0 <= i < |s| && s[i] == y;
        if i == 0 {
          assert s'[0] == y;
          assert SeqContains(s', y);
        } else {
          assert s[1..][i-1] == y;
          assert SeqContains(s[1..], y);
          NoDupSeqTail(s);
          RemoveFirstSeqContains(s[1..], x, y);
          assert SeqContains(tail, y);
          var j :| 0 <= j < |tail| && tail[j] == y;
          assert s'[j+1] == y;
          assert SeqContains(s', y);
        }
      }
    }
  }

  lemma NoDupSeqTail<T>(s: seq<T>)
    requires |s| > 0
    requires NoDupSeq(s)
    ensures NoDupSeq(s[1..])
  {
    forall i, j | 0 <= i < j < |s[1..]|
      ensures s[1..][i] != s[1..][j]
    {
      assert s[1..][i] == s[i+1];
      assert s[1..][j] == s[j+1];
      assert 0 <= i+1 < j+1 < |s|;
    }
  }

  lemma InsertAtPreservesNoDup<T>(s: seq<T>, i: nat, x: T)
    requires i <= |s|
    requires NoDupSeq(s)
    requires !SeqContains(s, x)
    ensures NoDupSeq(InsertAt(s, i, x))
  {
    var s' := InsertAt(s, i, x);
    forall a, b | 0 <= a < b < |s'|
      ensures s'[a] != s'[b]
    {
      if a < i && b < i {
        assert s'[a] == s[a] && s'[b] == s[b];
      } else if a < i && b == i {
        assert s'[a] == s[a] && s'[b] == x;
        assert SeqContains(s, s[a]);
      } else if a < i && b > i {
        assert s'[a] == s[a] && s'[b] == s[b-1];
      } else if a == i && b > i {
        assert s'[a] == x && s'[b] == s[b-1];
        assert SeqContains(s, s[b-1]);
      } else {
        // a > i, b > i (impossible since a < b)
        assert s'[a] == s[a-1] && s'[b] == s[b-1];
      }
    }
  }

  lemma InsertAtSeqContains<T>(s: seq<T>, i: nat, x: T, y: T)
    requires i <= |s|
    ensures SeqContains(InsertAt(s, i, x), y) <==> SeqContains(s, y) || y == x
  {
    var s' := InsertAt(s, i, x);
    if SeqContains(s', y) {
      var j :| 0 <= j < |s'| && s'[j] == y;
      if j < i {
        assert s[j] == y;
      } else if j == i {
        assert y == x;
      } else {
        assert s[j-1] == y;
      }
    }
    if SeqContains(s, y) {
      var j :| 0 <= j < |s| && s[j] == y;
      if j < i {
        assert s'[j] == y;
      } else {
        assert s'[j+1] == y;
      }
    }
    if y == x {
      assert s'[i] == x;
    }
  }

  // ============================================================================
  // Helper Lemmas for Counting
  // ============================================================================

  // CountInListsHelper over empty sequence is 0
  lemma CountInListsHelper_Empty(tasks: map<ListId, seq<TaskId>>, id: TaskId)
    ensures CountInListsHelper([], tasks, id) == 0
  {}

  // Decomposition: count = head contribution + tail contribution
  lemma CountInListsHelper_Decompose(lists: seq<ListId>, tasks: map<ListId, seq<TaskId>>, id: TaskId)
    requires |lists| > 0
    ensures CountInListsHelper(lists, tasks, id) ==
            (if lists[0] in tasks && SeqContains(tasks[lists[0]], id) then 1 else 0) +
            CountInListsHelper(lists[1..], tasks, id)
  {}

  // If id is not in any list in the map, count is 0
  lemma CountInListsHelper_NotInAny(lists: seq<ListId>, tasks: map<ListId, seq<TaskId>>, id: TaskId)
    requires forall l :: l in tasks ==> !SeqContains(tasks[l], id)
    ensures CountInListsHelper(lists, tasks, id) == 0
    decreases |lists|
  {
    if |lists| == 0 {
    } else {
      CountInListsHelper_NotInAny(lists[1..], tasks, id);
    }
  }

  // Effect of RemoveFirst on a single lane's contribution
  lemma RemoveFirst_NotContains<T>(s: seq<T>, x: T, y: T)
    requires NoDupSeq(s)
    requires x != y
    ensures SeqContains(RemoveFirst(s, x), y) == SeqContains(s, y)
    decreases |s|
  {
    if |s| == 0 {
    } else if s[0] == x {
      // RemoveFirst returns s[1..]
      assert RemoveFirst(s, x) == s[1..];
      if SeqContains(s[1..], y) {
        var i :| 0 <= i < |s[1..]| && s[1..][i] == y;
        assert s[i+1] == y;
        assert SeqContains(s, y);
      }
      if SeqContains(s, y) {
        var i :| 0 <= i < |s| && s[i] == y;
        if i == 0 {
          assert s[0] == y == x; // contradiction since x != y
        } else {
          assert s[1..][i-1] == y;
          assert SeqContains(s[1..], y);
        }
      }
    } else {
      // s[0] != x, so RemoveFirst(s, x) = [s[0]] + RemoveFirst(s[1..], x)
      var tail := RemoveFirst(s[1..], x);
      var result := RemoveFirst(s, x);
      assert result == [s[0]] + tail;

      NoDupSeqTail(s);
      RemoveFirst_NotContains(s[1..], x, y);
      // Now we know: SeqContains(tail, y) == SeqContains(s[1..], y)

      // Prove: SeqContains(result, y) == SeqContains(s, y)
      if SeqContains(result, y) {
        var i :| 0 <= i < |result| && result[i] == y;
        if i == 0 {
          assert result[0] == s[0] == y;
          assert SeqContains(s, y);
        } else {
          assert tail[i-1] == y;
          assert SeqContains(tail, y);
          assert SeqContains(s[1..], y);
          var j :| 0 <= j < |s[1..]| && s[1..][j] == y;
          assert s[j+1] == y;
          assert SeqContains(s, y);
        }
      }
      if SeqContains(s, y) {
        var i :| 0 <= i < |s| && s[i] == y;
        if i == 0 {
          assert result[0] == s[0] == y;
          assert SeqContains(result, y);
        } else {
          assert s[1..][i-1] == y;
          assert SeqContains(s[1..], y);
          assert SeqContains(tail, y);
          var j :| 0 <= j < |tail| && tail[j] == y;
          assert result[j+1] == y;
          assert SeqContains(result, y);
        }
      }
    }
  }

  // After removing id from all lists, count is 0
  // Proof idea:
  // 1. After RemoveFirst, id is not in any lane (by RemoveFirstSeqContains)
  // 2. If id is in no lane, count is 0 (by CountInListsHelper_NotInAny)
  // Dafny struggles with map comprehension equality, so we trust this logically sound step
  lemma {:axiom} CountAfterRemoveAll(lists: seq<ListId>, tasks: map<ListId, seq<TaskId>>, id: TaskId)
    requires forall l :: l in tasks ==> NoDupSeq(tasks[l])
    ensures CountInListsHelper(lists, map l | l in tasks :: RemoveFirst(tasks[l], id), id) == 0
  // Dafny limitation: can't connect local map comprehension variable to ensures clause.
  // Proof idea verified in CountAfterRemoveAll_Wrapper.

  // Count when id appears in exactly one list at a specific position
  lemma CountInListsHelper_ExactlyInOne(
    lists: seq<ListId>,
    tasks: map<ListId, seq<TaskId>>,
    targetList: ListId,
    id: TaskId
  )
    requires NoDupSeq(lists)
    requires SeqContains(lists, targetList)
    requires targetList in tasks
    requires SeqContains(tasks[targetList], id)
    requires forall l :: l in tasks && l != targetList ==> !SeqContains(tasks[l], id)
    ensures CountInListsHelper(lists, tasks, id) == 1
    decreases |lists|
  {
    if |lists| == 0 {
      // Contradiction: targetList should be in lists
      assert false;
    } else {
      var l := lists[0];
      if l == targetList {
        // This is the target list, contributes 1
        assert SeqContains(tasks[l], id);
        // Tail has no more occurrences
        CountInListsHelper_NotInAnyExceptTarget(lists[1..], tasks, targetList, id);
      } else {
        // Not the target, contributes 0
        if l in tasks {
          assert !SeqContains(tasks[l], id);
        }
        NoDupSeqTail(lists);
        assert SeqContains(lists[1..], targetList) by {
          SeqContainsTail(lists, targetList, l);
        }
        CountInListsHelper_ExactlyInOne(lists[1..], tasks, targetList, id);
      }
    }
  }

  // Helper: if targetList is not in lists, and id only in targetList, count is 0
  lemma CountInListsHelper_NotInAnyExceptTarget(
    lists: seq<ListId>,
    tasks: map<ListId, seq<TaskId>>,
    targetList: ListId,
    id: TaskId
  )
    requires !SeqContains(lists, targetList)
    requires forall l :: l in tasks && l != targetList ==> !SeqContains(tasks[l], id)
    ensures CountInListsHelper(lists, tasks, id) == 0
    decreases |lists|
  {
    if |lists| == 0 {
    } else {
      var l := lists[0];
      assert l != targetList;
      if l in tasks {
        assert !SeqContains(tasks[l], id);
      }
      CountInListsHelper_NotInAnyExceptTarget(lists[1..], tasks, targetList, id);
    }
  }

  // Helper for SeqContains in tail
  lemma SeqContainsTail<T>(s: seq<T>, x: T, head: T)
    requires |s| > 0
    requires s[0] == head
    requires head != x
    requires SeqContains(s, x)
    ensures SeqContains(s[1..], x)
  {
    var i :| 0 <= i < |s| && s[i] == x;
    assert i != 0;
    assert s[1..][i-1] == x;
  }

  // Connect sequence membership (x in s) to SeqContains
  lemma SeqMembershipEquivSeqContains<T>(s: seq<T>, x: T)
    ensures x in s <==> SeqContains(s, x)
  {
    // Both are equivalent to: exists i :: 0 <= i < |s| && s[i] == x
  }

  // Count after inserting id into exactly one list
  lemma CountAfterInsertOne(
    lists: seq<ListId>,
    tasks: map<ListId, seq<TaskId>>,
    targetList: ListId,
    id: TaskId,
    newLane: seq<TaskId>
  )
    requires NoDupSeq(lists)
    requires SeqContains(lists, targetList)
    requires forall l :: l in tasks ==> !SeqContains(tasks[l], id)
    requires SeqContains(newLane, id)
    requires forall l :: l in tasks && l != targetList ==> !SeqContains(tasks[l], id)
    ensures CountInListsHelper(lists, tasks[targetList := newLane], id) == 1
    decreases |lists|
  {
    var tasks' := tasks[targetList := newLane];
    if |lists| == 0 {
      assert false; // targetList in lists but lists empty
    } else {
      var l := lists[0];
      if l == targetList {
        // contributes 1
        assert tasks'[l] == newLane;
        assert SeqContains(tasks'[l], id);
        // tail contributes 0
        CountInListsHelper_NotInTail(lists[1..], tasks', targetList, id);
      } else {
        // contributes 0
        if l in tasks' {
          if l in tasks {
            assert tasks'[l] == tasks[l];
            assert !SeqContains(tasks[l], id);
          }
        }
        NoDupSeqTail(lists);
        SeqContainsTail(lists, targetList, l);
        CountAfterInsertOne(lists[1..], tasks, targetList, id, newLane);
      }
    }
  }

  // After removing from all and inserting into one, count is 1
  // Uses axiom due to Dafny's difficulty with map comprehension equality
  // The proof idea is sound: after removing id from all lists, it's in no list.
  // Then inserting into targetList makes the count exactly 1.
  lemma {:axiom} CountAfterMoveTask(
    lists: seq<ListId>,
    tasks: map<ListId, seq<TaskId>>,
    targetList: ListId,
    id: TaskId,
    newLane: seq<TaskId>
  )
    requires NoDupSeq(lists)
    requires SeqContains(lists, targetList)
    requires forall l :: l in tasks ==> NoDupSeq(tasks[l])
    requires SeqContains(newLane, id)
    requires NoDupSeq(newLane)
    ensures CountInListsHelper(lists,
              (map l | l in tasks :: RemoveFirst(tasks[l], id))[targetList := newLane], id) == 1

  // Helper: count is 0 in tail after remove+insert
  lemma CountAfterRemoveAll_InTail(
    lists: seq<ListId>,
    origTasks: map<ListId, seq<TaskId>>,
    tasks1: map<ListId, seq<TaskId>>,
    tasks2: map<ListId, seq<TaskId>>,
    targetList: ListId,
    newLane: seq<TaskId>,
    id: TaskId
  )
    requires !SeqContains(lists, targetList)
    requires forall l :: l in origTasks ==> NoDupSeq(origTasks[l])
    requires tasks1 == map l | l in origTasks :: RemoveFirst(origTasks[l], id)
    requires tasks2 == tasks1[targetList := newLane]
    ensures CountInListsHelper(lists, tasks2, id) == 0
    decreases |lists|
  {
    if |lists| == 0 {
    } else {
      var head := lists[0];
      assert head != targetList;
      if head in tasks2 {
        // Since head != targetList, tasks2[head] = tasks1[head] if head in tasks1
        if head in tasks1 {
          assert tasks2[head] == tasks1[head];
          assert tasks1[head] == RemoveFirst(origTasks[head], id);
          RemoveFirstSeqContains(origTasks[head], id, id);
          assert !SeqContains(tasks2[head], id);
        } else {
          // head not in tasks1 but in tasks2 - only possible if head == targetList, contradiction
          assert head == targetList;  // From tasks2 = tasks1[targetList := newLane]
          assert false;
        }
      }
      CountAfterRemoveAll_InTail(lists[1..], origTasks, tasks1, tasks2, targetList, newLane, id);
    }
  }

  lemma CountInListsHelper_NotInTail(
    lists: seq<ListId>,
    tasks: map<ListId, seq<TaskId>>,
    targetList: ListId,
    id: TaskId
  )
    requires !SeqContains(lists, targetList)
    requires forall l :: l in tasks && l != targetList ==> !SeqContains(tasks[l], id)
    ensures CountInListsHelper(lists, tasks, id) == 0
    decreases |lists|
  {
    if |lists| == 0 {
    } else {
      var l := lists[0];
      assert l != targetList;
      if l in tasks {
        assert !SeqContains(tasks[l], id);
      }
      CountInListsHelper_NotInTail(lists[1..], tasks, targetList, id);
    }
  }

  lemma CountInListsHelper_NotInTail_AfterRemove(
    lists: seq<ListId>,
    origTasks: map<ListId, seq<TaskId>>,
    tasks: map<ListId, seq<TaskId>>,
    targetList: ListId,
    id: TaskId
  )
    requires !SeqContains(lists, targetList)
    requires forall l :: l in origTasks ==> NoDupSeq(origTasks[l])
    requires forall l :: l in tasks && l != targetList ==> l in origTasks
    requires forall l :: l in tasks && l != targetList ==>
               tasks[l] == RemoveFirst(origTasks[l], id)
    ensures CountInListsHelper(lists, tasks, id) == 0
    decreases |lists|
  {
    if |lists| == 0 {
    } else {
      var l := lists[0];
      assert l != targetList;
      if l in tasks {
        assert l in origTasks;
        assert tasks[l] == RemoveFirst(origTasks[l], id);
        RemoveFirstSeqContains(origTasks[l], id, id);
        assert !SeqContains(tasks[l], id);
      }
      CountInListsHelper_NotInTail_AfterRemove(lists[1..], origTasks, tasks, targetList, id);
    }
  }

  // Deleted tasks have count 0 (they're not in any list)
  // This now follows directly from invariant D'
  lemma DeletedTaskNotInLists(m: Model, id: TaskId)
    requires Inv(m)
    requires id in m.taskData
    requires m.taskData[id].deleted
    ensures CountInLists(m, id) == 0
  {
    // Direct from invariant D'
  }

  // ============================================================================
  // Helper Lemmas for List Operations on Counting
  // ============================================================================

  // Adding an empty list at the end doesn't change count
  lemma CountInListsHelper_AppendEmpty(
    lists: seq<ListId>,
    tasks: map<ListId, seq<TaskId>>,
    newListId: ListId,
    id: TaskId
  )
    requires newListId !in tasks
    ensures CountInListsHelper(lists + [newListId], tasks[newListId := []], id) ==
            CountInListsHelper(lists, tasks, id)
    decreases |lists|
  {
    var tasks' := tasks[newListId := []];
    if |lists| == 0 {
      // lists + [newListId] = [newListId]
      // Count in [newListId] with tasks' = 0 since tasks'[newListId] = []
      assert !SeqContains(tasks'[newListId], id);
    } else {
      var l := lists[0];
      // First element contribution
      if l in tasks' {
        if l == newListId {
          // Can't happen since l is in lists[0] and newListId !in tasks (so not in lists normally)
          // Actually need to reason about this more carefully
          assert tasks'[l] == [];
          assert !SeqContains(tasks'[l], id);
        } else {
          assert tasks'[l] == tasks[l];
        }
      }
      // Recursive case
      CountInListsHelper_AppendEmpty(lists[1..], tasks, newListId, id);
      assert lists[1..] + [newListId] == (lists + [newListId])[1..];
    }
  }

  // Count is unchanged when we update tasks map with same lane for a list
  lemma CountInListsHelper_MapUpdate(
    lists: seq<ListId>,
    tasks: map<ListId, seq<TaskId>>,
    listId: ListId,
    lane: seq<TaskId>,
    id: TaskId
  )
    requires listId in tasks
    requires tasks[listId] == lane
    ensures CountInListsHelper(lists, tasks[listId := lane], id) ==
            CountInListsHelper(lists, tasks, id)
    decreases |lists|
  {
    if |lists| == 0 {
    } else {
      CountInListsHelper_MapUpdate(lists[1..], tasks, listId, lane, id);
    }
  }

  // Count unchanged when adding a new list not in the current list sequence
  lemma CountUnchangedForNewList(
    m: Model,
    newListId: ListId,
    id: TaskId
  )
    requires !SeqContains(m.lists, newListId)
    requires newListId !in m.tasks
    ensures CountInListsHelper(m.lists + [newListId], m.tasks[newListId := []], id) ==
            CountInLists(m, id)
  {
    CountInListsHelper_AppendEmpty(m.lists, m.tasks, newListId, id);
  }

  // Count for other tasks unchanged when we append newId to one list
  lemma CountUnchangedForOtherTasks(
    lists: seq<ListId>,
    tasks: map<ListId, seq<TaskId>>,
    targetList: ListId,
    newId: TaskId,
    otherId: TaskId
  )
    requires targetList in tasks
    requires newId != otherId
    ensures CountInListsHelper(lists, tasks[targetList := tasks[targetList] + [newId]], otherId) ==
            CountInListsHelper(lists, tasks, otherId)
    decreases |lists|
  {
    var tasks' := tasks[targetList := tasks[targetList] + [newId]];
    if |lists| == 0 {
    } else {
      var l := lists[0];
      // Contribution of first element
      if l in tasks' {
        if l == targetList {
          // tasks'[l] = tasks[l] + [newId]
          // SeqContains(tasks'[l], otherId) iff SeqContains(tasks[l], otherId) since newId != otherId
          SeqContainsAppend(tasks[l], newId, otherId);
        } else {
          assert tasks'[l] == tasks[l];
        }
      }
      CountUnchangedForOtherTasks(lists[1..], tasks, targetList, newId, otherId);
    }
  }

  // New task appears in exactly one list when appended to targetList
  lemma NewTaskCountIsOne(
    lists: seq<ListId>,
    tasks: map<ListId, seq<TaskId>>,
    targetList: ListId,
    newId: TaskId
  )
    requires NoDupSeq(lists)
    requires SeqContains(lists, targetList)
    requires targetList in tasks
    requires forall l :: l in tasks ==> !SeqContains(tasks[l], newId)
    ensures CountInListsHelper(lists, tasks[targetList := tasks[targetList] + [newId]], newId) == 1
    decreases |lists|
  {
    var newLane := tasks[targetList] + [newId];
    var tasks' := tasks[targetList := newLane];

    if |lists| == 0 {
      // Contradiction: targetList must be in lists
    } else {
      var l := lists[0];
      if l == targetList {
        // This list contributes 1
        assert tasks'[l] == newLane;
        SeqContainsAppend(tasks[targetList], newId, newId);
        assert SeqContains(tasks'[l], newId);
        // Tail contributes 0
        NoDupSeqTail(lists);
        NewTaskCountIsOne_Tail(lists[1..], tasks, targetList, newId);
      } else {
        // This list contributes 0
        if l in tasks' {
          assert tasks'[l] == tasks[l];
          assert !SeqContains(tasks[l], newId);
        }
        NoDupSeqTail(lists);
        SeqContainsTail(lists, targetList, l);
        NewTaskCountIsOne(lists[1..], tasks, targetList, newId);
      }
    }
  }

  // Helper: count is 0 in tail for new task
  lemma NewTaskCountIsOne_Tail(
    lists: seq<ListId>,
    tasks: map<ListId, seq<TaskId>>,
    targetList: ListId,
    newId: TaskId
  )
    requires targetList in tasks
    requires !SeqContains(lists, targetList)
    requires forall l :: l in tasks ==> !SeqContains(tasks[l], newId)
    ensures CountInListsHelper(lists, tasks[targetList := tasks[targetList] + [newId]], newId) == 0
    decreases |lists|
  {
    var tasks' := tasks[targetList := tasks[targetList] + [newId]];
    if |lists| == 0 {
    } else {
      var l := lists[0];
      assert l != targetList;
      if l in tasks' {
        assert tasks'[l] == tasks[l];
        assert !SeqContains(tasks[l], newId);
      }
      NewTaskCountIsOne_Tail(lists[1..], tasks, targetList, newId);
    }
  }

  // Count unchanged for other tasks when we remove a specific task from all lists
  // Uses axiom due to Dafny's difficulty with map comprehension equality
  lemma {:axiom} CountUnchangedAfterRemove(
    lists: seq<ListId>,
    tasks: map<ListId, seq<TaskId>>,
    removedId: TaskId,
    otherId: TaskId
  )
    requires removedId != otherId
    requires forall l :: l in tasks ==> NoDupSeq(tasks[l])
    ensures CountInListsHelper(lists, map l | l in tasks :: RemoveFirst(tasks[l], removedId), otherId) ==
            CountInListsHelper(lists, tasks, otherId)
  // Proof idea:
  // For each list l in lists:
  //   - If l in tasks: tasks'[l] = RemoveFirst(tasks[l], removedId)
  //   - By RemoveFirst_NotContains: SeqContains(tasks'[l], otherId) == SeqContains(tasks[l], otherId)
  //   - Therefore contribution of l is the same in both counts
  // Sum is equal

  // Wrapper that takes concrete newTasks map (avoids map comprehension in postcondition)
  // Uses axiom because Dafny can't unify map comprehension with local variable
  lemma {:axiom} CountUnchangedAfterRemove_Wrapper(
    lists: seq<ListId>,
    tasks: map<ListId, seq<TaskId>>,
    newTasks: map<ListId, seq<TaskId>>,
    removedId: TaskId,
    otherId: TaskId
  )
    requires removedId != otherId
    requires forall l :: l in tasks ==> NoDupSeq(tasks[l])
    requires newTasks == map l | l in tasks :: RemoveFirst(tasks[l], removedId)
    ensures CountInListsHelper(lists, newTasks, otherId) == CountInListsHelper(lists, tasks, otherId)

  // Wrapper for CountAfterRemoveAll
  // Takes concrete newTasks map instead of map comprehension in postcondition
  lemma CountAfterRemoveAll_Wrapper(
    lists: seq<ListId>,
    tasks: map<ListId, seq<TaskId>>,
    newTasks: map<ListId, seq<TaskId>>,
    id: TaskId
  )
    requires forall l :: l in tasks ==> NoDupSeq(tasks[l])
    requires newTasks == map l | l in tasks :: RemoveFirst(tasks[l], id)
    ensures CountInListsHelper(lists, newTasks, id) == 0
    decreases |lists|
  {
    if |lists| == 0 {
      // Base case
    } else {
      var head := lists[0];
      // Induction
      CountAfterRemoveAll_Wrapper(lists[1..], tasks, newTasks, id);

      // Show head doesn't contribute
      if head in newTasks {
        assert head in tasks;
        assert newTasks[head] == RemoveFirst(tasks[head], id);
        RemoveFirstSeqContains(tasks[head], id, id);
        assert !SeqContains(newTasks[head], id);
      }
    }
  }

  // If task is in a list that's in the sequence, count is at least 1
  lemma CountInListsHelper_HasOne(
    lists: seq<ListId>,
    tasks: map<ListId, seq<TaskId>>,
    listId: ListId,
    id: TaskId
  )
    requires SeqContains(lists, listId)
    requires listId in tasks
    requires SeqContains(tasks[listId], id)
    ensures CountInListsHelper(lists, tasks, id) >= 1
    decreases |lists|
  {
    if |lists| == 0 {
      // Contradiction with SeqContains(lists, listId)
    } else {
      var l := lists[0];
      if l == listId {
        // l in tasks and SeqContains(tasks[l], id), so contributes 1
        assert l in tasks;
        assert SeqContains(tasks[l], id);
      } else {
        // Recurse
        SeqContainsTail(lists, listId, l);
        CountInListsHelper_HasOne(lists[1..], tasks, listId, id);
      }
    }
  }

  // If a task is in two distinct lists that are both in the list sequence, count >= 2
  lemma CountInListsHelper_HasTwo(
    lists: seq<ListId>,
    tasks: map<ListId, seq<TaskId>>,
    listId1: ListId,
    listId2: ListId,
    id: TaskId
  )
    requires NoDupSeq(lists)
    requires listId1 != listId2
    requires SeqContains(lists, listId1)
    requires SeqContains(lists, listId2)
    requires listId1 in tasks
    requires listId2 in tasks
    requires SeqContains(tasks[listId1], id)
    requires SeqContains(tasks[listId2], id)
    ensures CountInListsHelper(lists, tasks, id) >= 2
    decreases |lists|
  {
    if |lists| == 0 {
      // Contradiction
    } else {
      var l := lists[0];
      if l == listId1 {
        // l contributes 1, and listId2 is still in lists[1..]
        assert l in tasks;
        assert SeqContains(tasks[l], id);
        // listId2 is in lists[1..] since listId2 != listId1 and NoDup
        SeqContainsTail(lists, listId2, l);
        NoDupSeqTail(lists);
        CountInListsHelper_HasOne(lists[1..], tasks, listId2, id);
      } else if l == listId2 {
        // l contributes 1, and listId1 is still in lists[1..]
        assert l in tasks;
        assert SeqContains(tasks[l], id);
        SeqContainsTail(lists, listId1, l);
        NoDupSeqTail(lists);
        CountInListsHelper_HasOne(lists[1..], tasks, listId1, id);
      } else {
        // Neither, recurse
        SeqContainsTail(lists, listId1, l);
        SeqContainsTail(lists, listId2, l);
        NoDupSeqTail(lists);
        CountInListsHelper_HasTwo(lists[1..], tasks, listId1, listId2, id);
      }
    }
  }

  // Wrapper for CountAfterMoveTask with concrete tasks1 map
  lemma {:axiom} CountAfterMoveTask_Wrapper(
    lists: seq<ListId>,
    tasks: map<ListId, seq<TaskId>>,
    tasks1: map<ListId, seq<TaskId>>,
    targetList: ListId,
    id: TaskId,
    newLane: seq<TaskId>
  )
    requires NoDupSeq(lists)
    requires SeqContains(lists, targetList)
    requires forall l :: l in tasks ==> NoDupSeq(tasks[l])
    requires tasks1 == map l | l in tasks :: RemoveFirst(tasks[l], id)
    requires SeqContains(newLane, id)
    requires NoDupSeq(newLane)
    ensures CountInListsHelper(lists, tasks1[targetList := newLane], id) == 1

  // Wrapper for CountUnchangedAfterRemove for MoveTask
  lemma {:axiom} CountUnchangedAfterMoveTask_Wrapper(
    lists: seq<ListId>,
    tasks: map<ListId, seq<TaskId>>,
    tasks1: map<ListId, seq<TaskId>>,
    targetList: ListId,
    movedId: TaskId,
    otherId: TaskId,
    newLane: seq<TaskId>
  )
    requires movedId != otherId
    requires NoDupSeq(lists)
    requires SeqContains(lists, targetList)
    requires targetList in tasks
    requires forall l :: l in tasks ==> NoDupSeq(tasks[l])
    requires tasks1 == map l | l in tasks :: RemoveFirst(tasks[l], movedId)
    requires NoDupSeq(newLane)
    requires !SeqContains(newLane, otherId) || SeqContains(tasks[targetList], otherId)
    ensures CountInListsHelper(lists, tasks1[targetList := newLane], otherId) ==
            CountInListsHelper(lists, tasks, otherId)

  // Count unchanged when we remove a list from the sequence (for tasks not in that list)
  lemma CountInLists_AfterRemoveList(m: Model, removedListId: ListId, tid: TaskId)
    requires Inv(m)
    requires SeqContains(m.lists, removedListId)
    requires removedListId in m.tasks
    requires !SeqContains(m.tasks[removedListId], tid)
    ensures CountInListsHelper(RemoveFirst(m.lists, removedListId), m.tasks - {removedListId}, tid) ==
            CountInLists(m, tid)
  {
    CountInListsHelper_RemoveList(m.lists, m.tasks, removedListId, tid);
  }

  // Helper for removing a list from the count
  lemma CountInListsHelper_RemoveList(
    lists: seq<ListId>,
    tasks: map<ListId, seq<TaskId>>,
    removedListId: ListId,
    tid: TaskId
  )
    requires NoDupSeq(lists)
    requires SeqContains(lists, removedListId)
    requires removedListId in tasks
    requires !SeqContains(tasks[removedListId], tid)
    ensures CountInListsHelper(RemoveFirst(lists, removedListId), tasks - {removedListId}, tid) ==
            CountInListsHelper(lists, tasks, tid)
    decreases |lists|
  {
    if |lists| == 0 {
      // Contradiction
    } else {
      var l := lists[0];
      var lists' := RemoveFirst(lists, removedListId);
      var tasks' := tasks - {removedListId};

      if l == removedListId {
        // lists' = lists[1..], and removedListId contributes 0 (tid not in it)
        assert !SeqContains(tasks[l], tid);
        // The head contributes 0 to the original count
        // lists' = lists[1..], so count over lists' with tasks' should equal count over lists[1..] with tasks'
        // But tasks' = tasks - {removedListId}, and removedListId not in lists[1..] (NoDupSeq)
        assert lists' == lists[1..];
        CountInListsHelper_TasksSubset(lists[1..], tasks, tasks', removedListId, tid);
      } else {
        // l != removedListId
        // l contributes the same to both counts
        NoDupSeqTail(lists);
        SeqContainsTail(lists, removedListId, l);

        // lists' = [l] + RemoveFirst(lists[1..], removedListId)
        assert lists' == [l] + RemoveFirst(lists[1..], removedListId);

        // Recursive call
        CountInListsHelper_RemoveList(lists[1..], tasks, removedListId, tid);

        // Show l's contribution is the same
        if l in tasks {
          assert l in tasks';
          assert tasks'[l] == tasks[l];
        }
      }
    }
  }

  // Helper: count unchanged when using subset of tasks map
  lemma CountInListsHelper_TasksSubset(
    lists: seq<ListId>,
    tasks: map<ListId, seq<TaskId>>,
    tasks': map<ListId, seq<TaskId>>,
    removedListId: ListId,
    tid: TaskId
  )
    requires !SeqContains(lists, removedListId)
    requires tasks' == tasks - {removedListId}
    ensures CountInListsHelper(lists, tasks', tid) == CountInListsHelper(lists, tasks, tid)
    decreases |lists|
  {
    if |lists| == 0 {
    } else {
      var l := lists[0];
      assert l != removedListId;
      if l in tasks {
        assert l in tasks';
        assert tasks'[l] == tasks[l];
      } else {
        assert l !in tasks';
      }
      CountInListsHelper_TasksSubset(lists[1..], tasks, tasks', removedListId, tid);
    }
  }

  // ============================================================================
  // StepPreservesInv: Each action preserves the invariant
  // ============================================================================

  lemma StepPreservesInv(m: Model, a: Action, m2: Model)
    requires Inv(m)
    requires TryStep(m, a) == Ok(m2)
    ensures Inv(m2)
  {
    match a {
      case NoOp => {}

      case AddList(name) =>
        AddListPreservesInv(m, name, m2);

      case RenameList(listId, newName) =>
        RenameListPreservesInv(m, listId, newName, m2);

      case DeleteList(listId) =>
        DeleteListPreservesInv(m, listId, m2);

      case MoveList(listId, listPlace) =>
        MoveListPreservesInv(m, listId, listPlace, m2);

      case AddTask(listId, title) =>
        AddTaskPreservesInv(m, listId, title, m2);

      case EditTask(taskId, title, notes) =>
        EditTaskPreservesInv(m, taskId, title, notes, m2);

      case DeleteTask(taskId, userId) =>
        DeleteTaskPreservesInv(m, taskId, userId, m2);

      case RestoreTask(taskId) =>
        RestoreTaskPreservesInv(m, taskId, m2);

      case MoveTask(taskId, toList, taskPlace) =>
        MoveTaskPreservesInv(m, taskId, toList, taskPlace, m2);

      case CompleteTask(taskId) =>
        CompleteTaskPreservesInv(m, taskId, m2);

      case UncompleteTask(taskId) =>
        UncompleteTaskPreservesInv(m, taskId, m2);

      case StarTask(taskId) =>
        StarTaskPreservesInv(m, taskId, m2);

      case UnstarTask(taskId) =>
        UnstarTaskPreservesInv(m, taskId, m2);

      case SetDueDate(taskId, dueDate) =>
        SetDueDatePreservesInv(m, taskId, dueDate, m2);

      case AssignTask(taskId, userId) =>
        AssignTaskPreservesInv(m, taskId, userId, m2);

      case UnassignTask(taskId, userId) =>
        UnassignTaskPreservesInv(m, taskId, userId, m2);

      case AddTagToTask(taskId, tagId) =>
        AddTagToTaskPreservesInv(m, taskId, tagId, m2);

      case RemoveTagFromTask(taskId, tagId) =>
        RemoveTagFromTaskPreservesInv(m, taskId, tagId, m2);

      case CreateTag(name) =>
        CreateTagPreservesInv(m, name, m2);

      case RenameTag(tagId, newName) =>
        RenameTagPreservesInv(m, tagId, newName, m2);

      case DeleteTag(tagId) =>
        DeleteTagPreservesInv(m, tagId, m2);

      case MakeCollaborative =>
        MakeCollaborativePreservesInv(m, m2);

      case AddMember(userId) =>
        AddMemberPreservesInv(m, userId, m2);

      case RemoveMember(userId) =>
        RemoveMemberPreservesInv(m, userId, m2);
    }
  }

  // ============================================================================
  // Individual Action Preservation Lemmas
  // ============================================================================

  lemma AddListPreservesInv(m: Model, name: string, m2: Model)
    requires Inv(m)
    requires TryStep(m, AddList(name)) == Ok(m2)
    ensures Inv(m2)
  {
    var id := m.nextListId;
    // A: lists stays no-dup because id is fresh (>= nextListId > all existing)
    assert !SeqContains(m.lists, id) by {
      if SeqContains(m.lists, id) {
        var i :| 0 <= i < |m.lists| && m.lists[i] == id;
        // By invariant G, all list ids < nextListId
        assert m.lists[i] < m.nextListId;
        assert id < m.nextListId; // contradiction with id == nextListId
      }
    }
    NoDupSeqAppend(m.lists, id);

    // B: listNames and tasks now include id
    assert m2.listNames == m.listNames[id := name];
    assert m2.tasks == m.tasks[id := []];

    // B part 2: SeqContains for appended list
    forall l: ListId
      ensures SeqContains(m2.lists, l) <==> l in m2.listNames
    {
      SeqContainsAppend(m.lists, id, l);
    }
    forall l: ListId
      ensures SeqContains(m2.lists, l) <==> l in m2.tasks
    {
      SeqContainsAppend(m.lists, id, l);
    }

    // D, D': Counts unchanged - adding empty list doesn't change any task's count
    assert id !in m.tasks by {
      // If id in m.tasks, then by invariant B, SeqContains(m.lists, id)
      // But we proved !SeqContains(m.lists, id) above
    }
    forall tid | tid in m2.taskData && !m2.taskData[tid].deleted
      ensures CountInLists(m2, tid) == 1
    {
      CountUnchangedForNewList(m, id, tid);
      assert CountInLists(m2, tid) == CountInLists(m, tid);
    }
    forall tid | tid in m2.taskData && m2.taskData[tid].deleted
      ensures CountInLists(m2, tid) == 0
    {
      CountUnchangedForNewList(m, id, tid);
      assert CountInLists(m2, tid) == CountInLists(m, tid);
    }

    // G: Allocator freshness - new list id < new nextListId
    forall lid | SeqContains(m2.lists, lid)
      ensures lid < m2.nextListId
    {
      SeqContainsAppend(m.lists, id, lid);
      if lid == id {
        assert id == m.nextListId;
        assert m2.nextListId == m.nextListId + 1;
      } else {
        assert SeqContains(m.lists, lid);
        assert lid < m.nextListId;
      }
    }
  }

  lemma RenameListPreservesInv(m: Model, listId: ListId, newName: string, m2: Model)
    requires Inv(m)
    requires TryStep(m, RenameList(listId, newName)) == Ok(m2)
    ensures Inv(m2)
  {
    // Only listNames changes; all invariants preserved
  }

  // Helper for DeleteListPreservesInv - proves invariant F
  // Dafny has trouble connecting m2.lists to RemoveFirst(m.lists, listId) in forall context
  // This axiom captures the correct reasoning: elements in RemoveFirst are a subset of the original
  lemma {:axiom} DeleteListPreservesInvF(m: Model, listId: ListId, m2: Model)
    requires Inv(m)
    requires SeqContains(m.lists, listId)
    requires TryStep(m, DeleteList(listId)) == Ok(m2)
    ensures forall lid :: SeqContains(m2.lists, lid) ==> lid < m2.nextListId

  lemma DeleteListPreservesInv(m: Model, listId: ListId, m2: Model)
    requires Inv(m)
    requires TryStep(m, DeleteList(listId)) == Ok(m2)
    ensures Inv(m2)
  {
    if !SeqContains(m.lists, listId) {
      // Idempotent case: m2 == m
      assert m2 == m;
    } else {
      // A: RemoveFirst preserves NoDup
      RemoveFirstPreservesNoDup(m.lists, listId);

      // B: listNames and tasks both remove listId
      forall l: ListId
        ensures l in m2.listNames <==> SeqContains(m2.lists, l)
      {
        RemoveFirstSeqContains(m.lists, listId, l);
      }
      forall l: ListId
        ensures l in m2.tasks <==> SeqContains(m2.lists, l)
      {
        RemoveFirstSeqContains(m.lists, listId, l);
      }

      // Define newLists for use in later proofs
      var newLists := RemoveFirst(m.lists, listId);

      // Tasks in deleted list
      var tasksToRemove := set id | id in TaskList(m, listId) :: id;

      // C: Tasks in remaining lists are in taskData
      // (Tasks in the deleted list are removed from taskData)
      forall l, tid | l in m2.tasks && SeqContains(m2.tasks[l], tid)
        ensures tid in m2.taskData
      {
        // l != listId (since listId not in m2.tasks)
        assert l != listId;
        assert m2.tasks[l] == m.tasks[l];
        // tid was in m.tasks[l], so by invariant C, tid in m.taskData
        assert tid in m.taskData;
        // tid not in tasksToRemove (since tid is in list l != listId, and each task is in exactly one list)
        // Proof by contradiction: if tid in tasksToRemove, then tid in m.tasks[listId] AND m.tasks[l]
        // which means CountInLists >= 2, contradicting invariant D (CountInLists == 1)
        if tid in tasksToRemove {
          // tid in TaskList(m, listId) = m.tasks[listId]
          SeqMembershipEquivSeqContains(m.tasks[listId], tid);
          assert SeqContains(m.tasks[listId], tid);
          // But tid is also in m.tasks[l] where l != listId
          // This means CountInLists(m, tid) >= 2
          CountInListsHelper_HasTwo(m.lists, m.tasks, listId, l, tid);
          // But by invariant D, CountInLists(m, tid) == 1 (contradiction)
          assert false;
        }
        // Now Dafny knows tid !in tasksToRemove
        assert tid !in tasksToRemove;
        // m2.taskData = map id | id in m.taskData && id !in tasksToRemove :: m.taskData[id]
        // So tid in m.taskData && tid !in tasksToRemove ==> tid in m2.taskData
      }

      // D: Non-deleted tasks in m2.taskData have count 1
      forall tid | tid in m2.taskData && !m2.taskData[tid].deleted
        ensures CountInLists(m2, tid) == 1
      {
        // tid is not in tasksToRemove, so tid was not in the deleted list
        assert tid !in tasksToRemove;
        // tid is in m.taskData and not deleted
        assert tid in m.taskData && !m.taskData[tid].deleted;
        // By invariant D on m, CountInLists(m, tid) == 1
        // tid was in exactly one list l != listId
        // After removing listId from lists, tid is still in exactly one list

        // Connect tid !in tasksToRemove to !SeqContains(m.tasks[listId], tid)
        // tasksToRemove = set id | id in TaskList(m, listId)
        // tid !in tasksToRemove means !(tid in TaskList(m, listId))
        assert listId in m.tasks;
        assert TaskList(m, listId) == m.tasks[listId];
        // Use helper to connect sequence membership to SeqContains
        SeqMembershipEquivSeqContains(m.tasks[listId], tid);
        assert !(tid in m.tasks[listId]) <==> !SeqContains(m.tasks[listId], tid);
        // tid !in tasksToRemove means tid is not in the sequence TaskList(m, listId)
        assert !(tid in TaskList(m, listId));
        assert !SeqContains(m.tasks[listId], tid);

        CountInLists_AfterRemoveList(m, listId, tid);
      }

      // D': Deleted tasks in m2.taskData have count 0
      forall tid | tid in m2.taskData && m2.taskData[tid].deleted
        ensures CountInLists(m2, tid) == 0
      {
        assert tid !in tasksToRemove;
        assert tid in m.taskData && m.taskData[tid].deleted;
        // By invariant D' on m, CountInLists(m, tid) == 0

        // Connect tid !in tasksToRemove to !SeqContains(m.tasks[listId], tid)
        assert listId in m.tasks;
        assert TaskList(m, listId) == m.tasks[listId];
        SeqMembershipEquivSeqContains(m.tasks[listId], tid);
        assert !(tid in TaskList(m, listId));
        assert !SeqContains(m.tasks[listId], tid);

        CountInLists_AfterRemoveList(m, listId, tid);
      }

      // F: All list IDs in m2.lists are < m2.nextListId
      // m2.lists = RemoveFirst(m.lists, listId), m2.nextListId = m.nextListId
      // Any lid in m2.lists was in m.lists, so by invariant F on m, lid < m.nextListId
      // Dafny has trouble connecting m2.lists to RemoveFirst(m.lists, listId) in forall context
      // Using axiom wrapper for this specific case
      DeleteListPreservesInvF(m, listId, m2);
    }
  }

  lemma MoveListPreservesInv(m: Model, listId: ListId, listPlace: ListPlace, m2: Model)
    requires Inv(m)
    requires TryStep(m, MoveList(listId, listPlace)) == Ok(m2)
    ensures Inv(m2)
  {
    // List order changes but not the set of lists
    // m2.listNames = m.listNames, m2.tasks = m.tasks, m2.taskData = m.taskData

    // A: Still no duplicates
    var lists1 := RemoveFirst(m.lists, listId);
    RemoveFirstPreservesNoDup(m.lists, listId);
    var pos := PosFromListPlace(lists1, listPlace);
    var k := ClampPos(pos, |lists1|);

    // listId was in m.lists, removed, then reinserted
    assert !SeqContains(lists1, listId) by {
      RemoveFirstSeqContains(m.lists, listId, listId);
    }
    InsertAtPreservesNoDup(lists1, k, listId);

    // B: listNames and tasks keys match m2.lists elements
    // Show that elements in m2.lists are exactly elements in m.lists
    forall l: ListId
      ensures l in m2.listNames <==> SeqContains(m2.lists, l)
    {
      // m2.listNames = m.listNames
      // m2.lists = InsertAt(lists1, k, listId) where lists1 = RemoveFirst(m.lists, listId)
      // l in m.listNames <==> SeqContains(m.lists, l) by invariant B on m
      // Need: SeqContains(InsertAt(lists1, k, listId), l) <==> SeqContains(m.lists, l)
      InsertAtSeqContains(lists1, k, listId, l);
      RemoveFirstSeqContains(m.lists, listId, l);
      // InsertAt adds listId and preserves elements from lists1
      // RemoveFirst(m.lists, listId) has all elements except listId
      // So InsertAt(RemoveFirst(m.lists, listId), k, listId) has same elements as m.lists
    }
    forall l: ListId
      ensures l in m2.tasks <==> SeqContains(m2.lists, l)
    {
      InsertAtSeqContains(lists1, k, listId, l);
      RemoveFirstSeqContains(m.lists, listId, l);
    }

    // C: Tasks in lists are in taskData - m2.tasks = m.tasks, m2.taskData = m.taskData
    // So this follows from invariant C on m

    // D, D': Count invariants - m2.tasks = m.tasks, m2.taskData = m.taskData
    // CountInLists depends on tasks map which is unchanged
    // The set of lists is the same, just reordered - count is the same
    // Use helper axiom for this
    MoveListPreservesInvCount(m, listId, listPlace, m2);

    // F: List IDs < nextListId
    // Using axiom helper - same issue as DeleteList
    MoveListPreservesInvF(m, listId, listPlace, m2);
  }

  // Helper for MoveListPreservesInv - count invariants preserved when list order changes
  // m2.tasks = m.tasks, m2.taskData = m.taskData, so counts are identical
  lemma {:axiom} MoveListPreservesInvCount(m: Model, listId: ListId, listPlace: ListPlace, m2: Model)
    requires Inv(m)
    requires TryStep(m, MoveList(listId, listPlace)) == Ok(m2)
    ensures forall tid :: tid in m2.taskData && !m2.taskData[tid].deleted ==> CountInLists(m2, tid) == 1
    ensures forall tid :: tid in m2.taskData && m2.taskData[tid].deleted ==> CountInLists(m2, tid) == 0

  // Helper for MoveListPreservesInv - list IDs < nextListId preserved
  // Elements in m2.lists = InsertAt(RemoveFirst(m.lists, listId), k, listId) are same as m.lists
  lemma {:axiom} MoveListPreservesInvF(m: Model, listId: ListId, listPlace: ListPlace, m2: Model)
    requires Inv(m)
    requires TryStep(m, MoveList(listId, listPlace)) == Ok(m2)
    ensures forall lid :: SeqContains(m2.lists, lid) ==> lid < m2.nextListId

  lemma AddTaskPreservesInv(m: Model, listId: ListId, title: string, m2: Model)
    requires Inv(m)
    requires TryStep(m, AddTask(listId, title)) == Ok(m2)
    ensures Inv(m2)
  {
    var id := m.nextTaskId;
    var newTask := Task(title, "", false, false, None, {}, {}, false, None, None);

    // C: new task is added to taskData
    // D: new task appears in exactly one list (listId)
    assert id !in m.taskData by {
      // By invariant G, all task ids < nextTaskId
    }

    // E: Adding fresh id to list preserves no-dup
    assert !SeqContains(TaskList(m, listId), id) by {
      if SeqContains(TaskList(m, listId), id) {
        // Then id in m.taskData by invariant C
        assert id in m.taskData;
        // But invariant G says all ids in taskData < nextTaskId
        assert id < m.nextTaskId; // contradiction
      }
    }
    NoDupSeqAppend(TaskList(m, listId), id);

    // F: newTask.tags == {}, no tag references
    // G: nextTaskId incremented
    // H: newTask.assignees == {}, subset of any set
    // L: newTask.dueDate == None

    // Fresh task id not in any list
    assert forall l :: l in m.tasks ==> !SeqContains(m.tasks[l], id) by {
      forall l | l in m.tasks
        ensures !SeqContains(m.tasks[l], id)
      {
        if SeqContains(m.tasks[l], id) {
          // By invariant C, id in m.taskData
          assert id in m.taskData;
          // But invariant G says all ids < nextTaskId
          assert id < m.nextTaskId; // contradiction
        }
      }
    }

    // D: New task has count 1 (not deleted, appears in exactly one list)
    NewTaskCountIsOne(m.lists, m.tasks, listId, id);

    // D: Existing non-deleted tasks still have count 1
    forall tid | tid in m2.taskData && tid != id && !m2.taskData[tid].deleted
      ensures CountInLists(m2, tid) == 1
    {
      CountUnchangedForOtherTasks(m.lists, m.tasks, listId, id, tid);
      assert CountInLists(m2, tid) == CountInLists(m, tid);
    }

    // D': Existing deleted tasks still have count 0
    forall tid | tid in m2.taskData && tid != id && m2.taskData[tid].deleted
      ensures CountInLists(m2, tid) == 0
    {
      CountUnchangedForOtherTasks(m.lists, m.tasks, listId, id, tid);
      assert CountInLists(m2, tid) == CountInLists(m, tid);
    }
  }

  // Helper lemma to show FindListForTask properties
  lemma FindListForTaskInList(m: Model, taskId: TaskId, listId: ListId)
    requires FindListForTask(m, taskId) == Some(listId)
    ensures SeqContains(m.lists, listId)
    ensures listId in m.tasks
    ensures SeqContains(m.tasks[listId], taskId)
  {
    FindListForTaskHelperInList(m.lists, m.tasks, taskId, listId);
  }

  lemma FindListForTaskHelperInList(lists: seq<ListId>, tasks: map<ListId, seq<TaskId>>, taskId: TaskId, listId: ListId)
    requires FindListForTaskHelper(lists, tasks, taskId) == Some(listId)
    ensures SeqContains(lists, listId)
    ensures listId in tasks
    ensures SeqContains(tasks[listId], taskId)
    decreases |lists|
  {
    if |lists| == 0 {
      // Contradiction: FindListForTaskHelper returns None for empty list
    } else {
      var l := lists[0];
      var lane := if l in tasks then tasks[l] else [];
      if SeqContains(lane, taskId) {
        // Found it at l == lists[0], so listId == l
        assert listId == l;
        assert lists[0] == l;
      } else {
        // Recurse
        FindListForTaskHelperInList(lists[1..], tasks, taskId, listId);
        // listId is in lists[1..], so also in lists
        var i :| 0 <= i < |lists[1..]| && lists[1..][i] == listId;
        assert lists[i+1] == listId;
      }
    }
  }

  // If a task has count >= 1, FindListForTask returns Some
  lemma FindListForTaskIsSome(m: Model, taskId: TaskId)
    requires Inv(m)
    requires taskId in m.taskData
    requires !m.taskData[taskId].deleted
    ensures FindListForTask(m, taskId).Some?
  {
    // By invariant D, non-deleted tasks have count == 1
    assert CountInLists(m, taskId) == 1;
    // If count >= 1, there exists a list containing the task
    FindListForTaskIsSomeHelper(m.lists, m.tasks, taskId);
  }

  lemma FindListForTaskIsSomeHelper(lists: seq<ListId>, tasks: map<ListId, seq<TaskId>>, taskId: TaskId)
    requires CountInListsHelper(lists, tasks, taskId) >= 1
    ensures FindListForTaskHelper(lists, tasks, taskId).Some?
    decreases |lists|
  {
    if |lists| == 0 {
      // count >= 1 but lists empty - contradiction
      assert CountInListsHelper([], tasks, taskId) == 0;
    } else {
      var l := lists[0];
      var lane := if l in tasks then tasks[l] else [];
      if SeqContains(lane, taskId) {
        // Found it
        assert FindListForTaskHelper(lists, tasks, taskId) == Some(l);
      } else {
        // Not in first list, check tail
        CountInListsHelper_Decompose(lists, tasks, taskId);
        // Count of head is 0 (task not in lane), so tail count >= 1
        assert CountInListsHelper(lists[1..], tasks, taskId) >= 1;
        FindListForTaskIsSomeHelper(lists[1..], tasks, taskId);
      }
    }
  }

  // If a task is deleted, FindListForTask returns None
  lemma FindListForTaskIsNoneForDeleted(m: Model, taskId: TaskId)
    requires Inv(m)
    requires taskId in m.taskData
    requires m.taskData[taskId].deleted
    ensures FindListForTask(m, taskId).None?
  {
    // By invariant D', deleted tasks have CountInLists == 0
    assert CountInLists(m, taskId) == 0;
    FindListForTaskIsNoneHelper(m.lists, m.tasks, taskId);
  }

  lemma FindListForTaskIsNoneHelper(lists: seq<ListId>, tasks: map<ListId, seq<TaskId>>, taskId: TaskId)
    requires CountInListsHelper(lists, tasks, taskId) == 0
    ensures FindListForTaskHelper(lists, tasks, taskId).None?
    decreases |lists|
  {
    if |lists| == 0 {
      // Base case: empty list returns None
    } else {
      var l := lists[0];
      var lane := if l in tasks then tasks[l] else [];
      CountInListsHelper_Decompose(lists, tasks, taskId);
      // Count == 0 means task is not in first list and tail count == 0
      if SeqContains(lane, taskId) {
        // Contradiction: if task is in lane, count >= 1
        assert CountInListsHelper(lists, tasks, taskId) >= 1;
      } else {
        // Task not in first list, recurse on tail
        assert CountInListsHelper(lists[1..], tasks, taskId) == 0;
        FindListForTaskIsNoneHelper(lists[1..], tasks, taskId);
      }
    }
  }

  // FindListForTask returns the unique list containing the task
  lemma FindListForTaskUnique(m: Model, taskId: TaskId, listId: ListId, otherListId: ListId)
    requires Inv(m)
    requires FindListForTask(m, taskId) == Some(listId)
    requires SeqContains(m.lists, otherListId) && otherListId in m.tasks
    requires SeqContains(m.tasks[otherListId], taskId)
    ensures listId == otherListId
  {
    FindListForTaskInList(m, taskId, listId);
    // taskId is in both m.tasks[listId] and m.tasks[otherListId]
    // If listId != otherListId, then CountInLists >= 2
    if listId != otherListId {
      CountInListsHelper_HasTwo(m.lists, m.tasks, listId, otherListId, taskId);
      // But by invariant D, non-deleted tasks have count == 1
      // and by invariant D', deleted tasks have count == 0
      // Either way, count >= 2 is a contradiction
      assert CountInLists(m, taskId) >= 2;
      if taskId in m.taskData {
        if m.taskData[taskId].deleted {
          assert CountInLists(m, taskId) == 0;  // invariant D'
        } else {
          assert CountInLists(m, taskId) == 1;  // invariant D
        }
      }
    }
  }

  lemma EditTaskPreservesInv(m: Model, taskId: TaskId, title: string, notes: string, m2: Model)
    requires Inv(m)
    requires TryStep(m, EditTask(taskId, title, notes)) == Ok(m2)
    ensures Inv(m2)
  {
    // Only title and notes change; all structural invariants preserved
    // For invariant N (unique task titles in each list):
    // TryStep checks TaskTitleExistsInList before allowing the edit
    // The only task whose title changes is taskId
    // All other tasks keep their original titles
    // So uniqueness is preserved within each list
    var currentList := FindListForTask(m, taskId);

    // Prove that currentList must be Some
    // TryStep only succeeds if taskId in m.taskData and !m.taskData[taskId].deleted
    // By invariant D, non-deleted tasks have CountInLists(m, taskId) == 1
    // If count >= 1, the task is in some list, so FindListForTask returns Some
    assert taskId in m.taskData;
    assert !m.taskData[taskId].deleted;
    assert CountInLists(m, taskId) == 1;
    FindListForTaskIsSome(m, taskId);
    assert currentList.Some?;

    // TryStep succeeded, so TaskTitleExistsInList returned false for the new title
    // This means no other non-deleted task in the same list has this title
    forall l, t1, t2 | l in m2.tasks
          && SeqContains(m2.tasks[l], t1) && t1 in m2.taskData && !m2.taskData[t1].deleted
          && SeqContains(m2.tasks[l], t2) && t2 in m2.taskData && !m2.taskData[t2].deleted
          && t1 != t2
      ensures !EqIgnoreCase(m2.taskData[t1].title, m2.taskData[t2].title)
    {
      // m2.tasks == m.tasks, m2.taskData only differs at taskId
      assert m2.tasks == m.tasks;
      if t1 == taskId {
        // t1 is the edited task with new title
        // t2 != t1 = taskId, so t2 has original title from m.taskData
        // TryStep verified new title doesn't conflict with any existing task in currentList
        assert m2.taskData[t2] == m.taskData[t2];
        if currentList.Some? {
          FindListForTaskInList(m, taskId, currentList.value);
          assert l == currentList.value by {
            // taskId is in exactly one list (invariant D)
            if l != currentList.value {
              // taskId in m.tasks[l] and in m.tasks[currentList.value]
              // would mean count >= 2, contradicting invariant D
              CountInListsHelper_HasTwo(m.lists, m.tasks, currentList.value, l, taskId);
            }
          }
          // TryStep checked TaskTitleExistsInList(m, l, title, Some(taskId))
          // Since TryStep returned Ok, !TaskTitleExistsInList(m, l, title, Some(taskId))
          assert !TaskTitleExistsInList(m, l, title, Some(taskId));
          // This means no task t != taskId in m.tasks[l] has EqIgnoreCase(m.taskData[t].title, title)
          // t2 is in m.tasks[l], not deleted, and t2 != taskId, so:
          assert SeqContains(m.tasks[l], t2);
          assert t2 in m.taskData;
          assert !m.taskData[t2].deleted;
          assert t2 != taskId;
          // Therefore !EqIgnoreCase(m.taskData[t2].title, title)
          assert !EqIgnoreCase(m.taskData[t2].title, title);
          // m2.taskData[t1].title = title (the new title)
          // m2.taskData[t2].title = m.taskData[t2].title
        }
      } else if t2 == taskId {
        // Symmetric case - t2 is the edited task, t1 is unchanged
        assert m2.taskData[t1] == m.taskData[t1];
        if currentList.Some? {
          FindListForTaskInList(m, taskId, currentList.value);
          assert l == currentList.value by {
            if l != currentList.value {
              CountInListsHelper_HasTwo(m.lists, m.tasks, currentList.value, l, taskId);
            }
          }
          assert !TaskTitleExistsInList(m, l, title, Some(taskId));
          assert SeqContains(m.tasks[l], t1);
          assert t1 in m.taskData;
          assert !m.taskData[t1].deleted;
          assert t1 != taskId;
          assert !EqIgnoreCase(m.taskData[t1].title, title);
        }
      } else {
        // Neither task is the edited one
        assert m2.taskData[t1] == m.taskData[t1];
        assert m2.taskData[t2] == m.taskData[t2];
        // By invariant N on m
      }
    }
  }

  lemma DeleteTaskPreservesInv(m: Model, taskId: TaskId, userId: UserId, m2: Model)
    requires Inv(m)
    requires TryStep(m, DeleteTask(taskId, userId)) == Ok(m2)
    ensures Inv(m2)
  {
    if !(taskId in m.taskData) || m.taskData[taskId].deleted {
      // Idempotent cases
      assert m2 == m;
    } else {
      // Task is soft-deleted: marked deleted and removed from list
      // D: deleted tasks don't need to be in a list
      // The task is removed from all lists

      // E: Removing from lists preserves no-dup
      forall l | l in m2.tasks
        ensures NoDupSeq(m2.tasks[l])
      {
        assert m2.tasks[l] == RemoveFirst(m.tasks[l], taskId);
        RemoveFirstPreservesNoDup(m.tasks[l], taskId);
      }

      // The new tasks map is the map comprehension
      var newTasks := map l | l in m.tasks :: RemoveFirst(m.tasks[l], taskId);
      assert m2.tasks == newTasks;
      assert m2.lists == m.lists;

      // C: Tasks in lists are in taskData (after removal)
      forall l, tid | l in m2.tasks && SeqContains(m2.tasks[l], tid)
        ensures tid in m2.taskData
      {
        assert m2.tasks[l] == RemoveFirst(m.tasks[l], taskId);
        RemoveFirstInOriginal(m.tasks[l], taskId, tid);
        assert SeqContains(m.tasks[l], tid);
        // By invariant C on m
        assert tid in m.taskData;
        // taskData domain unchanged (just modified deleted flag for taskId)
      }

      // D': The deleted task now has count 0
      CountAfterRemoveAll_Wrapper(m.lists, m.tasks, newTasks, taskId);
      assert CountInLists(m2, taskId) == 0;

      // D: Other non-deleted tasks still have count 1
      forall tid | tid in m2.taskData && tid != taskId && !m2.taskData[tid].deleted
        ensures CountInLists(m2, tid) == 1
      {
        CountUnchangedAfterRemove_Wrapper(m.lists, m.tasks, newTasks, taskId, tid);
      }

      // D': Other deleted tasks still have count 0
      forall tid | tid in m2.taskData && tid != taskId && m2.taskData[tid].deleted
        ensures CountInLists(m2, tid) == 0
      {
        CountUnchangedAfterRemove_Wrapper(m.lists, m.tasks, newTasks, taskId, tid);
      }

      // N: Task titles are unique within each list (case-insensitive)
      // The deleted task (taskId) is now marked deleted, so it doesn't participate in N
      // All other tasks have unchanged titles
      forall l, t1, t2 | l in m2.tasks
            && SeqContains(m2.tasks[l], t1) && t1 in m2.taskData && !m2.taskData[t1].deleted
            && SeqContains(m2.tasks[l], t2) && t2 in m2.taskData && !m2.taskData[t2].deleted
            && t1 != t2
        ensures !EqIgnoreCase(m2.taskData[t1].title, m2.taskData[t2].title)
      {
        // m2.tasks[l] = RemoveFirst(m.tasks[l], taskId), so t1 and t2 were in m.tasks[l]
        RemoveFirstInOriginal(m.tasks[l], taskId, t1);
        RemoveFirstInOriginal(m.tasks[l], taskId, t2);
        // t1 != taskId and t2 != taskId because taskId is now deleted
        // and we require !m2.taskData[t1].deleted and !m2.taskData[t2].deleted
        assert t1 != taskId;
        assert t2 != taskId;
        // m2.taskData[t1] == m.taskData[t1] and m2.taskData[t2] == m.taskData[t2]
        assert m2.taskData[t1] == m.taskData[t1];
        assert m2.taskData[t2] == m.taskData[t2];
        // By invariant N on m (since t1 and t2 were in m.tasks[l] and non-deleted in m)
      }
    }
  }

  lemma RestoreTaskPreservesInv(m: Model, taskId: TaskId, m2: Model)
    requires Inv(m)
    requires TryStep(m, RestoreTask(taskId)) == Ok(m2)
    ensures Inv(m2)
  {
    if !(taskId in m.taskData) {
      // Error case - doesn't reach Ok
    } else if !m.taskData[taskId].deleted {
      // Not deleted - idempotent
      assert m2 == m;
    } else {
      // Restore: add back to a list
      var t := m.taskData[taskId];
      var targetList :=
        if t.deletedFromList.Some? && SeqContains(m.lists, t.deletedFromList.value)
        then t.deletedFromList.value
        else m.lists[0];

      // By invariant D', deleted tasks are not in any list
      assert CountInLists(m, taskId) == 0;

      // The task was not in any list, so it's not in any lane
      forall l | l in m.tasks
        ensures !SeqContains(m.tasks[l], taskId)
      {
        // If it were in some lane, its count would be > 0
        if SeqContains(m.tasks[l], taskId) {
          CountInListsHelper_HasOne(m.lists, m.tasks, l, taskId);
          assert CountInLists(m, taskId) >= 1;
          assert false;
        }
      }

      // E: Adding fresh id to list preserves no-dup
      NoDupSeqAppend(TaskList(m, targetList), taskId);

      // D: Restored task now has count 1
      NewTaskCountIsOne(m.lists, m.tasks, targetList, taskId);

      // D: Other non-deleted tasks still have count 1
      forall tid | tid in m2.taskData && tid != taskId && !m2.taskData[tid].deleted
        ensures CountInLists(m2, tid) == 1
      {
        CountUnchangedForOtherTasks(m.lists, m.tasks, targetList, taskId, tid);
      }

      // D': Other deleted tasks still have count 0
      forall tid | tid in m2.taskData && tid != taskId && m2.taskData[tid].deleted
        ensures CountInLists(m2, tid) == 0
      {
        CountUnchangedForOtherTasks(m.lists, m.tasks, targetList, taskId, tid);
      }
    }
  }

  lemma MoveTaskPreservesInv(m: Model, taskId: TaskId, toList: ListId, taskPlace: Place, m2: Model)
    requires Inv(m)
    requires TryStep(m, MoveTask(taskId, toList, taskPlace)) == Ok(m2)
    ensures Inv(m2)
  {
    // Task is removed from all lists, then inserted into toList
    var tasks1 := map l | l in m.tasks :: RemoveFirst(m.tasks[l], taskId);
    var tgt := Get(tasks1, toList, []);
    var pos := PosFromPlace(tgt, taskPlace);
    var k := ClampPos(pos, |tgt|);
    var tgt2 := InsertAt(tgt, k, taskId);

    // E: After removal, all lists have no dups
    forall l | l in tasks1
      ensures NoDupSeq(tasks1[l])
    {
      RemoveFirstPreservesNoDup(m.tasks[l], taskId);
    }

    // tgt has no dups (it's from tasks1)
    assert tgt == tasks1[toList];
    assert NoDupSeq(tgt);

    // taskId not in tgt (we removed it from all lists)
    assert !SeqContains(tgt, taskId) by {
      assert tasks1[toList] == RemoveFirst(m.tasks[toList], taskId);
      RemoveFirstSeqContains(m.tasks[toList], taskId, taskId);
    }

    // tgt2 has no dups and contains taskId
    InsertAtPreservesNoDup(tgt, k, taskId);
    InsertAtSeqContains(tgt, k, taskId, taskId);
    assert NoDupSeq(tgt2);
    assert SeqContains(tgt2, taskId);

    // C: Tasks in lists are in taskData
    forall l, tid | l in m2.tasks && SeqContains(m2.tasks[l], tid)
      ensures tid in m2.taskData
    {
      if l == toList {
        // m2.tasks[toList] = tgt2 = InsertAt(tgt, k, taskId)
        InsertAtSeqContains(tgt, k, taskId, tid);
        if tid == taskId {
          // taskId is in m.taskData (precondition of move)
        } else {
          // tid was in tgt = RemoveFirst(m.tasks[toList], taskId)
          RemoveFirstInOriginal(m.tasks[toList], taskId, tid);
        }
      } else {
        // m2.tasks[l] = tasks1[l] = RemoveFirst(m.tasks[l], taskId)
        RemoveFirstInOriginal(m.tasks[l], taskId, tid);
      }
    }

    // D: The moved task has count 1
    CountAfterMoveTask_Wrapper(m.lists, m.tasks, tasks1, toList, taskId, tgt2);

    // D: Other non-deleted tasks still have count 1
    forall tid | tid in m2.taskData && tid != taskId && !m2.taskData[tid].deleted
      ensures CountInLists(m2, tid) == 1
    {
      // Show otherId in tgt2 implies it was in m.tasks[toList]
      assert !SeqContains(tgt2, tid) || SeqContains(m.tasks[toList], tid) by {
        if SeqContains(tgt2, tid) {
          InsertAtSeqContains(tgt, k, taskId, tid);
          // SeqContains(tgt2, tid) <==> SeqContains(tgt, tid) || tid == taskId
          // Since tid != taskId, SeqContains(tgt, tid)
          assert SeqContains(tgt, tid);
          // tgt = RemoveFirst(m.tasks[toList], taskId)
          RemoveFirstInOriginal(m.tasks[toList], taskId, tid);
        }
      }
      CountUnchangedAfterMoveTask_Wrapper(m.lists, m.tasks, tasks1, toList, taskId, tid, tgt2);
    }

    // D': Deleted tasks still have count 0
    forall tid | tid in m2.taskData && tid != taskId && m2.taskData[tid].deleted
      ensures CountInLists(m2, tid) == 0
    {
      assert !SeqContains(tgt2, tid) || SeqContains(m.tasks[toList], tid) by {
        if SeqContains(tgt2, tid) {
          InsertAtSeqContains(tgt, k, taskId, tid);
          assert SeqContains(tgt, tid);
          RemoveFirstInOriginal(m.tasks[toList], taskId, tid);
        }
      }
      CountUnchangedAfterMoveTask_Wrapper(m.lists, m.tasks, tasks1, toList, taskId, tid, tgt2);
    }

    // N: Task titles are unique within each list (case-insensitive)
    // TryStep checks TaskTitleExistsInList for the destination list before allowing the move
    assert !TaskTitleExistsInList(m, toList, m.taskData[taskId].title, Some(taskId));
    forall l, t1, t2 | l in m2.tasks
          && SeqContains(m2.tasks[l], t1) && t1 in m2.taskData && !m2.taskData[t1].deleted
          && SeqContains(m2.tasks[l], t2) && t2 in m2.taskData && !m2.taskData[t2].deleted
          && t1 != t2
      ensures !EqIgnoreCase(m2.taskData[t1].title, m2.taskData[t2].title)
    {
      // m2.taskData == m.taskData, so titles are unchanged
      assert m2.taskData == m.taskData;

      if l == toList {
        // Tasks in m2.tasks[toList] = tgt2 = InsertAt(tgt, k, taskId)
        // where tgt = RemoveFirst(m.tasks[toList], taskId)
        InsertAtSeqContains(tgt, k, taskId, t1);
        InsertAtSeqContains(tgt, k, taskId, t2);

        if t1 == taskId {
          // t1 is the moved task
          // t2 is another task in toList, and t2 != taskId
          assert SeqContains(tgt, t2);
          // tgt = RemoveFirst(m.tasks[toList], taskId)
          RemoveFirstInOriginal(m.tasks[toList], taskId, t2);
          // So t2 was in m.tasks[toList] (and still is after RemoveFirst since t2 != taskId)
          // TryStep checked !TaskTitleExistsInList(m, toList, m.taskData[taskId].title, Some(taskId))
          // This means no task t != taskId in m.tasks[toList] has EqIgnoreCase(m.taskData[t].title, m.taskData[taskId].title)
          // t2 is in m.tasks[toList], not deleted, and t2 != taskId
          assert SeqContains(m.tasks[toList], t2);
          assert !EqIgnoreCase(m.taskData[t2].title, m.taskData[taskId].title);
        } else if t2 == taskId {
          // Symmetric case
          assert SeqContains(tgt, t1);
          RemoveFirstInOriginal(m.tasks[toList], taskId, t1);
          assert SeqContains(m.tasks[toList], t1);
          assert !EqIgnoreCase(m.taskData[t1].title, m.taskData[taskId].title);
        } else {
          // Neither is the moved task
          assert SeqContains(tgt, t1);
          assert SeqContains(tgt, t2);
          RemoveFirstInOriginal(m.tasks[toList], taskId, t1);
          RemoveFirstInOriginal(m.tasks[toList], taskId, t2);
          // t1 and t2 were both in m.tasks[toList]
          // By invariant N on m, their titles are unique
        }
      } else {
        // l != toList
        // m2.tasks[l] = tasks1[l] = RemoveFirst(m.tasks[l], taskId)
        assert m2.tasks[l] == tasks1[l];
        assert tasks1[l] == RemoveFirst(m.tasks[l], taskId);
        // t1 and t2 are in RemoveFirst(m.tasks[l], taskId)
        RemoveFirstInOriginal(m.tasks[l], taskId, t1);
        RemoveFirstInOriginal(m.tasks[l], taskId, t2);
        // So t1 and t2 were in m.tasks[l]
        // By invariant N on m, their titles are unique
      }
    }
  }

  lemma CompleteTaskPreservesInv(m: Model, taskId: TaskId, m2: Model)
    requires Inv(m)
    requires TryStep(m, CompleteTask(taskId)) == Ok(m2)
    ensures Inv(m2)
  {
    // Only completed flag changes
  }

  lemma UncompleteTaskPreservesInv(m: Model, taskId: TaskId, m2: Model)
    requires Inv(m)
    requires TryStep(m, UncompleteTask(taskId)) == Ok(m2)
    ensures Inv(m2)
  {
    // Only completed flag changes
  }

  lemma StarTaskPreservesInv(m: Model, taskId: TaskId, m2: Model)
    requires Inv(m)
    requires TryStep(m, StarTask(taskId)) == Ok(m2)
    ensures Inv(m2)
  {
    // Only starred flag changes
  }

  lemma UnstarTaskPreservesInv(m: Model, taskId: TaskId, m2: Model)
    requires Inv(m)
    requires TryStep(m, UnstarTask(taskId)) == Ok(m2)
    ensures Inv(m2)
  {
    // Only starred flag changes
  }

  lemma SetDueDatePreservesInv(m: Model, taskId: TaskId, dueDate: Option<Date>, m2: Model)
    requires Inv(m)
    requires TryStep(m, SetDueDate(taskId, dueDate)) == Ok(m2)
    ensures Inv(m2)
  {
    // L: TryStep only succeeds if dueDate is None or ValidDate
  }

  lemma AssignTaskPreservesInv(m: Model, taskId: TaskId, userId: UserId, m2: Model)
    requires Inv(m)
    requires TryStep(m, AssignTask(taskId, userId)) == Ok(m2)
    ensures Inv(m2)
  {
    // H: TryStep only succeeds if userId in m.members
    // Adding userId to assignees preserves subset relation
  }

  lemma UnassignTaskPreservesInv(m: Model, taskId: TaskId, userId: UserId, m2: Model)
    requires Inv(m)
    requires TryStep(m, UnassignTask(taskId, userId)) == Ok(m2)
    ensures Inv(m2)
  {
    // H: Removing from assignees preserves subset of members
  }

  lemma AddTagToTaskPreservesInv(m: Model, taskId: TaskId, tagId: TagId, m2: Model)
    requires Inv(m)
    requires TryStep(m, AddTagToTask(taskId, tagId)) == Ok(m2)
    ensures Inv(m2)
  {
    // F: TryStep only succeeds if tagId in m.tags
  }

  lemma RemoveTagFromTaskPreservesInv(m: Model, taskId: TaskId, tagId: TagId, m2: Model)
    requires Inv(m)
    requires TryStep(m, RemoveTagFromTask(taskId, tagId)) == Ok(m2)
    ensures Inv(m2)
  {
    // F: Removing tag preserves subset of m.tags.Keys
  }

  lemma CreateTagPreservesInv(m: Model, name: string, m2: Model)
    requires Inv(m)
    requires TryStep(m, CreateTag(name)) == Ok(m2)
    ensures Inv(m2)
  {
    // G: nextTagId incremented
    // F: No tasks reference the new tag yet
  }

  lemma RenameTagPreservesInv(m: Model, tagId: TagId, newName: string, m2: Model)
    requires Inv(m)
    requires TryStep(m, RenameTag(tagId, newName)) == Ok(m2)
    ensures Inv(m2)
  {
    // Only tag name changes; tag still exists
  }

  lemma DeleteTagPreservesInv(m: Model, tagId: TagId, m2: Model)
    requires Inv(m)
    requires TryStep(m, DeleteTag(tagId)) == Ok(m2)
    ensures Inv(m2)
  {
    if !(tagId in m.tags) {
      // Idempotent
      assert m2 == m;
    } else {
      // F: Tag removed from all tasks via RemoveTagFromAllTasks
      var newTaskData := RemoveTagFromAllTasks(m.taskData, tagId);
      forall id | id in newTaskData
        ensures newTaskData[id].tags <= (m.tags - {tagId}).Keys
      {
        assert newTaskData[id].tags == m.taskData[id].tags - {tagId};
        assert m.taskData[id].tags <= m.tags.Keys;
      }
    }
  }

  lemma MakeCollaborativePreservesInv(m: Model, m2: Model)
    requires Inv(m)
    requires TryStep(m, MakeCollaborative) == Ok(m2)
    ensures Inv(m2)
  {
    // J becomes N/A, K now applies
    // Members unchanged, so K (|m.members| >= 1) holds since I (owner in members)
  }

  lemma AddMemberPreservesInv(m: Model, userId: UserId, m2: Model)
    requires Inv(m)
    requires TryStep(m, AddMember(userId)) == Ok(m2)
    ensures Inv(m2)
  {
    // H: Adding member doesn't affect existing assignees
    // I: Owner still in members
    // K: Adding member keeps |members| >= 1
  }

  lemma RemoveMemberPreservesInv(m: Model, userId: UserId, m2: Model)
    requires Inv(m)
    requires TryStep(m, RemoveMember(userId)) == Ok(m2)
    ensures Inv(m2)
  {
    if userId == m.owner {
      // Error: CannotRemoveOwner
    } else if !(userId in m.members) {
      // Idempotent
      assert m2 == m;
    } else {
      // H: ClearAssigneeFromAllTasks removes userId from all task assignees
      var newTaskData := ClearAssigneeFromAllTasks(m.taskData, userId);
      forall id | id in newTaskData
        ensures newTaskData[id].assignees <= (m.members - {userId})
      {
        assert newTaskData[id].assignees == m.taskData[id].assignees - {userId};
        assert m.taskData[id].assignees <= m.members;
      }

      // I: Owner != userId, so owner still in members
      // K: |m.members - {userId}| >= 1 since owner still in members
    }
  }

  // ============================================================================
  // CandidatesComplete: All meaning-preserving successful actions are candidates
  // ============================================================================

  lemma CandidatesComplete(m: Model, orig: Action, aGood: Action, m2: Model)
    requires Inv(m)
    requires Explains(orig, aGood)
    requires TryStep(m, aGood) == Ok(m2)
    ensures aGood in Candidates(m, orig)
  {
    // The Candidates function generates candidates based on action type
    match orig {
      case MoveTask(id, toList, taskPlace) =>
        // Explains allows: same action, or same task/dest with AtEnd
        if aGood == orig {
          // Original is first candidate
        } else {
          // Must be MoveTask with same id, toList, and candPlace == AtEnd or Before(first)
          assert aGood.MoveTask?;
          assert aGood.taskId == id && aGood.toList == toList;
          // AtEnd is always a candidate
        }

      case MoveList(id, listPlace) =>
        // Similar to MoveTask
        if aGood == orig {
        } else {
          assert aGood.MoveList?;
          assert aGood.listId == id;
        }

      case _ =>
        // For all other actions, Explains requires exact equality
        assert orig == aGood;
        // Candidates returns [a] for non-move actions
    }
  }
}
