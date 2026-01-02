// MultiProjectEffectStateMachine: Verified model of multi-project client-side effect orchestration
//
// This module extends EffectStateMachine to handle cross-project operations.
// Key differences from single-project:
// - Tracks baseVersions per project (not single baseVersion)
// - Uses MultiAction (can touch multiple projects)
// - Commands include touched project IDs and their versions

include "MultiProject.dfy"

abstract module MultiProjectEffectStateMachine {
  import MP : MultiProject

  // Re-export types from MultiProject
  type Model = MP.Model
  type Action = MP.MC.D.Action
  type MultiModel = MP.MultiModel
  type MultiAction = MP.MultiAction
  type ProjectId = MP.ProjectId

  // ===========================================================================
  // Multi-Project Client State
  // ===========================================================================

  // Client state tracks versions per project
  datatype MultiClientState = MultiClientState(
    baseVersions: map<ProjectId, nat>,   // Last synced version per project
    present: MultiModel,                  // Current local model (optimistic)
    pending: seq<MultiAction>             // Actions waiting to be flushed
  )

  // ===========================================================================
  // Effect State
  // ===========================================================================

  datatype NetworkStatus = Online | Offline

  datatype EffectMode =
    | Idle
    | Dispatching(retries: nat)

  datatype EffectState = EffectState(
    network: NetworkStatus,
    mode: EffectMode,
    client: MultiClientState
  )

  const MaxRetries: nat := 5

  // ===========================================================================
  // Events (inputs to the state machine)
  // ===========================================================================

  datatype Event =
    | UserAction(action: MultiAction)
    | DispatchAccepted(
        newVersions: map<ProjectId, nat>,   // Updated versions for touched projects
        newModels: map<ProjectId, Model>    // Updated models for touched projects
      )
    | DispatchConflict(
        freshVersions: map<ProjectId, nat>,
        freshModels: map<ProjectId, Model>
      )
    | DispatchRejected(
        freshVersions: map<ProjectId, nat>,
        freshModels: map<ProjectId, Model>
      )
    | NetworkError
    | NetworkRestored
    | ManualGoOffline
    | ManualGoOnline
    | Tick

  // ===========================================================================
  // Commands (outputs / side effects to perform)
  // ===========================================================================

  datatype Command =
    | NoOp
    | SendDispatch(
        touchedProjects: set<ProjectId>,
        baseVersions: map<ProjectId, nat>,  // Versions for touched projects only
        action: MultiAction
      )
    | FetchFreshState(projects: set<ProjectId>)

  // ===========================================================================
  // Client State Helpers
  // ===========================================================================

  function PendingCount(es: EffectState): nat
  {
    |es.client.pending|
  }

  function HasPending(es: EffectState): bool
  {
    PendingCount(es) > 0
  }

  function IsOnline(es: EffectState): bool
  {
    es.network == Online
  }

  function IsIdle(es: EffectState): bool
  {
    es.mode == Idle
  }

  function CanStartDispatch(es: EffectState): bool
  {
    IsOnline(es) && IsIdle(es) && HasPending(es)
  }

  function FirstPendingAction(es: EffectState): MultiAction
    requires HasPending(es)
  {
    es.client.pending[0]
  }

  // Get base versions for touched projects
  function BaseVersionsForAction(client: MultiClientState, action: MultiAction): map<ProjectId, nat>
  {
    var touched := MP.TouchedProjects(action);
    map pid | pid in touched && pid in client.baseVersions :: client.baseVersions[pid]
  }

  // ===========================================================================
  // Client State Management
  // ===========================================================================

  // Initialize client from versions and models
  function InitClient(versions: map<ProjectId, nat>, models: map<ProjectId, Model>): MultiClientState
  {
    MultiClientState(versions, MP.MultiModel(models), [])
  }

  // Local dispatch (optimistic update)
  function ClientLocalDispatch(client: MultiClientState, action: MultiAction): MultiClientState
  {
    if !MP.AllProjectsLoaded(client.present, action) then
      // Can't apply - just enqueue for server to handle
      MultiClientState(client.baseVersions, client.present, client.pending + [action])
    else
      var result := MP.MultiStep(client.present, action);
      match result
      case Ok(newModel) =>
        MultiClientState(client.baseVersions, newModel, client.pending + [action])
      case Err(_) =>
        // Optimistic failure: still enqueue (server might accept with fallback)
        MultiClientState(client.baseVersions, client.present, client.pending + [action])
  }

  // Re-apply pending actions to a model
  function ReapplyPending(mm: MultiModel, pending: seq<MultiAction>): MultiModel
    decreases |pending|
  {
    if |pending| == 0 then mm
    else
      var newMM := if MP.AllProjectsLoaded(mm, pending[0]) then
        var result := MP.MultiStep(mm, pending[0]);
        match result
        case Ok(m) => m
        case Err(_) => mm
      else mm;
      ReapplyPending(newMM, pending[1..])
  }

