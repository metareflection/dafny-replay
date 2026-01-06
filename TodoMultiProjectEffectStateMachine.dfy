// TodoMultiProjectEffectStateMachine: Verified multi-project effect orchestration for Todo
//
// Concrete refinement of MultiProjectEffectStateMachine for the Todo domain.
// This is compiled separately and used by MultiProjectEffectManager.js.

include "MultiProjectEffectStateMachine.dfy"
include "TodoMultiProjectDomain.dfy"

module TodoMultiProjectEffectStateMachine refines MultiProjectEffectStateMachine {
  import MP = TodoMultiProjectDomain
}

// Extend with compiled entry points for JavaScript
module TodoMultiProjectEffectAppCore {
  import E = TodoMultiProjectEffectStateMachine
  import MP = TodoMultiProjectDomain
  import TD = TodoDomain

  // Re-export types
  type ProjectId = E.ProjectId
  type Model = E.Model
  type MultiModel = E.MultiModel
  type Action = E.Action
  type MultiAction = E.MultiAction
  type EffectState = E.EffectState
  type EffectEvent = E.Event
  type EffectCommand = E.Command
  type MultiClientState = E.MultiClientState

  // ===========================================================================
  // Initialization
  // ===========================================================================

  function EffectInit(versions: map<ProjectId, nat>, models: map<ProjectId, Model>): EffectState
  {
    E.Init(versions, models)
  }

  // ===========================================================================
  // State Machine Step
  // ===========================================================================

  function EffectStep(es: EffectState, event: EffectEvent): (EffectState, EffectCommand)
  {
    E.Step(es, event)
  }

  // ===========================================================================
  // State Accessors
  // ===========================================================================

  function EffectIsOnline(es: EffectState): bool { E.IsOnline(es) }
  function EffectIsIdle(es: EffectState): bool { E.IsIdle(es) }
  function EffectHasPending(es: EffectState): bool { E.HasPending(es) }
  function EffectPendingCount(es: EffectState): nat { E.PendingCount(es) }
  function EffectIsDispatching(es: EffectState): bool { es.mode.Dispatching? }
  function EffectGetClient(es: EffectState): MultiClientState { es.client }

  // Get current MultiModel from client state
  function EffectGetMultiModel(es: EffectState): MultiModel { es.client.present }

  // Get base versions map
  function EffectGetBaseVersions(es: EffectState): map<ProjectId, nat> { es.client.baseVersions }

  // Get pending actions
  function EffectGetPending(es: EffectState): seq<MultiAction> { es.client.pending }

  // ===========================================================================
  // Event Constructors
  // ===========================================================================

  function EffectUserAction(action: MultiAction): EffectEvent
  {
    E.Event.UserAction(action)
  }

  // Single-project action convenience wrapper
  function EffectSingleUserAction(projectId: ProjectId, action: Action): EffectEvent
  {
    E.Event.UserAction(MP.MultiAction.Single(projectId, action))
  }

  // ===========================================================================
  // Single-Project Query Accessors (for JS interop)
  // ===========================================================================

  // Get deleted task IDs (for trash view)
  function GetDeletedTaskIds(m: Model): set<TD.TaskId>
  {
    MP.MC.D.GetDeletedTaskIds(m)
  }

  function EffectDispatchAccepted(newVersions: map<ProjectId, nat>, newModels: map<ProjectId, Model>): EffectEvent
  {
    E.Event.DispatchAccepted(newVersions, newModels)
  }

  function EffectDispatchConflict(freshVersions: map<ProjectId, nat>, freshModels: map<ProjectId, Model>): EffectEvent
  {
    E.Event.DispatchConflict(freshVersions, freshModels)
  }

  function EffectDispatchRejected(freshVersions: map<ProjectId, nat>, freshModels: map<ProjectId, Model>): EffectEvent
  {
    E.Event.DispatchRejected(freshVersions, freshModels)
  }

  function EffectRealtimeUpdate(projectId: ProjectId, version: nat, model: Model): EffectEvent
  {
    E.Event.RealtimeUpdate(projectId, version, model)
  }

