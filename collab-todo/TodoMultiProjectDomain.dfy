// TodoMultiProjectDomain: Cross-project operations for Todo
//
// This module refines the abstract MultiProject module to add Todo-specific
// cross-project operations like MoveTaskTo and CopyTaskTo.
//
// Pattern:
//   MultiProject (abstract)
//       ↓ refines
//   TodoMultiProjectDomain (this module)

include "../kernels/MultiProject.dfy"
include "TodoMultiCollaboration.dfy"

module TodoMultiProjectDomain refines MultiProject {
  import MC = TodoMultiCollaboration

  // Re-export domain types for convenience
  type Task = MC.D.Task
  type TaskId = MC.D.TaskId
  type ListId = MC.D.ListId
  type Place = MC.D.Place
  type UserId = MC.D.UserId

  // ===========================================================================
  // MultiAction: Concrete cross-project actions for Todo
  // ===========================================================================

  datatype MultiAction =
    // Wrap a single-project action (most common case)
    | Single(project: ProjectId, action: Action)

    // Cross-project: Move task from one project to another
    | MoveTaskTo(
        srcProject: ProjectId,
        dstProject: ProjectId,
        taskId: TaskId,
        dstList: ListId,
        anchor: Place
      )

    // Cross-project: Copy task to another project (keeps original)
    | CopyTaskTo(
        srcProject: ProjectId,
        dstProject: ProjectId,
        taskId: TaskId,
        dstList: ListId
      )

    // Cross-project: Move entire list to another project
    // Note: Tags and assignees are cleared (project-scoped data)
    | MoveListTo(
        srcProject: ProjectId,
        dstProject: ProjectId,
        listId: ListId
      )

  // ===========================================================================
  // Required by MultiProject: SingleAction and GetSingleAction
  // ===========================================================================

  function SingleAction(pid: ProjectId, a: Action): MultiAction
  {
    Single(pid, a)
  }

  function GetSingleAction(ma: MultiAction): Option<(ProjectId, Action)>
  {
    match ma
    case Single(pid, a) => Some((pid, a))
    case _ => None
  }

  // ===========================================================================
  // Required by MultiProject: TouchedProjects
  // ===========================================================================

  function TouchedProjects(a: MultiAction): set<ProjectId>
  {
    match a
    case Single(pid, _) => {pid}
    case MoveTaskTo(src, dst, _, _, _) => {src, dst}
    case CopyTaskTo(src, dst, _, _) => {src, dst}
    case MoveListTo(src, dst, _) => {src, dst}
  }

  lemma SingleActionTouchesOne(pid: ProjectId, a: Action)
    ensures TouchedProjects(SingleAction(pid, a)) == {pid}
  {}

  // ===========================================================================
  // Required by MultiProject: Inv (delegates to domain Inv)
  // ===========================================================================

  ghost predicate Inv(m: Model)
  {
    MC.D.Inv(m)
  }

  // ===========================================================================
  // Domain-specific error types
  // ===========================================================================

  // Extend MultiErr with Todo-specific errors
  datatype TodoMultiErr =
    | BaseError(err: MultiErr)
    | TaskNotInSource
    | DestListMissing

  // ===========================================================================
  // Helper: Extract task data from a project
  // ===========================================================================

  function ExtractTaskData(m: Model, taskId: TaskId): Result<Task, TodoMultiErr>
  {
    if taskId !in m.taskData then Err(TaskNotInSource)
    else if m.taskData[taskId].deleted then Err(TaskNotInSource)
    else Ok(m.taskData[taskId])
  }

  // Helper: Remove task from source project
  function RemoveTaskFromProject(m: Model, taskId: TaskId, userId: UserId): MC.D.Result<Model, MC.D.Err>
  {
    MC.D.TryStep(m, MC.D.Action.DeleteTask(taskId, userId))
  }

