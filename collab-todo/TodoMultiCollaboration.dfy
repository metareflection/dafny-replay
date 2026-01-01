include "../MultiCollaboration.dfy"

// =============================================================================
// TodoDomain: A collaborative Todo app with projects, lists, tasks, and tags
// =============================================================================
//
// Design decisions (pending confirmation):
// - Tasks stay in place when completed (marked done, not moved)
// - Tasks can be assigned to one user at a time (Option<UserId>)
// - No subtasks for now (flat task list)
// - All lists are user-created and equivalent (no special "Inbox")
// - Tasks within lists are ordered and can be reordered
// - Projects are either personal or collaborative (immutable after creation)
// - All members are equal (no roles beyond membership)
// - Tags are project-scoped
//
// =============================================================================

module TodoDomain refines Domain {

  // ===========================================================================
  // Core Types
  // ===========================================================================

  type TaskId = nat
  type ListId = string
  type TagId = nat
  type UserId = string  // Supabase user IDs are UUIDs as strings

  datatype Option<T> = None | Some(value: T)

  // Task data
  datatype Task = Task(
    title: string,
    notes: string,
    completed: bool,
    assignee: Option<UserId>,  // Who is this task assigned to?
    tags: set<TagId>           // Tags attached to this task
  )

  // Tag data (just a name for now)
  datatype Tag = Tag(name: string)

  // Project collaboration mode
  datatype ProjectMode = Personal | Collaborative

  // The Model represents a single project's state
  // (Each Supabase project row contains one Model)
  datatype Model = Model(
    mode: ProjectMode,                    // Personal or Collaborative
    members: set<UserId>,                 // Users who can access this project
    lists: seq<ListId>,                   // Ordered list IDs
    tasks: map<ListId, seq<TaskId>>,      // List -> ordered task IDs
    taskData: map<TaskId, Task>,          // TaskId -> Task
    tags: map<TagId, Tag>,                // TagId -> Tag
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
    | BadAnchor
    | NotAMember           // User not in project members
    | PersonalProject      // Tried to add member to personal project
    | Rejected             // Kernel rejection (no candidate succeeded)

  function RejectErr(): Err { Rejected }

  // ===========================================================================
  // Anchor-based placement (ported from Kanban)
  // ===========================================================================

  datatype Place =
    | AtEnd
    | Before(anchor: TaskId)
    | After(anchor: TaskId)

  // ===========================================================================
  // Actions
  // ===========================================================================

  datatype Action =
    // No-op (useful for rebasing)
    | NoOp

    // List CRUD
    | AddList(listId: ListId)
    | RenameList(listId: ListId, newName: ListId)  // ListId is the name
    | DeleteList(listId: ListId)                   // Also deletes all tasks in it
    | MoveList(listId: ListId, listPlace: ListPlace)   // Reorder lists

    // Task CRUD
    | AddTask(listId: ListId, title: string)
    | EditTask(taskId: TaskId, title: string, notes: string)
    | DeleteTask(taskId: TaskId)
    | MoveTask(taskId: TaskId, toList: ListId, taskPlace: Place)

    // Task status
    | CompleteTask(taskId: TaskId)
    | UncompleteTask(taskId: TaskId)

    // Task assignment
    | AssignTask(taskId: TaskId, assignee: Option<UserId>)

    // Tags on tasks
    | AddTagToTask(taskId: TaskId, tagId: TagId)
    | RemoveTagFromTask(taskId: TaskId, tagId: TagId)

    // Tag CRUD (project-level)
    | CreateTag(name: string)
    | RenameTag(tagId: TagId, newName: string)
    | DeleteTag(tagId: TagId)  // Removes from all tasks too

    // Membership (collaborative projects only)
    | AddMember(userId: UserId)
    | RemoveMember(userId: UserId)

  // List placement (for reordering lists)
  datatype ListPlace =
    | ListAtEnd
    | ListBefore(anchor: ListId)
    | ListAfter(anchor: ListId)

  // ===========================================================================
  // Invariant
  // ===========================================================================

  ghost predicate Inv(m: Model)
  {
    // A: Lists are unique
    NoDupSeq(m.lists)

    // B: tasks map defined exactly on lists
    && (forall l :: l in m.tasks <==> SeqContains(m.lists, l))

    // C: Every taskId in any list exists in taskData
    && (forall l, id :: l in m.tasks && SeqContains(m.tasks[l], id) ==> id in m.taskData)

    // D: Every task appears in exactly one list (no duplicates, no orphans)
    && (forall id :: id in m.taskData ==> CountInLists(m, id) == 1)

    // E: No duplicate task IDs within any single list
    && (forall l :: l in m.tasks ==> NoDupSeq(m.tasks[l]))

    // F: All tags referenced by tasks exist
    && (forall id :: id in m.taskData ==> m.taskData[id].tags <= m.tags.Keys)

    // G: Allocators fresh
    && (forall id :: id in m.taskData ==> id < m.nextTaskId)
    && (forall id :: id in m.tags ==> id < m.nextTagId)

    // H: Assignees must be members (for collaborative) or empty set check for personal
    && (forall id :: id in m.taskData && m.taskData[id].assignee.Some? ==>
          m.taskData[id].assignee.value in m.members)

    // I: Personal projects have exactly one member
    && (m.mode.Personal? ==> |m.members| == 1)

    // J: Collaborative projects have at least one member
    && (m.mode.Collaborative? ==> |m.members| >= 1)
  }

  // ===========================================================================
  // Initial Model
  // ===========================================================================

  // Placeholder for initial member (will be replaced by app layer)
  const InitialMember: UserId := ""

  function Init(): Model {
    // Start with a personal project with placeholder member
    // (Real init via InitServerWithOwner will set proper mode and member)
    Model(
      Personal,
      {InitialMember},  // Placeholder member to satisfy invariant
      [],               // lists
      map[],            // tasks
      map[],            // taskData
      map[],            // tags
      0,                // nextTaskId
      0                 // nextTagId
    )
  }

  // ===========================================================================
  // Helper Functions (ported from Kanban)
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
      Task(t.title, t.notes, t.completed, t.assignee, t.tags - {tagId})
  }

