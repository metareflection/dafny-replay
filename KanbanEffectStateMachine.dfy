// KanbanEffectStateMachine: Verified effect orchestration for Kanban
//
// Concrete refinement of EffectStateMachine for the Kanban domain.
// This is compiled separately and used by EffectManager.js.

include "EffectStateMachine.dfy"
include "KanbanMultiCollaboration.dfy"

module KanbanEffectStateMachine refines EffectStateMachine {
  import MC = KanbanMultiCollaboration
}

// Extend KanbanAppCore with Effect State Machine functions
module KanbanEffectAppCore refines KanbanAppCore {
  import E = KanbanEffectStateMachine

  type EffectState = E.EffectState
  type EffectEvent = E.Event
  type EffectCommand = E.Command

  // Initialize effect state
  function EffectInit(version: nat, model: K.Model): EffectState {
    E.Init(version, model)
  }

  // The verified Step function
  function EffectStep(es: EffectState, event: EffectEvent): (EffectState, EffectCommand) {
    E.Step(es, event)
  }

  // State accessors
  function EffectIsOnline(es: EffectState): bool { E.IsOnline(es) }
  function EffectIsIdle(es: EffectState): bool { E.IsIdle(es) }
  function EffectHasPending(es: EffectState): bool { E.HasPending(es) }
  function EffectPendingCount(es: EffectState): nat { E.PendingCount(es) }
  function EffectGetClient(es: EffectState): ClientState { es.client }
  function EffectGetServerVersion(es: EffectState): nat { es.serverVersion }

  // Event constructors
  function EffectUserAction(action: K.Action): EffectEvent {
    E.Event.UserAction(action)
  }
  function EffectDispatchAccepted(version: nat, model: K.Model): EffectEvent {
    E.Event.DispatchAccepted(version, model)
  }
  function EffectDispatchConflict(version: nat, model: K.Model): EffectEvent {
    E.Event.DispatchConflict(version, model)
  }
  function EffectDispatchRejected(version: nat, model: K.Model): EffectEvent {
    E.Event.DispatchRejected(version, model)
  }
  function EffectNetworkError(): EffectEvent { E.Event.NetworkError }
  function EffectNetworkRestored(): EffectEvent { E.Event.NetworkRestored }
  function EffectManualGoOffline(): EffectEvent { E.Event.ManualGoOffline }
  function EffectManualGoOnline(): EffectEvent { E.Event.ManualGoOnline }
  function EffectTick(): EffectEvent { E.Event.Tick }

  // Command inspection
  function EffectIsNoOp(cmd: EffectCommand): bool { cmd.NoOp? }
  function EffectIsSendDispatch(cmd: EffectCommand): bool { cmd.SendDispatch? }
  function EffectGetBaseVersion(cmd: EffectCommand): nat
    requires cmd.SendDispatch?
  { cmd.baseVersion }
  function EffectGetAction(cmd: EffectCommand): K.Action
    requires cmd.SendDispatch?
  { cmd.action }
}
