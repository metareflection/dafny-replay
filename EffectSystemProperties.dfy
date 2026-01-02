// EffectSystemProperties.dfy
//
// Top-level system properties for the Effect State Machine.
// These state that user intent is never silently lost.

include "EffectStateMachine.dfy"

abstract module EffectSystemProperties {
  import E : EffectStateMachine

  type Action = E.Action
  type Model = E.Model
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
  predicate ActionWasProcessed(es: EffectState, events: seq<Event>, action: Action)
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
  lemma {:axiom} NoSilentDataLoss(es: EffectState, action: Action, events: seq<Event>)
    requires E.Inv(es)
    requires action in E.Pending(es)
    ensures var es' := ApplyEvents(es, events);
            action in E.Pending(es') || ActionWasProcessed(es, events, action)

  // ===========================================================================
  // SYSTEM PROPERTY 2: User Actions Are Captured
  // ===========================================================================

  // When user dispatches an action, it enters pending (from UserActionAppendsExact)
  lemma {:axiom} UserActionEntersPending(es: EffectState, action: Action)
    requires E.Inv(es)
    ensures var (es', _) := E.Step(es, E.Event.UserAction(action));
            action in E.Pending(es')
            && E.Pending(es') == E.Pending(es) + [action]

  // ===========================================================================
  // SYSTEM PROPERTY 3: FIFO Processing
  // ===========================================================================

  // Actions are processed in order: only the first pending action can leave
  lemma {:axiom} FIFOProcessing(es: EffectState, event: Event, i: nat)
    requires E.Inv(es)
    requires 0 < i < |E.Pending(es)|  // Not the first action
    ensures var (es', _) := E.Step(es, event);
            E.Pending(es)[i] in E.Pending(es')  // Still there (possibly shifted)

  // ===========================================================================
  // SYSTEM PROPERTY 4: Progress
  // ===========================================================================

  // If online, idle, with pending actions, Tick initiates dispatch
  // (already proved as TickStartsDispatch)
  lemma {:axiom} OnlineIdlePendingMakesProgress(es: EffectState)
    requires E.Inv(es)
    requires E.IsOnline(es) && E.IsIdle(es) && E.HasPending(es)
    ensures var (es', cmd) := E.Step(es, E.Event.Tick);
            cmd.SendDispatch?

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
  // SYSTEM PROPERTY 6: Convergence
  // ===========================================================================

  // When pending is empty, client model reflects server state
  // (client's present was synced from server, no local changes pending)
  lemma {:axiom} ConvergenceWhenSynced(es: EffectState)
    requires E.Inv(es)
    requires !E.HasPending(es)
    ensures E.MC.ClientModel(es.client) == es.client.present
            // Client's optimistic view equals its base (no pending reapplied)
}