  lemma RemoveTaskFromProjectPreservesInv(m: Model, taskId: TaskId, userId: UserId, m2: Model)
    requires Inv(m)
    requires RemoveTaskFromProject(m, taskId, userId) == MC.D.Result.Ok(m2)
    ensures Inv(m2)
  {
    MC.D.StepPreservesInv(m, MC.D.Action.DeleteTask(taskId, userId), m2);
  }

  // Helper: Add task to destination project
  function AddTaskToProject(m: Model, listId: ListId, task: Task, anchor: Place): MC.D.Result<Model, MC.D.Err>
  {
    // Note: This function chains multiple TryStep calls.
    // AddTaskToProjectPreservesInv below proves invariant preservation.
    // First add a basic task
    var addResult := MC.D.TryStep(m, MC.D.Action.AddTask(listId, task.title));
    if addResult.Err? then addResult
    else
      var m1 := addResult.value;
      var newTaskId := m.nextTaskId;

      // Copy over additional properties
      var editResult := MC.D.TryStep(m1, MC.D.Action.EditTask(newTaskId, task.title, task.notes));
      if editResult.Err? then editResult
      else
        var m2 := editResult.value;

        // Copy starred status
        var m3 := if task.starred then
          (match MC.D.TryStep(m2, MC.D.Action.StarTask(newTaskId))
           case Ok(m) => m
           case Err(_) => m2)
        else m2;

        // Copy completed status
        var m4 := if task.completed then
          (match MC.D.TryStep(m3, MC.D.Action.CompleteTask(newTaskId))
           case Ok(m) => m
           case Err(_) => m3)
        else m3;

        // Copy due date
        var m5 := if task.dueDate.Some? then
          (match MC.D.TryStep(m4, MC.D.Action.SetDueDate(newTaskId, task.dueDate))
           case Ok(m) => m
           case Err(_) => m4)
        else m4;

        MC.D.Result.Ok(m5)
  }

  lemma AddTaskToProjectPreservesInv(m: Model, listId: ListId, task: Task, anchor: Place, mFinal: Model)
    requires Inv(m)
    requires AddTaskToProject(m, listId, task, anchor) == MC.D.Result.Ok(mFinal)
    ensures Inv(mFinal)
  {
    // Chain of TryStep calls, each preserving Inv
    var addResult := MC.D.TryStep(m, MC.D.Action.AddTask(listId, task.title));
    var m1 := addResult.value;
    var newTaskId := m.nextTaskId;
    MC.D.StepPreservesInv(m, MC.D.Action.AddTask(listId, task.title), m1);

    var editResult := MC.D.TryStep(m1, MC.D.Action.EditTask(newTaskId, task.title, task.notes));
    var m2 := editResult.value;
    MC.D.StepPreservesInv(m1, MC.D.Action.EditTask(newTaskId, task.title, task.notes), m2);

    // Starred: either step succeeds or m3 = m2
    var m3 := if task.starred then
      (match MC.D.TryStep(m2, MC.D.Action.StarTask(newTaskId))
       case Ok(mx) => mx
       case Err(_) => m2)
    else m2;
    if task.starred && MC.D.TryStep(m2, MC.D.Action.StarTask(newTaskId)).Ok? {
      MC.D.StepPreservesInv(m2, MC.D.Action.StarTask(newTaskId), m3);
    }

    // Completed: either step succeeds or m4 = m3
    var m4 := if task.completed then
      (match MC.D.TryStep(m3, MC.D.Action.CompleteTask(newTaskId))
       case Ok(mx) => mx
       case Err(_) => m3)
    else m3;
    if task.completed && MC.D.TryStep(m3, MC.D.Action.CompleteTask(newTaskId)).Ok? {
      MC.D.StepPreservesInv(m3, MC.D.Action.CompleteTask(newTaskId), m4);
    }

    // DueDate: either step succeeds or m5 = m4
    var m5 := if task.dueDate.Some? then
      (match MC.D.TryStep(m4, MC.D.Action.SetDueDate(newTaskId, task.dueDate))
       case Ok(mx) => mx
       case Err(_) => m4)
    else m4;
    if task.dueDate.Some? && MC.D.TryStep(m4, MC.D.Action.SetDueDate(newTaskId, task.dueDate)).Ok? {
      MC.D.StepPreservesInv(m4, MC.D.Action.SetDueDate(newTaskId, task.dueDate), m5);
    }

    assert mFinal == m5;
  }

