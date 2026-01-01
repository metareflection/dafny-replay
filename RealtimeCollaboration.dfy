// RealtimeCollaboration.dfy
// Models the coordination between flush and realtime updates
// Based on the JavaScript fix: skip realtime updates while flushing
//
// This module EXTENDS MultiCollaboration with mode-aware client state.
// It uses MC.ReapplyPending and MC.HandleRealtimeUpdate for the core logic,
// adding mode awareness (Normal | Flushing | Offline) on top.

include "MultiCollaboration.dfy"

abstract module RealtimeCollaboration {
  import MC : MultiCollaboration

  // Use MC.D for all domain types (to avoid type mismatches)
  type Model = MC.D.Model
  type Action = MC.D.Action

  // Local Option type
  datatype Option<T> = None | Some(value: T)

  // ==========================================================================
  // Client state with flush mode (extends MC.ClientState)
  // ==========================================================================

  datatype ClientMode = Normal | Flushing | Offline

  // Extended client state: wraps MC.ClientState + mode
  datatype ClientState = ClientState(
    base: MC.ClientState,       // Core client state (version, model, pending)
    mode: ClientMode            // Normal, Flushing, or Offline
  )

  // Accessors that delegate to base
  function BaseVersion(client: ClientState): nat { client.base.baseVersion }
  function Present(client: ClientState): Model { client.base.present }
  function Pending(client: ClientState): seq<Action> { client.base.pending }

  // ==========================================================================
  // Client initialization
  // ==========================================================================

  function InitClient(version: nat, model: Model): ClientState
  {
    ClientState(MC.InitClient(version, model), Normal)
  }

  function Sync(server: MC.ServerState): ClientState
  {
    ClientState(MC.Sync(server), Normal)
  }

  // ==========================================================================
  // Local dispatch (optimistic update)
  // ==========================================================================

  function LocalDispatch(client: ClientState, action: Action): ClientState
  {
    // Delegate to MC.ClientLocalDispatch, preserve mode
    var newBase := MC.ClientLocalDispatch(client.base, action);
    ClientState(newBase, client.mode)
  }

  // ==========================================================================
  // Realtime update handling - THE KEY FIX
  // ==========================================================================

  // Handle a realtime update from the server
  // KEY PROPERTIES:
  // - Skip when flushing or offline
  // - Preserve pending actions by re-applying to new server model (via MC.HandleRealtimeUpdate)
  function HandleRealtimeUpdate(client: ClientState, serverVersion: nat, serverModel: Model): ClientState
  {
    if client.mode == Flushing || client.mode == Offline then
      // Skip realtime updates while flushing or offline
      // - Flushing: we'll sync at the end
      // - Offline: user doesn't expect to see network updates
      client
    else
      // Delegate to MC.HandleRealtimeUpdate for the actual logic
      var newBase := MC.HandleRealtimeUpdate(client.base, serverVersion, serverModel);
      ClientState(newBase, Normal)
  }

  // ==========================================================================
  // Flush operations
  // ==========================================================================

  // Enter flushing mode
  function EnterFlushMode(client: ClientState): ClientState
  {
    ClientState(client.base, Flushing)
  }

  // Exit flushing mode (after sync)
  function ExitFlushMode(client: ClientState, server: MC.ServerState): ClientState
  {
    Sync(server)
  }

  datatype FlushOneResult = FlushOneResult(
    server: MC.ServerState,
    client: ClientState,
    reply: MC.Reply
  )

  // Flush one pending action
  function FlushOne(server: MC.ServerState, client: ClientState): Option<FlushOneResult>
    requires BaseVersion(client) <= MC.Version(server)
    requires MC.D.Inv(server.present)
  {
    if |Pending(client)| == 0 then None
    else
      var action := Pending(client)[0];
      var rest := Pending(client)[1..];

      var (newServer, reply) := MC.Dispatch(server, BaseVersion(client), action);

      match reply
        case Accepted(newVersion, newPresent, applied, noChange) =>
          var newBase := MC.ClientState(newVersion, newPresent, rest);
          var newClient := ClientState(newBase, client.mode);
          Some(FlushOneResult(newServer, newClient, reply))

        case Rejected(reason, rebased) =>
          var newBase := MC.ClientState(MC.Version(server), server.present, rest);
          var newClient := ClientState(newBase, client.mode);
          Some(FlushOneResult(newServer, newClient, reply))
  }

  datatype FlushAllResult = FlushAllResult(
    server: MC.ServerState,
    client: ClientState,
    replies: seq<MC.Reply>
  )

  // Flush all pending actions (recursive)
  function FlushAll(server: MC.ServerState, client: ClientState): FlushAllResult
    requires BaseVersion(client) <= MC.Version(server)
    requires MC.D.Inv(server.present)
    requires client.mode == Flushing
    ensures MC.D.Inv(FlushAll(server, client).server.present)
    ensures FlushAll(server, client).client.mode == Flushing
    ensures |FlushAll(server, client).replies| == |Pending(client)|  // no silent data loss
    ensures Pending(FlushAll(server, client).client) == []  // all actions processed
    decreases |Pending(client)|
  {
    if |Pending(client)| == 0 then
      FlushAllResult(server, client, [])
    else
      var flushResult := FlushOne(server, client);
      if flushResult.None? then
        FlushAllResult(server, client, [])
      else
        var result := flushResult.value;
        if BaseVersion(result.client) <= MC.Version(result.server) then
          var rest := FlushAll(result.server, result.client);
          FlushAllResult(rest.server, rest.client, [result.reply] + rest.replies)
        else
          FlushAllResult(result.server, result.client, [result.reply])
  }