  // Remove assignee if they're no longer a member
  function ClearAssigneeIfRemoved(taskData: map<TaskId, Task>, userId: UserId): map<TaskId, Task>
  {
    map id | id in taskData ::
      var t := taskData[id];
      if t.assignee == Some(userId)
      then Task(t.title, t.notes, t.completed, None, t.tags)
      else t
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

      case AddList(listId) =>
        if SeqContains(m.lists, listId) then Ok(m)  // Idempotent
        else Ok(Model(
          m.mode, m.members,
          m.lists + [listId],
          m.tasks[listId := []],
          m.taskData, m.tags, m.nextTaskId, m.nextTagId
        ))

      case RenameList(listId, newName) =>
        if !SeqContains(m.lists, listId) then Err(MissingList)
        else if listId == newName then Ok(m)  // No change
        else if SeqContains(m.lists, newName) then Err(DuplicateList)
        else
          // Replace listId with newName in lists sequence
          var newLists := ReplaceInSeq(m.lists, listId, newName);
          // Move tasks from old key to new key
          var tasksInList := TaskList(m, listId);
          var newTasks := (m.tasks - {listId})[newName := tasksInList];
          Ok(Model(m.mode, m.members, newLists, newTasks, m.taskData, m.tags, m.nextTaskId, m.nextTagId))

      case DeleteList(listId) =>
        if !SeqContains(m.lists, listId) then Ok(m)  // Idempotent
        else
          // Remove all tasks in this list
          var tasksToRemove := set id | id in TaskList(m, listId) :: id;
          var newTaskData := map id | id in m.taskData && id !in tasksToRemove :: m.taskData[id];
          var newLists := RemoveFirst(m.lists, listId);
          var newTasks := m.tasks - {listId};
          Ok(Model(m.mode, m.members, newLists, newTasks, newTaskData, m.tags, m.nextTaskId, m.nextTagId))

      case MoveList(listId, listPlace) =>
        if !SeqContains(m.lists, listId) then Err(MissingList)
        else
          var lists1 := RemoveFirst(m.lists, listId);
          var pos := PosFromListPlace(lists1, listPlace);
          if pos < 0 then Err(BadAnchor)
          else
            var k := ClampPos(pos, |lists1|);
            var newLists := InsertAt(lists1, k, listId);
            Ok(Model(m.mode, m.members, newLists, m.tasks, m.taskData, m.tags, m.nextTaskId, m.nextTagId))

      // -----------------------------------------------------------------------
      // Task CRUD
      // -----------------------------------------------------------------------

      case AddTask(listId, title) =>
        if !SeqContains(m.lists, listId) then Err(MissingList)
        else
          var id := m.nextTaskId;
          var newTask := Task(title, "", false, None, {});
          Ok(Model(
            m.mode, m.members, m.lists,
            m.tasks[listId := TaskList(m, listId) + [id]],
            m.taskData[id := newTask],
            m.tags,
            m.nextTaskId + 1,
            m.nextTagId
          ))

      case EditTask(taskId, title, notes) =>
        if !(taskId in m.taskData) then Err(MissingTask)
        else
          var t := m.taskData[taskId];
          var updated := Task(title, notes, t.completed, t.assignee, t.tags);
          Ok(Model(m.mode, m.members, m.lists, m.tasks, m.taskData[taskId := updated], m.tags, m.nextTaskId, m.nextTagId))

      case DeleteTask(taskId) =>
        if !(taskId in m.taskData) then Ok(m)  // Idempotent
        else
          // Remove from all lists
          var newTasks := map l | l in m.tasks :: RemoveFirst(m.tasks[l], taskId);
          var newTaskData := m.taskData - {taskId};
          Ok(Model(m.mode, m.members, m.lists, newTasks, newTaskData, m.tags, m.nextTaskId, m.nextTagId))

      case MoveTask(taskId, toList, taskPlace) =>
        if !(taskId in m.taskData) then Err(MissingTask)
        else if !SeqContains(m.lists, toList) then Err(MissingList)
        else
          // Remove from all lists
          var tasks1 := map l | l in m.tasks :: RemoveFirst(m.tasks[l], taskId);
          var tgt := Get(tasks1, toList, []);
          var pos := PosFromPlace(tgt, taskPlace);
          if pos < 0 then Err(BadAnchor)
          else
            var k := ClampPos(pos, |tgt|);
            var tgt2 := InsertAt(tgt, k, taskId);
            Ok(Model(m.mode, m.members, m.lists, tasks1[toList := tgt2], m.taskData, m.tags, m.nextTaskId, m.nextTagId))

      // -----------------------------------------------------------------------
      // Task status
      // -----------------------------------------------------------------------

      case CompleteTask(taskId) =>
        if !(taskId in m.taskData) then Err(MissingTask)
        else
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, true, t.assignee, t.tags);
          Ok(Model(m.mode, m.members, m.lists, m.tasks, m.taskData[taskId := updated], m.tags, m.nextTaskId, m.nextTagId))

