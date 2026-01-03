include "MultiCollaboration.dfy"

// =============================================================================
// TodoDomain: A collaborative Todo app with projects, lists, tasks, and tags
// =============================================================================
//
// Design decisions:
// - Tasks stay in place when completed (marked done, not moved)
// - Tasks can be assigned to multiple users (set<UserId>)
// - Tasks have optional due dates with timezone-aware validation
// - Tasks can be starred (surfaces to top as priority)
// - No subtasks for now (flat task list)
// - All lists are user-created and equivalent (no special "Inbox")
// - Tasks within lists are ordered and can be reordered
// - Projects start Personal or Collaborative; Personal can become Collaborative
// - Member roles: owner (exactly one) and members
// - Tags are project-scoped
// - Soft delete: deleted tasks stay in DB for restore capability
// - ListId is internal (nat), ListName is user-visible (string)
//
// Conflict resolution (Rebase):
// - DeleteTask conflicts: honor delete, both users notified (app layer)
// - RemoveMember + assignment: remove member, reject assignment
// - MoveList conflicts: remote wins, local warned (app layer)
//
// View layer:
// - Smart lists: Priority (starred, not completed, not deleted), Logbook (completed, not deleted)
// - Multi-project aggregation for "All Projects" view
// - All filtering/counting logic compiled to JS (not ghost)
//
// =============================================================================

module TodoDomain refines Domain {

  // ===========================================================================
  // Core Types
  // ===========================================================================

  type TaskId = nat
  type ListId = nat           // Internal ID, not user-visible
  type TagId = nat
  type UserId = string        // Supabase user IDs are UUIDs as strings

  datatype Option<T> = None | Some(value: T)

  // ---------------------------------------------------------------------------
  // Date with validation
  // ---------------------------------------------------------------------------
  // Note: Timezone handling happens at the app layer (JS Date conversion).
  // The Dafny spec stores dates in user's local timezone as provided by client.

  datatype Date = Date(year: nat, month: nat, day: nat)

  // Days in each month (non-leap year)
  function DaysInMonth(month: nat, year: nat): nat
  {
    if month == 1 then 31
    else if month == 2 then (if IsLeapYear(year) then 29 else 28)
    else if month == 3 then 31
    else if month == 4 then 30
    else if month == 5 then 31
    else if month == 6 then 30
    else if month == 7 then 31
    else if month == 8 then 31
    else if month == 9 then 30
    else if month == 10 then 31
    else if month == 11 then 30
    else if month == 12 then 31
    else 0  // Invalid month
  }

  predicate IsLeapYear(year: nat) {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
  }

  predicate ValidDate(d: Date) {
    d.year >= 1970 &&                           // Reasonable minimum
    d.month >= 1 && d.month <= 12 &&            // Valid month
    d.day >= 1 && d.day <= DaysInMonth(d.month, d.year)  // Valid day for month
  }

  // ---------------------------------------------------------------------------
  // Task data
  // ---------------------------------------------------------------------------

  datatype Task = Task(
    title: string,
    notes: string,
    completed: bool,
    starred: bool,             // Starred tasks surface as priority
    dueDate: Option<Date>,     // Optional due date
    assignees: set<UserId>,    // Who is this task assigned to? (multiple)
    tags: set<TagId>,          // Tags attached to this task
    deleted: bool,             // Soft delete flag
    deletedBy: Option<UserId>, // Who deleted it (for restore notification)
    deletedFromList: Option<ListId>  // Which list it was in (for restore)
  )

  // Tag data (just a name for now)
  datatype Tag = Tag(name: string)

  // Project collaboration mode
  datatype ProjectMode = Personal | Collaborative

  // The Model represents a single project's state
  // (Each Supabase project row contains one Model)
  datatype Model = Model(
    mode: ProjectMode,                    // Personal or Collaborative
    owner: UserId,                        // Project owner (exactly one)
    members: set<UserId>,                 // Users who can access (includes owner)
    lists: seq<ListId>,                   // Ordered list IDs (internal)
    listNames: map<ListId, string>,       // ListId -> user-visible name
    tasks: map<ListId, seq<TaskId>>,      // List -> ordered task IDs
    taskData: map<TaskId, Task>,          // TaskId -> Task
    tags: map<TagId, Tag>,                // TagId -> Tag
    nextListId: nat,                      // List ID allocator
    nextTaskId: nat,                      // Task ID allocator
    nextTagId: nat                        // Tag ID allocator
  )

  // ===========================================================================
  // Errors
  // ===========================================================================

  datatype Err =
    | MissingList
    | MissingTask
    | MissingTag
    | MissingUser
    | DuplicateList
    | DuplicateTask        // Task with same title already exists in list
    | DuplicateTag         // Tag with same name already exists in project
    | BadAnchor
    | NotAMember           // User not in project members
    | PersonalProject      // Tried to add member to personal project
    | AlreadyCollaborative // Tried to make collaborative when already is
    | CannotRemoveOwner    // Tried to remove the owner
    | TaskDeleted          // Tried to operate on deleted task
    | InvalidDate          // Due date failed validation
    | Rejected             // Kernel rejection (no candidate succeeded)

  function RejectErr(): Err { Rejected }

  // ===========================================================================
  // Anchor-based placement
  // ===========================================================================

  datatype Place =
    | AtEnd
    | Before(anchor: TaskId)
    | After(anchor: TaskId)

  datatype ListPlace =
    | ListAtEnd
    | ListBefore(anchor: ListId)
    | ListAfter(anchor: ListId)

  // ===========================================================================
  // Actions
  // ===========================================================================

  datatype Action =
    // No-op (useful for rebasing)
    | NoOp

    // List CRUD
    | AddList(name: string)                              // Creates list with name
    | RenameList(listId: ListId, newName: string)        // Rename existing list
    | DeleteList(listId: ListId)
    | MoveList(listId: ListId, listPlace: ListPlace)

    // Task CRUD
    | AddTask(listId: ListId, title: string)
    | EditTask(taskId: TaskId, title: string, notes: string)
    | DeleteTask(taskId: TaskId, userId: UserId)         // Soft delete, track who
    | RestoreTask(taskId: TaskId)                        // Undo soft delete
    | MoveTask(taskId: TaskId, toList: ListId, taskPlace: Place)

    // Task status
    | CompleteTask(taskId: TaskId)
    | UncompleteTask(taskId: TaskId)
    | StarTask(taskId: TaskId)
    | UnstarTask(taskId: TaskId)

    // Task due date
    | SetDueDate(taskId: TaskId, dueDate: Option<Date>)

    // Task assignment (multiple assignees)
    | AssignTask(taskId: TaskId, userId: UserId)      // Add assignee
    | UnassignTask(taskId: TaskId, userId: UserId)    // Remove assignee

