/*
TodoMultiCollaborationSanity.dfy - Complete Enumeration of NoOp Cases

This module proves that we have identified ALL cases where TryStep(m, a) == Ok(m).
A NoOp occurs when an action leaves the model unchanged.

== Explicit NoOp ==

NoOpAction:
  The NoOp action always returns the same model.

== Idempotent Operations (designed to be idempotent) ==

NoOpDeleteListMissing:
  DeleteList on a non-existent list returns Ok(m) unchanged.

NoOpDeleteTaskMissing:
  DeleteTask on a non-existent task returns Ok(m) unchanged.

NoOpDeleteTaskAlreadyDeleted:
  DeleteTask on an already-deleted task returns Ok(m) unchanged.

NoOpRestoreTaskNotDeleted:
  RestoreTask on a non-deleted task returns Ok(m) unchanged.

NoOpDeleteTagMissing:
  DeleteTag on a non-existent tag returns Ok(m) unchanged.

NoOpMakeCollaborativeAlready:
  MakeCollaborative on an already-collaborative project returns Ok(m) unchanged.

NoOpAddMemberAlready:
  AddMember for an existing member returns Ok(m) unchanged.

NoOpRemoveMemberMissing:
  RemoveMember for a non-member returns Ok(m) unchanged.

== Zero-Effect Operations (operation results in same state) ==

NoOpRenameListSameName:
  RenameList to the same name produces identical model.

NoOpEditTaskSameContent:
  EditTask with same title and notes produces identical model.

NoOpMoveListSamePosition:
  MoveList that results in the same position produces identical model.

NoOpMoveTaskSamePosition:
  MoveTask that results in the same position produces identical model.

NoOpSetDueDateSame:
  SetDueDate with the same due date produces identical model.

NoOpRenameTagSameName:
  RenameTag to the same name produces identical model.

NoOpCompleteTaskAlready:
  CompleteTask on an already-completed task produces identical model.

NoOpUncompleteTaskAlready:
  UncompleteTask on an already-uncompleted task produces identical model.

NoOpStarTaskAlready:
  StarTask on an already-starred task produces identical model.

NoOpUnstarTaskAlready:
  UnstarTask on an already-unstarred task produces identical model.

NoOpAssignTaskAlready:
  AssignTask for an already-assigned user produces identical model.

NoOpUnassignTaskMissing:
  UnassignTask for a non-assigned user produces identical model.

NoOpAddTagToTaskAlready:
  AddTagToTask for an already-attached tag produces identical model.

NoOpRemoveTagFromTaskMissing:
  RemoveTagFromTask for a non-attached tag produces identical model.

== Main Theorems ==

IsNoOp:
  Predicate combining all NoOp cases.

CheckNoOps:
  If TryStep(m, a) == Ok(m), then IsNoOp(m, a). (Completeness)

NoOpImpliesUnchanged:
  If IsNoOp(m, a), then TryStep(m, a) == Ok(m). (Soundness)
*/

include "TodoMultiCollaboration.dfy"

module TodoMultiCollaborationSanity {
  import opened TD = TodoDomain

  // ============================================================================
  // NoOp Case Predicates
  // ============================================================================

  // --- Explicit NoOp ---

  predicate NoOpAction(a: Action) {
    a.NoOp?
  }

  // --- Idempotent Operations ---

  // DeleteList on non-existent list
  predicate NoOpDeleteListMissing(m: Model, a: Action) {
    a.DeleteList? && !SeqContains(m.lists, a.listId)
  }

  // DeleteTask on non-existent task
  predicate NoOpDeleteTaskMissing(m: Model, a: Action) {
    a.DeleteTask? && !(a.taskId in m.taskData)
  }

  // DeleteTask on already-deleted task
  predicate NoOpDeleteTaskAlreadyDeleted(m: Model, a: Action) {
    a.DeleteTask? && a.taskId in m.taskData && m.taskData[a.taskId].deleted
  }

  // RestoreTask on non-deleted task
  predicate NoOpRestoreTaskNotDeleted(m: Model, a: Action) {
    a.RestoreTask? && a.taskId in m.taskData && !m.taskData[a.taskId].deleted
  }