      case UncompleteTask(taskId) =>
        if !(taskId in m.taskData) then Err(MissingTask)
        else
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, false, t.assignee, t.tags);
          Ok(Model(m.mode, m.members, m.lists, m.tasks, m.taskData[taskId := updated], m.tags, m.nextTaskId, m.nextTagId))

      // -----------------------------------------------------------------------
      // Task assignment
      // -----------------------------------------------------------------------

      case AssignTask(taskId, assignee) =>
        if !(taskId in m.taskData) then Err(MissingTask)
        else if assignee.Some? && !(assignee.value in m.members) then Err(NotAMember)
        else
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, t.completed, assignee, t.tags);
          Ok(Model(m.mode, m.members, m.lists, m.tasks, m.taskData[taskId := updated], m.tags, m.nextTaskId, m.nextTagId))

      // -----------------------------------------------------------------------
      // Tags on tasks
      // -----------------------------------------------------------------------

      case AddTagToTask(taskId, tagId) =>
        if !(taskId in m.taskData) then Err(MissingTask)
        else if !(tagId in m.tags) then Err(MissingTag)
        else
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, t.completed, t.assignee, t.tags + {tagId});
          Ok(Model(m.mode, m.members, m.lists, m.tasks, m.taskData[taskId := updated], m.tags, m.nextTaskId, m.nextTagId))

      case RemoveTagFromTask(taskId, tagId) =>
        if !(taskId in m.taskData) then Err(MissingTask)
        else
          var t := m.taskData[taskId];
          var updated := Task(t.title, t.notes, t.completed, t.assignee, t.tags - {tagId});
          Ok(Model(m.mode, m.members, m.lists, m.tasks, m.taskData[taskId := updated], m.tags, m.nextTaskId, m.nextTagId))

      // -----------------------------------------------------------------------
      // Tag CRUD
      // -----------------------------------------------------------------------

      case CreateTag(name) =>
        var id := m.nextTagId;
        Ok(Model(m.mode, m.members, m.lists, m.tasks, m.taskData, m.tags[id := Tag(name)], m.nextTaskId, m.nextTagId + 1))

      case RenameTag(tagId, newName) =>
        if !(tagId in m.tags) then Err(MissingTag)
        else Ok(Model(m.mode, m.members, m.lists, m.tasks, m.taskData, m.tags[tagId := Tag(newName)], m.nextTaskId, m.nextTagId))

      case DeleteTag(tagId) =>
        if !(tagId in m.tags) then Ok(m)  // Idempotent
        else
          // Remove tag from all tasks
          var newTaskData := RemoveTagFromAllTasks(m.taskData, tagId);
          var newTags := m.tags - {tagId};
          Ok(Model(m.mode, m.members, m.lists, m.tasks, newTaskData, newTags, m.nextTaskId, m.nextTagId))

      // -----------------------------------------------------------------------
      // Membership
      // -----------------------------------------------------------------------

      case AddMember(userId) =>
        if m.mode.Personal? then Err(PersonalProject)
        else if userId in m.members then Ok(m)  // Idempotent
        else Ok(Model(m.mode, m.members + {userId}, m.lists, m.tasks, m.taskData, m.tags, m.nextTaskId, m.nextTagId))

      case RemoveMember(userId) =>
        if !(userId in m.members) then Ok(m)  // Idempotent
        else if |m.members| == 1 then Ok(m)   // Can't remove last member
        else
          // Clear assignments to removed user
          var newTaskData := ClearAssigneeIfRemoved(m.taskData, userId);
          Ok(Model(m.mode, m.members - {userId}, m.lists, m.tasks, newTaskData, m.tags, m.nextTaskId, m.nextTagId))
  }

  // Helper: replace element in sequence
  function ReplaceInSeq<T(==)>(s: seq<T>, oldVal: T, newVal: T): seq<T>
  {
    if |s| == 0 then []
    else if s[0] == oldVal then [newVal] + s[1..]
    else [s[0]] + ReplaceInSeq(s[1..], oldVal, newVal)
  }

  // ===========================================================================
  // Collaboration Hooks
  // ===========================================================================

  // Helper: extract anchor from a Place
  function PlaceAnchor(p: Place): Option<TaskId>
  {
    match p
      case AtEnd => None
      case Before(a) => Some(a)
      case After(a) => Some(a)
  }

  // Helper: degrade place to AtEnd if anchor is the moved task
  function DegradeIfAnchorMoved(movedId: TaskId, p: Place): Place
  {
    match p
      case AtEnd => AtEnd
      case Before(a) => if a == movedId then AtEnd else p
      case After(a) => if a == movedId then AtEnd else p
  }

  // Rebase: intent-aware transformation of local action given remote action
  function Rebase(remote: Action, local: Action): Action
  {
    match (remote, local)
      case (NoOp, _) => local
      case (_, NoOp) => NoOp

      // Same task move: keep local (LWW)
      case (MoveTask(rid, _, _), MoveTask(lid, ltoList, lplace)) =>
        if rid == lid then local
        else MoveTask(lid, ltoList, DegradeIfAnchorMoved(rid, lplace))

      // Task edits: keep local (LWW)
      case (EditTask(_, _, _), EditTask(_, _, _)) => local

      // Task completion: keep local (LWW)
      case (CompleteTask(_), CompleteTask(_)) => local
      case (UncompleteTask(_), UncompleteTask(_)) => local

      // Assignment: keep local (LWW)
      case (AssignTask(_, _), AssignTask(_, _)) => local

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
      case _ =>
        [a]
  }

  // ===========================================================================
  // Proof Obligations (stubs - to be filled in)
  // ===========================================================================

  lemma InitSatisfiesInv()
    ensures Inv(Init())
  {
    // Empty model trivially satisfies invariant
    // Note: Real init via app layer will set mode and member
  }

  lemma StepPreservesInv(m: Model, a: Action, m2: Model)
  {
    // TODO: Proof for each action case
    assume {:axiom} Inv(m2);  // Placeholder - needs full proof
  }

  lemma CandidatesComplete(m: Model, orig: Action, aGood: Action, m2: Model)
  {
    // TODO: Proof
    assume {:axiom} aGood in Candidates(m, orig);  // Placeholder
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

  // Client state (same pattern as Kanban)
  datatype ClientState = ClientState(
    baseVersion: nat,
    present: K.Model,
    pending: seq<K.Action>
  )

  // Initialize server with owner
  function InitServerWithOwner(mode: K.ProjectMode, ownerId: K.UserId): MC.ServerState
  {
    var initModel := K.Model(
      mode,
      {ownerId},  // Owner is first member
      [],         // No lists yet
      map[],
      map[],
      map[],
      0,
      0
    );
    MC.ServerState(initModel, [], [])
  }

  // Create client from server state
  function InitClientFromServer(server: MC.ServerState): ClientState
  {
    ClientState(MC.Version(server), server.present, [])
  }

  // Local dispatch (optimistic)
  function ClientLocalDispatch(client: ClientState, action: K.Action): ClientState
  {
    var result := K.TryStep(client.present, action);
    match result
      case Ok(newModel) =>
        ClientState(client.baseVersion, newModel, client.pending + [action])
      case Err(_) =>
        ClientState(client.baseVersion, client.present, client.pending + [action])
  }

  // Accessors
  function ServerVersion(server: MC.ServerState): nat { MC.Version(server) }
  function ServerModel(server: MC.ServerState): K.Model { server.present }
  function ClientModel(client: ClientState): K.Model { client.present }
  function ClientVersion(client: ClientState): nat { client.baseVersion }
  function PendingCount(client: ClientState): nat { |client.pending| }
}