    // Tags on tasks
    | AddTagToTask(taskId: TaskId, tagId: TagId)
    | RemoveTagFromTask(taskId: TaskId, tagId: TagId)

    // Tag CRUD (project-level)
    | CreateTag(name: string)
    | RenameTag(tagId: TagId, newName: string)
    | DeleteTag(tagId: TagId)

    // Project mode
    | MakeCollaborative    // Convert Personal -> Collaborative

    // Membership (collaborative projects only)
    | AddMember(userId: UserId)
    | RemoveMember(userId: UserId)

  // ===========================================================================
  // Invariant
  // ===========================================================================

  ghost predicate Inv(m: Model)
  {
    // A: Lists are unique
    NoDupSeq(m.lists)

    // B: listNames and tasks maps defined exactly on lists
    && (forall l :: l in m.listNames <==> SeqContains(m.lists, l))
    && (forall l :: l in m.tasks <==> SeqContains(m.lists, l))

    // C: Every taskId in any list exists in taskData
    && (forall l, id :: l in m.tasks && SeqContains(m.tasks[l], id) ==> id in m.taskData)

    // D: Every non-deleted task appears in exactly one list
    && (forall id :: id in m.taskData && !m.taskData[id].deleted ==> CountInLists(m, id) == 1)

    // D': Deleted tasks are not in any list (required for RestoreTask correctness)
    && (forall id :: id in m.taskData && m.taskData[id].deleted ==> CountInLists(m, id) == 0)

    // E: No duplicate task IDs within any single list
    && (forall l :: l in m.tasks ==> NoDupSeq(m.tasks[l]))

    // F: All tags referenced by tasks exist
    && (forall id :: id in m.taskData ==> m.taskData[id].tags <= m.tags.Keys)

    // G: Allocators fresh
    && (forall id :: SeqContains(m.lists, id) ==> id < m.nextListId)
    && (forall id :: id in m.taskData ==> id < m.nextTaskId)
    && (forall id :: id in m.tags ==> id < m.nextTagId)

    // H: Assignees must be members
    && (forall id :: id in m.taskData ==> m.taskData[id].assignees <= m.members)

    // I: Owner is always a member
    && m.owner in m.members

    // J: Personal projects have exactly one member (the owner)
    && (m.mode.Personal? ==> m.members == {m.owner})

    // K: Collaborative projects have at least one member
    && (m.mode.Collaborative? ==> |m.members| >= 1)

    // L: Due dates are valid if present
    && (forall id :: id in m.taskData && m.taskData[id].dueDate.Some?
          ==> ValidDate(m.taskData[id].dueDate.value))

    // M: List names are unique within the project (case-insensitive)
    && (forall l1, l2 :: l1 in m.listNames && l2 in m.listNames && l1 != l2
          ==> !EqIgnoreCase(m.listNames[l1], m.listNames[l2]))

    // N: Task titles are unique within each list (case-insensitive)
    && (forall l, t1, t2 :: l in m.tasks
          && SeqContains(m.tasks[l], t1) && t1 in m.taskData && !m.taskData[t1].deleted
          && SeqContains(m.tasks[l], t2) && t2 in m.taskData && !m.taskData[t2].deleted
          && t1 != t2
          ==> !EqIgnoreCase(m.taskData[t1].title, m.taskData[t2].title))

    // O: Tag names are unique within the project (case-insensitive)
    && (forall t1, t2 :: t1 in m.tags && t2 in m.tags && t1 != t2
          ==> !EqIgnoreCase(m.tags[t1].name, m.tags[t2].name))
  }

  // ===========================================================================
  // Initial Model
  // ===========================================================================

  // Placeholder for initial owner (will be replaced by app layer)
  const InitialOwner: UserId := ""

  function Init(): Model {
    Model(
      Personal,
      InitialOwner,         // owner
      {InitialOwner},       // members (owner only for Personal)
      [],                   // lists
      map[],                // listNames
      map[],                // tasks
      map[],                // taskData
      map[],                // tags
      0,                    // nextListId
      0,                    // nextTaskId
      0                     // nextTagId
    )
  }

  // ===========================================================================
  // Helper Functions
  // ===========================================================================

  predicate NoDupSeq<T(==)>(s: seq<T>)
  {
    forall i, j :: 0 <= i < j < |s| ==> s[i] != s[j]
  }

  function SeqContains<T(==)>(s: seq<T>, x: T): bool {
    exists i :: 0 <= i < |s| && s[i] == x
  }

  function RemoveFirst<T(==)>(s: seq<T>, x: T): seq<T>
  {
    if |s| == 0 then []
    else if s[0] == x then s[1..]
    else [s[0]] + RemoveFirst(s[1..], x)
  }

  function InsertAt<T>(s: seq<T>, i: nat, x: T): seq<T>
    requires i <= |s|
  {
    s[..i] + [x] + s[i..]
  }

  function IndexOf<T(==)>(s: seq<T>, x: T): int
  {
    if |s| == 0 then -1
    else if s[0] == x then 0
    else
      var j := IndexOf(s[1..], x);
      if j < 0 then -1 else j + 1
  }

  function ClampPos(pos: int, n: int): nat
    requires n >= 0
  {
    if pos <= 0 then 0
    else if pos >= n then n as nat
    else pos as nat
  }

  function Get<K,V>(mp: map<K,V>, k: K, d: V): V {
    if k in mp then mp[k] else d
  }

  function TaskList(m: Model, l: ListId): seq<TaskId> {
    Get(m.tasks, l, [])
  }

  // Find which list contains a task (returns None if not found)
  function FindListForTask(m: Model, taskId: TaskId): Option<ListId>
  {
    FindListForTaskHelper(m.lists, m.tasks, taskId)
  }

  function FindListForTaskHelper(lists: seq<ListId>, tasks: map<ListId, seq<TaskId>>, taskId: TaskId): Option<ListId>
  {
    if |lists| == 0 then None
    else
      var l := lists[0];
      var lane := if l in tasks then tasks[l] else [];
      if SeqContains(lane, taskId) then Some(l)
      else FindListForTaskHelper(lists[1..], tasks, taskId)
  }

  // Count occurrences of taskId across all lists
  function CountInLists(m: Model, id: TaskId): nat
  {
    CountInListsHelper(m.lists, m.tasks, id)
  }

  function CountInListsHelper(lists: seq<ListId>, tasks: map<ListId, seq<TaskId>>, id: TaskId): nat
  {
    if |lists| == 0 then 0
    else
      var l := lists[0];
      var lane := if l in tasks then tasks[l] else [];
      var here := if SeqContains(lane, id) then 1 else 0;
      here + CountInListsHelper(lists[1..], tasks, id)
  }

  // Position from anchor for tasks
  function PosFromPlace(lane: seq<TaskId>, p: Place): int
  {
    match p
      case AtEnd => |lane|
      case Before(a) =>
        var i := IndexOf(lane, a);
        if i < 0 then -1 else i
      case After(a) =>
        var i := IndexOf(lane, a);
        if i < 0 then -1 else i + 1
  }

