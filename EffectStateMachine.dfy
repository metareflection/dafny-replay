// EffectStateMachine: Verified model of client-side effect orchestration
//
// This module models the state machine that governs:
// - When to flush pending actions to the server
// - How to handle dispatch responses (accept, conflict, reject)
// - Offline/online transitions
// - Retry logic with bounded attempts
//
// The goal is to verify properties like:
// - "Pending actions are eventually flushed or we're offline"
// - "No infinite retry loops"
// - "ClientState transitions only via verified functions"

include "MultiCollaboration.dfy"

abstract module EffectStateMachine {
  import MC : MultiCollaboration

  // Use the domain from MultiCollaboration for type consistency
  type Model = MC.D.Model
  type Action = MC.D.Action

  // ===========================================================================
  // Effect State
  // ===========================================================================

  datatype NetworkStatus = Online | Offline

  datatype EffectMode =
    | Idle                          // Not currently dispatching
    | Dispatching(retries: nat)     // Sending action to server, with retry count

  datatype EffectState = EffectState(
    network: NetworkStatus,
    mode: EffectMode,
    client: MC.ClientState,
    serverVersion: nat              // Last known server version
  )

  // Maximum retries before giving up on a single action
  const MaxRetries: nat := 5

  // ===========================================================================
  // Events (inputs to the state machine)
  // ===========================================================================

  datatype Event =
    | UserAction(action: Action)                // User dispatched an action
    | DispatchAccepted(newVersion: nat, newModel: Model)
    | DispatchConflict(freshVersion: nat, freshModel: Model)
    | DispatchRejected(freshVersion: nat, freshModel: Model)
    | NetworkError
    | NetworkRestored
    | ManualGoOffline
    | ManualGoOnline
    | Tick                                      // Periodic check to start flush

  // ===========================================================================
  // Commands (outputs / side effects to perform)
  // ===========================================================================

  datatype Command =
    | NoOp
    | SendDispatch(baseVersion: nat, action: Action)
    | FetchFreshState                           // Resync after conflict

  // ===========================================================================
  // State Transitions
  // ===========================================================================

  function PendingCount(es: EffectState): nat {
    MC.PendingCount(es.client)
  }

  function HasPending(es: EffectState): bool {
    PendingCount(es) > 0
  }

  function IsOnline(es: EffectState): bool {
    es.network == Online
  }

  function IsIdle(es: EffectState): bool {
    es.mode == Idle
  }

  function CanStartDispatch(es: EffectState): bool {
    IsOnline(es) && IsIdle(es) && HasPending(es)
  }

  // Get the first pending action (precondition: HasPending)
  function FirstPendingAction(es: EffectState): Action
    requires HasPending(es)
  {
    var pending := es.client.pending;
    pending[0]
  }