  // Merge updated project models and versions into client state
  function MergeVersions(
    base: map<ProjectId, nat>,
    updates: map<ProjectId, nat>
  ): map<ProjectId, nat>
  {
    map pid | pid in base.Keys + updates.Keys ::
      if pid in updates then updates[pid] else base[pid]
  }

  function MergeModels(
    base: map<ProjectId, Model>,
    updates: map<ProjectId, Model>
  ): map<ProjectId, Model>
  {
    map pid | pid in base.Keys + updates.Keys ::
      if pid in updates then updates[pid] else base[pid]
  }

  function MergeUpdates(
    client: MultiClientState,
    newVersions: map<ProjectId, nat>,
    newModels: map<ProjectId, Model>
  ): (map<ProjectId, nat>, MultiModel)
  {
    var mergedVersions := MergeVersions(client.baseVersions, newVersions);
    var mergedProjects := MergeModels(client.present.projects, newModels);
    (mergedVersions, MP.MultiModel(mergedProjects))
  }

  // Handle accepted reply
  function ClientAcceptReply(
    client: MultiClientState,
    newVersions: map<ProjectId, nat>,
    newModels: map<ProjectId, Model>
  ): MultiClientState
  {
    if |client.pending| == 0 then
      var (mergedV, mergedM) := MergeUpdates(client, newVersions, newModels);
      MultiClientState(mergedV, mergedM, [])
    else
      var rest := client.pending[1..];
      var (mergedV, mergedM) := MergeUpdates(client, newVersions, newModels);
      var reappliedModel := ReapplyPending(mergedM, rest);
      MultiClientState(mergedV, reappliedModel, rest)
  }

  // Handle rejected reply
  function ClientRejectReply(
    client: MultiClientState,
    freshVersions: map<ProjectId, nat>,
    freshModels: map<ProjectId, Model>
  ): MultiClientState
  {
    if |client.pending| == 0 then
      var (mergedV, mergedM) := MergeUpdates(client, freshVersions, freshModels);
      MultiClientState(mergedV, mergedM, [])
    else
      var rest := client.pending[1..];
      var (mergedV, mergedM) := MergeUpdates(client, freshVersions, freshModels);
      var reappliedModel := ReapplyPending(mergedM, rest);
      MultiClientState(mergedV, reappliedModel, rest)
  }

  // Handle conflict (realtime update while dispatch in flight)
  function HandleConflict(
    client: MultiClientState,
    freshVersions: map<ProjectId, nat>,
    freshModels: map<ProjectId, Model>
  ): MultiClientState
  {
    var (mergedV, mergedM) := MergeUpdates(client, freshVersions, freshModels);
    var reappliedModel := ReapplyPending(mergedM, client.pending);
    MultiClientState(mergedV, reappliedModel, client.pending)
  }

  // ===========================================================================
  // State Transitions
  // ===========================================================================

  function Step(es: EffectState, event: Event): (EffectState, Command)
  {
    match event {
      case UserAction(action) =>
        var newClient := ClientLocalDispatch(es.client, action);
        var newState := es.(client := newClient);
        if CanStartDispatch(newState) then
          var firstAction := FirstPendingAction(newState);
          var touched := MP.TouchedProjects(firstAction);
          var versions := BaseVersionsForAction(newState.client, firstAction);
          (newState.(mode := Dispatching(0)),
           SendDispatch(touched, versions, firstAction))
        else
          (newState, NoOp)

      case DispatchAccepted(newVersions, newModels) =>
        if es.mode.Dispatching? then
          var newClient := ClientAcceptReply(es.client, newVersions, newModels);
          var newState := EffectState(es.network, Idle, newClient);
          if CanStartDispatch(newState) then
            var firstAction := FirstPendingAction(newState);
            var touched := MP.TouchedProjects(firstAction);
            var versions := BaseVersionsForAction(newState.client, firstAction);
            (newState.(mode := Dispatching(0)),
             SendDispatch(touched, versions, firstAction))
          else
            (newState, NoOp)
        else
          (es, NoOp)

      case DispatchConflict(freshVersions, freshModels) =>
        if es.mode.Dispatching? then
          var retries := es.mode.retries;
          if retries >= MaxRetries then
            (es.(mode := Idle), NoOp)
          else
            var newClient := HandleConflict(es.client, freshVersions, freshModels);
            var newState := EffectState(es.network, Dispatching(retries + 1), newClient);
            if HasPending(newState) then
              var firstAction := FirstPendingAction(newState);
              var touched := MP.TouchedProjects(firstAction);
              var versions := BaseVersionsForAction(newState.client, firstAction);
              (newState, SendDispatch(touched, versions, firstAction))
            else
              (newState.(mode := Idle), NoOp)
        else
          (es, NoOp)

      case DispatchRejected(freshVersions, freshModels) =>
        if es.mode.Dispatching? then
          var newClient := ClientRejectReply(es.client, freshVersions, freshModels);
          var newState := EffectState(es.network, Idle, newClient);
          if CanStartDispatch(newState) then
            var firstAction := FirstPendingAction(newState);
            var touched := MP.TouchedProjects(firstAction);
            var versions := BaseVersionsForAction(newState.client, firstAction);
            (newState.(mode := Dispatching(0)),
             SendDispatch(touched, versions, firstAction))
          else
            (newState, NoOp)
        else
          (es, NoOp)

      case NetworkError =>
        (es.(network := Offline, mode := Idle), NoOp)

      case NetworkRestored =>
        var newState := es.(network := Online);
        if CanStartDispatch(newState) then
          var firstAction := FirstPendingAction(newState);
          var touched := MP.TouchedProjects(firstAction);
          var versions := BaseVersionsForAction(newState.client, firstAction);
          (newState.(mode := Dispatching(0)),
           SendDispatch(touched, versions, firstAction))
        else
          (newState, NoOp)

      case ManualGoOffline =>
        (es.(network := Offline, mode := Idle), NoOp)

      case ManualGoOnline =>
        var newState := es.(network := Online);
        if CanStartDispatch(newState) then
          var firstAction := FirstPendingAction(newState);
          var touched := MP.TouchedProjects(firstAction);
          var versions := BaseVersionsForAction(newState.client, firstAction);
          (newState.(mode := Dispatching(0)),
           SendDispatch(touched, versions, firstAction))
        else
          (newState, NoOp)

      case Tick =>
        if CanStartDispatch(es) then
          var firstAction := FirstPendingAction(es);
          var touched := MP.TouchedProjects(firstAction);
          var versions := BaseVersionsForAction(es.client, firstAction);
          (es.(mode := Dispatching(0)),
           SendDispatch(touched, versions, firstAction))
        else
          (es, NoOp)
    }
  }