  // Position from anchor for lists
  function PosFromListPlace(lists: seq<ListId>, p: ListPlace): int
  {
    match p
      case ListAtEnd => |lists|
      case ListBefore(a) =>
        var i := IndexOf(lists, a);
        if i < 0 then -1 else i
      case ListAfter(a) =>
        var i := IndexOf(lists, a);
        if i < 0 then -1 else i + 1
  }

  // Remove a tag from all tasks
  function RemoveTagFromAllTasks(taskData: map<TaskId, Task>, tagId: TagId): map<TaskId, Task>
  {
    map id | id in taskData ::
      var t := taskData[id];
      Task(t.title, t.notes, t.completed, t.starred, t.dueDate, t.assignees,
           t.tags - {tagId}, t.deleted, t.deletedBy, t.deletedFromList)
  }

  // Remove assignee from all tasks (when member is removed)
  function ClearAssigneeFromAllTasks(taskData: map<TaskId, Task>, userId: UserId): map<TaskId, Task>
  {
    map id | id in taskData ::
      var t := taskData[id];
      Task(t.title, t.notes, t.completed, t.starred, t.dueDate,
           t.assignees - {userId}, t.tags, t.deleted, t.deletedBy, t.deletedFromList)
  }

  // ---------------------------------------------------------------------------
  // Case-insensitive string comparison
  // ---------------------------------------------------------------------------

  // Convert a single character to lowercase
  function ToLowerChar(c: char): char
  {
    if 'A' <= c <= 'Z' then (c as int - 'A' as int + 'a' as int) as char
    else c
  }

  // Convert a string to lowercase
  function ToLower(s: string): string
  {
    if |s| == 0 then ""
    else [ToLowerChar(s[0])] + ToLower(s[1..])
  }

  // Case-insensitive string equality
  predicate EqIgnoreCase(a: string, b: string)
  {
    ToLower(a) == ToLower(b)
  }

  // Check if a list name exists (optionally excluding one list, for rename)
  // Uses case-insensitive comparison
  predicate ListNameExists(m: Model, name: string, excludeList: Option<ListId>)
  {
    exists l :: l in m.listNames &&
      (excludeList.None? || l != excludeList.value) &&
      EqIgnoreCase(m.listNames[l], name)
  }

  // Check if a task title exists in a specific list (optionally excluding one task, for edit)
  // Uses case-insensitive comparison
  predicate TaskTitleExistsInList(m: Model, listId: ListId, title: string, excludeTask: Option<TaskId>)
  {
    listId in m.tasks &&
    exists taskId :: taskId in m.taskData &&
      SeqContains(m.tasks[listId], taskId) &&
      !m.taskData[taskId].deleted &&
      (excludeTask.None? || taskId != excludeTask.value) &&
      EqIgnoreCase(m.taskData[taskId].title, title)
  }

  // Check if a tag name exists (optionally excluding one tag, for rename)
  // Uses case-insensitive comparison
  predicate TagNameExists(m: Model, name: string, excludeTag: Option<TagId>)
  {
    exists t :: t in m.tags &&
      (excludeTag.None? || t != excludeTag.value) &&
      EqIgnoreCase(m.tags[t].name, name)
  }

  // ===========================================================================
  // TryStep: Apply an action to the model
  // ===========================================================================