  // ===========================================================================
  // Helpers for MoveListTo
  // ===========================================================================

  // Helper: Extract all non-deleted tasks from a list as sequence of (TaskId, Task)
  function ExtractListTasks(m: Model, listId: ListId): seq<Task>
  {
    if listId !in m.tasks then []
    else ExtractTasksFromSeq(m.tasks[listId], m.taskData)
  }

  function ExtractTasksFromSeq(taskIds: seq<TaskId>, taskData: map<TaskId, Task>): seq<Task>
  {
    if |taskIds| == 0 then []
    else
      var id := taskIds[0];
      var rest := ExtractTasksFromSeq(taskIds[1..], taskData);
      if id in taskData && !taskData[id].deleted
      then [taskData[id]] + rest
      else rest
  }

  // Helper: Create a "clean" task for cross-project move (clear tags and assignees)
  function CleanTaskForMove(task: Task): Task
  {
    MC.D.Task(
      task.title, task.notes, task.completed, task.starred,
      task.dueDate,
      {},  // Clear assignees (project-scoped)
      {},  // Clear tags (project-scoped)
      false, MC.D.Option.None, MC.D.Option.None
    )
  }

  // Helper: Add multiple tasks to a list in destination project
  function AddTasksToList(m: Model, listId: ListId, tasks: seq<Task>): MC.D.Result<Model, MC.D.Err>
    decreases |tasks|
  {
    if |tasks| == 0 then MC.D.Result.Ok(m)
    else
      var task := tasks[0];
      var cleanTask := CleanTaskForMove(task);
      var addResult := AddTaskToProject(m, listId, cleanTask, MC.D.Place.AtEnd);
      if addResult.Err? then addResult
      else AddTasksToList(addResult.value, listId, tasks[1..])
  }

  // Helper: Create list and add tasks to destination project
  function AddListWithTasks(m: Model, listName: string, tasks: seq<Task>): MC.D.Result<Model, MC.D.Err>
  {
    // First create the list
    var addListResult := MC.D.TryStep(m, MC.D.Action.AddList(listName));
    if addListResult.Err? then addListResult
    else
      var m1 := addListResult.value;
      var newListId := m.nextListId;
      // Add each task to the new list
      AddTasksToList(m1, newListId, tasks)
  }

  lemma AddTasksToListPreservesInv(m: Model, listId: ListId, tasks: seq<Task>, mFinal: Model)
    requires Inv(m)
    requires AddTasksToList(m, listId, tasks) == MC.D.Result.Ok(mFinal)
    ensures Inv(mFinal)
    decreases |tasks|
  {
    if |tasks| == 0 {
      // Base case: mFinal == m
      assert mFinal == m;
    } else {
      var task := tasks[0];
      var cleanTask := CleanTaskForMove(task);
      var addResult := AddTaskToProject(m, listId, cleanTask, MC.D.Place.AtEnd);
      var m1 := addResult.value;
      // AddTaskToProject preserves Inv
      AddTaskToProjectPreservesInv(m, listId, cleanTask, MC.D.Place.AtEnd, m1);
      // Recursive call preserves Inv
      AddTasksToListPreservesInv(m1, listId, tasks[1..], mFinal);
    }
  }

