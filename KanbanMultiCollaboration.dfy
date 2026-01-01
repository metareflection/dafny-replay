include "MultiCollaboration.dfy"

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
    | Rejected  // Used by kernel when no candidate succeeds

  // Distinguished error for rejection
  function RejectErr(): Err { Rejected }

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

  // --- Initial model ---
  function Init(): Model {
    Model([], map[], map[], map[], 0)
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

      // Edits: keep local (LWW).
      case (EditTitle(_, _), EditTitle(_, _)) => local

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
  // - MoveCard: same card + same destination column; placement can be:
  //   (1) same as original, or (2) AtEnd fallback
  //
  // NOTE: This definition is deliberately restrictive. The minimal-reject
  // guarantee we prove is: "If origPlace OR AtEnd would succeed, server
  // won't reject." The server also tries Before(first) as a heuristic,
  // but that's not covered by this guarantee. See BeforeFirstImpliesAtEnd
  // for why Before(first) success implies AtEnd success anyway.
  ghost predicate Explains(orig: Action, cand: Action)
  {
    match (orig, cand)
      // MoveCard: same card, same destination column, and placement is either
      // the original placement or AtEnd (the universal fallback)
      case (MoveCard(oid, otoCol, origPlace), MoveCard(cid, ctoCol, candPlace)) =>
        oid == cid && otoCol == ctoCol &&
        (candPlace == origPlace || candPlace == AtEnd)

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

  lemma InitSatisfiesInv()
    ensures Inv(Init())
  {
    // Empty model trivially satisfies all invariant conditions
  }

  lemma StepPreservesInv(m: Model, a: Action, m2: Model)
  {
    match a {
      case NoOp =>
        // Model unchanged, invariant trivially preserved
        assert m2 == m;

      case AddColumn(col, limit) =>
        if col in m.cols {
          assert m2 == m;
        } else {
          // New column added
          AddColumnPreservesInv(m, col, limit, m2);
        }

      case SetWip(col, limit) =>
        if !(col in m.cols) {
          // Error case, not Ok
        } else if limit < |Lane(m, col)| {
          // Error case, not Ok
        } else {
          SetWipPreservesInv(m, col, limit, m2);
        }

      case AddCard(col, title) =>
        if !(col in m.cols) {
          // Error case
        } else if |Lane(m, col)| + 1 > Wip(m, col) {
          // Error case
        } else {
          AddCardPreservesInv(m, col, title, m2);
        }

      case EditTitle(id, title) =>
        if !(id in m.cards) {
          // Error case
        } else {
          EditTitlePreservesInv(m, id, title, m2);
        }

      case MoveCard(id, toCol, place) =>
        if !(id in m.cards) || !(toCol in m.cols) {
          // Error cases
        } else if |Lane(m, toCol)| + (if SeqContains(Lane(m, toCol), id) then 0 else 1) > Wip(m, toCol) {
          // WIP exceeded error
        } else {
          var lanes1 := map c | c in m.lanes :: RemoveFirst(m.lanes[c], id);
          var tgt := Get(lanes1, toCol, []);
          var pos := PosFromPlace(tgt, place);
          if pos < 0 {
            // BadAnchor error
          } else {
            MoveCardPreservesInvHelper(m, id, toCol, place, m2, lanes1, tgt, pos);
          }
        }
    }
  }

  // Helper to establish preconditions more explicitly
  lemma MoveCardPreservesInvHelper(m: Model, id: CardId, toCol: ColId, place: Place, m2: Model,
                                    lanes1: map<ColId, seq<CardId>>, tgt: seq<CardId>, pos: int)
    requires Inv(m)
    requires id in m.cards
    requires toCol in m.cols
    requires |Lane(m, toCol)| + (if SeqContains(Lane(m, toCol), id) then 0 else 1) <= Wip(m, toCol)
    requires lanes1 == map c | c in m.lanes :: RemoveFirst(m.lanes[c], id)
    requires tgt == Get(lanes1, toCol, [])
    requires pos == PosFromPlace(tgt, place)
    requires pos >= 0
    requires TryStep(m, MoveCard(id, toCol, place)) == Ok(m2)
    ensures Inv(m2)
  {
    var k := ClampPos(pos, |tgt|);
    assert m2 == Model(m.cols, lanes1[toCol := InsertAt(tgt, k, id)], m.wip, m.cards, m.nextId);
    MoveCardPreservesInv(m, id, toCol, place, m2);
  }

  // --- Helper lemmas for StepPreservesInv ---

  lemma AddColumnPreservesInv(m: Model, col: ColId, limit: nat, m2: Model)
    requires Inv(m)
    requires !(col in m.cols)
    requires m2 == Model(m.cols + [col], m.lanes[col := []], m.wip[col := limit], m.cards, m.nextId)
    ensures Inv(m2)
  {
    // A: NoDupSeq(m2.cols)
    assert NoDupSeq(m.cols);
    assert !(col in m.cols);
    NoDupSeqAppend(m.cols, col);

    // B: lanes and wip defined exactly on cols
    forall c
      ensures c in m2.lanes <==> SeqContains(m2.cols, c)
    {
      SeqContainsAppend(m.cols, col, c);
    }
    forall c
      ensures c in m2.wip <==> SeqContains(m2.cols, c)
    {
      SeqContainsAppend(m.cols, col, c);
    }

    // C: Every id in any lane exists in cards
    // New lane is empty, so no new ids added

    // D: CountInLanes preserved (new lane is empty)
    forall id | id in m2.cards
      ensures CountInLanes(m2, id) == 1
    {
      CountInLanesAddEmptyColumn(m, col, limit, id);
    }

    // E: No duplicates in lanes (new lane is empty)

    // F: WIP respected (new lane is empty, 0 <= limit)

    // G: Allocator fresh (cards unchanged)
  }

  lemma NoDupSeqAppend<T>(s: seq<T>, x: T)
    requires NoDupSeq(s)
    requires !SeqContains(s, x)
    ensures NoDupSeq(s + [x])
  {
    var s2 := s + [x];
    forall i, j | 0 <= i < j < |s2|
      ensures s2[i] != s2[j]
    {
      if j < |s| {
        assert s2[i] == s[i] && s2[j] == s[j];
      } else {
        // j == |s|, so s2[j] == x
        assert s2[j] == x;
        assert 0 <= i < |s|;
        assert s2[i] == s[i];
        SeqContainsIndex(s, x, i);
      }
    }
  }

  lemma SeqContainsIndex<T>(s: seq<T>, x: T, i: nat)
    requires 0 <= i < |s|
    requires !SeqContains(s, x)
    ensures s[i] != x
  {
    if s[i] == x {
      assert exists k :: 0 <= k < |s| && s[k] == x;
    }
  }

  lemma SeqContainsAppend<T>(s: seq<T>, x: T, y: T)
    ensures SeqContains(s + [x], y) <==> (SeqContains(s, y) || y == x)
  {
    var s2 := s + [x];
    if SeqContains(s2, y) {
      var i :| 0 <= i < |s2| && s2[i] == y;
      if i < |s| {
        assert s[i] == y;
      } else {
        assert y == x;
      }
    }
    if SeqContains(s, y) {
      var i :| 0 <= i < |s| && s[i] == y;
      assert s2[i] == y;
    }
    if y == x {
      assert s2[|s|] == x;
    }
  }

  lemma CountInLanesAddEmptyColumn(m: Model, col: ColId, limit: nat, id: CardId)
    requires Inv(m)
    requires !(col in m.cols)
    requires id in m.cards
    ensures CountInLanes(Model(m.cols + [col], m.lanes[col := []], m.wip[col := limit], m.cards, m.nextId), id) == 1
  {
    var m2 := Model(m.cols + [col], m.lanes[col := []], m.wip[col := limit], m.cards, m.nextId);
    CountInLanesHelperAddEmptyColumn(m.cols, m.lanes, col, id);
    assert CountInLanes(m, id) == 1;
    assert CountInLanes(m2, id) == CountInLanesHelper(m.cols + [col], m.lanes[col := []], id);
  }

  lemma CountInLanesHelperAddEmptyColumn(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, col: ColId, id: CardId)
    requires !SeqContains(cols, col)
    ensures CountInLanesHelper(cols + [col], lanes[col := []], id) == CountInLanesHelper(cols, lanes, id)
  {
    var lanes2 := lanes[col := []];
    if |cols| == 0 {
      // Base case: cols + [col] = [col]
      assert CountInLanesHelper([col], lanes2, id) ==
        (if SeqContains([], id) then 1 else 0) + CountInLanesHelper([], lanes2, id);
      assert CountInLanesHelper([col], lanes2, id) == 0;
      assert CountInLanesHelper([], lanes, id) == 0;
    } else {
      var c := cols[0];
      var rest := cols[1..];
      // lanes2[c] == lanes[c] because c != col (since col not in cols)
      assert c != col;
      assert (if c in lanes2 then lanes2[c] else []) == (if c in lanes then lanes[c] else []);

      // Recursive call
      assert !SeqContains(rest, col);
      CountInLanesHelperAddEmptyColumn(rest, lanes, col, id);

      // cols + [col] = [c] + (rest + [col])
      assert (cols + [col])[0] == c;
      assert (cols + [col])[1..] == rest + [col];
    }
  }

  lemma SetWipPreservesInv(m: Model, col: ColId, limit: nat, m2: Model)
    requires Inv(m)
    requires col in m.cols
    requires limit >= |Lane(m, col)|
    requires m2 == Model(m.cols, m.lanes, m.wip[col := limit], m.cards, m.nextId)
    ensures Inv(m2)
  {
    // Only wip changes, all other invariants trivially preserved
    // F: new limit >= |lane|, so WIP still respected
  }

  lemma AddCardPreservesInv(m: Model, col: ColId, title: string, m2: Model)
    requires Inv(m)
    requires col in m.cols
    requires |Lane(m, col)| + 1 <= Wip(m, col)
    requires m2 == Model(m.cols, m.lanes[col := Lane(m, col) + [m.nextId]], m.wip, m.cards[m.nextId := Card(title)], m.nextId + 1)
    ensures Inv(m2)
  {
    var id := m.nextId;

    // A: cols unchanged

    // B: lanes keys unchanged (col was already in lanes)

    // C: new id is added to cards

    // D: CountInLanes for new id == 1, old ids unchanged
    forall cid | cid in m2.cards
      ensures CountInLanes(m2, cid) == 1
    {
      if cid == id {
        // New card: appears exactly once in col's lane
        CountInLanesNewCard(m, col, id);
      } else {
        // Old card: count unchanged
        CountInLanesOldCardAfterAdd(m, col, id, cid);
      }
    }

    // E: No duplicates - new id not in any lane (it's fresh)
    forall c | c in m2.lanes
      ensures NoDupSeq(m2.lanes[c])
    {
      if c == col {
        // Need to show Lane(m, col) + [id] has no duplicates
        NoDupSeqAppendFresh(Lane(m, col), id, m);
      }
    }

    // F: WIP check passes by precondition

    // G: new nextId > id, old cards < id < id + 1
  }

  lemma NoDupSeqAppendFresh(lane: seq<CardId>, id: CardId, m: Model)
    requires Inv(m)
    requires id == m.nextId
    requires NoDupSeq(lane)
    requires forall x :: SeqContains(lane, x) ==> x in m.cards
    ensures NoDupSeq(lane + [id])
  {
    // id >= m.nextId, but all ids in lane are < m.nextId
    assert !SeqContains(lane, id) by {
      if SeqContains(lane, id) {
        assert id in m.cards;
        assert id < m.nextId;  // from Inv
        assert false;
      }
    }
    NoDupSeqAppend(lane, id);
  }

  lemma CountInLanesNewCard(m: Model, col: ColId, id: CardId)
    requires Inv(m)
    requires col in m.cols
    requires id == m.nextId
    ensures CountInLanes(Model(m.cols, m.lanes[col := Lane(m, col) + [id]], m.wip, m.cards[id := Card("")], m.nextId + 1), id) == 1
  {
    var m2 := Model(m.cols, m.lanes[col := Lane(m, col) + [id]], m.wip, m.cards[id := Card("")], m.nextId + 1);
    // col is in m.cols, so SeqContains(m.cols, col)
    assert SeqContains(m.cols, col) by {
      var i :| 0 <= i < |m.cols| && m.cols[i] == col;
      assert exists j :: 0 <= j < |m.cols| && m.cols[j] == col;
    }
    // m.cols is trivially a subset of itself
    assert forall c :: SeqContains(m.cols, c) ==> SeqContains(m.cols, c);
    CountInLanesHelperNewCard(m.cols, m.lanes, col, Lane(m, col) + [id], id, m);
  }

  lemma CountInLanesHelperNewCard(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, col: ColId, newLane: seq<CardId>, id: CardId, m: Model)
    requires Inv(m)
    requires SeqContains(cols, col)
    requires id == m.nextId
    requires newLane == Lane(m, col) + [id]
    requires forall c :: c in lanes <==> SeqContains(m.cols, c)
    requires lanes == m.lanes
    requires forall c :: SeqContains(cols, c) ==> SeqContains(m.cols, c)  // cols is a subset of m.cols
    requires NoDupSeq(cols)  // Added to prove cc != col when cc in rest
    ensures CountInLanesHelper(cols, lanes[col := newLane], id) == 1
  {
    if |cols| == 0 {
      assert false;  // col must be in cols
    } else {
      var c := cols[0];
      var rest := cols[1..];
      var lanes2 := lanes[col := newLane];

      if c == col {
        // This is the column where we added id
        // newLane = Lane(m, col) + [id], so id is at position |Lane(m, col)|
        var pos := |Lane(m, col)|;
        assert newLane[pos] == id;
        assert 0 <= pos < |newLane|;
        assert SeqContains(newLane, id);
        assert CountInLanesHelper(rest, lanes2, id) == 0 by {
          // For cols in rest, lanes2[cc] == m.lanes[cc] (since cc != col by NoDupSeq)
          forall cc | cc in rest && cc in lanes2
            ensures forall x :: SeqContains(lanes2[cc], x) ==> x in m.cards
          {
            // cc is in rest and c == col is cols[0], so cc != col by NoDupSeq(cols)
            assert cc != col;
            assert lanes2[cc] == lanes[cc];
            assert lanes[cc] == m.lanes[cc];
            forall x | SeqContains(lanes2[cc], x)
              ensures x in m.cards
            {
              assert SeqContains(m.lanes[cc], x);
              // By Inv C: x in m.cards
            }
          }
          CountInLanesHelperFreshIdSimple(rest, lanes2, id, m);
        }
      } else {
        // c != col
        var lane := if c in lanes then lanes[c] else [];
        assert (if c in lanes2 then lanes2[c] else []) == lane;

        // id is fresh, not in this lane
        assert !SeqContains(lane, id) by {
          if SeqContains(lane, id) {
            assert c in lanes;
            assert c in m.lanes;
            assert SeqContains(m.lanes[c], id);
            // By Inv C: id in m.cards
            assert id in m.cards;
            // By Inv G: id < m.nextId - contradiction
            assert id < m.nextId;
            assert false;
          }
        }

        // Recursive call
        if SeqContains(rest, col) {
          // rest is still a subset of m.cols
          assert forall cc :: SeqContains(rest, cc) ==> SeqContains(m.cols, cc);
          // NoDupSeq(rest) follows from NoDupSeq(cols)
          NoDupSeqSuffix(cols);
          CountInLanesHelperNewCard(rest, lanes, col, newLane, id, m);
        } else {
          // col not in rest, count is 0
          forall cc | cc in rest && cc in lanes2
            ensures forall x :: SeqContains(lanes2[cc], x) ==> x in m.cards
          {
            assert lanes2[cc] == lanes[cc];
            assert lanes[cc] == m.lanes[cc];
          }
          CountInLanesHelperFreshIdSimple(rest, lanes2, id, m);
        }
      }
    }
  }

  lemma CountInLanesHelperFreshIdSimple(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, id: CardId, m: Model)
    requires Inv(m)
    requires id == m.nextId
    requires forall c :: c in cols && c in lanes ==> (forall x :: SeqContains(lanes[c], x) ==> x in m.cards)
    ensures CountInLanesHelper(cols, lanes, id) == 0
  {
    if |cols| == 0 {
    } else {
      var c := cols[0];
      var lane := if c in lanes then lanes[c] else [];

      // id is fresh, not in any lane
      assert !SeqContains(lane, id) by {
        if SeqContains(lane, id) {
          if c in lanes {
            assert id in m.cards;
            assert id < m.nextId;  // from Inv G
            assert false;  // contradiction since id == m.nextId
          }
        }
      }

      CountInLanesHelperFreshIdSimple(cols[1..], lanes, id, m);
    }
  }

  lemma CountInLanesHelperFreshId(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, id: CardId, m: Model)
    requires Inv(m)
    requires id == m.nextId
    requires forall c :: c in cols && c in lanes ==> (forall x :: SeqContains(lanes[c], x) ==> x in m.cards)
    ensures CountInLanesHelper(cols, lanes, id) == 0
  {
    if |cols| == 0 {
    } else {
      var c := cols[0];
      var lane := if c in lanes then lanes[c] else [];

      // id is fresh, not in any lane
      assert !SeqContains(lane, id) by {
        if SeqContains(lane, id) {
          if c in lanes {
            assert id in m.cards;
            assert id < m.nextId;
            assert false;
          }
        }
      }

      CountInLanesHelperFreshId(cols[1..], lanes, id, m);
    }
  }

  lemma CountInLanesOldCardAfterAdd(m: Model, col: ColId, newId: CardId, oldId: CardId)
    requires Inv(m)
    requires col in m.cols
    requires newId == m.nextId
    requires oldId in m.cards
    requires oldId != newId
    ensures CountInLanes(Model(m.cols, m.lanes[col := Lane(m, col) + [newId]], m.wip, m.cards[newId := Card("")], m.nextId + 1), oldId) == 1
  {
    var m2 := Model(m.cols, m.lanes[col := Lane(m, col) + [newId]], m.wip, m.cards[newId := Card("")], m.nextId + 1);
    // newId is fresh, so it's not in any lane
    assert !SeqContains(Lane(m, col), newId) by {
      if SeqContains(Lane(m, col), newId) {
        // Lane(m, col) = m.lanes[col] since col in m.cols => col in m.lanes
        assert col in m.lanes;
        assert SeqContains(m.lanes[col], newId);
        // By Inv C: newId in m.cards
        assert newId in m.cards;
        // By Inv G: newId < m.nextId
        assert newId < m.nextId;
        // Contradiction
        assert false;
      }
    }
    CountInLanesHelperOldCardAfterAdd(m.cols, m.lanes, col, Lane(m, col) + [newId], newId, oldId);
    assert CountInLanes(m, oldId) == 1;
  }

  lemma CountInLanesHelperOldCardAfterAdd(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, col: ColId, newLane: seq<CardId>, newId: CardId, oldId: CardId)
    requires NoDupSeq(cols)
    requires SeqContains(cols, col)
    requires col in lanes
    requires newLane == lanes[col] + [newId]
    requires !SeqContains(lanes[col], newId)
    requires oldId != newId
    ensures CountInLanesHelper(cols, lanes[col := newLane], oldId) == CountInLanesHelper(cols, lanes, oldId)
  {
    if |cols| == 0 {
    } else {
      var c := cols[0];
      var rest := cols[1..];
      var lanes2 := lanes[col := newLane];

      if c == col {
        // The count in this lane: oldId in newLane iff oldId in lanes[col]
        assert SeqContains(newLane, oldId) <==> SeqContains(lanes[col], oldId) by {
          SeqContainsAppend(lanes[col], newId, oldId);
        }
        // Rest of cols don't contain col (NoDupSeq)
        CountInLanesHelperSkipCol(rest, lanes2, lanes, col, oldId);
      } else {
        // c != col, so lanes2[c] == lanes[c]
        assert (if c in lanes2 then lanes2[c] else []) == (if c in lanes then lanes[c] else []);
        CountInLanesHelperOldCardAfterAdd(rest, lanes, col, newLane, newId, oldId);
      }
    }
  }

  lemma CountInLanesHelperSkipCol(cols: seq<ColId>, lanes1: map<ColId, seq<CardId>>, lanes2: map<ColId, seq<CardId>>, col: ColId, id: CardId)
    requires !SeqContains(cols, col)
    requires forall c :: c in cols ==> (if c in lanes1 then lanes1[c] else []) == (if c in lanes2 then lanes2[c] else [])
    ensures CountInLanesHelper(cols, lanes1, id) == CountInLanesHelper(cols, lanes2, id)
  {
    if |cols| == 0 {
    } else {
      var c := cols[0];
      assert c != col;
      CountInLanesHelperSkipCol(cols[1..], lanes1, lanes2, col, id);
    }
  }

  lemma EditTitlePreservesInv(m: Model, id: CardId, title: string, m2: Model)
    requires Inv(m)
    requires id in m.cards
    requires m2 == Model(m.cols, m.lanes, m.wip, m.cards[id := Card(title)], m.nextId)
    ensures Inv(m2)
  {
    // Only card content changes, structure unchanged
    // All invariant parts trivially preserved
    forall cid | cid in m2.cards
      ensures CountInLanes(m2, cid) == 1
    {
      assert CountInLanes(m2, cid) == CountInLanes(m, cid);
    }
  }

  lemma MoveCardPreservesInv(m: Model, id: CardId, toCol: ColId, place: Place, m2: Model)
    requires Inv(m)
    requires id in m.cards
    requires toCol in m.cols
    requires |Lane(m, toCol)| + (if SeqContains(Lane(m, toCol), id) then 0 else 1) <= Wip(m, toCol)
    requires var lanes1 := map c | c in m.lanes :: RemoveFirst(m.lanes[c], id);
             var tgt := Get(lanes1, toCol, []);
             var pos := PosFromPlace(tgt, place);
             pos >= 0 &&
             m2 == Model(m.cols, lanes1[toCol := InsertAt(tgt, ClampPos(pos, |tgt|), id)], m.wip, m.cards, m.nextId)
    ensures Inv(m2)
  {
    var lanes1 := map c | c in m.lanes :: RemoveFirst(m.lanes[c], id);
    var tgt := Get(lanes1, toCol, []);
    var pos := PosFromPlace(tgt, place);
    var k := ClampPos(pos, |tgt|);
    var tgt2 := InsertAt(tgt, k, id);
    var lanes2 := lanes1[toCol := tgt2];

    // m2 is given by the precondition; connect to our local variables
    // The precondition establishes m2 == Model(m.cols, lanes1[toCol := InsertAt(tgt, ClampPos(pos, |tgt|), id)], ...)
    // Since k == ClampPos(pos, |tgt|), we have lanes2 == m2.lanes
    assert k == ClampPos(pos, |tgt|);
    assert tgt2 == InsertAt(tgt, ClampPos(pos, |tgt|), id);
    assert lanes2 == lanes1[toCol := tgt2];
    assert lanes2 == lanes1[toCol := InsertAt(tgt, ClampPos(pos, |tgt|), id)];

    // A: cols unchanged

    // B: lanes keys unchanged
    assert forall c :: c in m2.lanes <==> SeqContains(m2.cols, c) by {
      forall c
        ensures c in m2.lanes <==> SeqContains(m2.cols, c)
      {
        assert c in lanes1 <==> c in m.lanes;
        assert c in m.lanes <==> SeqContains(m.cols, c);
      }
    }

    // C: Every id in lanes exists in cards
    assert forall c, cid :: c in m2.lanes && SeqContains(m2.lanes[c], cid) ==> cid in m2.cards by {
      forall c, cid | c in m2.lanes && SeqContains(m2.lanes[c], cid)
        ensures cid in m2.cards
      {
        if c == toCol {
          // m2.lanes[toCol] = tgt2 = InsertAt(tgt, k, id)
          assert m2.lanes[toCol] == tgt2;
          assert tgt2 == InsertAt(tgt, k, id);
          assert SeqContains(m2.lanes[toCol], cid);
          SeqContainsInsertAt(tgt, k, id, cid);
          if cid == id {
            assert id in m.cards;
          } else {
            // By SeqContainsInsertAt: SeqContains(InsertAt(tgt, k, id), cid) <==> (cid == id || SeqContains(tgt, cid))
            // Since cid != id and SeqContains(tgt2, cid), we have SeqContains(tgt, cid)
            assert SeqContains(tgt, cid);
            // tgt = lanes1[toCol] = RemoveFirst(m.lanes[toCol], id)
            assert tgt == lanes1[toCol];
            assert lanes1[toCol] == RemoveFirst(m.lanes[toCol], id);
            SeqContainsRemoveFirst(m.lanes[toCol], id, cid);
            assert SeqContains(m.lanes[toCol], cid);
            assert cid in m.cards;
          }
        } else {
          // m2.lanes[c] = lanes1[c] = RemoveFirst(m.lanes[c], id)
          assert lanes1[c] == RemoveFirst(m.lanes[c], id);
          if cid == id {
            // But id was removed from all lanes, so it shouldn't be here
            RemoveFirstRemoves(m.lanes[c], id);
            assert !SeqContains(lanes1[c], id);
            assert false;
          } else {
            SeqContainsRemoveFirst(m.lanes[c], id, cid);
            assert SeqContains(m.lanes[c], cid);
            assert cid in m.cards;
          }
        }
      }
    }

    // D: CountInLanes for each card == 1
    forall cid | cid in m2.cards
      ensures CountInLanes(m2, cid) == 1
    {
      MoveCardCountInLanes(m, id, toCol, lanes1, tgt, k, cid);
    }

    // E: No duplicates in lanes
    forall c | c in m2.lanes
      ensures NoDupSeq(m2.lanes[c])
    {
      if c == toCol {
        // Need NoDupSeq(tgt2) where tgt2 = InsertAt(tgt, k, id)
        // tgt = RemoveFirst(m.lanes[toCol], id), which has no dups and doesn't contain id
        RemoveFirstNoDup(m.lanes[toCol], id);
        RemoveFirstRemoves(m.lanes[toCol], id);
        NoDupSeqInsertAt(tgt, k, id);
      } else {
        RemoveFirstNoDup(m.lanes[c], id);
      }
    }

    // F: WIP respected
    assert forall c :: c in m.cols && c in m2.lanes && c in m.wip ==> |m2.lanes[c]| <= m.wip[c] by {
      forall c | c in m.cols && c in m2.lanes && c in m.wip
        ensures |m2.lanes[c]| <= m.wip[c]
      {
        if c == toCol {
          assert |tgt2| == |tgt| + 1;
          RemoveFirstLength(m.lanes[toCol], id);
          if SeqContains(m.lanes[toCol], id) {
            assert |tgt| == |m.lanes[toCol]| - 1;
            assert |tgt2| == |m.lanes[toCol]|;
          } else {
            assert |tgt| == |m.lanes[toCol]|;
            assert |tgt2| == |m.lanes[toCol]| + 1;
          }
        } else {
          RemoveFirstLength(m.lanes[c], id);
        }
      }
    }

    // G: Allocator fresh (cards unchanged)
  }

  lemma SeqContainsInsertAt<T>(s: seq<T>, i: nat, x: T, y: T)
    requires i <= |s|
    ensures SeqContains(InsertAt(s, i, x), y) <==> (y == x || SeqContains(s, y))
  {
    var s2 := InsertAt(s, i, x);
    assert s2 == s[..i] + [x] + s[i..];

    if SeqContains(s2, y) {
      var j :| 0 <= j < |s2| && s2[j] == y;
      if j < i {
        assert s2[j] == s[j];
        assert SeqContains(s, y);
      } else if j == i {
        assert y == x;
      } else {
        assert s2[j] == s[j-1];
        assert SeqContains(s, y);
      }
    }

    if y == x {
      assert s2[i] == x;
    }

    if SeqContains(s, y) {
      var j :| 0 <= j < |s| && s[j] == y;
      if j < i {
        assert s2[j] == y;
      } else {
        assert s2[j+1] == y;
      }
    }
  }

  lemma SeqContainsRemoveFirst<T>(s: seq<T>, x: T, y: T)
    requires x != y
    ensures SeqContains(RemoveFirst(s, x), y) <==> SeqContains(s, y)
  {
    var r := RemoveFirst(s, x);
    if |s| == 0 {
    } else if s[0] == x {
      // RemoveFirst returns s[1..]
      assert r == s[1..];
      if SeqContains(s[1..], y) {
        var i :| 0 <= i < |s[1..]| && s[1..][i] == y;
        assert s[i+1] == y;
      }
      if SeqContains(s, y) {
        var i :| 0 <= i < |s| && s[i] == y;
        assert i != 0;
        assert s[1..][i-1] == y;
      }
    } else {
      // RemoveFirst returns [s[0]] + RemoveFirst(s[1..], x)
      SeqContainsRemoveFirst(s[1..], x, y);
      var rest := RemoveFirst(s[1..], x);
      assert r == [s[0]] + rest;
      if SeqContains(r, y) {
        var i :| 0 <= i < |r| && r[i] == y;
        if i == 0 {
          assert y == s[0];
          assert SeqContains(s, y);
        } else {
          assert rest[i-1] == y;
          assert SeqContains(rest, y);
          assert SeqContains(s[1..], y);
          // Need to show s contains y
          var j :| 0 <= j < |s[1..]| && s[1..][j] == y;
          assert s[j+1] == y;
          assert SeqContains(s, y);
        }
      }
      if SeqContains(s, y) {
        var i :| 0 <= i < |s| && s[i] == y;
        if i == 0 {
          assert r[0] == s[0] == y;
          assert SeqContains(r, y);
        } else {
          assert s[1..][i-1] == y;
          assert SeqContains(s[1..], y);
          assert SeqContains(rest, y);
          var j :| 0 <= j < |rest| && rest[j] == y;
          assert r[j+1] == y;
          assert SeqContains(r, y);
        }
      }
    }
  }

  lemma RemoveFirstNoDup<T>(s: seq<T>, x: T)
    requires NoDupSeq(s)
    ensures NoDupSeq(RemoveFirst(s, x))
  {
    var r := RemoveFirst(s, x);
    if |s| == 0 {
    } else if s[0] == x {
      // r = s[1..], which is a suffix of s
      forall i, j | 0 <= i < j < |r|
        ensures r[i] != r[j]
      {
        assert r[i] == s[i+1];
        assert r[j] == s[j+1];
        assert s[i+1] != s[j+1];  // by NoDupSeq(s)
      }
    } else {
      RemoveFirstNoDup(s[1..], x);
      var rest := RemoveFirst(s[1..], x);
      // r = [s[0]] + rest
      forall i, j | 0 <= i < j < |r|
        ensures r[i] != r[j]
      {
        if i == 0 {
          // r[0] = s[0], r[j] is in rest
          assert r[j] == rest[j-1];
          // rest is subset of s[1..], so r[j] != s[0]
          RemoveFirstSubset(s[1..], x, rest[j-1]);
        } else {
          // Both in rest
          assert r[i] == rest[i-1];
          assert r[j] == rest[j-1];
        }
      }
    }
  }

  lemma RemoveFirstSubset<T>(s: seq<T>, x: T, y: T)
    requires SeqContains(RemoveFirst(s, x), y)
    ensures SeqContains(s, y)
  {
    if |s| == 0 {
    } else if s[0] == x {
      var i :| 0 <= i < |s[1..]| && s[1..][i] == y;
      assert s[i+1] == y;
    } else {
      var r := RemoveFirst(s, x);
      // r = [s[0]] + RemoveFirst(s[1..], x)
      var i :| 0 <= i < |r| && r[i] == y;
      if i == 0 {
        assert y == s[0];
      } else {
        RemoveFirstSubset(s[1..], x, y);
      }
    }
  }

  lemma RemoveFirstRemoves<T>(s: seq<T>, x: T)
    requires NoDupSeq(s)
    ensures !SeqContains(RemoveFirst(s, x), x)
  {
    var r := RemoveFirst(s, x);
    if |s| == 0 {
    } else if s[0] == x {
      // r = s[1..], x not in s[1..] by NoDupSeq
      if SeqContains(s[1..], x) {
        var i :| 0 <= i < |s[1..]| && s[1..][i] == x;
        assert s[i+1] == x;
        assert s[0] == x;
        // Contradiction with NoDupSeq
      }
    } else {
      RemoveFirstRemoves(s[1..], x);
      // r = [s[0]] + RemoveFirst(s[1..], x)
      if SeqContains(r, x) {
        var i :| 0 <= i < |r| && r[i] == x;
        if i == 0 {
          assert s[0] == x;
          assert false;
        } else {
          assert SeqContains(RemoveFirst(s[1..], x), x);
          assert false;
        }
      }
    }
  }

  lemma NoDupSeqInsertAt<T>(s: seq<T>, i: nat, x: T)
    requires i <= |s|
    requires NoDupSeq(s)
    requires !SeqContains(s, x)
    ensures NoDupSeq(InsertAt(s, i, x))
  {
    var s2 := InsertAt(s, i, x);
    forall j, k | 0 <= j < k < |s2|
      ensures s2[j] != s2[k]
    {
      if j < i && k < i {
        assert s2[j] == s[j];
        assert s2[k] == s[k];
      } else if j < i && k == i {
        assert s2[j] == s[j];
        assert s2[k] == x;
        SeqContainsIndex(s, x, j);
      } else if j < i && k > i {
        assert s2[j] == s[j];
        assert s2[k] == s[k-1];
      } else if j == i && k > i {
        assert s2[j] == x;
        assert s2[k] == s[k-1];
        SeqContainsIndex(s, x, k-1);
      } else {
        // j > i, k > j > i
        assert s2[j] == s[j-1];
        assert s2[k] == s[k-1];
      }
    }
  }

  lemma RemoveFirstLength<T>(s: seq<T>, x: T)
    ensures |RemoveFirst(s, x)| == if SeqContains(s, x) then |s| - 1 else |s|
  {
    if |s| == 0 {
    } else if s[0] == x {
      assert |RemoveFirst(s, x)| == |s| - 1;
      assert SeqContains(s, x);
    } else {
      RemoveFirstLength(s[1..], x);
      assert |RemoveFirst(s, x)| == 1 + |RemoveFirst(s[1..], x)|;
      if SeqContains(s[1..], x) {
        var i :| 0 <= i < |s[1..]| && s[1..][i] == x;
        assert s[i+1] == x;
        assert SeqContains(s, x);
      }
      if SeqContains(s, x) {
        var i :| 0 <= i < |s| && s[i] == x;
        if i == 0 {
          assert false;
        } else {
          assert s[1..][i-1] == x;
          assert SeqContains(s[1..], x);
        }
      }
    }
  }

  lemma MoveCardCountInLanes(m: Model, id: CardId, toCol: ColId, lanes1: map<ColId, seq<CardId>>, tgt: seq<CardId>, k: nat, cid: CardId)
    requires Inv(m)
    requires id in m.cards
    requires toCol in m.cols
    requires lanes1 == map c | c in m.lanes :: RemoveFirst(m.lanes[c], id)
    requires tgt == Get(lanes1, toCol, [])
    requires k <= |tgt|
    requires cid in m.cards
    ensures CountInLanes(Model(m.cols, lanes1[toCol := InsertAt(tgt, k, id)], m.wip, m.cards, m.nextId), cid) == 1
  {
    var m2 := Model(m.cols, lanes1[toCol := InsertAt(tgt, k, id)], m.wip, m.cards, m.nextId);
    var tgt2 := InsertAt(tgt, k, id);

    if cid == id {
      // The moved card: removed from all lanes, then inserted into toCol
      MoveCardCountId(m, id, toCol, lanes1, tgt, k);
    } else {
      // Other cards: count unchanged
      MoveCardCountOther(m, id, toCol, lanes1, tgt, k, cid);
    }
  }

  lemma MoveCardCountId(m: Model, id: CardId, toCol: ColId, lanes1: map<ColId, seq<CardId>>, tgt: seq<CardId>, k: nat)
    requires Inv(m)
    requires id in m.cards
    requires toCol in m.cols
    requires lanes1 == map c | c in m.lanes :: RemoveFirst(m.lanes[c], id)
    requires tgt == Get(lanes1, toCol, [])
    requires k <= |tgt|
    ensures CountInLanes(Model(m.cols, lanes1[toCol := InsertAt(tgt, k, id)], m.wip, m.cards, m.nextId), id) == 1
  {
    var tgt2 := InsertAt(tgt, k, id);
    var lanes2 := lanes1[toCol := tgt2];

    // First, show id not in any lane in lanes1
    forall c | c in lanes1
      ensures !SeqContains(lanes1[c], id)
    {
      assert lanes1[c] == RemoveFirst(m.lanes[c], id);
      RemoveFirstRemoves(m.lanes[c], id);
    }

    // id is in tgt2 = InsertAt(tgt, k, id)
    assert SeqContains(tgt2, id) by {
      SeqContainsInsertAt(tgt, k, id, id);
    }

    // lanes1 keys equal m.lanes keys, which equal cols (by Inv B)
    assert forall c :: c in lanes1 <==> SeqContains(m.cols, c);

    // So id appears exactly once (in toCol) in lanes2
    CountInLanesHelperAfterMove(m.cols, lanes1, lanes2, toCol, tgt2, id);
  }

  lemma CountInLanesHelperAfterMove(cols: seq<ColId>, lanes1: map<ColId, seq<CardId>>, lanes2: map<ColId, seq<CardId>>, toCol: ColId, tgt2: seq<CardId>, id: CardId)
    requires SeqContains(cols, toCol)
    requires NoDupSeq(cols)
    requires forall c :: SeqContains(cols, c) ==> c in lanes1  // Weakened: only need cols subset of lanes1 domain
    requires lanes2 == lanes1[toCol := tgt2]
    requires SeqContains(tgt2, id)
    requires forall c :: c in lanes1 ==> !SeqContains(lanes1[c], id)
    ensures CountInLanesHelper(cols, lanes2, id) == 1
  {
    if |cols| == 0 {
    } else {
      var c := cols[0];
      var rest := cols[1..];

      if c == toCol {
        // This column has id
        assert SeqContains(lanes2[c], id);
        // rest doesn't have toCol (NoDupSeq)
        CountInLanesHelperZero(rest, lanes2, id);
      } else {
        // This column doesn't have id
        assert c in lanes1;  // by precondition
        assert lanes2[c] == lanes1[c];
        assert !SeqContains(lanes2[c], id);
        // rest is subset of cols, so still subset of lanes1 domain
        assert forall cc :: SeqContains(rest, cc) ==> cc in lanes1;
        CountInLanesHelperAfterMove(rest, lanes1, lanes2, toCol, tgt2, id);
      }
    }
  }

  lemma CountInLanesHelperZero(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, id: CardId)
    requires forall c :: c in cols && c in lanes ==> !SeqContains(lanes[c], id)
    ensures CountInLanesHelper(cols, lanes, id) == 0
  {
    if |cols| == 0 {
    } else {
      var c := cols[0];
      var lane := if c in lanes then lanes[c] else [];
      assert !SeqContains(lane, id);
      CountInLanesHelperZero(cols[1..], lanes, id);
    }
  }

  lemma MoveCardCountOther(m: Model, id: CardId, toCol: ColId, lanes1: map<ColId, seq<CardId>>, tgt: seq<CardId>, k: nat, cid: CardId)
    requires Inv(m)
    requires id in m.cards
    requires cid in m.cards
    requires cid != id
    requires toCol in m.cols
    requires lanes1 == map c | c in m.lanes :: RemoveFirst(m.lanes[c], id)
    requires tgt == Get(lanes1, toCol, [])
    requires k <= |tgt|
    ensures CountInLanes(Model(m.cols, lanes1[toCol := InsertAt(tgt, k, id)], m.wip, m.cards, m.nextId), cid) == 1
  {
    var tgt2 := InsertAt(tgt, k, id);
    var lanes2 := lanes1[toCol := tgt2];
    var m2 := Model(m.cols, lanes2, m.wip, m.cards, m.nextId);

    // Show count is same as in m
    CountInLanesHelperOtherCard(m.cols, m.lanes, lanes1, lanes2, toCol, tgt, tgt2, id, cid, k);
    assert CountInLanes(m, cid) == 1;
  }

  lemma CountInLanesHelperOtherCard(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, lanes1: map<ColId, seq<CardId>>, lanes2: map<ColId, seq<CardId>>, toCol: ColId, tgt: seq<CardId>, tgt2: seq<CardId>, id: CardId, cid: CardId, k: nat)
    requires NoDupSeq(cols)
    requires forall c :: SeqContains(cols, c) ==> c in lanes  // Weakened: cols subset of lanes domain
    requires forall c :: c in lanes ==> NoDupSeq(lanes[c])
    requires lanes1 == map c | c in lanes :: RemoveFirst(lanes[c], id)
    requires SeqContains(cols, toCol)
    requires tgt == Get(lanes1, toCol, [])
    requires k <= |tgt|
    requires tgt2 == InsertAt(tgt, k, id)
    requires lanes2 == lanes1[toCol := tgt2]
    requires cid != id
    ensures CountInLanesHelper(cols, lanes2, cid) == CountInLanesHelper(cols, lanes, cid)
  {
    if |cols| == 0 {
    } else {
      var c := cols[0];
      var rest := cols[1..];

      var oldLane := if c in lanes then lanes[c] else [];
      var newLane := if c in lanes2 then lanes2[c] else [];

      // c is in lanes since c is in cols
      assert c in lanes;

      // Show SeqContains(newLane, cid) <==> SeqContains(oldLane, cid)
      if c == toCol {
        // newLane = tgt2 = InsertAt(tgt, k, id)
        // tgt = RemoveFirst(lanes[toCol], id)
        assert toCol in lanes;
        SeqContainsInsertAt(tgt, k, id, cid);
        SeqContainsRemoveFirst(lanes[toCol], id, cid);
      } else {
        // newLane = lanes1[c] = RemoveFirst(lanes[c], id)
        SeqContainsRemoveFirst(lanes[c], id, cid);
      }

      // rest is subset of cols, so still subset of lanes domain
      assert forall cc :: SeqContains(rest, cc) ==> cc in lanes;

      // For the recursive call, we need SeqContains(rest, toCol)
      // If c == toCol, then toCol is not in rest (NoDupSeq)
      // If c != toCol, then toCol must be in rest
      if c != toCol {
        SeqContainsRest(cols, toCol, c);
        assert SeqContains(rest, toCol);
        CountInLanesHelperOtherCard(rest, lanes, lanes1, lanes2, toCol, tgt, tgt2, id, cid, k);
      } else {
        // c == toCol, so toCol is not in rest (by NoDupSeq)
        NoDupSeqSuffix(cols);
        // Prove toCol not in rest
        if SeqContains(rest, toCol) {
          SeqContainsIndex(rest, toCol, 0);  // get index in rest
          var i :| 0 <= i < |rest| && rest[i] == toCol;
          assert cols[0] == toCol;
          assert cols[i+1] == toCol;
          assert 0 != i + 1;  // since i >= 0
          // contradicts NoDupSeq(cols)
        }
        assert !SeqContains(rest, toCol);
        // Use helper lemma
        CountInLanesHelperWhenNotInCols(rest, lanes, lanes1, lanes2, toCol, tgt2, id, cid);
      }
    }
  }

  lemma SeqContainsRest<T>(s: seq<T>, x: T, first: T)
    requires |s| > 0
    requires SeqContains(s, x)
    requires s[0] == first
    requires first != x
    ensures SeqContains(s[1..], x)
  {
    var i :| 0 <= i < |s| && s[i] == x;
    assert i != 0;
    assert s[1..][i-1] == x;
  }

  lemma NoDupSeqSuffix<T>(s: seq<T>)
    requires |s| > 0
    requires NoDupSeq(s)
    ensures NoDupSeq(s[1..])
  {
    var rest := s[1..];
    forall i, j | 0 <= i < j < |rest|
      ensures rest[i] != rest[j]
    {
      assert rest[i] == s[i+1];
      assert rest[j] == s[j+1];
      assert s[i+1] != s[j+1];  // by NoDupSeq(s)
    }
  }

  // Helper lemma: when toCol is not in cols, lanes2 and lanes1 agree on cols,
  // and lanes1 differs from lanes only by RemoveFirst on id (which != cid), counts are equal
  lemma CountInLanesHelperWhenNotInCols(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, lanes1: map<ColId, seq<CardId>>, lanes2: map<ColId, seq<CardId>>, toCol: ColId, tgt2: seq<CardId>, id: CardId, cid: CardId)
    requires !SeqContains(cols, toCol)
    requires forall c :: SeqContains(cols, c) ==> c in lanes
    requires forall c :: c in lanes ==> NoDupSeq(lanes[c])
    requires lanes1 == map c | c in lanes :: RemoveFirst(lanes[c], id)
    requires lanes2 == lanes1[toCol := tgt2]  // lanes2 is lanes1 with toCol mapped to tgt2
    requires cid != id
    ensures CountInLanesHelper(cols, lanes2, cid) == CountInLanesHelper(cols, lanes, cid)
    decreases |cols|
  {
    if |cols| == 0 {
    } else {
      var c := cols[0];
      var rest := cols[1..];

      assert c in lanes;
      assert c != toCol;  // since c is in cols but toCol is not
      assert c in lanes1;  // c in lanes implies c in lanes1
      assert c in lanes2;  // lanes2 == lanes1[toCol := tgt2] so c in lanes1 implies c in lanes2
      assert lanes2[c] == lanes1[c];  // since c != toCol
      assert lanes1[c] == RemoveFirst(lanes[c], id);

      // Show SeqContains(lanes2[c], cid) <==> SeqContains(lanes[c], cid)
      SeqContainsRemoveFirst(lanes[c], id, cid);

      // Recursive call
      assert !SeqContains(rest, toCol);  // toCol not in cols implies not in rest
      CountInLanesHelperWhenNotInCols(rest, lanes, lanes1, lanes2, toCol, tgt2, id, cid);
    }
  }

  lemma CandidatesComplete(m: Model, orig: Action, aGood: Action, m2: Model)
  {
    match (orig, aGood) {
      case (MoveCard(oid, otoCol, origPlace), MoveCard(gid, gtoCol, goodPlace)) =>
        // By Explains: oid == gid && otoCol == gtoCol && (goodPlace == origPlace || goodPlace == AtEnd)
        assert oid == gid;
        assert otoCol == gtoCol;
        assert goodPlace == origPlace || goodPlace == AtEnd;

        var lane := Lane(m, otoCol);

        // Candidates always includes orig and MoveCard(oid, otoCol, AtEnd)
        // (either as the only element, or as part of a larger list)
        if origPlace == AtEnd {
          // Candidates = [MoveCard(oid, otoCol, AtEnd)]
          // By Explains, goodPlace == origPlace (== AtEnd) or goodPlace == AtEnd
          // Either way, goodPlace == AtEnd
          assert goodPlace == AtEnd;
          assert aGood == MoveCard(oid, otoCol, AtEnd);
          assert aGood in Candidates(m, orig);
        } else if |lane| == 0 {
          // Candidates = [orig, MoveCard(oid, otoCol, AtEnd)]
          // By Explains, goodPlace == origPlace or goodPlace == AtEnd
          if goodPlace == origPlace {
            assert aGood == orig;
            assert orig in Candidates(m, orig);
          } else {
            assert goodPlace == AtEnd;
            assert aGood == MoveCard(oid, otoCol, AtEnd);
            assert MoveCard(oid, otoCol, AtEnd) in Candidates(m, orig);
          }
        } else {
          // Candidates = [orig, MoveCard(oid, otoCol, AtEnd), MoveCard(oid, otoCol, Before(first))]
          // By Explains, goodPlace == origPlace or goodPlace == AtEnd
          if goodPlace == origPlace {
            assert aGood == orig;
            assert orig in Candidates(m, orig);
          } else {
            assert goodPlace == AtEnd;
            assert aGood == MoveCard(oid, otoCol, AtEnd);
            assert MoveCard(oid, otoCol, AtEnd) in Candidates(m, orig);
          }
        }

      case (_, _) =>
        // Non-MoveCard: Explains requires exact equality
        assert orig == aGood;
        assert Candidates(m, orig) == [orig];
        assert aGood in Candidates(m, orig);
    }
  }

  // Before(first) is a heuristic candidate in Candidates, but not in Explains.
  // This lemma shows that Before(first) success implies AtEnd success, so
  // the heuristic never helps avoid rejection—it only affects final position.
  //
  // Proof: TryStep failure modes are:
  //   1. MissingCard   - same for all placements
  //   2. MissingColumn - same for all placements
  //   3. WipExceeded   - same for all placements (depends on lane size, not placement)
  //   4. BadAnchor     - only for Before/After when anchor not found
  // AtEnd never fails due to (4), so if Before(first) passes (1)-(4), AtEnd passes (1)-(3).
  lemma BeforeFirstImpliesAtEnd(m: Model, id: CardId, toCol: ColId, anchor: CardId, m2: Model)
    requires TryStep(m, MoveCard(id, toCol, Before(anchor))).Ok?
    ensures  TryStep(m, MoveCard(id, toCol, AtEnd)).Ok?
  {
    // TryStep for Before(anchor) succeeded, so:
    // - id in m.cards
    // - toCol in m.cols
    // - WIP check passed
    // - anchor was found in target lane (PosFromPlace >= 0)
    // For AtEnd, same first three checks pass, and AtEnd always has pos >= 0.
  }
}

module KanbanMultiCollaboration refines MultiCollaboration {
  import D = KanbanDomain
}

// =============================================================================
// AppCore: JS-friendly wrappers around MultiCollaboration client operations
// =============================================================================
module KanbanAppCore {
  import K = KanbanDomain
  import MC = KanbanMultiCollaboration

  // -------------------------------------------------------------------------
  // Re-export ClientState from MultiCollaboration
  // -------------------------------------------------------------------------
  type ClientState = MC.ClientState

  // Constructor wrapper for JS
  function MakeClientState(baseVersion: nat, present: K.Model, pending: seq<K.Action>): ClientState
  {
    MC.ClientState(baseVersion, present, pending)
  }

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------

  // Create initial server state with verified default model
  function Init(): MC.ServerState
  {
    MC.InitServer()
  }

  // Create initial server state from a custom model
  // Note: caller is responsible for ensuring model satisfies K.Inv
  function InitServerWithModel(initModel: K.Model): MC.ServerState
  {
    MC.ServerState(initModel, [], [])
  }

  // Create client state synced to server
  function InitClientFromServer(server: MC.ServerState): ClientState
  {
    MC.InitClientFromServer(server)
  }

  // -------------------------------------------------------------------------
  // Client operations (delegated to MultiCollaboration)
  // -------------------------------------------------------------------------

  function ClientLocalDispatch(client: ClientState, action: K.Action): ClientState
  {
    MC.ClientLocalDispatch(client, action)
  }

  function HandleRealtimeUpdate(client: ClientState, serverVersion: nat, serverModel: K.Model): ClientState
  {
    MC.HandleRealtimeUpdate(client, serverVersion, serverModel)
  }

  function Sync(server: MC.ServerState): ClientState
  {
    MC.Sync(server)
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
    MC.PendingCount(client)
  }

  function ClientModel(client: ClientState): K.Model
  {
    MC.ClientModel(client)
  }

  function ClientVersion(client: ClientState): nat
  {
    MC.ClientVersion(client)
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