  // ===========================================================================
  // Invariants
  // ===========================================================================

  predicate ModeConsistent(es: EffectState)
  {
    es.mode.Dispatching? ==> HasPending(es)
  }

  predicate RetriesBounded(es: EffectState)
  {
    es.mode.Dispatching? ==> es.mode.retries <= MaxRetries
  }

  predicate Inv(es: EffectState)
  {
    ModeConsistent(es) && RetriesBounded(es)
  }

  // ===========================================================================
  // Key Properties
  // ===========================================================================

  function Pending(es: EffectState): seq<MultiAction>
  {
    es.client.pending
  }

  lemma RetriesAreBounded(es: EffectState, event: Event)
    requires Inv(es)
    ensures RetriesBounded(Step(es, event).0)
  {}

  lemma TickStartsDispatch(es: EffectState)
    requires Inv(es)
    requires IsOnline(es) && IsIdle(es) && HasPending(es)
    ensures Step(es, Tick).0.mode.Dispatching?
    ensures Step(es, Tick).1.SendDispatch?
  {}

  lemma PendingNeverLost(es: EffectState, event: Event)
    requires Inv(es)
    ensures var (es', _) := Step(es, event);
            match event {
              case UserAction(_) => PendingCount(es') >= PendingCount(es)
              case DispatchAccepted(_, _) => PendingCount(es') >= PendingCount(es) - 1
              case DispatchRejected(_, _) => PendingCount(es') >= PendingCount(es) - 1
              case DispatchConflict(_, _) => PendingCount(es') == PendingCount(es)
              case NetworkError => PendingCount(es') == PendingCount(es)
              case NetworkRestored => PendingCount(es') == PendingCount(es)
              case ManualGoOffline => PendingCount(es') == PendingCount(es)
              case ManualGoOnline => PendingCount(es') == PendingCount(es)
              case Tick => PendingCount(es') == PendingCount(es)
            }
  {}

  lemma ConflictPreservesPendingExactly(es: EffectState, freshVersions: map<ProjectId, nat>, freshModels: map<ProjectId, Model>)
    requires Inv(es)
    requires es.mode.Dispatching?
    ensures var (es', _) := Step(es, DispatchConflict(freshVersions, freshModels));
            Pending(es') == Pending(es)
  {}

  // ===========================================================================
  // Initialization
  // ===========================================================================

  function Init(versions: map<ProjectId, nat>, models: map<ProjectId, Model>): EffectState
  {
    EffectState(Online, Idle, InitClient(versions, models))
  }

  lemma InitSatisfiesInv(versions: map<ProjectId, nat>, models: map<ProjectId, Model>)
    ensures Inv(Init(versions, models))
  {}

  // ===========================================================================
  // Invariant Preservation
  // ===========================================================================

  lemma StepPreservesInv(es: EffectState, event: Event)
    requires Inv(es)
    ensures Inv(Step(es, event).0)
  {
    var (es', cmd) := Step(es, event);
    // Proof by case analysis on event...
  }
}