  lemma AddListWithTasksPreservesInv(m: Model, listName: string, tasks: seq<Task>, mFinal: Model)
    requires Inv(m)
    requires AddListWithTasks(m, listName, tasks) == MC.D.Result.Ok(mFinal)
    ensures Inv(mFinal)
  {
    var addListResult := MC.D.TryStep(m, MC.D.Action.AddList(listName));
    var m1 := addListResult.value;
    var newListId := m.nextListId;
    // AddList preserves Inv
    MC.D.StepPreservesInv(m, MC.D.Action.AddList(listName), m1);
    // AddTasksToList preserves Inv
    AddTasksToListPreservesInv(m1, newListId, tasks, mFinal);
  }

  // Helper: Check if list was deleted in a log suffix
  function ListDeletedInLog(suffix: seq<Action>, listId: ListId): bool
  {
    if |suffix| == 0 then false
    else
      match suffix[0]
      case DeleteList(id) => id == listId || ListDeletedInLog(suffix[1..], listId)
      case _ => ListDeletedInLog(suffix[1..], listId)
  }

  // ===========================================================================
  // Required by MultiProject: MultiStep
  // ===========================================================================

  function MultiStep(mm: MultiModel, a: MultiAction): Result<MultiModel, MultiErr>
  {
    match a
    case Single(pid, action) =>
      var model := mm.projects[pid];
      var result := MC.D.TryStep(model, action);
      (match result
       case Ok(newModel) => Ok(MultiModel(mm.projects[pid := newModel]))
       case Err(e) => Err(SingleProjectError(pid, e)))

    case MoveTaskTo(src, dst, taskId, dstList, anchor) =>
      var srcModel := mm.projects[src];
      var dstModel := mm.projects[dst];

      // Extract task data from source
      var extractResult := ExtractTaskData(srcModel, taskId);
      if extractResult.Err? then Err(CrossProjectError("Task not in source"))
      else
        var taskData := extractResult.value;

        // Check destination list exists
        if !MC.D.SeqContains(dstModel.lists, dstList) then Err(CrossProjectError("Destination list missing"))
        else
          // Remove from source (soft delete)
          var removeResult := RemoveTaskFromProject(srcModel, taskId, "");
          if removeResult.Err? then Err(SingleProjectError(src, removeResult.error))
          else
            var newSrc := removeResult.value;

            // Add to destination
            var addResult := AddTaskToProject(dstModel, dstList, taskData, anchor);
            if addResult.Err? then Err(SingleProjectError(dst, addResult.error))
            else
              var newDst := addResult.value;
              Ok(MultiModel(mm.projects[src := newSrc][dst := newDst]))

    case CopyTaskTo(src, dst, taskId, dstList) =>
      var srcModel := mm.projects[src];
      var dstModel := mm.projects[dst];

      // Extract task data from source (don't remove it)
      var extractResult := ExtractTaskData(srcModel, taskId);
      if extractResult.Err? then Err(CrossProjectError("Task not in source"))
      else
        var taskData := extractResult.value;

        // Check destination list exists
        if !MC.D.SeqContains(dstModel.lists, dstList) then Err(CrossProjectError("Destination list missing"))
        else
          // Add to destination (source unchanged)
          var addResult := AddTaskToProject(dstModel, dstList, taskData, MC.D.Place.AtEnd);
          if addResult.Err? then Err(SingleProjectError(dst, addResult.error))
          else
            var newDst := addResult.value;
            Ok(MultiModel(mm.projects[dst := newDst]))

    case MoveListTo(src, dst, listId) =>
      var srcModel := mm.projects[src];
      var dstModel := mm.projects[dst];

      // Check source list exists (and has a name in the map)
      if !MC.D.SeqContains(srcModel.lists, listId) then
        Err(CrossProjectError("Source list missing"))
      else if listId !in srcModel.listNames then
        Err(CrossProjectError("Source list name missing"))  // Should never happen if invariant holds
      else
        var listName := srcModel.listNames[listId];

        // Check destination doesn't have list with same name
        if MC.D.ListNameExists(dstModel, listName, MC.D.Option.None) then
          Err(CrossProjectError("Duplicate list name in destination"))
        else
          // Extract tasks from source list
          var tasks := ExtractListTasks(srcModel, listId);

          // Delete list from source (removes list and its tasks)
          var deleteResult := MC.D.TryStep(srcModel, MC.D.Action.DeleteList(listId));
          if deleteResult.Err? then Err(SingleProjectError(src, deleteResult.error))
          else
            var newSrc := deleteResult.value;

            // Add list with tasks to destination
            var addResult := AddListWithTasks(dstModel, listName, tasks);
            if addResult.Err? then Err(SingleProjectError(dst, addResult.error))
            else
              var newDst := addResult.value;
              Ok(MultiModel(mm.projects[src := newSrc][dst := newDst]))
  }

