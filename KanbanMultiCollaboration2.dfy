include "MultiCollaboration2.dfy"

module KanbanDomain refines Domain {
  type CardId = nat
  type ColId  = string

  datatype Card = Card(title: string)

  datatype Model = Model(
    cols: seq<ColId>,                 // authoritative order
    lanes: map<ColId, seq<CardId>>,   // col -> ordered ids
    wip: map<ColId, nat>,             // col -> limit
    cards: map<CardId, Card>,         // id -> payload
    nextId: nat                       // allocator (optional if you want server-only ids)
  )

  datatype Err =
    | MissingColumn
    | MissingCard
    | WipExceeded
    | BadAnchor

  datatype Option<T> = None | Some(value: T)

  // Less positional move: anchor-based intent
  datatype Place =
    | AtEnd
    | Before(anchor: CardId)
    | After(anchor: CardId)

  datatype Action =
    | NoOp
    | AddColumn(col: ColId, limit: nat)
    | SetWip(col: ColId, limit: nat)
    | AddCard(col: ColId, title: string)     // allocates nextId
    | MoveCard(id: CardId, toCol: ColId, place: Place)
    | EditTitle(id: CardId, title: string)

  // --- Invariant helpers ---

  // No duplicates in a sequence
  predicate NoDupSeq<T(==)>(s: seq<T>)
  {
    forall i, j :: 0 <= i < j < |s| ==> s[i] != s[j]
  }

  // Flatten all lanes along cols order into a single sequence of CardIds
  function AllIds(m: Model): seq<CardId>
  {
    AllIdsHelper(m.cols, m.lanes)
  }

  function AllIdsHelper(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>): seq<CardId>
  {
    if |cols| == 0 then []
    else
      var c := cols[0];
      var lane := if c in lanes then lanes[c] else [];
      lane + AllIdsHelper(cols[1..], lanes)
  }

  // Check if id occurs in any lane
  predicate OccursInLanes(m: Model, id: CardId)
  {
    exists c :: c in m.lanes && SeqContains(m.lanes[c], id)
  }

  // Count occurrences of id across all lanes
  function CountInLanes(m: Model, id: CardId): nat
  {
    CountInLanesHelper(m.cols, m.lanes, id)
  }

  function CountInLanesHelper(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, id: CardId): nat
  {
    if |cols| == 0 then 0
    else
      var c := cols[0];
      var lane := if c in lanes then lanes[c] else [];
      var here := if SeqContains(lane, id) then 1 else 0;
      here + CountInLanesHelper(cols[1..], lanes, id)
  }

  // --- Real invariant ---
  ghost predicate Inv(m: Model)
  {
    // A: Columns are unique
    NoDupSeq(m.cols)

    // B: lanes and wip defined exactly on cols
    && (forall c :: c in m.lanes <==> SeqContains(m.cols, c))
    && (forall c :: c in m.wip <==> SeqContains(m.cols, c))

    // C: Every id in any lane exists in cards
    && (forall c, id :: c in m.lanes && SeqContains(m.lanes[c], id) ==> id in m.cards)

    // D: Every card id occurs in exactly one lane (no duplicates, no orphans)
    && (forall id :: id in m.cards ==> CountInLanes(m, id) == 1)

    // E: No duplicate ids within any single lane
    && (forall c :: c in m.lanes ==> NoDupSeq(m.lanes[c]))

    // F: WIP respected: each lane length <= its limit
    && (forall c :: c in m.cols && c in m.lanes && c in m.wip ==> |m.lanes[c]| <= m.wip[c])

    // G: Allocator fresh: all card ids are < nextId
    && (forall id :: id in m.cards ==> id < m.nextId)
  }

  // --- Helpers ---
  function Get<K,V>(mp: map<K,V>, k: K, d: V): V { if k in mp then mp[k] else d }
  function Lane(m: Model, c: ColId): seq<CardId> { Get(m.lanes, c, []) }
  function Wip(m: Model, c: ColId): nat { Get(m.wip, c, 0) }

  function SeqContains<T(==)>(s: seq<T>, x: T): bool { exists i :: 0 <= i < |s| && s[i] == x }

