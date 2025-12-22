include "MultiCollaboration.dfy"

module KanbanDomain refines Domain {
    // ---- Types ----
    type CardId = nat
    type ColId  = string

    datatype Card = Card(title: string)

    // Immutable model (datatype, not class)
    datatype Model = Model(
        columns: map<ColId, seq<CardId>>,  // ordered card IDs per column
        wip: map<ColId, nat>,              // WIP limits per column
        cards: map<CardId, Card>           // card payloads
    )

    datatype Err =
        | MissingColumn
        | MissingCard
        | DuplicateCardId
        | WipExceeded
        | BadPos

    datatype Action =
        | NoOp
        | AddColumn(col: ColId, limit: nat)
        | DeleteColumn(col: ColId)
        | SetWip(col: ColId, limit: nat)
        | AddCard(col: ColId, id: CardId, pos: nat, title: string)
        | DeleteCard(id: CardId)
        | MoveCard(id: CardId, toCol: ColId, pos: nat)
        | EditTitle(id: CardId, title: string)

    // ---- Required API ----

    function NoOp(): Action { Action.NoOp }

    // Total OT transform (may yield NoOp).
    // LWW intuition: when both edit/move same target, keep local (since it is "later").
    function Transform(remote: Action, local: Action): Action
    {
        match remote
        case NoOp =>
            local

        case DeleteCard(rc) =>
            (match local
            case EditTitle(lc, _) =>
                if lc == rc then NoOp() else local
            case MoveCard(lc, _, _) =>
                if lc == rc then NoOp() else local
            case DeleteCard(lc) =>
                if lc == rc then NoOp() else local
            case _ =>
                local)

        case EditTitle(rc, _) =>
            (match local
            case EditTitle(lc, _) =>
                // LWW for same-card title edits: keep local
                local
            case _ =>
                local)

        case MoveCard(rc, _, _) =>
            (match local
            case MoveCard(lc, _, _) =>
                // LWW for same-card moves: keep local
                local
            case _ =>
                local)

        // TODO: Column deletion interactions, add-card interactions, etc.
        case _ =>
            local
    }

    // Global invariant — stub for now.
    // You’ll likely encode:
    //  (1) exact partition of cards across columns (no dupes, no missing)
    //  (2) referential integrity: ids in columns appear in cards
    //  (3) WIP respected: |columns[c]| <= wip[c]
    predicate Inv(m: Model)
    {
        true
    }

    // Semantic step: apply action to model, may reject with error.
    function TryStep(m: Model, a: Action): Result<Model, Err>
    {
        match a
        case NoOp =>
            Ok(m)

        case AddColumn(col, limit) =>
            if col in m.columns then
                Ok(m)  // Column already exists, no-op
            else
                Ok(Model(
                    m.columns[col := []],
                    m.wip[col := limit],
                    m.cards
                ))

        case DeleteColumn(col) =>
            if col !in m.columns then
                Err(MissingColumn)
            else if |m.columns[col]| > 0 then
                Err(MissingColumn)  // Can't delete non-empty column
            else
                var newCols := map k | k in m.columns && k != col :: m.columns[k];
                var newWip := map k | k in m.wip && k != col :: m.wip[k];
                Ok(Model(newCols, newWip, m.cards))

        case SetWip(col, limit) =>
            if col !in m.columns then
                Err(MissingColumn)
            else
                Ok(Model(m.columns, m.wip[col := limit], m.cards))

        case AddCard(col, id, pos, title) =>
            if col !in m.columns then
                Err(MissingColumn)
            else if id in m.cards then
                Err(DuplicateCardId)
            else if pos > |m.columns[col]| then
                Err(BadPos)
            else
                var lane := m.columns[col];
                var newLane := lane[..pos] + [id] + lane[pos..];
                Ok(Model(
                    m.columns[col := newLane],
                    m.wip,
                    m.cards[id := Card(title)]
                ))

        case DeleteCard(id) =>
            if id !in m.cards then
                Err(MissingCard)
            else
                // Find and remove from column
                var newCols := map col | col in m.columns :: RemoveFromSeq(m.columns[col], id);
                var newCards := map k | k in m.cards && k != id :: m.cards[k];
                Ok(Model(newCols, m.wip, newCards))

        case MoveCard(id, toCol, pos) =>
            if id !in m.cards then
                Err(MissingCard)
            else if toCol !in m.columns then
                Err(MissingColumn)
            else
                // Remove from all columns, then add to target
                var removed := map col | col in m.columns :: RemoveFromSeq(m.columns[col], id);
                var targetLane := if toCol in removed then removed[toCol] else [];
                if pos > |targetLane| then
                    Err(BadPos)
                else
                    var newLane := targetLane[..pos] + [id] + targetLane[pos..];
                    Ok(Model(removed[toCol := newLane], m.wip, m.cards))

        case EditTitle(id, title) =>
            if id !in m.cards then
                Err(MissingCard)
            else
                Ok(Model(m.columns, m.wip, m.cards[id := Card(title)]))
    }

