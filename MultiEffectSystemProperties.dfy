// MultiEffectSystemProperties.dfy
//
// Top-level system properties for the Multi-Project Effect State Machine.
// These state that user intent is never silently lost across multiple projects.

include "MultiProjectEffectStateMachine.dfy"

abstract module MultiEffectSystemProperties {
  import E : MultiProjectEffectStateMachine

  type MultiAction = E.MultiAction
  type Model = E.Model
  type ProjectId = E.ProjectId
  type EffectState = E.EffectState
  type Event = E.Event

  // ===========================================================================
  // Helper: Apply a sequence of events
  // ===========================================================================

  function ApplyEvents(es: EffectState, events: seq<Event>): EffectState
    requires E.Inv(es)
    ensures E.Inv(ApplyEvents(es, events))
    decreases |events|
  {
    if |events| == 0 then es
    else
      var (es', _) := E.Step(es, events[0]);
      E.StepPreservesInv(es, events[0]);
      ApplyEvents(es', events[1..])
  }

  // ===========================================================================
  // Action Fate: What can happen to a pending action
  // ===========================================================================

  // Predicate: action was at position 0 and processed (accepted or rejected)
  predicate ActionWasProcessed(es: EffectState, events: seq<Event>, action: MultiAction)
    requires E.Inv(es)
    decreases |events|
  {
    if |events| == 0 then false
    else
      var event := events[0];
      var wasAtFront := |E.Pending(es)| > 0 && E.Pending(es)[0] == action;
      var isProcessingEvent := event.DispatchAccepted? || event.DispatchRejected?;
      var processed := wasAtFront && isProcessingEvent && es.mode.Dispatching?;
      if processed then true
      else
        var (es', _) := E.Step(es, event);
        E.StepPreservesInv(es, event);
        ActionWasProcessed(es', events[1..], action)
  }

  // ===========================================================================
  // SYSTEM PROPERTY 1: No Silent Data Loss
  // ===========================================================================

  // Every action that enters pending will either:
  // 1. Still be in pending, OR
  // 2. Have been explicitly processed (accepted or rejected while at position 0)
  //
  // There is NO case where an action silently disappears.
  lemma NoSilentDataLoss(es: EffectState, action: MultiAction, events: seq<Event>)
    requires E.Inv(es)
    requires action in E.Pending(es)
    ensures var es' := ApplyEvents(es, events);
            action in E.Pending(es') || ActionWasProcessed(es, events, action)
    decreases |events|
  {
    if |events| == 0 {
      // Base case: no events means state unchanged
      assert ApplyEvents(es, events) == es;
    } else {
      var event := events[0];
      var (es1, _) := E.Step(es, event);
      E.StepPreservesInv(es, event);

      // Check if action is being processed
      var wasAtFront := |E.Pending(es)| > 0 && E.Pending(es)[0] == action;
      var isProcessingEvent := event.DispatchAccepted? || event.DispatchRejected?;
      var processed := wasAtFront && isProcessingEvent && es.mode.Dispatching?;

      if processed {
        // Action was processed on this step
        assert ActionWasProcessed(es, events, action);
      } else {
        // Action was NOT processed on this step, so it must still be in pending
        ActionStillInPending(es, event, action, wasAtFront, isProcessingEvent);
        assert action in E.Pending(es1);

        // By induction on the remaining events
        NoSilentDataLoss(es1, action, events[1..]);
        // Inductive result: action in E.Pending(ApplyEvents(es1, events[1..])) ||
        //                   ActionWasProcessed(es1, events[1..], action)

        // Connect ApplyEvents
        assert ApplyEvents(es, events) == ApplyEvents(es1, events[1..]);

        // Connect ActionWasProcessed: if recursively processed, then processed from es
        if ActionWasProcessed(es1, events[1..], action) {
          assert ActionWasProcessed(es, events, action);
        }
      }
    }
  }

  // Helper lemma: if action wasn't processed, it's still in pending after step
  lemma ActionStillInPending(es: EffectState, event: Event, action: MultiAction,
                              wasAtFront: bool, isProcessingEvent: bool)
    requires E.Inv(es)
    requires action in E.Pending(es)
    requires !(wasAtFront && isProcessingEvent && es.mode.Dispatching?)
    requires wasAtFront == (|E.Pending(es)| > 0 && E.Pending(es)[0] == action)
    requires isProcessingEvent == (event.DispatchAccepted? || event.DispatchRejected?)
    ensures var (es', _) := E.Step(es, event);
            action in E.Pending(es')
  {
    var (es', _) := E.Step(es, event);

    // Find position of action in pending
    var i :| 0 <= i < |E.Pending(es)| && E.Pending(es)[i] == action;

    if i > 0 {
      // Action is not at front, use FIFOProcessing
      FIFOProcessing(es, event, i);
    } else {
      // Action is at front (i == 0), but wasn't processed
      // This means either: not a processing event, or not in Dispatching mode
      match event {
        case UserAction(a) =>
          E.UserActionAppendsExact(es, a);
          assert E.Pending(es') == E.Pending(es) + [a];

        case DispatchAccepted(_, _) =>
          // Must not be in Dispatching mode (since not processed and at front)
          assert !es.mode.Dispatching?;
          // Spurious accept, pending unchanged

        case DispatchRejected(_, _) =>
          // Must not be in Dispatching mode (since not processed and at front)
          assert !es.mode.Dispatching?;
          // Spurious reject, pending unchanged

        case DispatchConflict(freshVersions, freshModels) =>
          if es.mode.Dispatching? {
            E.ConflictPreservesPendingExactly(es, freshVersions, freshModels);
          }
          // Otherwise pending unchanged

        case NetworkError =>
        case NetworkRestored =>
        case ManualGoOffline =>
        case ManualGoOnline =>
        case Tick =>
          // All these preserve pending

        case RealtimeUpdate(_, _, _) =>
          // Realtime updates from other clients preserve pending
      }
    }
  }

  // ===========================================================================
  // SYSTEM PROPERTY 2: User Actions Are Captured
  // ===========================================================================

  // When user dispatches an action, it enters pending (from UserActionAppendsExact)
  lemma UserActionEntersPending(es: EffectState, action: MultiAction)
    requires E.Inv(es)
    ensures var (es', _) := E.Step(es, E.Event.UserAction(action));
            action in E.Pending(es')
            && E.Pending(es') == E.Pending(es) + [action]
  {
    E.UserActionAppendsExact(es, action);
  }

  // ===========================================================================
  // SYSTEM PROPERTY 3: FIFO Processing
  // ===========================================================================

  // Actions are processed in order: only the first pending action can leave
  lemma FIFOProcessing(es: EffectState, event: Event, i: nat)
    requires E.Inv(es)
    requires 0 < i < |E.Pending(es)|  // Not the first action
    ensures var (es', _) := E.Step(es, event);
            E.Pending(es)[i] in E.Pending(es')  // Still there (possibly shifted)
  {
    var (es', _) := E.Step(es, event);
    var action := E.Pending(es)[i];

    match event {
      case UserAction(a) =>
        // pending becomes pending + [a], so action is still there
        E.UserActionAppendsExact(es, a);
        assert E.Pending(es') == E.Pending(es) + [a];

      case DispatchAccepted(newVersions, newModels) =>
        if es.mode.Dispatching? {
          // pending becomes pending[1..], action at i > 0 becomes action at i-1
          E.PendingSequencePreserved(es, event);
          assert E.Pending(es') == E.Pending(es)[1..];
          assert action == E.Pending(es)[i];
          assert action == E.Pending(es)[1..][i-1];
          assert action in E.Pending(es)[1..];
        } else {
          // Spurious accept, pending unchanged
        }

      case DispatchRejected(freshVersions, freshModels) =>
        if es.mode.Dispatching? {
          // pending becomes pending[1..], action at i > 0 becomes action at i-1
          E.PendingSequencePreserved(es, event);
          assert E.Pending(es') == E.Pending(es)[1..];
          assert action == E.Pending(es)[i];
          assert action == E.Pending(es)[1..][i-1];
          assert action in E.Pending(es)[1..];
        } else {
          // Spurious reject, pending unchanged
        }

      case DispatchConflict(freshVersions, freshModels) =>
        if es.mode.Dispatching? {
          // pending is fully preserved
          E.ConflictPreservesPendingExactly(es, freshVersions, freshModels);
          assert E.Pending(es') == E.Pending(es);
        } else {
          // Spurious conflict, pending unchanged
        }

      case NetworkError =>
        // pending unchanged

      case NetworkRestored =>
        // pending unchanged

      case ManualGoOffline =>
        // pending unchanged

      case ManualGoOnline =>
        // pending unchanged

      case Tick =>
        // pending unchanged

      case RealtimeUpdate(_, _, _) =>
        // Realtime updates from other clients preserve pending
    }
  }

  // ===========================================================================
  // SYSTEM PROPERTY 4: Progress
  // ===========================================================================

  // If online, idle, with pending actions, Tick initiates dispatch
  // (already proved as TickStartsDispatch)
  lemma OnlineIdlePendingMakesProgress(es: EffectState)
    requires E.Inv(es)
    requires E.IsOnline(es) && E.IsIdle(es) && E.HasPending(es)
    ensures var (es', cmd) := E.Step(es, E.Event.Tick);
            cmd.SendDispatch?
  {
    E.TickStartsDispatch(es);
  }

  // ===========================================================================
  // SYSTEM PROPERTY 5: Eventual Processing
  // ===========================================================================

  // In a "fair" execution (infinitely many Ticks, server eventually responds),
  // every action is eventually processed.
  //
  // This is a liveness property - harder to state in Dafny but follows from:
  // - Progress: Tick starts dispatch when online/idle/pending
  // - Bounded retries: won't loop forever on one action
  // - FIFO: each accept/reject removes exactly one action from front

  // ===========================================================================
  // SYSTEM PROPERTY 6: Quiescence
  // ===========================================================================

  // When pending is empty, the client has no local modifications pending.
  // This means the UI shows a state derived from synchronized project data,
  // with no un-flushed local modifications layered on top.
  //
  // Combined with the other properties, this gives us:
  // - User action enters pending (UserActionEntersPending)
  // - Action eventually processed (NoSilentDataLoss + Progress)
  // - When all actions processed, client shows synchronized state (Quiescence)
  lemma Quiescence(es: EffectState)
    requires E.Inv(es)
    requires !E.HasPending(es)
    ensures es.client.pending == []
  {
    // When pending is empty, client.pending == []
  }

  // ===========================================================================
  // SYSTEM PROPERTY 7: Cross-Project Atomicity
  // ===========================================================================

  // Multi-project actions either:
  // 1. Fully succeed (all touched projects updated atomically), OR
  // 2. Fully fail (no projects modified)
  //
  // This is ensured by the server-side save_multi_update function and
  // verified via the MultiStep function semantics.

  // ===========================================================================
  // SYSTEM PROPERTY 8: Project Isolation (stated as design invariant)
  // ===========================================================================

  // Projects not touched by an action remain completely unchanged.
  // This follows from TouchedProjects correctly identifying affected projects
  // and MultiStep only modifying those projects.
  //
  // Note: This property is ensured by the MultiStep semantics in MultiProject.dfy.
  // The optimistic update layer (ClientLocalDispatch) applies MultiStep,
  // so untouched projects are preserved.
}