  function RemoveFirst<T(==)>(s: seq<T>, x: T): seq<T>
  {
    if |s| == 0 then []
    else if s[0] == x then s[1..]
    else [s[0]] + RemoveFirst(s[1..], x)
  }

  function InsertAt<T>(s: seq<T>, i: nat, x: T): seq<T>
    requires i <= |s|
  {
    s[..i] + [x] + s[i..]
  }

  function IndexOf<T(==)>(s: seq<T>, x: T): int
  {
    if |s| == 0 then -1
    else if s[0] == x then 0
    else
      var j := IndexOf(s[1..], x);
      if j < 0 then -1 else j + 1
  }

  function ClampPos(pos: int, n: int): nat
    requires n >= 0
  {
    if pos <= 0 then 0
    else if pos >= n then n as nat
    else pos as nat
  }

  // Compute candidate position from an anchor intent *in the current lane*.
  function PosFromPlace(lane: seq<CardId>, p: Place): int
  {
    match p
      case AtEnd => |lane|
      case Before(a) =>
        var i := IndexOf(lane, a);
        if i < 0 then -1 else i
      case After(a) =>
        var i := IndexOf(lane, a);
        if i < 0 then -1 else i + 1
  }

  // --- Semantics ---
  function TryStep(m: Model, a: Action): Result<Model, Err>
  {
    match a
      case NoOp => Ok(m)

      case AddColumn(col, limit) =>
        if col in m.cols then Ok(m)
        else Ok(Model(m.cols + [col],
                      m.lanes[col := []],
                      m.wip[col := limit],
                      m.cards,
                      m.nextId))

      case SetWip(col, limit) =>
        if !(col in m.cols) then Err(MissingColumn)
        else if limit < |Lane(m,col)| then Err(WipExceeded)
        else Ok(Model(m.cols, m.lanes, m.wip[col := limit], m.cards, m.nextId))

      case AddCard(col, title) =>
        if !(col in m.cols) then Err(MissingColumn)
        else if |Lane(m,col)| + 1 > Wip(m,col) then Err(WipExceeded)
        else
          var id := m.nextId;
          Ok(Model(m.cols,
                   m.lanes[col := Lane(m,col) + [id]],
                   m.wip,
                   m.cards[id := Card(title)],
                   m.nextId + 1))

      case EditTitle(id, title) =>
        if !(id in m.cards) then Err(MissingCard)
        else Ok(Model(m.cols, m.lanes, m.wip, m.cards[id := Card(title)], m.nextId))

      case MoveCard(id, toCol, place) =>
        if !(id in m.cards) then Err(MissingCard)
        else if !(toCol in m.cols) then Err(MissingColumn)
        else if |Lane(m,toCol)| + (if SeqContains(Lane(m,toCol), id) then 0 else 1) > Wip(m,toCol) then Err(WipExceeded)
        else
          // remove from all lanes, then insert into toCol
          var lanes1 := map c | c in m.lanes :: RemoveFirst(m.lanes[c], id);
          var tgt := Get(lanes1, toCol, []);
          var pos := PosFromPlace(tgt, place);
          if pos < 0 then Err(BadAnchor)
          else
            var k := ClampPos(pos, |tgt|);
            var tgt2 := InsertAt(tgt, k, id);
            Ok(Model(m.cols, lanes1[toCol := tgt2], m.wip, m.cards, m.nextId))
  }

  // --- Collaboration hooks ---

  // Helper: extract anchor from a Place
  function PlaceAnchor(p: Place): Option<CardId>
  {
    match p
      case AtEnd => None
      case Before(a) => Some(a)
      case After(a) => Some(a)
  }

  // Helper: degrade place to AtEnd if anchor is the moved card
  function DegradeIfAnchorMoved(movedId: CardId, p: Place): Place
  {
    match p
      case AtEnd => AtEnd
      case Before(a) => if a == movedId then AtEnd else p
      case After(a) => if a == movedId then AtEnd else p
  }

