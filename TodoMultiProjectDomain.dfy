// TodoMultiProjectDomain: Cross-project operations for Todo
//
// This module refines the abstract MultiProject module to add Todo-specific
// cross-project operations like MoveTaskTo and CopyTaskTo.
//
// Pattern:
//   MultiProject (abstract)
//       ↓ refines
//   TodoMultiProjectDomain (this module)

include "MultiProject.dfy"
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

  // Helper: Add task to destination project
  function AddTaskToProject(m: Model, listId: ListId, task: Task, anchor: Place): MC.D.Result<Model, MC.D.Err>
  {
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
    assume {:axiom} MultiInv(mm2);  // TODO: Full proof
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
  }

  lemma CandidatesStartWithOriginal(mm: MultiModel, a: MultiAction)
  {
    // Trivial: all branches start with [a, ...]
  }
}