    // Helper: remove first occurrence of element from sequence
    function RemoveFromSeq(s: seq<CardId>, x: CardId): seq<CardId>
    {
        if |s| == 0 then []
        else if s[0] == x then s[1..]
        else [s[0]] + RemoveFromSeq(s[1..], x)
    }

    // Domain obligation.
    lemma StepPreservesInv(m: Model, a: Action, m2: Model)
    {
      // Trivial: Inv(m) == true for all m.
    }
}

module KanbanMultiCollaboration refines MultiCollaboration {
  import D = KanbanDomain
}

module KanbanAppCore {
  import S = KanbanMultiCollaboration
  import D = KanbanDomain

  // -------------------------
  // Type aliases
  // -------------------------

  type ServerState = S.ServerState
  type Reply = S.Reply

  // Client keeps a base version, a local present, and pending *original* actions.
  datatype ClientState = ClientState(
    baseVersion: nat,
    present: D.Model,
    pending: seq<D.Action>
  )

  // -------------------------
  // Initialization
  // -------------------------

  function InitServer(): ServerState {
    var m := D.Model(map[], map[], map[]);
    S.ServerState(m, [], [])
  }

  function InitClientFromServer(s: ServerState): ClientState {
    ClientState(S.Version(s), s.present, [])
  }

  // -------------------------
  // Action constructors
  // -------------------------

  function NoOp(): D.Action { D.NoOp() }

  function AddColumn(col: string, limit: nat): D.Action { D.AddColumn(col, limit) }
  function DeleteColumn(col: string): D.Action { D.DeleteColumn(col) }
  function SetWip(col: string, limit: nat): D.Action { D.SetWip(col, limit) }

  function AddCard(col: string, id: nat, pos: nat, title: string): D.Action {
    D.AddCard(col, id, pos, title)
  }
  function DeleteCard(id: nat): D.Action { D.DeleteCard(id) }
  function MoveCard(id: nat, toCol: string, pos: nat): D.Action { D.MoveCard(id, toCol, pos) }
  function EditTitle(id: nat, title: string): D.Action { D.EditTitle(id, title) }

  // -------------------------
  // Client-local execution (offline work)
  // -------------------------
  // Client can optimistically apply actions locally. This needs a *client reducer*.
  // You have two choices:
  //
  // (A) reuse D.TryStep to update client.present (recommended; keeps "works without server")
  // (B) do not update present locally; just append to pending and show "optimistic" UI some other way.
  //
  // Below uses (A): apply if Ok, otherwise keep present unchanged but still enqueue (or not).
  // Choose policy: I’ll implement "enqueue always, update present only on Ok" (common).

  function ClientLocalStep(m: D.Model, a: D.Action): D.Model {
    match D.TryStep(m, a)
      case Ok(m2) => m2
      case Err(_) => m
  }

  function LocalDispatch(c: ClientState, a: D.Action): ClientState {
    var m2 := ClientLocalStep(c.present, a);
    ClientState(c.baseVersion, m2, c.pending + [a])
  }

  // -------------------------
  // Sync (client pulls current server state)
  // -------------------------
  // For now, Sync just sets baseVersion/present to server's current truth.
  // Policy choice: keep pending as-is (so user can still try to flush),
  // or drop pending on sync. We keep it (standard offline queue).

  function Sync(c: ClientState, s: ServerState): ClientState {
    ClientState(S.Version(s), s.present, c.pending)
  }