  function EffectNetworkError(): EffectEvent { E.Event.NetworkError }
  function EffectNetworkRestored(): EffectEvent { E.Event.NetworkRestored }
  function EffectManualGoOffline(): EffectEvent { E.Event.ManualGoOffline }
  function EffectManualGoOnline(): EffectEvent { E.Event.ManualGoOnline }
  function EffectTick(): EffectEvent { E.Event.Tick }

  // ===========================================================================
  // Command Inspection
  // ===========================================================================

  function EffectIsNoOp(cmd: EffectCommand): bool { cmd.NoOp? }
  function EffectIsSendDispatch(cmd: EffectCommand): bool { cmd.SendDispatch? }
  function EffectIsFetchFreshState(cmd: EffectCommand): bool { cmd.FetchFreshState? }

  function EffectGetTouchedProjects(cmd: EffectCommand): set<ProjectId>
    requires cmd.SendDispatch?
  { cmd.touchedProjects }

  function EffectGetBaseVersionsFromCmd(cmd: EffectCommand): map<ProjectId, nat>
    requires cmd.SendDispatch?
  { cmd.baseVersions }

  function EffectGetMultiAction(cmd: EffectCommand): MultiAction
    requires cmd.SendDispatch?
  { cmd.action }

  // ===========================================================================
  // MultiAction Constructors
  // ===========================================================================

  function MakeSingleAction(projectId: ProjectId, action: Action): MultiAction
  {
    MP.MultiAction.Single(projectId, action)
  }

  function MakeMoveTaskTo(
    srcProject: ProjectId,
    dstProject: ProjectId,
    taskId: TD.TaskId,
    dstList: TD.ListId,
    anchor: TD.Place
  ): MultiAction
  {
    MP.MultiAction.MoveTaskTo(srcProject, dstProject, taskId, dstList, anchor)
  }

  function MakeCopyTaskTo(
    srcProject: ProjectId,
    dstProject: ProjectId,
    taskId: TD.TaskId,
    dstList: TD.ListId
  ): MultiAction
  {
    MP.MultiAction.CopyTaskTo(srcProject, dstProject, taskId, dstList)
  }

  function MakeMoveListTo(
    srcProject: ProjectId,
    dstProject: ProjectId,
    listId: TD.ListId
  ): MultiAction
  {
    MP.MultiAction.MoveListTo(srcProject, dstProject, listId)
  }

  // ===========================================================================
  // MultiAction Inspection
  // ===========================================================================

  function IsSingleAction(ma: MultiAction): bool { ma.Single? }
  function IsMoveTaskTo(ma: MultiAction): bool { ma.MoveTaskTo? }
  function IsCopyTaskTo(ma: MultiAction): bool { ma.CopyTaskTo? }
  function IsMoveListTo(ma: MultiAction): bool { ma.MoveListTo? }

  function GetTouchedProjects(ma: MultiAction): set<ProjectId>
  {
    MP.TouchedProjects(ma)
  }

  // ===========================================================================
  // MultiModel Helpers
  // ===========================================================================

  function GetProjectModel(mm: MultiModel, projectId: ProjectId): Model
    requires projectId in mm.projects
  {
    mm.projects[projectId]
  }

  // ===========================================================================
  // Single-Project Query Helpers
  // ===========================================================================

  // Find which list contains a task
  function FindListForTask(m: Model, taskId: TD.TaskId): TD.Option<TD.ListId>
  {
    TD.FindListForTask(m, taskId)
  }

  function HasProject(mm: MultiModel, projectId: ProjectId): bool
  {
    projectId in mm.projects
  }

  function GetProjectIds(mm: MultiModel): set<ProjectId>
  {
    mm.projects.Keys
  }

  // ===========================================================================
  // Direct MultiStep access (for server-side use)
  // ===========================================================================

  function TryMultiStep(mm: MultiModel, action: MultiAction): MP.Result<MultiModel, MP.MultiErr>
  {
    MP.TryMultiStep(mm, action)
  }

  function MultiRebase(
    projectLogs: map<ProjectId, seq<Action>>,
    baseVersions: map<ProjectId, nat>,
    action: MultiAction
  ): MultiAction
  {
    MP.MultiRebase(projectLogs, baseVersions, action)
  }

  function MultiCandidates(mm: MultiModel, action: MultiAction): seq<MultiAction>
  {
    MP.MultiCandidates(mm, action)
  }
}