  // ===========================================================================
  // Required by MultiProject: TryMultiStep
  // ===========================================================================

  function TryMultiStep(mm: MultiModel, a: MultiAction): Result<MultiModel, MultiErr>
  {
    if !AllProjectsLoaded(mm, a) then
      match a
      case Single(pid, _) => Err(MissingProject(pid))
      case MoveTaskTo(src, dst, _, _, _) =>
        if src !in mm.projects then Err(MissingProject(src))
        else Err(MissingProject(dst))
      case CopyTaskTo(src, dst, _, _) =>
        if src !in mm.projects then Err(MissingProject(src))
        else Err(MissingProject(dst))
      case MoveListTo(src, dst, _) =>
        if src !in mm.projects then Err(MissingProject(src))
        else Err(MissingProject(dst))
    else
      MultiStep(mm, a)
  }

  lemma TryMultiStepEquivalence(mm: MultiModel, a: MultiAction)
    ensures AllProjectsLoaded(mm, a) ==> TryMultiStep(mm, a) == MultiStep(mm, a)
  {}

  // ===========================================================================
  // Required by MultiProject: MultiStepPreservesInv
  // ===========================================================================

  lemma MultiStepPreservesInv(mm: MultiModel, a: MultiAction, mm2: MultiModel)
  {
    // Proof that MultiStep preserves MultiInv
    // MultiInv(mm) = forall pid :: pid in mm.projects ==> Inv(mm.projects[pid])
    // Need to show: forall pid :: pid in mm2.projects ==> Inv(mm2.projects[pid])

    match a {
      case Single(pid, action) =>
        // mm2.projects = mm.projects[pid := newModel]
        // where TryStep(mm.projects[pid], action) == Ok(newModel)
        var model := mm.projects[pid];
        var result := MC.D.TryStep(model, action);
        if result.Ok? {
          var newModel := result.value;
          // Use StepPreservesInv for the changed project
          MC.D.StepPreservesInv(model, action, newModel);
          // Other projects unchanged
        }

      case MoveTaskTo(src, dst, taskId, dstList, anchor) =>
        var srcModel := mm.projects[src];
        var dstModel := mm.projects[dst];
        var extractResult := ExtractTaskData(srcModel, taskId);
        var taskData := extractResult.value;
        var removeResult := RemoveTaskFromProject(srcModel, taskId, "");
        var newSrc := removeResult.value;
        var addResult := AddTaskToProject(dstModel, dstList, taskData, anchor);
        var newDst := addResult.value;

        // src project: RemoveTaskFromProject preserves Inv
        RemoveTaskFromProjectPreservesInv(srcModel, taskId, "", newSrc);

        // dst project: AddTaskToProject preserves Inv
        AddTaskToProjectPreservesInv(dstModel, dstList, taskData, anchor, newDst);

        // Other projects unchanged

      case CopyTaskTo(src, dst, taskId, dstList) =>
        var srcModel := mm.projects[src];
        var dstModel := mm.projects[dst];
        var extractResult := ExtractTaskData(srcModel, taskId);
        var taskData := extractResult.value;
        var addResult := AddTaskToProject(dstModel, dstList, taskData, MC.D.Place.AtEnd);
        var newDst := addResult.value;

        // dst project: AddTaskToProject preserves Inv
        AddTaskToProjectPreservesInv(dstModel, dstList, taskData, MC.D.Place.AtEnd, newDst);

        // src and other projects unchanged

      case MoveListTo(src, dst, listId) =>
        var srcModel := mm.projects[src];
        var dstModel := mm.projects[dst];
        var listName := srcModel.listNames[listId];
        var tasks := ExtractListTasks(srcModel, listId);

        // Delete from source
        var deleteResult := MC.D.TryStep(srcModel, MC.D.Action.DeleteList(listId));
        var newSrc := deleteResult.value;
        MC.D.StepPreservesInv(srcModel, MC.D.Action.DeleteList(listId), newSrc);

        // Add to destination
        var addResult := AddListWithTasks(dstModel, listName, tasks);
        var newDst := addResult.value;
        AddListWithTasksPreservesInv(dstModel, listName, tasks, newDst);

        // Other projects unchanged
    }
  }