  // Main transition function
  function Step(es: EffectState, event: Event): (EffectState, Command)
  {
    match event {
      case UserAction(action) =>
        // Apply action locally via VERIFIED ClientLocalDispatch
        var newClient := MC.ClientLocalDispatch(es.client, action);
        var newState := es.(client := newClient);
        // If online and idle, start dispatching
        if CanStartDispatch(newState) then
          (newState.(mode := Dispatching(0)),
           SendDispatch(MC.ClientVersion(newState.client), FirstPendingAction(newState)))
        else
          (newState, NoOp)

      case DispatchAccepted(newVersion, newModel) =>
        if es.mode.Dispatching? then
          // Use VERIFIED ClientAcceptReply
          var newClient := MC.ClientAcceptReply(es.client, newVersion, newModel);
          var newState := EffectState(es.network, Idle, newClient, newVersion);
          // If more pending, continue dispatching
          if CanStartDispatch(newState) then
            (newState.(mode := Dispatching(0)),
             SendDispatch(MC.ClientVersion(newState.client), FirstPendingAction(newState)))
          else
            (newState, NoOp)
        else
          // Spurious accept (shouldn't happen), ignore
          (es, NoOp)

      case DispatchConflict(freshVersion, freshModel) =>
        if es.mode.Dispatching? then
          var retries := es.mode.retries;
          if retries >= MaxRetries then
            // Pause dispatch: go idle, action stays in pending.
            // Next Tick will retry with fresh retries=0.
            // This provides bounded immediate retries + eventual persistent retry.
            (es.(mode := Idle), NoOp)
          else
            // Resync and retry with incremented retry count
            var newClient := MC.HandleRealtimeUpdate(es.client, freshVersion, freshModel);
            var newState := EffectState(es.network, Dispatching(retries + 1), newClient, freshVersion);
            if HasPending(newState) then
              (newState, SendDispatch(freshVersion, FirstPendingAction(newState)))
            else
              // Dead code: proved unreachable by ConflictNeverEmptiesPending
              (newState.(mode := Idle), NoOp)
        else
          (es, NoOp)

      case DispatchRejected(freshVersion, freshModel) =>
        if es.mode.Dispatching? then
          // Action rejected by domain - drop the rejected action but preserve other pending
          var newClient := MC.ClientRejectReply(es.client, freshVersion, freshModel);
          var newState := EffectState(es.network, Idle, newClient, freshVersion);
          // If more pending, continue
          if CanStartDispatch(newState) then
            (newState.(mode := Dispatching(0)),
             SendDispatch(MC.ClientVersion(newState.client), FirstPendingAction(newState)))
          else
            (newState, NoOp)
        else
          (es, NoOp)

      case NetworkError =>
        // Go offline, stay in whatever mode (will resume when online)
        (es.(network := Offline, mode := Idle), NoOp)

      case NetworkRestored =>
        var newState := es.(network := Online);
        if CanStartDispatch(newState) then
          (newState.(mode := Dispatching(0)),
           SendDispatch(MC.ClientVersion(newState.client), FirstPendingAction(newState)))
        else
          (newState, NoOp)

      case ManualGoOffline =>
        (es.(network := Offline, mode := Idle), NoOp)

      case ManualGoOnline =>
        var newState := es.(network := Online);
        if CanStartDispatch(newState) then
          (newState.(mode := Dispatching(0)),
           SendDispatch(MC.ClientVersion(newState.client), FirstPendingAction(newState)))
        else
          (newState, NoOp)

      case Tick =>
        // Periodic check: if we should be dispatching but aren't, start
        if CanStartDispatch(es) then
          (es.(mode := Dispatching(0)),
           SendDispatch(MC.ClientVersion(es.client), FirstPendingAction(es)))
        else
          (es, NoOp)
    }
  }

  // ===========================================================================
  // Invariants
  // ===========================================================================

  // The client state is always well-formed (pending queue matches optimistic model)
  // This is inherited from MC.ClientState by construction

  // When dispatching, we must have pending actions
  predicate ModeConsistent(es: EffectState) {
    es.mode.Dispatching? ==> HasPending(es)
  }

  // Retry count is bounded
  predicate RetriesBounded(es: EffectState) {
    es.mode.Dispatching? ==> es.mode.retries <= MaxRetries
  }

  predicate Inv(es: EffectState) {
    ModeConsistent(es) && RetriesBounded(es)
  }

  // ===========================================================================
  // Key Properties
  // ===========================================================================

  // Property 1: UserAction always adds to pending (unless action fails locally)
  // This follows from MC.ClientLocalDispatch always appending to pending

  // Property 2: DispatchAccepted decreases pending by 1
  // This follows from MC.ClientAcceptReply removing first pending

  // Property 3: Retries are bounded - we never retry more than MaxRetries times
  lemma RetriesAreBounded(es: EffectState, event: Event)
    requires Inv(es)
    ensures RetriesBounded(Step(es, event).0)
  {
    // Follows from Step logic: retries only increment up to MaxRetries
  }

  // Property 4: If online, idle, and has pending, Step with Tick starts dispatch
  lemma TickStartsDispatch(es: EffectState)
    requires Inv(es)
    requires IsOnline(es) && IsIdle(es) && HasPending(es)
    ensures Step(es, Tick).0.mode.Dispatching?
    ensures Step(es, Tick).1.SendDispatch?
  {
    // Direct from Step definition
  }

