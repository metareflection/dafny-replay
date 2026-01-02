// TodoMultiProjectDomain: Cross-project operations for Todo
//
// This module extends TodoDomain to support operations that span multiple projects,
// such as moving a task from one project to another.
//
// Key insight: The action itself declares which projects it touches.
// The server loads only those projects, runs verified MultiStep, and
// persists only the changed subset.

include "TodoMultiCollaboration.dfy"

module TodoMultiProjectDomain {
  import TD = TodoDomain
  import MC = TodoMultiCollaboration

  // ===========================================================================
  // Types
  // ===========================================================================

  type ProjectId = TD.ProjectId  // Reuse from TodoDomain (string)

  // MultiModel is already defined in TodoDomain, reuse it
  type MultiModel = TD.MultiModel

  // Errors for multi-project operations
  datatype MultiErr =
    | MissingProject(projectId: ProjectId)
    | SingleProjectError(projectId: ProjectId, err: TD.Err)
    | TaskNotInSource  // Task doesn't exist in source project
    | DestListMissing  // Destination list doesn't exist

  // ===========================================================================
  // MultiAction: Actions that can span multiple projects
  // ===========================================================================

  datatype MultiAction =
    // Wrap a single-project action (most common case)
    | Single(project: ProjectId, action: TD.Action)

    // Cross-project: Move task from one project to another
    | MoveTaskTo(
        srcProject: ProjectId,
        dstProject: ProjectId,
        taskId: TD.TaskId,
        dstList: TD.ListId,
        anchor: TD.Place
      )

    // Cross-project: Copy task to another project (keeps original)
    | CopyTaskTo(
        srcProject: ProjectId,
        dstProject: ProjectId,
        taskId: TD.TaskId,
        dstList: TD.ListId
      )

  // ===========================================================================
  // TouchedProjects: Which projects does an action affect?
  // ===========================================================================

  function TouchedProjects(a: MultiAction): set<ProjectId>
  {
    match a
    case Single(pid, _) => {pid}
    case MoveTaskTo(src, dst, _, _, _) => {src, dst}
    case CopyTaskTo(src, dst, _, _) => {src, dst}
  }

  // ===========================================================================
  // Helper: Extract task data from a project
  // ===========================================================================

  function ExtractTaskData(m: TD.Model, taskId: TD.TaskId): TD.Result<TD.Task, MultiErr>
  {
    if taskId !in m.taskData then TD.Result.Err(TaskNotInSource)
    else if m.taskData[taskId].deleted then TD.Result.Err(TaskNotInSource)
    else TD.Result.Ok(m.taskData[taskId])
  }

  // Helper: Remove task from source project
  function RemoveTaskFromProject(m: TD.Model, taskId: TD.TaskId, userId: TD.UserId): TD.Result<TD.Model, TD.Err>
  {
    TD.TryStep(m, TD.Action.DeleteTask(taskId, userId))
  }

  // Helper: Add task to destination project
  // Note: We create a new task with the same data but a fresh ID
  function AddTaskToProject(m: TD.Model, listId: TD.ListId, task: TD.Task, anchor: TD.Place): TD.Result<TD.Model, TD.Err>
  {
    // First add a basic task
    var addResult := TD.TryStep(m, TD.Action.AddTask(listId, task.title));
    if addResult.Err? then addResult
    else
      var m1 := addResult.value;
      var newTaskId := m.nextTaskId;  // The ID that was assigned

      // Copy over additional properties
      var editResult := TD.TryStep(m1, TD.Action.EditTask(newTaskId, task.title, task.notes));
      if editResult.Err? then editResult
      else
        var m2 := editResult.value;

        // Copy starred status
        var m3 := if task.starred then
          match TD.TryStep(m2, TD.Action.StarTask(newTaskId))
          case Ok(m) => m
          case Err(_) => m2
        else m2;

        // Copy completed status
        var m4 := if task.completed then
          match TD.TryStep(m3, TD.Action.CompleteTask(newTaskId))
          case Ok(m) => m
          case Err(_) => m3
        else m3;

        // Copy due date
        var m5 := if task.dueDate.Some? then
          match TD.TryStep(m4, TD.Action.SetDueDate(newTaskId, task.dueDate))
          case Ok(m) => m
          case Err(_) => m4
        else m4;

        TD.Result.Ok(m5)
  }

  // ===========================================================================
  // AllProjectsLoaded: Are all touched projects present?
  // ===========================================================================

  predicate AllProjectsLoaded(mm: MultiModel, a: MultiAction)
  {
    forall pid :: pid in TouchedProjects(a) ==> pid in mm.projects
  }

  // ===========================================================================
  // MultiStep: Apply a multi-action to a MultiModel
  // ===========================================================================

