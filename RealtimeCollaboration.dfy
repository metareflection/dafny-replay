// RealtimeCollaboration.dfy
// Models the coordination between flush and realtime updates
// Based on the JavaScript fix: skip realtime updates while flushing
//
// This module is just a model, for the proofs.

include "MultiCollaboration.dfy"

abstract module RealtimeCollaboration {
  import MC : MultiCollaboration

  // Use MC.D for all domain types (to avoid type mismatches)
  type Model = MC.D.Model
  type Action = MC.D.Action

  // Local Option type
  datatype Option<T> = None | Some(value: T)

  // ==========================================================================
  // Client state with flush mode
  // ==========================================================================

  datatype ClientMode = Normal | Flushing

  datatype ClientState = ClientState(
    baseVersion: nat,           // last synced server version
    present: Model,             // current local model (optimistic)
    pending: seq<Action>,       // actions waiting to be flushed
    mode: ClientMode            // Normal or Flushing
  )

  // ==========================================================================
  // Client initialization
  // ==========================================================================

  function InitClient(version: nat, model: Model): ClientState
  {
    ClientState(version, model, [], Normal)
  }

  function Sync(server: MC.ServerState): ClientState
  {
    ClientState(MC.Version(server), server.present, [], Normal)
  }

  // ==========================================================================
  // Local dispatch (optimistic update)
  // ==========================================================================

  function LocalDispatch(client: ClientState, action: Action): ClientState
  {
    var result := MC.D.TryStep(client.present, action);
    match result
      case Ok(newModel) =>
        ClientState(client.baseVersion, newModel, client.pending + [action], client.mode)
      case Err(_) =>
        ClientState(client.baseVersion, client.present, client.pending + [action], client.mode)
  }

  // ==========================================================================
  // Realtime update handling - THE KEY FIX
  // ==========================================================================

  // Handle a realtime update from the server
  // KEY PROPERTY: Skip updates while flushing
  function HandleRealtimeUpdate(client: ClientState, serverVersion: nat, serverModel: Model): ClientState
  {
    if client.mode == Flushing then
      // Skip realtime updates while flushing - we'll sync at the end
      client
    else if serverVersion > client.baseVersion then
      // Accept update from other clients
      ClientState(serverVersion, serverModel, [], Normal)
    else
      // Stale update, ignore
      client
  }

  // ==========================================================================
  // Flush operations
  // ==========================================================================

  // Enter flushing mode
  function EnterFlushMode(client: ClientState): ClientState
  {
    ClientState(client.baseVersion, client.present, client.pending, Flushing)
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
    requires client.baseVersion <= MC.Version(server)
    requires MC.D.Inv(server.present)
  {
    if |client.pending| == 0 then None
    else
      var action := client.pending[0];
      var rest := client.pending[1..];

      var (newServer, reply) := MC.Dispatch(server, client.baseVersion, action);

      match reply
        case Accepted(newVersion, newPresent, applied, noChange) =>
          var newClient := ClientState(newVersion, newPresent, rest, client.mode);
          Some(FlushOneResult(newServer, newClient, reply))

        case Rejected(reason, rebased) =>
          var newClient := ClientState(MC.Version(server), server.present, rest, client.mode);
          Some(FlushOneResult(newServer, newClient, reply))
  }

  datatype FlushAllResult = FlushAllResult(
    server: MC.ServerState,
    client: ClientState,
    replies: seq<MC.Reply>
  )

  // Flush all pending actions (recursive)
  function FlushAll(server: MC.ServerState, client: ClientState): FlushAllResult
    requires client.baseVersion <= MC.Version(server)
    requires MC.D.Inv(server.present)
    requires client.mode == Flushing
    ensures MC.D.Inv(FlushAll(server, client).server.present)
    ensures FlushAll(server, client).client.mode == Flushing
    ensures |FlushAll(server, client).replies| == |client.pending|  // no silent data loss
    ensures FlushAll(server, client).client.pending == []  // all actions processed
    decreases |client.pending|
  {
    if |client.pending| == 0 then
      FlushAllResult(server, client, [])
    else
      var flushResult := FlushOne(server, client);
      if flushResult.None? then
        FlushAllResult(server, client, [])
      else
        var result := flushResult.value;
        if result.client.baseVersion <= MC.Version(result.server) then
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
    requires client.baseVersion <= MC.Version(server)
    requires MC.D.Inv(server.present)
    ensures MC.D.Inv(FlushCycle(server, client).server.present)
    ensures FlushCycle(server, client).client.mode == Normal
    ensures FlushCycle(server, client).client.pending == []
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
    requires client.baseVersion <= MC.Version(server)
    requires MC.D.Inv(server.present)
    ensures MC.D.Inv(FlushWithRealtimeEvents(server, client, events).server.present)
    ensures FlushWithRealtimeEvents(server, client, events).client.mode == Normal
    ensures FlushWithRealtimeEvents(server, client, events).client.pending == []
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
    requires client.baseVersion <= MC.Version(server)
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
    requires client.baseVersion <= MC.Version(server)
    requires MC.D.Inv(server.present)
    ensures var result := FlushCycle(server, client);
            result.client.present == result.server.present &&
            result.client.baseVersion == MC.Version(result.server)
  {
    // Follows from ExitFlushMode calling Sync
  }
}