  function TryStep(m: Model, a: Action): Result<Model, Err>
  {
    match a

      case NoOp => Ok(m)

      // -----------------------------------------------------------------------
      // List operations
      // -----------------------------------------------------------------------

      case AddList(name) =>
        if ListNameExists(m, name, None) then Err(DuplicateList)
        else
          var id := m.nextListId;
          Ok(Model(
            m.mode, m.owner, m.members,
            m.lists + [id],
            m.listNames[id := name],
            m.tasks[id := []],
            m.taskData, m.tags,
            m.nextListId + 1, m.nextTaskId, m.nextTagId
          ))

      case RenameList(listId, newName) =>
        if !SeqContains(m.lists, listId) then Err(MissingList)
        else if ListNameExists(m, newName, Some(listId)) then Err(DuplicateList)
        else Ok(Model(
          m.mode, m.owner, m.members, m.lists,
          m.listNames[listId := newName],
          m.tasks, m.taskData, m.tags,
          m.nextListId, m.nextTaskId, m.nextTagId
        ))

      case DeleteList(listId) =>
        if !SeqContains(m.lists, listId) then Ok(m)  // Idempotent
        else
          var tasksToRemove := set id | id in TaskList(m, listId) :: id;
          var newTaskData := map id | id in m.taskData && id !in tasksToRemove :: m.taskData[id];
          var newLists := RemoveFirst(m.lists, listId);
          var newListNames := m.listNames - {listId};
          var newTasks := m.tasks - {listId};
          Ok(Model(
            m.mode, m.owner, m.members, newLists, newListNames, newTasks, newTaskData, m.tags,
            m.nextListId, m.nextTaskId, m.nextTagId
          ))

      case MoveList(listId, listPlace) =>
        if !SeqContains(m.lists, listId) then Err(MissingList)
        else
          var lists1 := RemoveFirst(m.lists, listId);
          var pos := PosFromListPlace(lists1, listPlace);
          if pos < 0 then Err(BadAnchor)
          else
            var k := ClampPos(pos, |lists1|);
            var newLists := InsertAt(lists1, k, listId);
            Ok(Model(
              m.mode, m.owner, m.members, newLists, m.listNames, m.tasks, m.taskData, m.tags,
              m.nextListId, m.nextTaskId, m.nextTagId
            ))

      // -----------------------------------------------------------------------
      // Task CRUD
      // -----------------------------------------------------------------------

      case AddTask(listId, title) =>
        if !SeqContains(m.lists, listId) then Err(MissingList)
        else if TaskTitleExistsInList(m, listId, title, None) then Err(DuplicateTask)
        else
          var id := m.nextTaskId;
          var newTask := Task(title, "", false, false, None, {}, {}, false, None, None);
          Ok(Model(
            m.mode, m.owner, m.members, m.lists, m.listNames,
            m.tasks[listId := TaskList(m, listId) + [id]],
            m.taskData[id := newTask],
            m.tags,
            m.nextListId, m.nextTaskId + 1, m.nextTagId
          ))

      case EditTask(taskId, title, notes) =>
        if !(taskId in m.taskData) then Err(MissingTask)
        else if m.taskData[taskId].deleted then Err(TaskDeleted)
        else
          var currentList := FindListForTask(m, taskId);
          if currentList.Some? && TaskTitleExistsInList(m, currentList.value, title, Some(taskId))
          then Err(DuplicateTask)
          else
            var t := m.taskData[taskId];
            var updated := Task(title, notes, t.completed, t.starred, t.dueDate,
                                t.assignees, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
            Ok(Model(
              m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks,
              m.taskData[taskId := updated], m.tags,
              m.nextListId, m.nextTaskId, m.nextTagId
            ))

      case DeleteTask(taskId, userId) =>
        if !(taskId in m.taskData) then Ok(m)  // Idempotent
        else if m.taskData[taskId].deleted then Ok(m)  // Already deleted
        else
          // Soft delete: mark as deleted, record which list, remove from list
          var t := m.taskData[taskId];
          var fromList := FindListForTask(m, taskId);
          var updated := Task(t.title, t.notes, t.completed, t.starred, t.dueDate,
                              t.assignees, t.tags, true, Some(userId), fromList);
          var newTasks := map l | l in m.tasks :: RemoveFirst(m.tasks[l], taskId);
          Ok(Model(
            m.mode, m.owner, m.members, m.lists, m.listNames, newTasks,
            m.taskData[taskId := updated], m.tags,
            m.nextListId, m.nextTaskId, m.nextTagId
          ))

      case RestoreTask(taskId) =>
        if !(taskId in m.taskData) then Err(MissingTask)
        else if !m.taskData[taskId].deleted then Ok(m)  // Not deleted, idempotent
        else if |m.lists| == 0 then Err(MissingList)  // No lists to restore to
        else
          // Restore: clear deleted flag, add back to original list (or first if original gone)
          var t := m.taskData[taskId];
          // Try original list first, fall back to first list
          var targetList :=
            if t.deletedFromList.Some? && SeqContains(m.lists, t.deletedFromList.value)
            then t.deletedFromList.value
            else m.lists[0];
          // Check for duplicate title in target list
          if TaskTitleExistsInList(m, targetList, t.title, None) then Err(DuplicateTask)
          else
            var updated := Task(t.title, t.notes, t.completed, t.starred, t.dueDate,
                                t.assignees, t.tags, false, None, None);
            Ok(Model(
              m.mode, m.owner, m.members, m.lists, m.listNames,
              m.tasks[targetList := TaskList(m, targetList) + [taskId]],
              m.taskData[taskId := updated], m.tags,
              m.nextListId, m.nextTaskId, m.nextTagId
            ))

      case MoveTask(taskId, toList, taskPlace) =>
        if !(taskId in m.taskData) then Err(MissingTask)
        else if m.taskData[taskId].deleted then Err(TaskDeleted)
        else if !SeqContains(m.lists, toList) then Err(MissingList)
        // Check for duplicate title in destination list (exclude this task since it's moving)
        else if TaskTitleExistsInList(m, toList, m.taskData[taskId].title, Some(taskId))
        then Err(DuplicateTask)
        else
          var tasks1 := map l | l in m.tasks :: RemoveFirst(m.tasks[l], taskId);
          var tgt := Get(tasks1, toList, []);
          var pos := PosFromPlace(tgt, taskPlace);
          if pos < 0 then Err(BadAnchor)
          else
            var k := ClampPos(pos, |tgt|);
            var tgt2 := InsertAt(tgt, k, taskId);
            Ok(Model(
              m.mode, m.owner, m.members, m.lists, m.listNames,
              tasks1[toList := tgt2], m.taskData, m.tags,
              m.nextListId, m.nextTaskId, m.nextTagId
            ))

      // -----------------------------------------------------------------------
      // Task status
      // -----------------------------------------------------------------------

      case CompleteTask(taskId) =>
        if !(taskId in m.taskData) then Err(MissingTask)
        else if m.taskData[taskId].deleted then Err(TaskDeleted)
        else
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, true, t.starred, t.dueDate,
                              t.assignees, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
          Ok(Model(
            m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks,
            m.taskData[taskId := updated], m.tags,
            m.nextListId, m.nextTaskId, m.nextTagId
          ))

      case UncompleteTask(taskId) =>
        if !(taskId in m.taskData) then Err(MissingTask)
        else if m.taskData[taskId].deleted then Err(TaskDeleted)
        else
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, false, t.starred, t.dueDate,
                              t.assignees, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
          Ok(Model(
            m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks,
            m.taskData[taskId := updated], m.tags,
            m.nextListId, m.nextTaskId, m.nextTagId
          ))

      case StarTask(taskId) =>
        if !(taskId in m.taskData) then Err(MissingTask)
        else if m.taskData[taskId].deleted then Err(TaskDeleted)
        else
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, t.completed, true, t.dueDate,
                              t.assignees, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
          Ok(Model(
            m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks,
            m.taskData[taskId := updated], m.tags,
            m.nextListId, m.nextTaskId, m.nextTagId
          ))

      case UnstarTask(taskId) =>
        if !(taskId in m.taskData) then Err(MissingTask)
        else if m.taskData[taskId].deleted then Err(TaskDeleted)
        else
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, t.completed, false, t.dueDate,
                              t.assignees, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
          Ok(Model(
            m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks,
            m.taskData[taskId := updated], m.tags,
            m.nextListId, m.nextTaskId, m.nextTagId
          ))

      // -----------------------------------------------------------------------
      // Task due date
      // -----------------------------------------------------------------------

      case SetDueDate(taskId, dueDate) =>
        if !(taskId in m.taskData) then Err(MissingTask)
        else if m.taskData[taskId].deleted then Err(TaskDeleted)
        else if dueDate.Some? && !ValidDate(dueDate.value) then Err(InvalidDate)
        else
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, t.completed, t.starred, dueDate,
                              t.assignees, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
          Ok(Model(
            m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks,
            m.taskData[taskId := updated], m.tags,
            m.nextListId, m.nextTaskId, m.nextTagId
          ))

      // -----------------------------------------------------------------------
      // Task assignment
      // -----------------------------------------------------------------------

      case AssignTask(taskId, userId) =>
        if !(taskId in m.taskData) then Err(MissingTask)
        else if m.taskData[taskId].deleted then Err(TaskDeleted)
        else if !(userId in m.members) then Err(NotAMember)
        else
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, t.completed, t.starred, t.dueDate,
                              t.assignees + {userId}, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
          Ok(Model(
            m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks,
            m.taskData[taskId := updated], m.tags,
            m.nextListId, m.nextTaskId, m.nextTagId
          ))

      case UnassignTask(taskId, userId) =>
        if !(taskId in m.taskData) then Err(MissingTask)
        else if m.taskData[taskId].deleted then Err(TaskDeleted)
        else
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, t.completed, t.starred, t.dueDate,
                              t.assignees - {userId}, t.tags, t.deleted, t.deletedBy, t.deletedFromList);
          Ok(Model(
            m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks,
            m.taskData[taskId := updated], m.tags,
            m.nextListId, m.nextTaskId, m.nextTagId
          ))

      // -----------------------------------------------------------------------
      // Tags on tasks
      // -----------------------------------------------------------------------

      case AddTagToTask(taskId, tagId) =>
        if !(taskId in m.taskData) then Err(MissingTask)
        else if m.taskData[taskId].deleted then Err(TaskDeleted)
        else if !(tagId in m.tags) then Err(MissingTag)
        else
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, t.completed, t.starred, t.dueDate,
                              t.assignees, t.tags + {tagId}, t.deleted, t.deletedBy, t.deletedFromList);
          Ok(Model(
            m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks,
            m.taskData[taskId := updated], m.tags,
            m.nextListId, m.nextTaskId, m.nextTagId
          ))