  // ==========================================================================
  // Complete flush cycle: enter flush mode, flush all, sync
  // ==========================================================================

  datatype FlushCycleResult = FlushCycleResult(
    server: MC.ServerState,
    client: ClientState,
    replies: seq<MC.Reply>
  )

  function FlushCycle(server: MC.ServerState, client: ClientState): FlushCycleResult
    requires BaseVersion(client) <= MC.Version(server)
    requires MC.D.Inv(server.present)
    ensures MC.D.Inv(FlushCycle(server, client).server.present)
    ensures FlushCycle(server, client).client.mode == Normal
    ensures Pending(FlushCycle(server, client).client) == []
  {
    // 1. Enter flushing mode
    var flushingClient := EnterFlushMode(client);

    // 2. Flush all pending actions
    var flushResult := FlushAll(server, flushingClient);

    // 3. Exit flushing mode with final sync
    var finalClient := ExitFlushMode(flushResult.client, flushResult.server);

    FlushCycleResult(flushResult.server, finalClient, flushResult.replies)
  }

  // ==========================================================================
  // KEY THEOREM: Realtime updates during flush don't affect final state
  // ==========================================================================

  // Model an interleaved execution where realtime updates arrive during flush
  // We prove that the final state is the same as if we skipped them

  // A "realtime event" that might arrive during flush
  datatype RealtimeEvent = RealtimeEvent(version: nat, model: Model)

  // Process flush with interleaved realtime events
  // Since HandleRealtimeUpdate skips during Flushing mode, events have no effect
  function FlushWithRealtimeEvents(
    server: MC.ServerState,
    client: ClientState,
    events: seq<RealtimeEvent>
  ): FlushCycleResult
    requires BaseVersion(client) <= MC.Version(server)
    requires MC.D.Inv(server.present)
    ensures MC.D.Inv(FlushWithRealtimeEvents(server, client, events).server.present)
    ensures FlushWithRealtimeEvents(server, client, events).client.mode == Normal
    ensures Pending(FlushWithRealtimeEvents(server, client, events).client) == []
  {
    // 1. Enter flushing mode
    var flushingClient := EnterFlushMode(client);

    // 2. Process realtime events (all skipped because mode == Flushing)
    var afterEvents := ProcessRealtimeEvents(flushingClient, events);

    // 3. Flush all pending actions
    var flushResult := FlushAll(server, afterEvents);

    // 4. Exit flushing mode with final sync
    var finalClient := ExitFlushMode(flushResult.client, flushResult.server);

    FlushCycleResult(flushResult.server, finalClient, flushResult.replies)
  }

  function ProcessRealtimeEvents(client: ClientState, events: seq<RealtimeEvent>): ClientState
    ensures client.mode == Flushing ==> ProcessRealtimeEvents(client, events) == client
    decreases |events|
  {
    if |events| == 0 then client
    else
      var e := events[0];
      var newClient := HandleRealtimeUpdate(client, e.version, e.model);
      // When flushing, newClient == client, so mode stays Flushing
      ProcessRealtimeEvents(newClient, events[1..])
  }

  // THE KEY LEMMA: Realtime events have no effect during flush
  lemma RealtimeEventsSkippedDuringFlush(client: ClientState, events: seq<RealtimeEvent>)
    requires client.mode == Flushing
    ensures ProcessRealtimeEvents(client, events) == client
  {
    if |events| == 0 {
      // Base case: no events, client unchanged
    } else {
      // Inductive case
      var e := events[0];
      var newClient := HandleRealtimeUpdate(client, e.version, e.model);
      // HandleRealtimeUpdate returns client unchanged when mode == Flushing
      assert newClient == client;
      // Recursive call
      RealtimeEventsSkippedDuringFlush(client, events[1..]);
    }
  }

  // MAIN THEOREM: Flush with realtime events gives same result as flush without
  lemma FlushWithRealtimeEventsEquivalent(
    server: MC.ServerState,
    client: ClientState,
    events: seq<RealtimeEvent>
  )
    requires BaseVersion(client) <= MC.Version(server)
    requires MC.D.Inv(server.present)
    ensures FlushWithRealtimeEvents(server, client, events) == FlushCycle(server, client)
  {
    var flushingClient := EnterFlushMode(client);
    RealtimeEventsSkippedDuringFlush(flushingClient, events);
    // After applying the lemma, ProcessRealtimeEvents(flushingClient, events) == flushingClient
    // So FlushWithRealtimeEvents and FlushCycle take the same path
  }

  // ==========================================================================
  // Additional property: After flush cycle, client is synced with server
  // ==========================================================================

  lemma FlushCycleClientSynced(server: MC.ServerState, client: ClientState)
    requires BaseVersion(client) <= MC.Version(server)
    requires MC.D.Inv(server.present)
    ensures var result := FlushCycle(server, client);
            Present(result.client) == result.server.present &&
            BaseVersion(result.client) == MC.Version(result.server)
  {
    // Follows from ExitFlushMode calling Sync
  }
}