  // Rebase: intent-aware transformation of local action given remote action.
  // For Kanban:
  // - Title edits commute with moves.
  // - Same-card move/move: keep local (LWW-by-arrival).
  // - If remote moved the anchor card, degrade local's place to AtEnd.
  function Rebase(remote: Action, local: Action): Action
  {
    match (remote, local)
      case (NoOp, _) => local
      case (_, NoOp) => NoOp

      // Same card move: keep local (LWW).
      case (MoveCard(rid, _, _), MoveCard(lid, ltoCol, lplace)) =>
        if rid == lid then local
        // Remote moved anchor card: degrade local's placement
        else MoveCard(lid, ltoCol, DegradeIfAnchorMoved(rid, lplace))

      // Same card edit: keep local (LWW).
      case (EditTitle(rid, _), EditTitle(lid, _)) =>
        if rid == lid then local else local

      // Remote move might affect local move's anchor
      case (MoveCard(rid, _, _), _) => local

      // AddColumn doesn't affect other actions
      case (AddColumn(_, _), _) => local

      // SetWip doesn't affect other actions
      case (SetWip(_, _), _) => local

      // AddCard doesn't affect other actions (new id won't collide)
      case (AddCard(_, _), _) => local

      // EditTitle doesn't affect other actions
      case (EditTitle(_, _), _) => local
  }

  // "Explains": candidate is a meaning-preserving interpretation of orig.
  // For Kanban:
  // - Non-move actions: exact equality
  // - MoveCard: same card + same destination column; placement can degrade
  //   (i.e., anchor fallback allowed if anchor missing)
  ghost predicate Explains(orig: Action, cand: Action)
  {
    match (orig, cand)
      // MoveCard: same card, same destination column = meaning preserved
      // (placement can differ due to anchor fallback)
      case (MoveCard(oid, otoCol, _), MoveCard(cid, ctoCol, _)) =>
        oid == cid && otoCol == ctoCol

      // All other actions: exact equality
      case (_, _) => orig == cand
  }

  // Candidates: give a small list that avoids coarse rejection.
  // For MoveCard, try:
  //  1. Original placement (anchor-resolved)
  //  2. AtEnd fallback (if anchor missing or for resilience)
  //  3. AtStart (Before first card) for less disruption if lane non-empty
  function Candidates(m: Model, a: Action): seq<Action>
  {
    match a
      case MoveCard(id, toCol, place) =>
        var lane := Lane(m, toCol);
        if place == AtEnd then
          // Already AtEnd, just try it
          [MoveCard(id, toCol, AtEnd)]
        else if |lane| == 0 then
          // Empty lane: AtEnd is the only sensible placement
          [MoveCard(id, toCol, place), MoveCard(id, toCol, AtEnd)]
        else
          // Try: original, AtEnd, and Before(first) for front placement
          var first := lane[0];
          [MoveCard(id, toCol, place),
           MoveCard(id, toCol, AtEnd),
           MoveCard(id, toCol, Before(first))]
      case _ =>
        [a]
  }

  lemma StepPreservesInv(m: Model, a: Action, m2: Model)
  {
    // TODO: prove each action case preserves invariant
    assume {:axiom} false;
  }

  lemma CandidatesComplete(m: Model, orig: Action, aGood: Action, m2: Model)
  {
    // TODO: prove that Candidates covers all Explains-compatible actions
    assume {:axiom} false;
  }
}

module KanbanMultiCollaboration refines MultiCollaboration {
  import D = KanbanDomain
}

// =============================================================================
// AppCore: Client-side state management (compiled, JS-friendly)
// =============================================================================
module KanbanAppCore {
  import K = KanbanDomain
  import MC = KanbanMultiCollaboration

  // -------------------------------------------------------------------------
  // Client state
  // -------------------------------------------------------------------------
  datatype ClientState = ClientState(
    baseVersion: nat,           // last synced server version
    present: K.Model,           // current local model (optimistic)
    pending: seq<K.Action>      // actions waiting to be flushed
  )

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------

  // Create initial server state from a model
  function InitServer(initModel: K.Model): MC.ServerState
  {
    MC.ServerState(initModel, [], [])
  }