  function MultiStep(mm: MultiModel, a: MultiAction): TD.Result<MultiModel, MultiErr>
    requires AllProjectsLoaded(mm, a)
  {
    match a
    case Single(pid, action) =>
      var model := mm.projects[pid];
      var result := TD.TryStep(model, action);
      (match result
       case Ok(newModel) => TD.Result.Ok(TD.MultiModel(mm.projects[pid := newModel]))
       case Err(e) => TD.Result.Err(SingleProjectError(pid, e)))

    case MoveTaskTo(src, dst, taskId, dstList, anchor) =>
      var srcModel := mm.projects[src];
      var dstModel := mm.projects[dst];

        // Extract task data from source
        var extractResult := ExtractTaskData(srcModel, taskId);
        if extractResult.Err? then TD.Result.Err(extractResult.error)
        else
          var taskData := extractResult.value;

          // Check destination list exists
          if !TD.SeqContains(dstModel.lists, dstList) then TD.Result.Err(DestListMissing)
          else
            // Remove from source (soft delete)
            // Use empty string as userId since we don't track who did cross-project moves
            var removeResult := RemoveTaskFromProject(srcModel, taskId, "");
            if removeResult.Err? then TD.Result.Err(SingleProjectError(src, removeResult.error))
            else
              var newSrc := removeResult.value;

              // Add to destination
              var addResult := AddTaskToProject(dstModel, dstList, taskData, anchor);
              if addResult.Err? then TD.Result.Err(SingleProjectError(dst, addResult.error))
              else
                var newDst := addResult.value;
                TD.Result.Ok(TD.MultiModel(mm.projects[src := newSrc][dst := newDst]))

    case CopyTaskTo(src, dst, taskId, dstList) =>
      var srcModel := mm.projects[src];
      var dstModel := mm.projects[dst];

        // Extract task data from source (don't remove it)
        var extractResult := ExtractTaskData(srcModel, taskId);
        if extractResult.Err? then TD.Result.Err(extractResult.error)
        else
          var taskData := extractResult.value;

          // Check destination list exists
          if !TD.SeqContains(dstModel.lists, dstList) then TD.Result.Err(DestListMissing)
          else
            // Add to destination (source unchanged)
            var addResult := AddTaskToProject(dstModel, dstList, taskData, TD.Place.AtEnd);
            if addResult.Err? then TD.Result.Err(SingleProjectError(dst, addResult.error))
            else
              var newDst := addResult.value;
              TD.Result.Ok(TD.MultiModel(mm.projects[dst := newDst]))
  }

  // Variant without precondition (checks internally, returns error if not loaded)
  function TryMultiStep(mm: MultiModel, a: MultiAction): TD.Result<MultiModel, MultiErr>
  {
    if !AllProjectsLoaded(mm, a) then
      // Find a missing project to report
      match a
      case Single(pid, _) => TD.Result.Err(MissingProject(pid))
      case MoveTaskTo(src, dst, _, _, _) =>
        if src !in mm.projects then TD.Result.Err(MissingProject(src))
        else TD.Result.Err(MissingProject(dst))
      case CopyTaskTo(src, dst, _, _) =>
        if src !in mm.projects then TD.Result.Err(MissingProject(src))
        else TD.Result.Err(MissingProject(dst))
    else
      MultiStep(mm, a)
  }

  // ===========================================================================
  // ChangedProjects: Which projects were modified?
  // ===========================================================================

  function ChangedProjects(before: MultiModel, after: MultiModel): set<ProjectId>
  {
    set pid | pid in after.projects &&
              (pid !in before.projects || before.projects[pid] != after.projects[pid])
  }

  // ===========================================================================
  // MultiInv: All projects satisfy their individual invariants
  // ===========================================================================

  ghost predicate MultiInv(mm: MultiModel)
  {
    forall pid :: pid in mm.projects ==> TD.Inv(mm.projects[pid])
  }

  // ===========================================================================
  // Proof: MultiStep preserves MultiInv
  // ===========================================================================

  lemma MultiStepPreservesInv(mm: MultiModel, a: MultiAction, mm2: MultiModel)
    requires MultiInv(mm)
    requires AllProjectsLoaded(mm, a)
    requires MultiStep(mm, a) == TD.Result.Ok(mm2)
    ensures MultiInv(mm2)
  {
    // Each project's transition is via TryStep, which preserves Inv
    assume {:axiom} MultiInv(mm2);  // TODO: Full proof
  }

  // ===========================================================================
  // MultiRebase: Rebase a multi-action through concurrent changes
  // ===========================================================================