      case RemoveTagFromTask(taskId, tagId) =>
        if !(taskId in m.taskData) then Err(MissingTask)
        else if m.taskData[taskId].deleted then Err(TaskDeleted)
        else
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, t.completed, t.starred, t.dueDate,
                              t.assignees, t.tags - {tagId}, t.deleted, t.deletedBy, t.deletedFromList);
          Ok(Model(
            m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks,
            m.taskData[taskId := updated], m.tags,
            m.nextListId, m.nextTaskId, m.nextTagId
          ))

      // -----------------------------------------------------------------------
      // Tag CRUD
      // -----------------------------------------------------------------------

      case CreateTag(name) =>
        if TagNameExists(m, name, None) then Err(DuplicateTag)
        else
          var id := m.nextTagId;
          Ok(Model(
            m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks, m.taskData,
            m.tags[id := Tag(name)],
            m.nextListId, m.nextTaskId, m.nextTagId + 1
          ))

      case RenameTag(tagId, newName) =>
        if !(tagId in m.tags) then Err(MissingTag)
        else if TagNameExists(m, newName, Some(tagId)) then Err(DuplicateTag)
        else Ok(Model(
          m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks, m.taskData,
          m.tags[tagId := Tag(newName)],
          m.nextListId, m.nextTaskId, m.nextTagId
        ))

      case DeleteTag(tagId) =>
        if !(tagId in m.tags) then Ok(m)  // Idempotent
        else
          var newTaskData := RemoveTagFromAllTasks(m.taskData, tagId);
          var newTags := m.tags - {tagId};
          Ok(Model(
            m.mode, m.owner, m.members, m.lists, m.listNames, m.tasks, newTaskData, newTags,
            m.nextListId, m.nextTaskId, m.nextTagId
          ))

      // -----------------------------------------------------------------------
      // Project mode
      // -----------------------------------------------------------------------

      case MakeCollaborative =>
        if m.mode.Collaborative? then Ok(m)  // Already collaborative, idempotent
        else
          Ok(Model(
            Collaborative, m.owner, m.members, m.lists, m.listNames, m.tasks, m.taskData, m.tags,
            m.nextListId, m.nextTaskId, m.nextTagId
          ))

      // -----------------------------------------------------------------------
      // Membership
      // -----------------------------------------------------------------------

      case AddMember(userId) =>
        if m.mode.Personal? then Err(PersonalProject)
        else if userId in m.members then Ok(m)  // Idempotent
        else Ok(Model(
          m.mode, m.owner, m.members + {userId}, m.lists, m.listNames, m.tasks, m.taskData, m.tags,
          m.nextListId, m.nextTaskId, m.nextTagId
        ))

      case RemoveMember(userId) =>
        if userId == m.owner then Err(CannotRemoveOwner)
        else if !(userId in m.members) then Ok(m)  // Idempotent
        else
          // Clear assignments to removed user
          var newTaskData := ClearAssigneeFromAllTasks(m.taskData, userId);
          Ok(Model(
            m.mode, m.owner, m.members - {userId}, m.lists, m.listNames, m.tasks, newTaskData, m.tags,
            m.nextListId, m.nextTaskId, m.nextTagId
          ))
  }

  // ===========================================================================
  // Collaboration Hooks
  // ===========================================================================

  // Helper: degrade place to AtEnd if anchor is the moved task
  function DegradeIfAnchorMoved(movedId: TaskId, p: Place): Place
  {
    match p
      case AtEnd => AtEnd
      case Before(a) => if a == movedId then AtEnd else p
      case After(a) => if a == movedId then AtEnd else p
  }

  // Helper: degrade list place to AtEnd if anchor is the moved list
  function DegradeIfListAnchorMoved(movedId: ListId, p: ListPlace): ListPlace
  {
    match p
      case ListAtEnd => ListAtEnd
      case ListBefore(a) => if a == movedId then ListAtEnd else p
      case ListAfter(a) => if a == movedId then ListAtEnd else p
  }

  // Rebase: intent-aware transformation of local action given remote action
  function Rebase(remote: Action, local: Action): Action
  {
    match (remote, local)
      case (NoOp, _) => local
      case (_, NoOp) => NoOp

      // -----------------------------------------------------------------------
      // DeleteTask conflicts: honor delete, local op becomes NoOp
      // (app layer notifies both users of the conflict)
      // -----------------------------------------------------------------------
      case (DeleteTask(rid, _), EditTask(lid, _, _)) =>
        if rid == lid then NoOp else local
      case (DeleteTask(rid, _), MoveTask(lid, _, _)) =>
        if rid == lid then NoOp else local
      case (DeleteTask(rid, _), CompleteTask(lid)) =>
        if rid == lid then NoOp else local
      case (DeleteTask(rid, _), UncompleteTask(lid)) =>
        if rid == lid then NoOp else local
      case (DeleteTask(rid, _), StarTask(lid)) =>
        if rid == lid then NoOp else local
      case (DeleteTask(rid, _), UnstarTask(lid)) =>
        if rid == lid then NoOp else local
      case (DeleteTask(rid, _), SetDueDate(lid, _)) =>
        if rid == lid then NoOp else local
      case (DeleteTask(rid, _), AssignTask(lid, _)) =>
        if rid == lid then NoOp else local
      case (DeleteTask(rid, _), UnassignTask(lid, _)) =>
        if rid == lid then NoOp else local
      case (DeleteTask(rid, _), AddTagToTask(lid, _)) =>
        if rid == lid then NoOp else local
      case (DeleteTask(rid, _), RemoveTagFromTask(lid, _)) =>
        if rid == lid then NoOp else local

      // -----------------------------------------------------------------------
      // RemoveMember conflicts: member is removed, assignment becomes NoOp
      // -----------------------------------------------------------------------
      case (RemoveMember(ruid), AssignTask(taskId, luid)) =>
        if ruid == luid then NoOp else local

      // -----------------------------------------------------------------------
      // MoveList conflicts: remote wins, local becomes NoOp
      // (app layer warns local user their move couldn't be applied)
      // -----------------------------------------------------------------------
      case (MoveList(rid, _), MoveList(lid, _)) =>
        if rid == lid then NoOp else local

      // -----------------------------------------------------------------------
      // MoveTask conflicts: same task -> keep local (LWW), different -> degrade anchor
      // -----------------------------------------------------------------------
      case (MoveTask(rid, _, _), MoveTask(lid, ltoList, lplace)) =>
        if rid == lid then local
        else MoveTask(lid, ltoList, DegradeIfAnchorMoved(rid, lplace))

      // -----------------------------------------------------------------------
      // Task edits: keep local (LWW)
      // -----------------------------------------------------------------------
      case (EditTask(_, _, _), EditTask(_, _, _)) => local
      case (CompleteTask(_), CompleteTask(_)) => local
      case (UncompleteTask(_), UncompleteTask(_)) => local
      case (StarTask(_), StarTask(_)) => local
      case (UnstarTask(_), UnstarTask(_)) => local
      case (AssignTask(_, _), AssignTask(_, _)) => local
      case (UnassignTask(_, _), UnassignTask(_, _)) => local
      case (SetDueDate(_, _), SetDueDate(_, _)) => local

      // Default: keep local
      case (_, _) => local
  }

  // Ghost predicate: is candidate a meaning-preserving interpretation of orig?
  ghost predicate Explains(orig: Action, cand: Action)
  {
    match (orig, cand)
      // MoveTask: same task, same destination, placement is original or AtEnd
      case (MoveTask(oid, otoList, origPlace), MoveTask(cid, ctoList, candPlace)) =>
        oid == cid && otoList == ctoList &&
        (candPlace == origPlace || candPlace == AtEnd)

      // MoveList: same list, placement is original or AtEnd
      case (MoveList(oid, origPlace), MoveList(cid, candPlace)) =>
        oid == cid &&
        (candPlace == origPlace || candPlace == ListAtEnd)

      // All other actions: exact equality
      case (_, _) => orig == cand
  }

  // Candidates: list of actions to try for conflict resolution
  function Candidates(m: Model, a: Action): seq<Action>
  {
    match a
      case MoveTask(id, toList, taskPlace) =>
        var lane := TaskList(m, toList);
        if taskPlace == AtEnd then
          [MoveTask(id, toList, AtEnd)]
        else if |lane| == 0 then
          [MoveTask(id, toList, taskPlace), MoveTask(id, toList, AtEnd)]
        else
          var first := lane[0];
          [MoveTask(id, toList, taskPlace),
           MoveTask(id, toList, AtEnd),
           MoveTask(id, toList, Before(first))]

      case MoveList(id, listPlace) =>
        if listPlace == ListAtEnd then
          [MoveList(id, ListAtEnd)]
        else if |m.lists| == 0 then
          [MoveList(id, listPlace), MoveList(id, ListAtEnd)]
        else
          var first := m.lists[0];
          [MoveList(id, listPlace),
           MoveList(id, ListAtEnd),
           MoveList(id, ListBefore(first))]

      case _ =>
        [a]
  }

  // ===========================================================================
  // View Layer: Smart Lists and Aggregation (all compiled, not ghost)
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------------------

  type ProjectId = string   // Supabase project UUIDs

  datatype ViewMode =
    | SingleProject         // View one project at a time
    | AllProjects           // Aggregate view across all projects

  datatype SmartListType =
    | Priority              // Starred, not completed, not deleted
    | Logbook               // Completed, not deleted

  // ---------------------------------------------------------------------------
  // Smart List Predicates (compiled)
  // ---------------------------------------------------------------------------

  // A task appears in the Priority smart list if:
  // - It is starred
  // - It is NOT completed
  // - It is NOT deleted
  predicate IsPriorityTask(t: Task)
  {
    t.starred && !t.completed && !t.deleted
  }

  // A task appears in the Logbook smart list if:
  // - It IS completed
  // - It is NOT deleted
  predicate IsLogbookTask(t: Task)
  {
    t.completed && !t.deleted
  }

  // A task is visible (not soft-deleted)
  predicate IsVisibleTask(t: Task)
  {
    !t.deleted
  }

  // Check if a task matches a smart list filter
  predicate MatchesSmartList(t: Task, smartList: SmartListType)
  {
    match smartList
      case Priority => IsPriorityTask(t)
      case Logbook => IsLogbookTask(t)
  }

  // ---------------------------------------------------------------------------
  // Single-Project Query Functions (compiled)
  // ---------------------------------------------------------------------------

  // Get all visible (non-deleted) task IDs in a model
  function GetVisibleTaskIds(m: Model): set<TaskId>
  {
    set id | id in m.taskData && IsVisibleTask(m.taskData[id]) :: id
  }

  // Get all task IDs matching a smart list filter
  function GetSmartListTaskIds(m: Model, smartList: SmartListType): set<TaskId>
  {
    set id | id in m.taskData && MatchesSmartList(m.taskData[id], smartList) :: id
  }

  // Get priority task IDs
  function GetPriorityTaskIds(m: Model): set<TaskId>
  {
    set id | id in m.taskData && IsPriorityTask(m.taskData[id]) :: id
  }

  // Get logbook task IDs
  function GetLogbookTaskIds(m: Model): set<TaskId>
  {
    set id | id in m.taskData && IsLogbookTask(m.taskData[id]) :: id
  }

  // Count tasks matching a smart list filter
  function CountSmartListTasks(m: Model, smartList: SmartListType): nat
  {
    |GetSmartListTaskIds(m, smartList)|
  }

  // Count priority tasks
  function CountPriorityTasks(m: Model): nat
  {
    |GetPriorityTaskIds(m)|
  }

  // Count logbook tasks
  function CountLogbookTasks(m: Model): nat
  {
    |GetLogbookTaskIds(m)|
  }

  // Count visible tasks in a list
  function CountVisibleTasksInList(m: Model, listId: ListId): nat
  {
    if listId !in m.tasks then 0
    else CountVisibleInSeq(m.tasks[listId], m.taskData)
  }

  function CountVisibleInSeq(ids: seq<TaskId>, taskData: map<TaskId, Task>): nat
  {
    if |ids| == 0 then 0
    else
      var head := ids[0];
      var countHead := if head in taskData && IsVisibleTask(taskData[head]) then 1 else 0;
      countHead + CountVisibleInSeq(ids[1..], taskData)
  }

  // ---------------------------------------------------------------------------
  // Task Accessors (compiled)
  // ---------------------------------------------------------------------------

  // Get a task by ID (returns None if not found or deleted)
  function GetTask(m: Model, taskId: TaskId): Option<Task>
  {
    if taskId in m.taskData && IsVisibleTask(m.taskData[taskId])
    then Some(m.taskData[taskId])
    else None
  }

  // Get a task by ID including deleted (for trash view)
  function GetTaskIncludingDeleted(m: Model, taskId: TaskId): Option<Task>
  {
    if taskId in m.taskData then Some(m.taskData[taskId]) else None
  }

  // Get all tasks in a list (ordered, visible only)
  function GetTasksInList(m: Model, listId: ListId): seq<TaskId>
  {
    if listId !in m.tasks then []
    else FilterVisibleTasks(m.tasks[listId], m.taskData)
  }

  function FilterVisibleTasks(ids: seq<TaskId>, taskData: map<TaskId, Task>): seq<TaskId>
  {
    if |ids| == 0 then []
    else
      var head := ids[0];
      var rest := FilterVisibleTasks(ids[1..], taskData);
      if head in taskData && IsVisibleTask(taskData[head])
      then [head] + rest
      else rest
  }

  // Get list name
  function GetListName(m: Model, listId: ListId): Option<string>
  {
    if listId in m.listNames then Some(m.listNames[listId]) else None
  }

  // Get all list IDs (ordered)
  function GetLists(m: Model): seq<ListId>
  {
    m.lists
  }

  // Get tag name
  function GetTagName(m: Model, tagId: TagId): Option<string>
  {
    if tagId in m.tags then Some(m.tags[tagId].name) else None
  }

  // Get all tag IDs
  function GetTags(m: Model): set<TagId>
  {
    m.tags.Keys
  }

  // ---------------------------------------------------------------------------
  // Multi-Project Aggregation (compiled)
  // ---------------------------------------------------------------------------

  // A collection of loaded projects
  datatype MultiModel = MultiModel(projects: map<ProjectId, Model>)

  // Empty multi-model
  function EmptyMultiModel(): MultiModel
  {
    MultiModel(map[])
  }

  // Add or update a project in the multi-model
  function SetProject(mm: MultiModel, projectId: ProjectId, model: Model): MultiModel
  {
    MultiModel(mm.projects[projectId := model])
  }

  // Remove a project from the multi-model
  function RemoveProject(mm: MultiModel, projectId: ProjectId): MultiModel
  {
    MultiModel(mm.projects - {projectId})
  }

  // Get a project from the multi-model
  function GetProject(mm: MultiModel, projectId: ProjectId): Option<Model>
  {
    if projectId in mm.projects then Some(mm.projects[projectId]) else None
  }

  // Get all project IDs
  function GetProjectIds(mm: MultiModel): set<ProjectId>
  {
    mm.projects.Keys
  }

  // Count projects
  function CountProjects(mm: MultiModel): nat
  {
    |mm.projects|
  }

  // ---------------------------------------------------------------------------
  // Multi-Project Smart List Functions (compiled)
  // ---------------------------------------------------------------------------

  // Tagged task ID: includes project context
  datatype TaggedTaskId = TaggedTaskId(projectId: ProjectId, taskId: TaskId)

  // Get all priority tasks across all projects
  function GetAllPriorityTasks(mm: MultiModel): set<TaggedTaskId>
  {
    set pid, tid | pid in mm.projects && tid in GetPriorityTaskIds(mm.projects[pid])
      :: TaggedTaskId(pid, tid)
  }

  // Get all logbook tasks across all projects
  function GetAllLogbookTasks(mm: MultiModel): set<TaggedTaskId>
  {
    set pid, tid | pid in mm.projects && tid in GetLogbookTaskIds(mm.projects[pid])
      :: TaggedTaskId(pid, tid)
  }

  // Get all tasks matching a smart list across all projects
  function GetAllSmartListTasks(mm: MultiModel, smartList: SmartListType): set<TaggedTaskId>
  {
    match smartList
      case Priority => GetAllPriorityTasks(mm)
      case Logbook => GetAllLogbookTasks(mm)
  }

  // Count priority tasks across all projects
  function CountAllPriorityTasks(mm: MultiModel): nat
  {
    |GetAllPriorityTasks(mm)|
  }

  // Count logbook tasks across all projects
  function CountAllLogbookTasks(mm: MultiModel): nat
  {
    |GetAllLogbookTasks(mm)|
  }

  // Count tasks matching a smart list across all projects
  function CountAllSmartListTasks(mm: MultiModel, smartList: SmartListType): nat
  {
    |GetAllSmartListTasks(mm, smartList)|
  }

  // ---------------------------------------------------------------------------
  // View State (compiled) - What the UI is currently showing
  // ---------------------------------------------------------------------------

  datatype SidebarSelection =
    | NoSelection                                    // Nothing selected
    | SmartListSelected(smartList: SmartListType)    // Priority or Logbook
    | ProjectSelected(projectId: ProjectId)          // A specific project
    | ListSelected(projectId: ProjectId, listId: ListId)  // A specific list

  datatype ViewState = ViewState(
    viewMode: ViewMode,                    // Single or All
    selection: SidebarSelection,           // What's selected in sidebar
    loadedProjects: MultiModel             // All loaded project data
  )

  // Initial view state: All Projects mode, no selection
  function InitViewState(): ViewState
  {
    ViewState(AllProjects, NoSelection, EmptyMultiModel())
  }

  // ---------------------------------------------------------------------------
  // View State Transitions (compiled)
  // ---------------------------------------------------------------------------

  // Set view mode
  function SetViewMode(vs: ViewState, mode: ViewMode): ViewState
  {
    ViewState(mode, vs.selection, vs.loadedProjects)
  }

  // Select a smart list
  function SelectSmartList(vs: ViewState, smartList: SmartListType): ViewState
  {
    ViewState(vs.viewMode, SmartListSelected(smartList), vs.loadedProjects)
  }

  // Select a project
  function SelectProject(vs: ViewState, projectId: ProjectId): ViewState
  {
    ViewState(vs.viewMode, ProjectSelected(projectId), vs.loadedProjects)
  }

  // Select a list within a project
  function SelectList(vs: ViewState, projectId: ProjectId, listId: ListId): ViewState
  {
    ViewState(vs.viewMode, ListSelected(projectId, listId), vs.loadedProjects)
  }

  // Clear selection
  function ClearSelection(vs: ViewState): ViewState
  {
    ViewState(vs.viewMode, NoSelection, vs.loadedProjects)
  }

  // Load a project into the view state
  function LoadProject(vs: ViewState, projectId: ProjectId, model: Model): ViewState
  {
    ViewState(vs.viewMode, vs.selection, SetProject(vs.loadedProjects, projectId, model))
  }

  // Unload a project from the view state
  function UnloadProject(vs: ViewState, projectId: ProjectId): ViewState
  {
    ViewState(vs.viewMode, vs.selection, RemoveProject(vs.loadedProjects, projectId))
  }

  // ---------------------------------------------------------------------------
  // View State Queries (compiled) - What should the UI display?
  // ---------------------------------------------------------------------------

  // Get tasks to display based on current selection
  function GetTasksToDisplay(vs: ViewState): set<TaggedTaskId>
  {
    match vs.selection
      case NoSelection => {}
      case SmartListSelected(smartList) =>
        // In AllProjects mode: aggregate across all loaded projects
        // In SingleProject mode: should only have one project loaded
        GetAllSmartListTasks(vs.loadedProjects, smartList)
      case ProjectSelected(projectId) =>
        // All visible tasks in the project
        if projectId in vs.loadedProjects.projects then
          var m := vs.loadedProjects.projects[projectId];
          set tid | tid in GetVisibleTaskIds(m) :: TaggedTaskId(projectId, tid)
        else {}
      case ListSelected(projectId, listId) =>
        // Tasks in the specific list
        if projectId in vs.loadedProjects.projects then
          var m := vs.loadedProjects.projects[projectId];
          set tid | tid in m.taskData &&
                    listId in m.tasks &&
                    SeqContains(m.tasks[listId], tid) &&
                    IsVisibleTask(m.taskData[tid])
            :: TaggedTaskId(projectId, tid)
        else {}
  }

  // Get count to display for a smart list (respects view mode)
  function GetSmartListCount(vs: ViewState, smartList: SmartListType): nat
  {
    CountAllSmartListTasks(vs.loadedProjects, smartList)
  }

  // Check if a project is loaded
  function IsProjectLoaded(vs: ViewState, projectId: ProjectId): bool
  {
    projectId in vs.loadedProjects.projects
  }

  // ===========================================================================
  // Ghost Invariants for View Layer
  // ===========================================================================

  // View state is consistent: selection refers to loaded data
  ghost predicate ViewStateConsistent(vs: ViewState)
  {
    match vs.selection
      case NoSelection => true
      case SmartListSelected(_) => true  // Smart lists always valid
      case ProjectSelected(projectId) =>
        projectId in vs.loadedProjects.projects
      case ListSelected(projectId, listId) =>
        projectId in vs.loadedProjects.projects &&
        listId in vs.loadedProjects.projects[projectId].listNames
  }

  // Key invariant: Count matches actual task set size
  // This ensures the "count shows but no tasks" bug cannot happen
  ghost predicate CountMatchesTasks(vs: ViewState, smartList: SmartListType)
  {
    GetSmartListCount(vs, smartList) == |GetAllSmartListTasks(vs.loadedProjects, smartList)|
  }

  // This is trivially true by definition, but stating it explicitly
  // ensures the UI uses the same logic for both
  lemma CountMatchesTasksAlways(vs: ViewState, smartList: SmartListType)
    ensures CountMatchesTasks(vs, smartList)
  {
    // Trivial: both sides call the same underlying function
  }

  // ===========================================================================
  // Proof Obligations (stubs)
  // ===========================================================================

  lemma InitSatisfiesInv()
    ensures Inv(Init())
  {
    // Empty model trivially satisfies invariant
  }

  lemma StepPreservesInv(m: Model, a: Action, m2: Model)
  {
    assume {:axiom} Inv(m2);  // Proof in TodoMultiCollaborationProof.StepPreservesInv
  }

  lemma CandidatesComplete(m: Model, orig: Action, aGood: Action, m2: Model)
  {
    // Proof by case analysis on orig
    match orig {
      case MoveTask(id, toList, origPlace) =>
        // Explains requires: aGood == MoveTask(id, toList, candPlace)
        // where candPlace == origPlace || candPlace == AtEnd
        var MoveTask(_, _, candPlace) := aGood;
        var cands := Candidates(m, orig);
        if origPlace == AtEnd {
          // cands == [MoveTask(id, toList, AtEnd)]
          assert candPlace == AtEnd || candPlace == origPlace;
          assert aGood == MoveTask(id, toList, AtEnd);
        } else {
          // cands includes origPlace and AtEnd
          if candPlace == origPlace {
            assert aGood == MoveTask(id, toList, origPlace);
            assert MoveTask(id, toList, origPlace) in cands;
          } else {
            assert candPlace == AtEnd;
            assert aGood == MoveTask(id, toList, AtEnd);
            assert MoveTask(id, toList, AtEnd) in cands;
          }
        }

      case MoveList(id, origPlace) =>
        var MoveList(_, candPlace) := aGood;
        var cands := Candidates(m, orig);
        if origPlace == ListAtEnd {
          assert candPlace == ListAtEnd || candPlace == origPlace;
          assert aGood == MoveList(id, ListAtEnd);
        } else {
          if candPlace == origPlace {
            assert aGood == MoveList(id, origPlace);
            assert MoveList(id, origPlace) in cands;
          } else {
            assert candPlace == ListAtEnd;
            assert aGood == MoveList(id, ListAtEnd);
            assert MoveList(id, ListAtEnd) in cands;
          }
        }

      case _ =>
        // For all other actions, Explains requires orig == aGood
        // and Candidates returns [orig]
        assert aGood == orig;
        assert Candidates(m, orig) == [orig];
    }
  }
}