  // ===========================================================================
  // Required by MultiProject: MultiRebase
  // ===========================================================================

  function MultiRebase(
    projectLogs: map<ProjectId, seq<Action>>,
    baseVersions: map<ProjectId, nat>,
    a: MultiAction
  ): MultiAction
  {
    match a
    case Single(pid, action) =>
      if pid !in projectLogs || pid !in baseVersions then a
      else
        var suffix := GetSuffix(projectLogs, baseVersions, pid);
        var rebased := RebaseThroughSuffix(suffix, action);
        Single(pid, rebased)

    case MoveTaskTo(src, dst, taskId, dstList, anchor) =>
      var srcSuffix := GetSuffix(projectLogs, baseVersions, src);
      if TaskDeletedInLog(srcSuffix, taskId) then
        Single(src, MC.D.Action.NoOp)
      else
        var dstSuffix := GetSuffix(projectLogs, baseVersions, dst);
        var newAnchor := RebaseAnchor(dstSuffix, anchor);
        MoveTaskTo(src, dst, taskId, dstList, newAnchor)

    case CopyTaskTo(src, dst, taskId, dstList) =>
      var srcSuffix := GetSuffix(projectLogs, baseVersions, src);
      if TaskDeletedInLog(srcSuffix, taskId) then
        Single(src, MC.D.Action.NoOp)
      else
        a

    case MoveListTo(src, dst, listId) =>
      var srcSuffix := GetSuffix(projectLogs, baseVersions, src);
      // If list was deleted in source, become NoOp
      if ListDeletedInLog(srcSuffix, listId) then
        Single(src, MC.D.Action.NoOp)
      else
        a  // Keep as-is (list always placed at end)
  }

  // Helper: Get log suffix for a project
  function GetSuffix(logs: map<ProjectId, seq<Action>>, versions: map<ProjectId, nat>, pid: ProjectId): seq<Action>
  {
    if pid !in logs || pid !in versions then []
    else if versions[pid] >= |logs[pid]| then []
    else logs[pid][versions[pid]..]
  }

  // Helper: Check if task was deleted in a log suffix
  function TaskDeletedInLog(suffix: seq<Action>, taskId: TaskId): bool
  {
    if |suffix| == 0 then false
    else
      match suffix[0]
      case DeleteTask(id, _) => id == taskId || TaskDeletedInLog(suffix[1..], taskId)
      case _ => TaskDeletedInLog(suffix[1..], taskId)
  }

  // Helper: Rebase through a suffix
  function RebaseThroughSuffix(suffix: seq<Action>, local: Action): Action
  {
    if |suffix| == 0 then local
    else
      var rebased := MC.D.Rebase(suffix[0], local);
      RebaseThroughSuffix(suffix[1..], rebased)
  }

  // Helper: Rebase an anchor through concurrent moves
  function RebaseAnchor(suffix: seq<Action>, anchor: Place): Place
  {
    if |suffix| == 0 then anchor
    else
      match suffix[0]
      case MoveTask(movedId, _, _) =>
        var degraded := MC.D.DegradeIfAnchorMoved(movedId, anchor);
        RebaseAnchor(suffix[1..], degraded)
      case _ => RebaseAnchor(suffix[1..], anchor)
  }