  // DeleteTag on non-existent tag
  predicate NoOpDeleteTagMissing(m: Model, a: Action) {
    a.DeleteTag? && !(a.tagId in m.tags)
  }

  // MakeCollaborative on already-collaborative project
  predicate NoOpMakeCollaborativeAlready(m: Model, a: Action) {
    a.MakeCollaborative? && m.mode.Collaborative?
  }

  // AddMember for existing member
  predicate NoOpAddMemberAlready(m: Model, a: Action) {
    a.AddMember? && m.mode.Collaborative? && a.userId in m.members
  }

  // RemoveMember for non-member
  predicate NoOpRemoveMemberMissing(m: Model, a: Action) {
    a.RemoveMember? && !(a.userId in m.members)
  }

  // --- Zero-Effect Operations ---

  // RenameList to same name
  predicate NoOpRenameListSameName(m: Model, a: Action) {
    a.RenameList? &&
    SeqContains(m.lists, a.listId) &&
    a.listId in m.listNames &&
    m.listNames[a.listId] == a.newName
  }

  // EditTask with same content
  predicate NoOpEditTaskSameContent(m: Model, a: Action) {
    a.EditTask? &&
    a.taskId in m.taskData &&
    !m.taskData[a.taskId].deleted &&
    m.taskData[a.taskId].title == a.title &&
    m.taskData[a.taskId].notes == a.notes
  }

  // SetDueDate with same date
  predicate NoOpSetDueDateSame(m: Model, a: Action) {
    a.SetDueDate? &&
    a.taskId in m.taskData &&
    !m.taskData[a.taskId].deleted &&
    m.taskData[a.taskId].dueDate == a.dueDate
  }

  // RenameTag to same name
  predicate NoOpRenameTagSameName(m: Model, a: Action) {
    a.RenameTag? &&
    a.tagId in m.tags &&
    m.tags[a.tagId].name == a.newName
  }

  // CompleteTask on already-completed task
  predicate NoOpCompleteTaskAlready(m: Model, a: Action) {
    a.CompleteTask? &&
    a.taskId in m.taskData &&
    !m.taskData[a.taskId].deleted &&
    m.taskData[a.taskId].completed
  }

  // UncompleteTask on already-uncompleted task
  predicate NoOpUncompleteTaskAlready(m: Model, a: Action) {
    a.UncompleteTask? &&
    a.taskId in m.taskData &&
    !m.taskData[a.taskId].deleted &&
    !m.taskData[a.taskId].completed
  }

  // StarTask on already-starred task
  predicate NoOpStarTaskAlready(m: Model, a: Action) {
    a.StarTask? &&
    a.taskId in m.taskData &&
    !m.taskData[a.taskId].deleted &&
    m.taskData[a.taskId].starred
  }

  // UnstarTask on already-unstarred task
  predicate NoOpUnstarTaskAlready(m: Model, a: Action) {
    a.UnstarTask? &&
    a.taskId in m.taskData &&
    !m.taskData[a.taskId].deleted &&
    !m.taskData[a.taskId].starred
  }

  // AssignTask for already-assigned user
  predicate NoOpAssignTaskAlready(m: Model, a: Action) {
    a.AssignTask? &&
    a.taskId in m.taskData &&
    !m.taskData[a.taskId].deleted &&
    a.userId in m.members &&
    a.userId in m.taskData[a.taskId].assignees
  }

  // UnassignTask for non-assigned user
  predicate NoOpUnassignTaskMissing(m: Model, a: Action) {
    a.UnassignTask? &&
    a.taskId in m.taskData &&
    !m.taskData[a.taskId].deleted &&
    !(a.userId in m.taskData[a.taskId].assignees)
  }

  // AddTagToTask for already-attached tag
  predicate NoOpAddTagToTaskAlready(m: Model, a: Action) {
    a.AddTagToTask? &&
    a.taskId in m.taskData &&
    !m.taskData[a.taskId].deleted &&
    a.tagId in m.tags &&
    a.tagId in m.taskData[a.taskId].tags
  }