  // Create client state synced to server
  function InitClientFromServer(server: MC.ServerState): ClientState
  {
    ClientState(MC.Version(server), server.present, [])
  }

  // -------------------------------------------------------------------------
  // Client local dispatch (optimistic update)
  // -------------------------------------------------------------------------

  // Policy: optimistic apply if TryStep succeeds, always enqueue
  function ClientLocalDispatch(client: ClientState, action: K.Action): ClientState
  {
    // Try to apply optimistically
    var result := K.TryStep(client.present, action);
    match result
      case Ok(newModel) =>
        // Optimistic success: update local model and enqueue
        ClientState(client.baseVersion, newModel, client.pending + [action])
      case Err(_) =>
        // Optimistic failure: still enqueue (server might accept with fallback)
        ClientState(client.baseVersion, client.present, client.pending + [action])
  }

  // -------------------------------------------------------------------------
  // Flush: send pending actions to server
  // -------------------------------------------------------------------------

  datatype FlushResult = FlushResult(
    server: MC.ServerState,
    client: ClientState,
    reply: MC.Reply
  )

  // Flush one pending action to server
  function FlushOne(server: MC.ServerState, client: ClientState): K.Option<FlushResult>
    requires client.baseVersion <= MC.Version(server)
    requires K.Inv(server.present)  // Server must maintain invariant
  {
    if |client.pending| == 0 then K.None
    else
      var action := client.pending[0];
      var rest := client.pending[1..];

      var (newServer, reply) := MC.Dispatch(server, client.baseVersion, action);

      match reply
        case Accepted(newVersion, newPresent, applied, noChange) =>
          // Update client to match server
          var newClient := ClientState(newVersion, newPresent, rest);
          K.Some(FlushResult(newServer, newClient, reply))

        case Rejected(reason, rebased) =>
          // Drop the action and sync to server state
          var newClient := ClientState(MC.Version(server), server.present, rest);
          K.Some(FlushResult(newServer, newClient, reply))
  }

  datatype FlushAllResult = FlushAllResult(
    server: MC.ServerState,
    client: ClientState,
    replies: seq<MC.Reply>
  )

  // Flush all pending actions
  // Note: we use a ghost ensures to track that invariant is preserved
  function FlushAll(server: MC.ServerState, client: ClientState): FlushAllResult
    requires client.baseVersion <= MC.Version(server)
    requires K.Inv(server.present)  // Server must maintain invariant
    ensures K.Inv(FlushAll(server, client).server.present)
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
        // Dispatch preserves invariant (by MC.Dispatch ensures)
        // Version only increases by 0 or 1, so we need to check the bound
        if result.client.baseVersion <= MC.Version(result.server) then
          var rest := FlushAll(result.server, result.client);
          FlushAllResult(rest.server, rest.client, [result.reply] + rest.replies)
        else
          // Should not happen, but be safe
          FlushAllResult(result.server, result.client, [result.reply])
  }

  // -------------------------------------------------------------------------
  // Sync: pull server state (discard pending, full reset)
  // -------------------------------------------------------------------------
  function Sync(server: MC.ServerState): ClientState
  {
    ClientState(MC.Version(server), server.present, [])
  }

  // -------------------------------------------------------------------------
  // Inspection helpers
  // -------------------------------------------------------------------------

  function ServerVersion(server: MC.ServerState): nat
  {
    MC.Version(server)
  }

  function ServerModel(server: MC.ServerState): K.Model
  {
    server.present
  }

  function AuditLength(server: MC.ServerState): nat
  {
    |server.auditLog|
  }

  function PendingCount(client: ClientState): nat
  {
    |client.pending|
  }

  function ClientModel(client: ClientState): K.Model
  {
    client.present
  }

  function ClientVersion(client: ClientState): nat
  {
    client.baseVersion
  }

  // Check if reply was accepted
  function IsAccepted(reply: MC.Reply): bool
  {
    reply.Accepted?
  }

  // Check if reply was rejected
  function IsRejected(reply: MC.Reply): bool
  {
    reply.Rejected?
  }
}