  // ===========================================================================
  // Required by MultiProject: MultiCandidates
  // ===========================================================================

  function MultiCandidates(mm: MultiModel, a: MultiAction): seq<MultiAction>
  {
    match a
    case Single(pid, action) =>
      if pid !in mm.projects then [a]
      else
        var candidates := MC.D.Candidates(mm.projects[pid], action);
        seq(|candidates|, i requires 0 <= i < |candidates| => Single(pid, candidates[i]))

    case MoveTaskTo(src, dst, taskId, dstList, anchor) =>
      if dst !in mm.projects then [a]
      else
        var dstModel := mm.projects[dst];
        if !MC.D.SeqContains(dstModel.lists, dstList) then
          if |dstModel.lists| > 0 then
            [a, MoveTaskTo(src, dst, taskId, dstModel.lists[0], MC.D.Place.AtEnd)]
          else
            [a]
        else if anchor == MC.D.Place.AtEnd then
          [a]
        else
          [a, MoveTaskTo(src, dst, taskId, dstList, MC.D.Place.AtEnd)]

    case CopyTaskTo(src, dst, taskId, dstList) =>
      if dst !in mm.projects then [a]
      else
        var dstModel := mm.projects[dst];
        if !MC.D.SeqContains(dstModel.lists, dstList) then
          if |dstModel.lists| > 0 then
            [a, CopyTaskTo(src, dst, taskId, dstModel.lists[0])]
          else
            [a]
        else
          [a]

    case MoveListTo(src, dst, listId) =>
      // No fallback candidates for MoveListTo - either it works or it doesn't
      // (list name conflict in destination is a hard error)
      [a]
  }

  lemma CandidatesStartWithOriginal(mm: MultiModel, a: MultiAction)
  {
    // Trivial: all branches start with [a, ...]
  }

  // ===========================================================================
  // View Layer: Multi-Project Queries (compiled)
  // ===========================================================================
  //
  // These functions query across all loaded projects. They use the single
  // MultiModel definition from MultiProject (no separate definition needed).

  // Re-export SmartListType for convenience
  type SmartListType = MC.D.SmartListType

  // Tagged task ID: includes project context
  datatype TaggedTaskId = TaggedTaskId(projectId: ProjectId, taskId: TaskId)

  // Get all priority tasks across all projects
  function GetAllPriorityTasks(mm: MultiModel): set<TaggedTaskId>
  {
    set pid, tid | pid in mm.projects && tid in MC.D.GetPriorityTaskIds(mm.projects[pid])
      :: TaggedTaskId(pid, tid)
  }

  // Get all logbook tasks across all projects
  function GetAllLogbookTasks(mm: MultiModel): set<TaggedTaskId>
  {
    set pid, tid | pid in mm.projects && tid in MC.D.GetLogbookTaskIds(mm.projects[pid])
      :: TaggedTaskId(pid, tid)
  }

  // Get all visible (non-deleted) tasks across all projects
  function GetAllVisibleTasks(mm: MultiModel): set<TaggedTaskId>
  {
    set pid, tid | pid in mm.projects && tid in MC.D.GetVisibleTaskIds(mm.projects[pid])
      :: TaggedTaskId(pid, tid)
  }

  // Get all deleted tasks across all projects (for trash view)
  function GetAllDeletedTasks(mm: MultiModel): set<TaggedTaskId>
  {
    set pid, tid | pid in mm.projects && tid in MC.D.GetDeletedTaskIds(mm.projects[pid])
      :: TaggedTaskId(pid, tid)
  }