  // RemoveTagFromTask for non-attached tag
  predicate NoOpRemoveTagFromTaskMissing(m: Model, a: Action) {
    a.RemoveTagFromTask? &&
    a.taskId in m.taskData &&
    !m.taskData[a.taskId].deleted &&
    !(a.tagId in m.taskData[a.taskId].tags)
  }

  // MoveList that results in same position
  // This is tricky - need to check if position is unchanged
  predicate NoOpMoveListSamePosition(m: Model, a: Action)
    requires Inv(m)
  {
    a.MoveList? &&
    SeqContains(m.lists, a.listId) &&
    var lists1 := RemoveFirst(m.lists, a.listId);
    var pos := PosFromListPlace(lists1, a.listPlace);
    pos >= 0 &&
    var k := ClampPos(pos, |lists1|);
    InsertAt(lists1, k, a.listId) == m.lists
  }

  // MoveTask that results in same position
  predicate NoOpMoveTaskSamePosition(m: Model, a: Action)
    requires Inv(m)
  {
    a.MoveTask? &&
    a.taskId in m.taskData &&
    !m.taskData[a.taskId].deleted &&
    SeqContains(m.lists, a.toList) &&
    var tasks1 := map l | l in m.tasks :: RemoveFirst(m.tasks[l], a.taskId);
    var tgt := Get(tasks1, a.toList, []);
    var pos := PosFromPlace(tgt, a.taskPlace);
    pos >= 0 &&
    var k := ClampPos(pos, |tgt|);
    tasks1[a.toList := InsertAt(tgt, k, a.taskId)] == m.tasks
  }

  // ============================================================================
  // Main Predicate: Complete enumeration of all NoOp cases
  // ============================================================================

  predicate IsNoOp(m: Model, a: Action)
    requires Inv(m)
  {
    // Explicit NoOp
    NoOpAction(a) ||
    // Idempotent operations
    NoOpDeleteListMissing(m, a) ||
    NoOpDeleteTaskMissing(m, a) ||
    NoOpDeleteTaskAlreadyDeleted(m, a) ||
    NoOpRestoreTaskNotDeleted(m, a) ||
    NoOpDeleteTagMissing(m, a) ||
    NoOpMakeCollaborativeAlready(m, a) ||
    NoOpAddMemberAlready(m, a) ||
    NoOpRemoveMemberMissing(m, a) ||
    // Zero-effect operations
    NoOpRenameListSameName(m, a) ||
    NoOpEditTaskSameContent(m, a) ||
    NoOpSetDueDateSame(m, a) ||
    NoOpRenameTagSameName(m, a) ||
    NoOpCompleteTaskAlready(m, a) ||
    NoOpUncompleteTaskAlready(m, a) ||
    NoOpStarTaskAlready(m, a) ||
    NoOpUnstarTaskAlready(m, a) ||
    NoOpAssignTaskAlready(m, a) ||
    NoOpUnassignTaskMissing(m, a) ||
    NoOpAddTagToTaskAlready(m, a) ||
    NoOpRemoveTagFromTaskMissing(m, a) ||
    NoOpMoveListSamePosition(m, a) ||
    NoOpMoveTaskSamePosition(m, a)
  }

  // ============================================================================
  // Main Theorem: Completeness - If TryStep(m, a) == Ok(m), then IsNoOp(m, a)
  // ============================================================================