// =============================================================================
// MultiCollaboration kernel instantiation
// =============================================================================

module TodoMultiCollaboration refines MultiCollaboration {
  import D = TodoDomain
}

// =============================================================================
// AppCore: Client-side API
// =============================================================================

module TodoAppCore {
  import K = TodoDomain
  import MC = TodoMultiCollaboration

  // Re-export ClientState from MultiCollaboration (like KanbanAppCore)
  type ClientState = MC.ClientState

  // Initialize server with owner
  function InitServerWithOwner(mode: K.ProjectMode, ownerId: K.UserId): MC.ServerState
  {
    var initModel := K.Model(
      mode,
      ownerId,      // owner
      {ownerId},    // members (owner is always a member)
      [],           // No lists yet
      map[],        // listNames
      map[],        // tasks
      map[],        // taskData
      map[],        // tags
      0,            // nextListId
      0,            // nextTaskId
      0             // nextTagId
    );
    MC.ServerState(initModel, [], [])
  }

  // Create client from server state
  function InitClientFromServer(server: MC.ServerState): ClientState
  {
    MC.InitClientFromServer(server)
  }

  // Local dispatch (optimistic)
  function ClientLocalDispatch(client: ClientState, action: K.Action): ClientState
  {
    MC.ClientLocalDispatch(client, action)
  }

  // Accessors
  function ServerVersion(server: MC.ServerState): nat { MC.Version(server) }
  function ServerModel(server: MC.ServerState): K.Model { server.present }
  function ClientModel(client: ClientState): K.Model { MC.ClientModel(client) }
  function ClientVersion(client: ClientState): nat { MC.ClientVersion(client) }
  function PendingCount(client: ClientState): nat { MC.PendingCount(client) }

  // Additional functions needed by EffectStateMachine
  function InitClient(version: nat, model: K.Model): ClientState {
    MC.InitClient(version, model)
  }

  function HandleRealtimeUpdate(client: ClientState, serverVersion: nat, serverModel: K.Model): ClientState {
    MC.HandleRealtimeUpdate(client, serverVersion, serverModel)
  }
}