  // -------------------------
  // Flush (send pending to server)
  // -------------------------
  // We submit pending actions in order, all tagged with the *same* baseVersion.
  // The server will OT-transform each against whatever suffix it has internally.
  //
  // After each Accepted, we advance client.baseVersion to the returned newVersion
  // (so subsequent actions are "less stale"). On Rejected, we keep baseVersion
  // (or we could still bump to current; policy choice). Here we *do bump* by
  // syncing to the server's current version on any reply, because the reply carries
  // the server's new present/version only on success. If rejected, we can read
  // server version from state we carry in the recursion.

  datatype FlushOutcome = FlushOutcome(
    client: ClientState,
    replies: seq<Reply>
  )

  function FlushAll(s: ServerState, c: ClientState): (ServerState, FlushOutcome)
    requires c.baseVersion <= S.Version(s)
    requires D.Inv(s.present)
    decreases |c.pending|
  {
    if |c.pending| == 0 then
      (s, FlushOutcome(c, []))
    else
      var a := c.pending[0];
      var rest := c.pending[1..];

      // Dispatch using client's baseVersion.
      var (s2, r) := S.Dispatch(s, c.baseVersion, a);

      // Update client based on reply:
      // - If accepted: set baseVersion to newVersion, set present to newPresent.
      // - If rejected: keep present as-is (or sync to server). We sync to server present
      //   to avoid diverging forever; pending action is dropped (it was attempted).
      var c2 :=
        match r
          case Accepted(v, m, _, _) =>
            ClientState(v, m, rest)
          case Rejected(_, _) =>
            // drop the rejected action; sync base/present to current server
            ClientState(S.Version(s2), s2.present, rest);

      var (s3, out) := FlushAll(s2, c2);
      (s3, FlushOutcome(out.client, [r] + out.replies))
  }

  // Public entrypoint: flush client.pending and clear it (attempted).
  function Flush(s: ServerState, c: ClientState): (ServerState, ClientState, seq<Reply>)
    requires c.baseVersion <= S.Version(s)
    requires D.Inv(s.present)
  {
    var (s2, out) := FlushAll(s, c);
    (s2, out.client, out.replies)
  }

  // -------------------------
  // Server selectors (JS helpers)
  // -------------------------

  function GetServerVersion(s: ServerState): nat { S.Version(s) }
  function GetServerPresent(s: ServerState): D.Model { s.present }
  function GetAppliedLogLen(s: ServerState): nat { |s.appliedLog| }
  function GetAuditLogLen(s: ServerState): nat { |s.auditLog| }

  // -------------------------
  // Client selectors (JS helpers)
  // -------------------------

  function GetClientBaseVersion(c: ClientState): nat { c.baseVersion }
  function GetClientPresent(c: ClientState): D.Model { c.present }
  function GetClientPendingLen(c: ClientState): nat { |c.pending| }

  // -------------------------
  // Reply inspectors (JS helpers)
  // -------------------------

  function IsAccepted(r: Reply): bool {
    match r
      case Accepted(_, _, _, _) => true
      case Rejected(_, _) => false
  }

  function IsRejected(r: Reply): bool { !IsAccepted(r) }

  function GetResponseVersion(r: Reply): nat
    requires IsAccepted(r)
  {
    match r
      case Accepted(v, _, _, _) => v
      case _ => 0
  }

  function GetSuccessPresent(r: Reply): D.Model
    requires IsAccepted(r)
  {
    match r
      case Accepted(_, m, _, _) => m
      case _ => D.Model(map[], map[], map[]) // unreachable
  }

  function GetRejectedCandidate(r: Reply): D.Action
    requires IsRejected(r)
  {
    match r
      case Rejected(_, cand) => cand
      case _ => D.NoOp() // unreachable
  }

  // -------------------------
  // Model accessors for JS (same as before, adapted to new Model)
  // -------------------------

  function GetLane(m: D.Model, col: string): seq<nat> {
    if col in m.columns then m.columns[col] else []
  }

  function GetWip(m: D.Model, col: string): nat {
    if col in m.wip then m.wip[col] else 0
  }

  function GetCardTitle(m: D.Model, id: nat): string {
    if id in m.cards then m.cards[id].title else ""
  }
}