  lemma CheckNoOps(m: Model, a: Action)
    requires Inv(m)
    requires TryStep(m, a) == Ok(m)
    ensures IsNoOp(m, a)
  {
    match a {
      case NoOp =>
        assert NoOpAction(a);

      case AddList(name) =>
        // AddList always creates a new list with fresh ID, so m2 != m
        var id := m.nextListId;
        var m2 := Model(m.mode, m.owner, m.members,
                        m.lists + [id],
                        m.listNames[id := name],
                        m.tasks[id := []],
                        m.taskData, m.tags,
                        m.nextListId + 1, m.nextTaskId, m.nextTagId);
        assert TryStep(m, a) == Ok(m2);
        assert m2.nextListId != m.nextListId;
        assert m2 != m;
        assert false; // Contradiction

      case RenameList(listId, newName) =>
        if !SeqContains(m.lists, listId) {
          // Error case, doesn't reach Ok(m)
          assert false;
        } else {
          var m2 := Model(m.mode, m.owner, m.members, m.lists,
                          m.listNames[listId := newName],
                          m.tasks, m.taskData, m.tags,
                          m.nextListId, m.nextTaskId, m.nextTagId);
          assert TryStep(m, a) == Ok(m2);
          assert m == m2;
          assert m.listNames[listId := newName] == m.listNames;
          assert m.listNames[listId] == newName;
          assert NoOpRenameListSameName(m, a);
        }

      case DeleteList(listId) =>
        if !SeqContains(m.lists, listId) {
          assert NoOpDeleteListMissing(m, a);
        } else {
          // Non-trivial delete changes the model
          assert false; // Should not reach Ok(m) for existing list
        }

      case MoveList(listId, listPlace) =>
        if !SeqContains(m.lists, listId) {
          // Error case
          assert false;
        } else {
          // Position unchanged case
          assert NoOpMoveListSamePosition(m, a);
        }

      case AddTask(listId, title) =>
        // Always creates new task with fresh ID
        if !SeqContains(m.lists, listId) {
          assert false; // Error case
        } else {
          var id := m.nextTaskId;
          var m2 := Model(m.mode, m.owner, m.members, m.lists, m.listNames,
                          m.tasks[listId := TaskList(m, listId) + [id]],
                          m.taskData[id := Task(title, "", false, false, None, {}, {}, false, None, None)],
                          m.tags,
                          m.nextListId, m.nextTaskId + 1, m.nextTagId);
          assert TryStep(m, a) == Ok(m2);
          assert m2.nextTaskId != m.nextTaskId;
          assert m2 != m;
          assert false;
        }

      case EditTask(taskId, title, notes) =>
        if !(taskId in m.taskData) || m.taskData[taskId].deleted {
          assert false; // Error cases
        } else {
          var t := m.taskData[taskId];
          var updated := Task(title, notes, t.completed, t.starred, t.dueDate,
                              t.assignees, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
          var m2 := Model(m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks,
                          m.taskData[taskId := updated], m.tags,
                          m.nextListId, m.nextTaskId, m.nextTagId);
          assert TryStep(m, a) == Ok(m2);
          assert m == m2;
          assert t.title == title && t.notes == notes;
          assert NoOpEditTaskSameContent(m, a);
        }

      case DeleteTask(taskId, userId) =>
        if !(taskId in m.taskData) {
          assert NoOpDeleteTaskMissing(m, a);
        } else if m.taskData[taskId].deleted {
          assert NoOpDeleteTaskAlreadyDeleted(m, a);
        } else {
          // Non-trivial delete changes model
          assert false;
        }

      case RestoreTask(taskId) =>
        if !(taskId in m.taskData) {
          assert false; // Error
        } else if !m.taskData[taskId].deleted {
          assert NoOpRestoreTaskNotDeleted(m, a);
        } else {
          // Restore changes model
          assert false;
        }

      case MoveTask(taskId, toList, taskPlace) =>
        if !(taskId in m.taskData) || m.taskData[taskId].deleted || !SeqContains(m.lists, toList) {
          assert false; // Error cases
        } else {
          // Position unchanged case
          assert NoOpMoveTaskSamePosition(m, a);
        }

      case CompleteTask(taskId) =>
        if !(taskId in m.taskData) || m.taskData[taskId].deleted {
          assert false;
        } else {
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, true, t.starred, t.dueDate,
                              t.assignees, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
          var m2 := Model(m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks,
                          m.taskData[taskId := updated], m.tags,
                          m.nextListId, m.nextTaskId, m.nextTagId);
          assert TryStep(m, a) == Ok(m2);
          assert m == m2;
          assert t.completed;
          assert NoOpCompleteTaskAlready(m, a);
        }

      case UncompleteTask(taskId) =>
        if !(taskId in m.taskData) || m.taskData[taskId].deleted {
          assert false;
        } else {
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, false, t.starred, t.dueDate,
                              t.assignees, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
          var m2 := Model(m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks,
                          m.taskData[taskId := updated], m.tags,
                          m.nextListId, m.nextTaskId, m.nextTagId);
          assert TryStep(m, a) == Ok(m2);
          assert m == m2;
          assert !t.completed;
          assert NoOpUncompleteTaskAlready(m, a);
        }

      case StarTask(taskId) =>
        if !(taskId in m.taskData) || m.taskData[taskId].deleted {
          assert false;
        } else {
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, t.completed, true, t.dueDate,
                              t.assignees, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
          var m2 := Model(m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks,
                          m.taskData[taskId := updated], m.tags,
                          m.nextListId, m.nextTaskId, m.nextTagId);
          assert TryStep(m, a) == Ok(m2);
          assert m == m2;
          assert t.starred;
          assert NoOpStarTaskAlready(m, a);
        }

      case UnstarTask(taskId) =>
        if !(taskId in m.taskData) || m.taskData[taskId].deleted {
          assert false;
        } else {
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, t.completed, false, t.dueDate,
                              t.assignees, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
          var m2 := Model(m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks,
                          m.taskData[taskId := updated], m.tags,
                          m.nextListId, m.nextTaskId, m.nextTagId);
          assert TryStep(m, a) == Ok(m2);
          assert m == m2;
          assert !t.starred;
          assert NoOpUnstarTaskAlready(m, a);
        }

      case SetDueDate(taskId, dueDate) =>
        if !(taskId in m.taskData) || m.taskData[taskId].deleted {
          assert false;
        } else if dueDate.Some? && !ValidDate(dueDate.value) {
          assert false;
        } else {
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, t.completed, t.starred, dueDate,
                              t.assignees, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
          var m2 := Model(m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks,
                          m.taskData[taskId := updated], m.tags,
                          m.nextListId, m.nextTaskId, m.nextTagId);
          assert TryStep(m, a) == Ok(m2);
          assert m == m2;
          assert t.dueDate == dueDate;
          assert NoOpSetDueDateSame(m, a);
        }

      case AssignTask(taskId, userId) =>
        if !(taskId in m.taskData) || m.taskData[taskId].deleted || !(userId in m.members) {
          assert false;
        } else {
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, t.completed, t.starred, t.dueDate,
                              t.assignees + {userId}, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
          var m2 := Model(m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks,
                          m.taskData[taskId := updated], m.tags,
                          m.nextListId, m.nextTaskId, m.nextTagId);
          assert TryStep(m, a) == Ok(m2);
          assert m == m2;
          assert t.assignees + {userId} == t.assignees;
          assert userId in t.assignees;
          assert NoOpAssignTaskAlready(m, a);
        }

      case UnassignTask(taskId, userId) =>
        if !(taskId in m.taskData) || m.taskData[taskId].deleted {
          assert false;
        } else {
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, t.completed, t.starred, t.dueDate,
                              t.assignees - {userId}, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
          var m2 := Model(m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks,
                          m.taskData[taskId := updated], m.tags,
                          m.nextListId, m.nextTaskId, m.nextTagId);
          assert TryStep(m, a) == Ok(m2);
          assert m == m2;
          assert t.assignees - {userId} == t.assignees;
          assert !(userId in t.assignees);
          assert NoOpUnassignTaskMissing(m, a);
        }

      case AddTagToTask(taskId, tagId) =>
        if !(taskId in m.taskData) || m.taskData[taskId].deleted || !(tagId in m.tags) {
          assert false;
        } else {
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, t.completed, t.starred, t.dueDate,
                              t.assignees, t.tags + {tagId}, t.deleted, t.deletedBy, t.deletedFromList);
          var m2 := Model(m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks,
                          m.taskData[taskId := updated], m.tags,
                          m.nextListId, m.nextTaskId, m.nextTagId);
          assert TryStep(m, a) == Ok(m2);
          assert m == m2;
          assert t.tags + {tagId} == t.tags;
          assert tagId in t.tags;
          assert NoOpAddTagToTaskAlready(m, a);
        }

      case RemoveTagFromTask(taskId, tagId) =>
        if !(taskId in m.taskData) || m.taskData[taskId].deleted {
          assert false;
        } else {
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, t.completed, t.starred, t.dueDate,
                              t.assignees, t.tags - {tagId}, t.deleted, t.deletedBy, t.deletedFromList);
          var m2 := Model(m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks,
                          m.taskData[taskId := updated], m.tags,
                          m.nextListId, m.nextTaskId, m.nextTagId);
          assert TryStep(m, a) == Ok(m2);
          assert m == m2;
          assert t.tags - {tagId} == t.tags;
          assert !(tagId in t.tags);
          assert NoOpRemoveTagFromTaskMissing(m, a);
        }

      case CreateTag(name) =>
        // Always creates new tag with fresh ID
        var id := m.nextTagId;
        var m2 := Model(m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks, m.taskData,
                        m.tags[id := Tag(name)],
                        m.nextListId, m.nextTaskId, m.nextTagId + 1);
        assert TryStep(m, a) == Ok(m2);
        assert m2.nextTagId != m.nextTagId;
        assert m2 != m;
        assert false;

      case RenameTag(tagId, newName) =>
        if !(tagId in m.tags) {
          assert false;
        } else {
          var m2 := Model(m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks, m.taskData,
                          m.tags[tagId := Tag(newName)],
                          m.nextListId, m.nextTaskId, m.nextTagId);
          assert TryStep(m, a) == Ok(m2);
          assert m == m2;
          assert m.tags[tagId := Tag(newName)] == m.tags;
          assert m.tags[tagId].name == newName;
          assert NoOpRenameTagSameName(m, a);
        }

      case DeleteTag(tagId) =>
        if !(tagId in m.tags) {
          assert NoOpDeleteTagMissing(m, a);
        } else {
          // Non-trivial delete changes model
          assert false;
        }

      case MakeCollaborative =>
        if m.mode.Collaborative? {
          assert NoOpMakeCollaborativeAlready(m, a);
        } else {
          // Changes mode
          assert false;
        }

      case AddMember(userId) =>
        if m.mode.Personal? {
          assert false; // Error
        } else if userId in m.members {
          assert NoOpAddMemberAlready(m, a);
        } else {
          // Adds member
          assert false;
        }

      case RemoveMember(userId) =>
        if userId == m.owner {
          assert false; // Error
        } else if !(userId in m.members) {
          assert NoOpRemoveMemberMissing(m, a);
        } else {
          // Removes member
          assert false;
        }
    }
  }

  // ============================================================================
  // Converse Theorem: Soundness - If IsNoOp(m, a), then TryStep(m, a) == Ok(m)
  // ============================================================================

  lemma NoOpImpliesUnchanged(m: Model, a: Action)
    requires Inv(m)
    requires IsNoOp(m, a)
    ensures TryStep(m, a) == Ok(m)
  {
    if NoOpAction(a) {
      assert TryStep(m, a) == Ok(m);
    } else if NoOpDeleteListMissing(m, a) {
      assert TryStep(m, a) == Ok(m);
    } else if NoOpDeleteTaskMissing(m, a) {
      assert TryStep(m, a) == Ok(m);
    } else if NoOpDeleteTaskAlreadyDeleted(m, a) {
      assert TryStep(m, a) == Ok(m);
    } else if NoOpRestoreTaskNotDeleted(m, a) {
      assert TryStep(m, a) == Ok(m);
    } else if NoOpDeleteTagMissing(m, a) {
      assert TryStep(m, a) == Ok(m);
    } else if NoOpMakeCollaborativeAlready(m, a) {
      assert TryStep(m, a) == Ok(m);
    } else if NoOpAddMemberAlready(m, a) {
      assert TryStep(m, a) == Ok(m);
    } else if NoOpRemoveMemberMissing(m, a) {
      assert TryStep(m, a) == Ok(m);
    } else if NoOpRenameListSameName(m, a) {
      assert m.listNames[a.listId := a.newName] == m.listNames;
    } else if NoOpEditTaskSameContent(m, a) {
      var t := m.taskData[a.taskId];
      var updated := Task(a.title, a.notes, t.completed, t.starred, t.dueDate,
                          t.assignees, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
      assert updated == t;
      assert m.taskData[a.taskId := updated] == m.taskData;
    } else if NoOpSetDueDateSame(m, a) {
      var t := m.taskData[a.taskId];
      var updated := Task(t.title, t.notes, t.completed, t.starred, a.dueDate,
                          t.assignees, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
      assert updated == t;
      assert m.taskData[a.taskId := updated] == m.taskData;
    } else if NoOpRenameTagSameName(m, a) {
      assert m.tags[a.tagId := Tag(a.newName)] == m.tags;
    } else if NoOpCompleteTaskAlready(m, a) {
      var t := m.taskData[a.taskId];
      var updated := Task(t.title, t.notes, true, t.starred, t.dueDate,
                          t.assignees, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
      assert updated == t;
      assert m.taskData[a.taskId := updated] == m.taskData;
    } else if NoOpUncompleteTaskAlready(m, a) {
      var t := m.taskData[a.taskId];
      var updated := Task(t.title, t.notes, false, t.starred, t.dueDate,
                          t.assignees, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
      assert updated == t;
      assert m.taskData[a.taskId := updated] == m.taskData;
    } else if NoOpStarTaskAlready(m, a) {
      var t := m.taskData[a.taskId];
      var updated := Task(t.title, t.notes, t.completed, true, t.dueDate,
                          t.assignees, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
      assert updated == t;
      assert m.taskData[a.taskId := updated] == m.taskData;
    } else if NoOpUnstarTaskAlready(m, a) {
      var t := m.taskData[a.taskId];
      var updated := Task(t.title, t.notes, t.completed, false, t.dueDate,
                          t.assignees, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
      assert updated == t;
      assert m.taskData[a.taskId := updated] == m.taskData;
    } else if NoOpAssignTaskAlready(m, a) {
      var t := m.taskData[a.taskId];
      assert t.assignees + {a.userId} == t.assignees;
      var updated := Task(t.title, t.notes, t.completed, t.starred, t.dueDate,
                          t.assignees + {a.userId}, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
      assert updated == t;
      assert m.taskData[a.taskId := updated] == m.taskData;
    } else if NoOpUnassignTaskMissing(m, a) {
      var t := m.taskData[a.taskId];
      assert t.assignees - {a.userId} == t.assignees;
      var updated := Task(t.title, t.notes, t.completed, t.starred, t.dueDate,
                          t.assignees - {a.userId}, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
      assert updated == t;
      assert m.taskData[a.taskId := updated] == m.taskData;
    } else if NoOpAddTagToTaskAlready(m, a) {
      var t := m.taskData[a.taskId];
      assert t.tags + {a.tagId} == t.tags;
      var updated := Task(t.title, t.notes, t.completed, t.starred, t.dueDate,
                          t.assignees, t.tags + {a.tagId}, t.deleted, t.deletedBy, t.deletedFromList);
      assert updated == t;
      assert m.taskData[a.taskId := updated] == m.taskData;
    } else if NoOpRemoveTagFromTaskMissing(m, a) {
      var t := m.taskData[a.taskId];
      assert t.tags - {a.tagId} == t.tags;
      var updated := Task(t.title, t.notes, t.completed, t.starred, t.dueDate,
                          t.assignees, t.tags - {a.tagId}, t.deleted, t.deletedBy, t.deletedFromList);
      assert updated == t;
      assert m.taskData[a.taskId := updated] == m.taskData;
    } else if NoOpMoveListSamePosition(m, a) {
      // Position unchanged means result == m
    } else if NoOpMoveTaskSamePosition(m, a) {
      // Position unchanged means result == m
    }
  }
}