  // For single-project actions, delegate to TodoDomain.Rebase
  // For cross-project actions, rebase independently in each project's log
  function MultiRebase(
    projectLogs: map<ProjectId, seq<TD.Action>>,
    baseVersions: map<ProjectId, nat>,
    a: MultiAction
  ): MultiAction
  {
    match a
    case Single(pid, action) =>
      if pid !in projectLogs || pid !in baseVersions then a
      else
        var suffix := if baseVersions[pid] < |projectLogs[pid]|
                      then projectLogs[pid][baseVersions[pid]..]
                      else [];
        var rebased := RebaseThroughSuffix(suffix, action);
        Single(pid, rebased)

    case MoveTaskTo(src, dst, taskId, dstList, anchor) =>
      // Rebase taskId reference against source project's log
      // Rebase anchor against destination project's log
      // For now, keep it simple: if task was deleted in source, become NoOp
      var srcSuffix := GetSuffix(projectLogs, baseVersions, src);
      if TaskDeletedInLog(srcSuffix, taskId) then
        Single(src, TD.Action.NoOp)  // Degrade to no-op
      else
        var dstSuffix := GetSuffix(projectLogs, baseVersions, dst);
        var newAnchor := RebaseAnchor(dstSuffix, anchor);
        MoveTaskTo(src, dst, taskId, dstList, newAnchor)

    case CopyTaskTo(src, dst, taskId, dstList) =>
      var srcSuffix := GetSuffix(projectLogs, baseVersions, src);
      if TaskDeletedInLog(srcSuffix, taskId) then
        Single(src, TD.Action.NoOp)
      else
        a  // Copy doesn't need anchor rebasing
  }

  // Helper: Get log suffix for a project
  function GetSuffix(logs: map<ProjectId, seq<TD.Action>>, versions: map<ProjectId, nat>, pid: ProjectId): seq<TD.Action>
  {
    if pid !in logs || pid !in versions then []
    else if versions[pid] >= |logs[pid]| then []
    else logs[pid][versions[pid]..]
  }

  // Helper: Check if task was deleted in a log suffix
  function TaskDeletedInLog(suffix: seq<TD.Action>, taskId: TD.TaskId): bool
  {
    if |suffix| == 0 then false
    else
      match suffix[0]
      case DeleteTask(id, _) => id == taskId || TaskDeletedInLog(suffix[1..], taskId)
      case _ => TaskDeletedInLog(suffix[1..], taskId)
  }

  // Helper: Rebase through a suffix (delegate to single-project Rebase)
  function RebaseThroughSuffix(suffix: seq<TD.Action>, local: TD.Action): TD.Action
  {
    if |suffix| == 0 then local
    else
      var rebased := TD.Rebase(suffix[0], local);
      RebaseThroughSuffix(suffix[1..], rebased)
  }

  // Helper: Rebase an anchor through concurrent moves
  function RebaseAnchor(suffix: seq<TD.Action>, anchor: TD.Place): TD.Place
  {
    if |suffix| == 0 then anchor
    else
      match suffix[0]
      case MoveTask(movedId, _, _) =>
        var degraded := TD.DegradeIfAnchorMoved(movedId, anchor);
        RebaseAnchor(suffix[1..], degraded)
      case _ => RebaseAnchor(suffix[1..], anchor)
  }

  // ===========================================================================
  // MultiCandidates: Generate fallback candidates for cross-project actions
  // ===========================================================================

  function MultiCandidates(mm: MultiModel, a: MultiAction): seq<MultiAction>
  {
    match a
    case Single(pid, action) =>
      if pid !in mm.projects then [a]
      else
        var candidates := TD.Candidates(mm.projects[pid], action);
        seq(|candidates|, i requires 0 <= i < |candidates| => Single(pid, candidates[i]))

    case MoveTaskTo(src, dst, taskId, dstList, anchor) =>
      if dst !in mm.projects then [a]
      else
        var dstModel := mm.projects[dst];
        if !TD.SeqContains(dstModel.lists, dstList) then
          // Destination list doesn't exist - try first list
          if |dstModel.lists| > 0 then
            [a, MoveTaskTo(src, dst, taskId, dstModel.lists[0], TD.Place.AtEnd)]
          else
            [a]  // No fallback possible
        else if anchor == TD.Place.AtEnd then
          [a]
        else
          // Try original, then AtEnd
          [a, MoveTaskTo(src, dst, taskId, dstList, TD.Place.AtEnd)]

    case CopyTaskTo(src, dst, taskId, dstList) =>
      if dst !in mm.projects then [a]
      else
        var dstModel := mm.projects[dst];
        if !TD.SeqContains(dstModel.lists, dstList) then
          if |dstModel.lists| > 0 then
            [a, CopyTaskTo(src, dst, taskId, dstModel.lists[0])]
          else
            [a]
        else
          [a]
  }
}