  // Count all visible tasks across all projects
  function CountAllVisibleTasks(mm: MultiModel): nat
  {
    |GetAllVisibleTasks(mm)|
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
  // MultiModel Helpers (compiled)
  // ---------------------------------------------------------------------------

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

  // ===========================================================================
  // Authorization Layer (compiled, separate from domain logic)
  // ===========================================================================
  //
  // This predicate checks whether a user is authorized to perform an action.
  // It's separate from MultiStep so domain logic stays pure.
  // The edge function should call IsAuthorized before calling MultiStep.

  predicate IsAuthorized(mm: MultiModel, actingUser: UserId, a: MultiAction)
  {
    match a
    // MoveListTo: only source project owner can move lists out
    case MoveListTo(src, dst, listId) =>
      src in mm.projects && actingUser == mm.projects[src].owner

    // Single-project actions: allowed for now (could add per-action checks later)
    case Single(pid, action) => true

    // MoveTaskTo: allowed for any member (task-level, less sensitive than list)
    case MoveTaskTo(src, dst, taskId, dstList, anchor) => true

    // CopyTaskTo: allowed for any member (non-destructive)
    case CopyTaskTo(src, dst, taskId, dstList) => true
  }

  // Wrapper for JS: returns string reason if not authorized, empty string if OK
  function CheckAuthorization(mm: MultiModel, actingUser: UserId, a: MultiAction): string
  {
    if IsAuthorized(mm, actingUser, a) then ""
    else match a
      case MoveListTo(_, _, _) => "Only project owner can move lists"
      case _ => "Not authorized"
  }

  // ===========================================================================
  // Error Conversion (compiled, for JS interop)
  // ===========================================================================

  // Convert MultiErr to human-readable string
  function MultiErrToString(err: MultiErr): string
  {
    match err
    case MissingProject(pid) => "Project not found: " + pid
    case SingleProjectError(pid, e) => "Error in project " + pid + ": " + MC.D.ErrToString(e)
    case CrossProjectError(msg) => msg
  }

  // ===========================================================================
  // Effective Actions (compiled, for applied_log storage)
  // ===========================================================================
  //
  // Returns the single-project action to store in each project's applied_log.
  // This is needed because:
  // 1. Single-project dispatch parses applied_log using single-project Action type
  // 2. Rebasing needs to detect deleted tasks/lists via the log
  //
  // For cross-project actions, we return the actual action applied to each project:
  // - Source project gets the "destructive" action (DeleteTask, DeleteList)
  // - Destination project gets the "constructive" action (AddTask, AddList)

  function GetEffectiveAction(mm: MultiModel, a: MultiAction, projectId: ProjectId): Action
  {
    match a
    case Single(pid, action) =>
      if pid == projectId then action else MC.D.Action.NoOp

    case MoveTaskTo(src, dst, taskId, dstList, anchor) =>
      if projectId == src then
        MC.D.Action.DeleteTask(taskId, "")
      else if projectId == dst then
        // Get task title from source model
        if src in mm.projects && taskId in mm.projects[src].taskData then
          var task := mm.projects[src].taskData[taskId];
          MC.D.Action.AddTask(dstList, task.title)
        else
          MC.D.Action.NoOp
      else
        MC.D.Action.NoOp

    case CopyTaskTo(src, dst, taskId, dstList) =>
      if projectId == dst then
        // Get task title from source model
        if src in mm.projects && taskId in mm.projects[src].taskData then
          var task := mm.projects[src].taskData[taskId];
          MC.D.Action.AddTask(dstList, task.title)
        else
          MC.D.Action.NoOp
      else
        // Source unchanged
        MC.D.Action.NoOp

    case MoveListTo(src, dst, listId) =>
      if projectId == src then
        MC.D.Action.DeleteList(listId)
      else if projectId == dst then
        // Get list name from source model
        if src in mm.projects && listId in mm.projects[src].listNames then
          var listName := mm.projects[src].listNames[listId];
          MC.D.Action.AddList(listName)
        else
          MC.D.Action.NoOp
      else
        MC.D.Action.NoOp
  }
}