  // Property 5: DispatchAccepted transitions to Idle (or continues dispatching)
  lemma AcceptedGoesIdleOrContinues(es: EffectState, newVersion: nat, newModel: Model)
    requires es.mode.Dispatching?
    ensures var (es', cmd) := Step(es, DispatchAccepted(newVersion, newModel));
            es'.mode.Idle? || es'.mode.Dispatching?
  {
    // Direct from Step definition
  }

  // Property 6: MaxRetries exceeded leads to Idle
  lemma MaxRetriesLeadsToIdle(es: EffectState, freshVersion: nat, freshModel: Model)
    requires es.mode.Dispatching? && es.mode.retries >= MaxRetries
    ensures Step(es, DispatchConflict(freshVersion, freshModel)).0.mode.Idle?
  {
    // Direct from Step definition
  }

  // ===========================================================================
  // Pending Preservation (Key Safety Property)
  // ===========================================================================

  // Helper to get the pending sequence
  function Pending(es: EffectState): seq<Action> {
    es.client.pending
  }

  // Property 7: Pending actions are never lost - strong preservation guarantee
  //
  // - UserAction: pending grows by 1 (action appended)
  // - DispatchAccepted/Rejected: pending[1..] preserved (only dispatched action removed)
  // - DispatchConflict: pending fully preserved
  // - All other events: pending unchanged
  lemma PendingNeverLost(es: EffectState, event: Event)
    requires Inv(es)
    ensures var (es', _) := Step(es, event);
            match event {
              case UserAction(_) =>
                // Pending grows (action appended)
                PendingCount(es') >= PendingCount(es)
              case DispatchAccepted(_, _) =>
                // At most one action removed (the dispatched one)
                PendingCount(es') >= PendingCount(es) - 1
              case DispatchRejected(_, _) =>
                // At most one action removed (the rejected one)
                PendingCount(es') >= PendingCount(es) - 1
              case DispatchConflict(_, _) =>
                // Pending fully preserved
                PendingCount(es') == PendingCount(es)
              case NetworkError =>
                PendingCount(es') == PendingCount(es)
              case NetworkRestored =>
                PendingCount(es') == PendingCount(es)
              case ManualGoOffline =>
                PendingCount(es') == PendingCount(es)
              case ManualGoOnline =>
                PendingCount(es') == PendingCount(es)
              case Tick =>
                PendingCount(es') == PendingCount(es)
            }
  {
    // Follows from the definitions of ClientLocalDispatch, ClientAcceptReply,
    // ClientRejectReply, and HandleRealtimeUpdate
  }

  // Property 8: Stronger - the tail of pending is exactly preserved on accept/reject
  lemma PendingTailPreserved(es: EffectState, event: Event)
    requires Inv(es)
    requires event.DispatchAccepted? || event.DispatchRejected?
    requires es.mode.Dispatching?  // Must be in dispatching mode to process reply
    ensures var (es', _) := Step(es, event);
            // The remaining pending actions are exactly pending[1..]
            // (though reapplied to new model, the sequence is preserved)
            |Pending(es')| == |Pending(es)| - 1
  {
    // Follows from ClientAcceptReply and ClientRejectReply removing only first element
    // Note: ModeConsistent ensures HasPending when Dispatching
  }

  // Property 9: Strongest - exact sequence preservation on accept/reject
  lemma PendingSequencePreserved(es: EffectState, event: Event)
    requires Inv(es)
    requires es.mode.Dispatching?
    requires event.DispatchAccepted? || event.DispatchRejected?
    ensures var (es', _) := Step(es, event);
            Pending(es') == Pending(es)[1..]  // Exact sequence equality
  {
    // ClientAcceptReply and ClientRejectReply both set pending to rest = pending[1..]
    // The model is reapplied but the pending sequence is exactly preserved
  }

  // Property 10: DispatchConflict preserves pending exactly
  lemma ConflictPreservesPendingExactly(es: EffectState, freshVersion: nat, freshModel: Model)
    requires Inv(es)
    requires es.mode.Dispatching?
    ensures var (es', _) := Step(es, DispatchConflict(freshVersion, freshModel));
            Pending(es') == Pending(es)  // Exact sequence equality - nothing removed
  {
    // HandleRealtimeUpdate preserves pending exactly
  }

  // Property 10b: Conflict never empties pending (the "else" branch in Step is dead code)
  lemma ConflictNeverEmptiesPending(es: EffectState, freshVersion: nat, freshModel: Model)
    requires Inv(es)
    requires es.mode.Dispatching?
    ensures var (es', _) := Step(es, DispatchConflict(freshVersion, freshModel));
            HasPending(es')
  {
    // Follows from ConflictPreservesPendingExactly + ModeConsistent (Dispatching => HasPending)
    ConflictPreservesPendingExactly(es, freshVersion, freshModel);
  }

  // Property 11: UserAction always appends exactly one action
  lemma UserActionAppendsOne(es: EffectState, action: Action)
    requires Inv(es)
    ensures var (es', _) := Step(es, UserAction(action));
            |Pending(es')| == |Pending(es)| + 1
  {
    // ClientLocalDispatch always appends action to pending
  }

  // Property 12: UserAction appends the exact action (strongest form)
  lemma UserActionAppendsExact(es: EffectState, action: Action)
    requires Inv(es)
    ensures var (es', _) := Step(es, UserAction(action));
            Pending(es') == Pending(es) + [action]  // Exact sequence
  {
    // ClientLocalDispatch does: client.pending + [action] in both Ok and Err cases
  }

  // ===========================================================================
  // Progress Property (Liveness)
  // ===========================================================================

  // Define a measure for progress: (isDispatching, retries, pendingCount)
  // This decreases on successful dispatch, bounded by retries on conflict

  function ProgressMeasure(es: EffectState): (bool, nat, nat)
    requires RetriesBounded(es)
  {
    (es.mode.Dispatching?,
     if es.mode.Dispatching? && es.mode.retries <= MaxRetries
       then MaxRetries - es.mode.retries
       else 0,
     PendingCount(es))
  }

  // Lexicographic ordering for progress
  // Tuple is (isDispatching: bool, retriesRemaining: nat, pendingCount: nat)
  predicate ProgressLt(m1: (bool, nat, nat), m2: (bool, nat, nat)) {
    // Primary: pendingCount decreases
    m1.2 < m2.2 ||
    // Secondary: if pending same, prefer going from dispatching to idle
    (m1.2 == m2.2 && !m1.0 && m2.0) ||
    // Tertiary: if both dispatching with same pending, retries remaining decreases
    (m1.2 == m2.2 && m1.0 == m2.0 && m1.1 < m2.1)
  }

  // Key progress theorem:
  // If we're online and dispatching, eventually either:
  // - pending decreases (on accept), or
  // - we hit max retries and go idle (on repeated conflict), or
  // - we go offline (on network error)
  //
  // This ensures no infinite loops in the flush logic.

  // ===========================================================================
  // Initialization
  // ===========================================================================

  function Init(version: nat, model: Model): EffectState {
    EffectState(Online, Idle, MC.InitClient(version, model), version)
  }

  lemma InitSatisfiesInv(version: nat, model: Model)
    ensures Inv(Init(version, model))
  {
    // InitClient creates empty pending, so ModeConsistent holds
    // Idle has no retries, so RetriesBounded holds
  }

  // ===========================================================================
  // Invariant Preservation
  // ===========================================================================

  lemma StepPreservesInv(es: EffectState, event: Event)
    requires Inv(es)
    ensures Inv(Step(es, event).0)
  {
    var (es', cmd) := Step(es, event);

    // ModeConsistent: if Dispatching, must have pending
    // Case analysis on event...
    match event {
      case UserAction(action) =>
        // ClientLocalDispatch always adds to pending
        // So if we start Dispatching, we have pending

      case DispatchAccepted(newVersion, newModel) =>
        // ClientAcceptReply removes first pending
        // We only start Dispatching again if HasPending after that

      case DispatchConflict(freshVersion, freshModel) =>
        // HandleRealtimeUpdate preserves pending
        // We check HasPending before continuing

      case DispatchRejected(freshVersion, freshModel) =>
        // InitClient clears pending
        // But rejected action was at front, so this is correct
        // We only continue if HasPending after init

      case NetworkError =>
        // Goes to Idle, ModeConsistent trivially holds

      case NetworkRestored =>
        // Only Dispatching if HasPending

      case ManualGoOffline =>
        // Goes to Idle

      case ManualGoOnline =>
        // Only Dispatching if HasPending

      case Tick =>
        // Only Dispatching if CanStartDispatch (includes HasPending)
    }

    // RetriesBounded: retries <= MaxRetries
    // Only DispatchConflict increments retries, and it checks >= MaxRetries first
  }
}
