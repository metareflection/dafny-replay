include "../kernels/Replay.dfy"

// Goal: prove preservation of
// - A1 (exact partition, no duplicates)
// - B (WIP limits)
// for a dynamic-column Kanban reducer under undo/redo replay.

module KanbanDomain refines Domain {
  // user facing
  type ColId = string
  // allocated by model
  type CardId = nat

  datatype Card = Card(title: string)

  datatype Model = Model(
    cols: seq<ColId>,                 // authoritative list of columns
    lanes: map<ColId, seq<CardId>>,   // column -> ordered card ids
    wip: map<ColId, nat>,             // column -> limit (nat); use a large number for "unlimited"
    cards: map<CardId, Card>,         // id -> payload
    nextId: nat                       // fresh allocator
  )

  datatype Action =
    | AddColumn(col: ColId, limit: nat)
    | SetWip(col: ColId, limit: nat)
    | AddCard(col: ColId, title: string)          // allocates nextId if succeeds
    | MoveCard(id: CardId, toCol: ColId, pos: int)

  // --------------------------
  // Helpers (sequence reasoning)
  // --------------------------

  function get<K,V>(s: map<K, V>, c: K, default: V): V
  {
    if c in s then s[c] else default
  }

  function Lane(lanes: map<ColId, seq<CardId>>, c: ColId): seq<CardId>
  {
    get(lanes, c, [])
  }

  function Wip(wip: map<ColId, nat>, c: ColId): nat
  {
    get(wip, c, 0)
  }

  ghost predicate NoDupSeq<T>(s: seq<T>)
  {
    forall i, j :: 0 <= i < j < |s| ==> s[i] != s[j]
  }

  function ClampPos(pos: int, n: int): nat
    requires n >= 0
  {
    if pos <= 0 then 0
    else if pos >= n then n as nat
    else pos as nat
  }

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

  function FlatColsPosition(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, c: nat, i: nat): nat
    requires c < |cols|
    requires i < |Lane(lanes, cols[c])|
  {
    if c == 0 then i
    else |Lane(lanes, cols[0])| + FlatColsPosition(cols[1..], lanes, c-1, i)
  }

  // Flatten lanes in the order of cols
  function AllIds(m: Model): seq<CardId>
  {
    match m
    case Model(cols, lanes, wip, cards, nextId) =>
      FlattenCols(cols, lanes)
  }

  function FlattenCols(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>): seq<CardId>
  {
    if |cols| == 0 then []
    else Lane(lanes, cols[0]) + FlattenCols(cols[1..], lanes)
  }

  // Does a card id occur in some lane?
  predicate OccursInLanes(m: Model, id: CardId)
  {
    exists i :: 0 <= i < |m.cols| && (exists j :: 0 <= j < |Lane(m.lanes, m.cols[i])| && Lane(m.lanes, m.cols[i])[j] == id)
  }

  // --------------------------
  // Invariant (A1 + B + column well-formedness)
  // --------------------------
  ghost predicate Inv(m: Model)
  {
    // Column list well-formed
    NoDupSeq(m.cols) &&

    // Lanes/wip defined exactly on existing columns
    (forall i :: 0 <= i < |m.cols| ==> m.cols[i] in m.lanes && m.cols[i] in m.wip) &&
    (forall c :: c in m.lanes ==> c in m.cols) &&
    (forall c :: c in m.wip ==> c in m.cols) &&

    // A1: exact partition (no disappear / no duplicate)
    NoDupSeq(AllIds(m)) &&
    (forall id :: id in m.cards <==> OccursInLanes(m, id)) &&

    // B: WIP limits
    (forall i :: 0 <= i < |m.cols| ==> |m.lanes[m.cols[i]]| <= m.wip[m.cols[i]]) &&

    // Allocator is fresh
    (forall id :: id in m.cards ==> id < m.nextId)
  }

  // --------------------------
  // Init
  // --------------------------
  function Init(): Model {
    Model([], map[], map[], map[], 0)
  }

  // --------------------------
  // Normalize
  // --------------------------
  // For now, Normalize is the identity.
  // That keeps semantics simple and makes "no-op on violation" exact.
  //
  // If you later want Normalize to "repair" (e.g., drop unknown columns,
  // clamp positions, etc.), this is the hook point.
  function Normalize(m: Model): Model { m }

  // --------------------------
  // Apply
  // --------------------------
  function Apply(m: Model, a: Action): Model
  {
    match m
    case Model(cols, lanes, wip, cards, nextId) =>
      match a
      case AddColumn(col, limit) =>
        if col in cols then m
        else
          // add an empty lane and a wip entry
          Model(cols + [col],
                lanes[col := []],
                wip[col := limit],
                cards,
                nextId)

      case SetWip(col, limit) =>
        if !(col in cols) then m
        else if limit < |Lane(lanes, col)| then m
        else Model(cols, lanes, wip[col := limit], cards, nextId)

      case AddCard(col, title) =>
        if !(col in cols) then m
        else if |Lane(lanes, col)| + 1 > (Wip(wip, col)) then m
        else
          var id := nextId;
          Model(cols,
                lanes[col := Lane(lanes, col) + [id]],
                wip,
                cards[id := Card(title)],
                nextId + 1)

      case MoveCard(id, toCol, pos) =>
        if !(toCol in cols) then m
        else if !(id in cards) then m
        else
          // Find the source column by scanning cols
          var src := FindColumnOf(cols, lanes, id);
          if src == "" then m // should be impossible under Inv; safe fallback
          else if src == toCol then
            // reorder within same column (still checks WIP trivially)
            var s := Lane(lanes, src);
            var s1 := RemoveFirst(s, id);
            var k := ClampPos(pos, |s1|);
            Model(cols, lanes[src := InsertAt(s1, k, id)], wip, cards, nextId)
          else
            // cross-column move: check WIP of destination
            if |Lane(lanes, toCol)| + 1 > (Wip(wip, toCol)) then m
            else
              var s := Lane(lanes, src);
              var t := Lane(lanes, toCol);
              var s1 := RemoveFirst(s, id);
              var k := ClampPos(pos, |t|);
              var t1 := InsertAt(t, k, id);
              Model(cols, lanes[src := s1][toCol := t1], wip, cards, nextId)
  }

  // Helper: find which column contains id; returns "" if not found.
  function FindColumnOf(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, id: CardId): ColId
  {
    if |cols| == 0 then ""
    else if SeqContains(Lane(lanes, cols[0]), id) then cols[0]
    else FindColumnOf(cols[1..], lanes, id)
  }

  function SeqContains<T(==)>(s: seq<T>, x: T): bool
  {
    exists i :: 0 <= i < |s| && s[i] == x
  }

  // --------------------------
  // The required lemmas for dafny-replay
  // --------------------------

  lemma InitSatisfiesInv()
    ensures Inv(Init())
  {
  }

  //
  // This is the only thing the replay kernel needs from the domain:
  // Step preserves Inv (possibly after Normalize, but Normalize is identity here).
  //
  // Proof strategy:
  // - case split on action
  // - every branch is either "no-op" (model unchanged) or a local update
  // - show:
  //   * column keys preserved
  //   * cards moved/added without duplication
  //   * WIP checked before insertion
  //
  lemma StepPreservesInv(m: Model, a: Action)
  {
    assert Normalize(Apply(m,a)) == Apply(m,a);
    var m' := Apply(m, a);
    match a
    case AddColumn(col, limit) => {
        if col in m.cols {
          // No-op case
        } else {
          // m' = Model(cols + [col], lanes[col := []], wip[col := limit], cards, nextId)
          var cols' := m.cols + [col];
          var lanes' := m.lanes[col := []];
          var wip' := m.wip[col := limit];
          assert m' == Model(cols', lanes', wip', m.cards, m.nextId);

          // NoDupSeq(cols')
          assert !(col in m.cols);
          NoDupSeqAppendFresh(m.cols, col);

          // Lanes/wip defined exactly on existing columns
          forall i | 0 <= i < |cols'|
            ensures cols'[i] in lanes' && cols'[i] in wip'
          {
            if i < |m.cols| {
              assert cols'[i] == m.cols[i];
              assert m.cols[i] in m.lanes;
              assert m.cols[i] in m.wip;
            } else {
              assert cols'[i] == col;
            }
          }

          // AllIds(m') = AllIds(m) since the new lane is empty
          // First show that lanes' agrees with m.lanes on all columns in m.cols
          assert forall c :: c in m.cols ==> Lane(lanes', c) == Lane(m.lanes, c);
          FlattenColsSameLanes(m.cols, m.lanes, lanes');
          assert FlattenCols(m.cols, lanes') == FlattenCols(m.cols, m.lanes);
          FlattenColsAppendEmpty(m.cols, lanes', col);
          assert FlattenCols(cols', lanes') == FlattenCols(m.cols, lanes');
          assert AllIds(m') == AllIds(m);

          // OccursInLanes preserved
          forall id
            ensures OccursInLanes(m', id) <==> OccursInLanes(m, id)
          {
            if OccursInLanes(m', id) {
              var i :| 0 <= i < |m'.cols| && (exists j :: 0 <= j < |Lane(m'.lanes, m'.cols[i])| && Lane(m'.lanes, m'.cols[i])[j] == id);
              var j :| 0 <= j < |Lane(m'.lanes, m'.cols[i])| && Lane(m'.lanes, m'.cols[i])[j] == id;
              if i < |m.cols| {
                assert m'.cols[i] == m.cols[i];
                if m.cols[i] == col {
                  assert false; // col not in m.cols
                } else {
                  assert Lane(lanes', m.cols[i]) == Lane(m.lanes, m.cols[i]);
                  OccursInLanesWitness(m, id, i, j);
                }
              } else {
                assert m'.cols[i] == col;
                assert Lane(lanes', col) == [];
                assert false; // empty lane has no elements
              }
            }
            if OccursInLanes(m, id) {
              var i :| 0 <= i < |m.cols| && (exists j :: 0 <= j < |Lane(m.lanes, m.cols[i])| && Lane(m.lanes, m.cols[i])[j] == id);
              var j :| 0 <= j < |Lane(m.lanes, m.cols[i])| && Lane(m.lanes, m.cols[i])[j] == id;
              assert m.cols[i] != col; // since col not in m.cols
              assert Lane(lanes', m.cols[i]) == Lane(m.lanes, m.cols[i]);
              assert i < |cols'|;
              assert cols'[i] == m.cols[i];
              OccursInLanesWitness(m', id, i, j);
            }
          }

          // WIP limits for new column
          assert Lane(lanes', col) == [];
          assert |Lane(lanes', col)| == 0 <= limit;

          assert Inv(m');
        }
    }
    case SetWip(col, limit) => {}
    case AddCard(col, title) => {
        if !(col in m.cols) {}
        else if |Lane(m.lanes, col)| + 1 > (Wip(m.wip, col)) {}
        else {
            var newId := m.nextId;
            var lanes' := m.lanes[col := Lane(m.lanes, col) + [newId]];
            var cards' := m.cards[newId := Card(title)];
            assert m' == Model(m.cols, lanes', m.wip, cards', newId + 1);

            // Find col's index
            ColInColsWitness(m.cols, col);
            var colIdx :| 0 <= colIdx < |m.cols| && m.cols[colIdx] == col;

            // Prove: new card occurs in lanes
            var newLane := Lane(lanes', col);
            assert newLane == Lane(m.lanes, col) + [newId];
            var posIdx := |Lane(m.lanes, col)|;
            assert newLane[posIdx] == newId;
            assert Lane(m'.lanes, m'.cols[colIdx]) == newLane;
            OccursInLanesWitness(m', newId, colIdx, posIdx);

            // Prove: old cards still occur in lanes
            forall id | id in m.cards
              ensures OccursInLanes(m', id)
            {
              assert OccursInLanes(m, id);
              var i :| 0 <= i < |m.cols| && (exists j :: 0 <= j < |Lane(m.lanes, m.cols[i])| && Lane(m.lanes, m.cols[i])[j] == id);
              var j :| 0 <= j < |Lane(m.lanes, m.cols[i])| && Lane(m.lanes, m.cols[i])[j] == id;
              if m.cols[i] == col {
                assert Lane(lanes', col) == Lane(m.lanes, col) + [newId];
                assert j < |Lane(m.lanes, col)|;
                assert Lane(lanes', col)[j] == Lane(m.lanes, col)[j] == id;
                OccursInLanesWitness(m', id, i, j);
              } else {
                assert Lane(lanes', m.cols[i]) == Lane(m.lanes, m.cols[i]);
                OccursInLanesWitness(m', id, i, j);
              }
            }

            // Forward direction: in cards' => OccursInLanes
            forall id | id in cards'
              ensures OccursInLanes(m', id)
            {
              if id == newId {
                assert OccursInLanes(m', newId);
              } else {
                assert id in m.cards;
              }
            }

            // Reverse direction: OccursInLanes => in cards'
            forall id | OccursInLanes(m', id)
              ensures id in cards'
            {
              var i :| 0 <= i < |m'.cols| && (exists j :: 0 <= j < |Lane(m'.lanes, m'.cols[i])| && Lane(m'.lanes, m'.cols[i])[j] == id);
              var j :| 0 <= j < |Lane(m'.lanes, m'.cols[i])| && Lane(m'.lanes, m'.cols[i])[j] == id;
              if m'.cols[i] == col {
                if j < |Lane(m.lanes, col)| {
                  assert Lane(m.lanes, col)[j] == id;
                  OccursInLanesWitness(m, id, i, j);
                  assert id in m.cards;
                } else {
                  assert j == |Lane(m.lanes, col)|;
                  assert Lane(lanes', col)[j] == newId;
                  assert id == newId;
                }
              } else {
                assert Lane(lanes', m'.cols[i]) == Lane(m.lanes, m.cols[i]);
                OccursInLanesWitness(m, id, i, j);
                assert id in m.cards;
              }
            }

            // NoDupSeq(AllIds(m'))
            FreshIdNotInAllIds(m, newId);
            assert !SeqContains(AllIds(m), newId);
            FlattenColsAppendToLane(m.cols, m.lanes, col, newId);

            assert Inv(m');
        }
    }
    case MoveCard(id, toCol, pos) => {
        if !(toCol in m.cols) {
          // No-op
        } else if !(id in m.cards) {
          // No-op
        } else {
          FindColumnOfInv(m, id);
          var src := FindColumnOf(m.cols, m.lanes, id);
          if src == "" {
            // No-op (shouldn't happen under Inv)
          } else if src == toCol {
            // Same-column reorder
            var s := Lane(m.lanes, src);
            var s1 := RemoveFirst(s, id);
            var k := ClampPos(pos, |s1|);
            var lanes' := m.lanes[src := InsertAt(s1, k, id)];
            assert m' == Model(m.cols, lanes', m.wip, m.cards, m.nextId);

            // Use the same-column reorder lemma
            RemoveFirstLength(s, id);
            FlattenColsSameColReorder(m.cols, m.lanes, src, id, k);

            // AllIds same contents
            forall y
              ensures SeqContains(AllIds(m'), y) <==> SeqContains(AllIds(m), y)
            {
              assert SeqContains(FlattenCols(m.cols, lanes'), y) <==> SeqContains(FlattenCols(m.cols, m.lanes), y);
            }

            // OccursInLanes preserved
            forall y
              ensures OccursInLanes(m', y) <==> OccursInLanes(m, y)
            {
              AllIdsContains(m.cols, lanes', y);
              AllIdsContains(m.cols, m.lanes, y);
              OccursInLanesEquivSeqContains(m, y);
              OccursInLanesEquivSeqContainsLanes(m.cols, lanes', y);
            }

            // WIP limits preserved (lane length unchanged)
            RemoveFirstLength(s, id);
            InsertAtLength(s1, k, id);
            assert |InsertAt(s1, k, id)| == |s|;

            assert Inv(m');
          } else {
            // Cross-column move
            if |Lane(m.lanes, toCol)| + 1 > (Wip(m.wip, toCol)) {
              // WIP exceeded, no-op
            } else {
              var s := Lane(m.lanes, src);
              var t := Lane(m.lanes, toCol);
              var s1 := RemoveFirst(s, id);
              var k := ClampPos(pos, |t|);
              var t1 := InsertAt(t, k, id);
              var lanes' := m.lanes[src := s1][toCol := t1];
              assert m' == Model(m.cols, lanes', m.wip, m.cards, m.nextId);

              // Use the cross-column move lemma
              FlattenColsCrossColMove(m.cols, m.lanes, src, toCol, id, k);

              // AllIds same contents
              forall y
                ensures SeqContains(AllIds(m'), y) <==> SeqContains(AllIds(m), y)
              {
                assert SeqContains(FlattenCols(m.cols, lanes'), y) <==> SeqContains(FlattenCols(m.cols, m.lanes), y);
              }

              // OccursInLanes preserved
              forall y
                ensures OccursInLanes(m', y) <==> OccursInLanes(m, y)
              {
                AllIdsContains(m.cols, lanes', y);
                AllIdsContains(m.cols, m.lanes, y);
                OccursInLanesEquivSeqContains(m, y);
                OccursInLanesEquivSeqContainsLanes(m.cols, lanes', y);
              }

              // WIP limits: src lane shorter, toCol lane longer by 1 (but within limit)
              RemoveFirstLength(s, id);
              assert |s1| == |s| - 1;
              InsertAtLength(t, k, id);
              assert |t1| == |t| + 1;
              assert |t1| <= Wip(m.wip, toCol);

              assert Inv(m');
            }
          }
        }
    }
  }

  // --------------------------
  // Helper lemmas
  // --------------------------

   // RemoveFirst lemmas
  // When NoDupSeq, removing x gives us everything except x
  lemma RemoveFirstNoDupContains<T>(s: seq<T>, x: T, y: T)
    requires NoDupSeq(s)
    ensures SeqContains(RemoveFirst(s, x), y) <==> (SeqContains(s, y) && y != x)
  {
    if |s| == 0 {
    } else if s[0] == x {
      // RemoveFirst = s[1..]
      // NoDupSeq means x doesn't appear in s[1..]
      assert RemoveFirst(s, x) == s[1..];
      if SeqContains(s[1..], x) {
        SeqContainsMeansInSeq(s[1..], x);
        var j :| 0 <= j < |s[1..]| && s[1..][j] == x;
        assert s[j+1] == x && s[0] == x;
        // contradicts NoDupSeq
      }
      if y == x {
        if SeqContains(s[1..], y) {
          assert false;
        }
      } else {
        if SeqContains(s, y) {
          SeqContainsMeansInSeq(s, y);
          var i :| 0 <= i < |s| && s[i] == y;
          if i == 0 { assert y == x; }
          else { assert s[1..][i-1] == y; }
        }
      }
    } else {
      ConcatNoDup([s[0]], s[1..]);
      RemoveFirstNoDupContains(s[1..], x, y);
      assert RemoveFirst(s, x) == [s[0]] + RemoveFirst(s[1..], x);
      ConcatContains([s[0]], RemoveFirst(s[1..], x), y);
      if SeqContains(s, y) && y != x {
        SeqContainsMeansInSeq(s, y);
        var i :| 0 <= i < |s| && s[i] == y;
        if i == 0 {
          assert [s[0]][0] == y;
          assert SeqContains([s[0]], y);
        } else {
          assert s[1..][i-1] == y;
          assert SeqContains(s[1..], y);
        }
      }
      if SeqContains(s[1..], y) {
        SeqContainsMeansInSeq(s[1..], y);
        var i :| 0 <= i < |s[1..]| && s[1..][i] == y;
        assert s[i+1] == y;
      }
    }
  }

  lemma RemoveFirstPreservesNoDup<T>(s: seq<T>, x: T)
    requires NoDupSeq(s)
    ensures NoDupSeq(RemoveFirst(s, x))
  {
    var r := RemoveFirst(s, x);
    forall i, j | 0 <= i < j < |r|
      ensures r[i] != r[j]
    {
      RemoveFirstIndex(s, x, i, j);
    }
  }

  lemma RemoveFirstIndex<T>(s: seq<T>, x: T, i: nat, j: nat)
    requires NoDupSeq(s)
    requires i < j < |RemoveFirst(s, x)|
    ensures RemoveFirst(s, x)[i] != RemoveFirst(s, x)[j]
  {
    if |s| == 0 {
    } else if s[0] == x {
      assert RemoveFirst(s, x) == s[1..];
      assert s[1..][i] == s[i+1];
      assert s[1..][j] == s[j+1];
    } else {
      var r := RemoveFirst(s, x);
      assert r == [s[0]] + RemoveFirst(s[1..], x);
      ConcatNoDup([s[0]], s[1..]);
      if i == 0 {
        assert r[0] == s[0];
        // r[j] is from RemoveFirst(s[1..], x)
        RemoveFirstInOriginal(s[1..], x, r[j]);
        // r[j] is in s[1..]
        if r[j] == s[0] {
          SeqContainsMeansInSeq(s[1..], r[j]);
          var k :| 0 <= k < |s[1..]| && s[1..][k] == r[j];
          assert s[k+1] == s[0];
        }
      } else {
        // Both from RemoveFirst(s[1..], x)
        RemoveFirstIndex(s[1..], x, i-1, j-1);
      }
    }
  }

  lemma RemoveFirstInOriginal<T>(s: seq<T>, x: T, y: T)
    requires NoDupSeq(s)
    requires SeqContains(RemoveFirst(s, x), y)
    ensures SeqContains(s, y)
  {
    RemoveFirstNoDupContains(s, x, y);
  }

  lemma RemoveFirstLength<T>(s: seq<T>, x: T)
    ensures SeqContains(s, x) ==> |RemoveFirst(s, x)| == |s| - 1
    ensures !SeqContains(s, x) ==> RemoveFirst(s, x) == s
  {
    if |s| == 0 {
    } else if s[0] == x {
      assert SeqContains(s, x);
    } else {
      RemoveFirstLength(s[1..], x);
      if SeqContains(s, x) {
        SeqContainsMeansInSeq(s, x);
        var i :| 0 <= i < |s| && s[i] == x;
        if i == 0 {
          assert false;
        } else {
          assert s[1..][i-1] == x;
          assert SeqContains(s[1..], x);
        }
      }
      if SeqContains(s[1..], x) {
        SeqContainsMeansInSeq(s[1..], x);
        var i :| 0 <= i < |s[1..]| && s[1..][i] == x;
        assert s[i+1] == x;
        assert SeqContains(s, x);
      }
    }
  }

  // InsertAt lemmas
  lemma InsertAtContains<T>(s: seq<T>, i: nat, x: T, y: T)
    requires i <= |s|
    ensures SeqContains(InsertAt(s, i, x), y) <==> SeqContains(s, y) || y == x
  {
    var r := InsertAt(s, i, x);
    ConcatContains(s[..i], [x] + s[i..], y);
    ConcatContains([x], s[i..], y);
    // Forward direction: if y in InsertAt result
    if SeqContains(r, y) {
      if SeqContains(s[..i], y) {
        SeqContainsMeansInSeq(s[..i], y);
        var j :| 0 <= j < |s[..i]| && s[..i][j] == y;
        assert s[j] == y;
      } else if SeqContains([x], y) {
        assert y == x;
      } else if SeqContains(s[i..], y) {
        SeqContainsMeansInSeq(s[i..], y);
        var j :| 0 <= j < |s[i..]| && s[i..][j] == y;
        assert s[i+j] == y;
      }
    }
    // Reverse direction: if y in s or y == x
    if SeqContains(s, y) {
      SeqContainsMeansInSeq(s, y);
      var j :| 0 <= j < |s| && s[j] == y;
      if j < i {
        assert s[..i][j] == y;
        assert SeqContains(s[..i], y);
      } else {
        assert s[i..][j-i] == y;
        assert SeqContains(s[i..], y);
      }
    }
    if y == x {
      assert [x][0] == x;
      assert SeqContains([x], x);
      assert SeqContains([x] + s[i..], x);
      assert SeqContains(s[..i] + ([x] + s[i..]), x);
      assert r == s[..i] + ([x] + s[i..]);
    }
  }

  lemma InsertAtPreservesNoDup<T>(s: seq<T>, i: nat, x: T)
    requires i <= |s|
    requires NoDupSeq(s)
    requires !SeqContains(s, x)
    ensures NoDupSeq(InsertAt(s, i, x))
  {
    var r := InsertAt(s, i, x);
    forall a, b | 0 <= a < b < |r|
      ensures r[a] != r[b]
    {
      if a < i && b < i {
        assert r[a] == s[a];
        assert r[b] == s[b];
      } else if a < i && b == i {
        assert r[a] == s[a];
        assert r[b] == x;
        if s[a] == x {
          assert SeqContains(s, x);
        }
      } else if a < i && b > i {
        assert r[a] == s[a];
        assert r[b] == s[b-1];
      } else if a == i && b > i {
        assert r[a] == x;
        assert r[b] == s[b-1];
        if s[b-1] == x {
          assert SeqContains(s, x);
        }
      } else {
        assert a > i && b > i;
        assert r[a] == s[a-1];
        assert r[b] == s[b-1];
      }
    }
  }

  lemma InsertAtLength<T>(s: seq<T>, i: nat, x: T)
    requires i <= |s|
    ensures |InsertAt(s, i, x)| == |s| + 1
  {}

  // Key lemma for same-column reorder: removing and reinserting same element preserves NoDup
  lemma RemoveInsertPreservesNoDup<T>(s: seq<T>, x: T, k: nat)
    requires NoDupSeq(s)
    requires SeqContains(s, x)
    requires k <= |RemoveFirst(s, x)|
    ensures NoDupSeq(InsertAt(RemoveFirst(s, x), k, x))
  {
    var s1 := RemoveFirst(s, x);
    RemoveFirstPreservesNoDup(s, x);
    RemoveFirstNoDupContains(s, x, x);
    assert !SeqContains(s1, x);
    InsertAtPreservesNoDup(s1, k, x);
  }

  // Contents after remove-insert is the same
  lemma RemoveInsertContents<T>(s: seq<T>, x: T, k: nat, y: T)
    requires NoDupSeq(s)
    requires SeqContains(s, x)
    requires k <= |RemoveFirst(s, x)|
    ensures SeqContains(InsertAt(RemoveFirst(s, x), k, x), y) <==> SeqContains(s, y)
  {
    var s1 := RemoveFirst(s, x);
    RemoveFirstNoDupContains(s, x, y);
    InsertAtContains(s1, k, x, y);
  }

  // FlattenCols when one lane changes by remove-insert (same column reorder)
  lemma FlattenColsSameColReorder(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, col: ColId, id: CardId, k: nat)
    requires NoDupSeq(cols)
    requires col in cols
    requires col in lanes
    requires SeqContains(Lane(lanes, col), id)
    requires k <= |RemoveFirst(Lane(lanes, col), id)|
    requires NoDupSeq(FlattenCols(cols, lanes))
    ensures NoDupSeq(FlattenCols(cols, lanes[col := InsertAt(RemoveFirst(Lane(lanes, col), id), k, id)]))
    ensures forall y :: SeqContains(FlattenCols(cols, lanes[col := InsertAt(RemoveFirst(Lane(lanes, col), id), k, id)]), y)
                   <==> SeqContains(FlattenCols(cols, lanes), y)
  {
    var lane := Lane(lanes, col);
    var lane' := InsertAt(RemoveFirst(lane, id), k, id);
    var lanes' := lanes[col := lane'];

    // Get NoDupSeq of the lane
    AllIdsContains(cols, lanes, id);
    LaneNoDupFromFlattened(cols, lanes, col);

    // lane' has same contents as lane
    forall y
      ensures SeqContains(lane', y) <==> SeqContains(lane, y)
    {
      RemoveInsertContents(lane, id, k, y);
    }

    // lane' is NoDup
    RemoveInsertPreservesNoDup(lane, id, k);

    // FlattenCols contents same
    FlattenColsUpdateOneLane(cols, lanes, lanes', col);
  }

  lemma LaneNoDupFromFlattened(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, col: ColId)
    requires col in cols
    requires NoDupSeq(FlattenCols(cols, lanes))
    ensures NoDupSeq(Lane(lanes, col))
  {
    if |cols| == 0 {
    } else if cols[0] == col {
      ConcatNoDup(Lane(lanes, col), FlattenCols(cols[1..], lanes));
    } else {
      ConcatNoDup(Lane(lanes, cols[0]), FlattenCols(cols[1..], lanes));
      assert col in cols[1..];
      LaneNoDupFromFlattened(cols[1..], lanes, col);
    }
  }

  lemma FlattenColsUpdateOneLane(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, lanes': map<ColId, seq<CardId>>, col: ColId)
    requires NoDupSeq(cols)
    requires col in cols
    requires forall c :: c in cols && c != col ==> Lane(lanes', c) == Lane(lanes, c)
    requires forall y :: SeqContains(Lane(lanes', col), y) <==> SeqContains(Lane(lanes, col), y)
    requires NoDupSeq(FlattenCols(cols, lanes))
    requires NoDupSeq(Lane(lanes', col))
    ensures NoDupSeq(FlattenCols(cols, lanes'))
    ensures forall y :: SeqContains(FlattenCols(cols, lanes'), y) <==> SeqContains(FlattenCols(cols, lanes), y)
  {
    if |cols| == 0 {
    } else if cols[0] == col {
      NoDupSeqNotInTail(cols, col);
      FlattenColsUnchanged(cols[1..], lanes, lanes', col);
      // FlattenCols(cols, lanes') = Lane(lanes', col) + FlattenCols(cols[1..], lanes')
      //                           = Lane(lanes', col) + FlattenCols(cols[1..], lanes)
      var rest := FlattenCols(cols[1..], lanes);
      ConcatNoDup(Lane(lanes, col), rest);
      // Lane(lanes', col) and rest are disjoint (since Lane(lanes, col) and rest are disjoint
      // and Lane(lanes', col) has same contents as Lane(lanes, col))
      ConcatDisjoint(Lane(lanes, col), rest);
      forall y | SeqContains(Lane(lanes', col), y)
        ensures !SeqContains(rest, y)
      {
        assert SeqContains(Lane(lanes, col), y);
      }
      ConcatNoDupDisjoint(Lane(lanes', col), rest);
      forall y
        ensures SeqContains(FlattenCols(cols, lanes'), y) <==> SeqContains(FlattenCols(cols, lanes), y)
      {
        ConcatContains(Lane(lanes', col), rest, y);
        ConcatContains(Lane(lanes, col), rest, y);
      }
    } else {
      assert cols[0] != col;
      assert Lane(lanes', cols[0]) == Lane(lanes, cols[0]);
      assert col in cols[1..];
      ConcatNoDup(Lane(lanes, cols[0]), FlattenCols(cols[1..], lanes));
      FlattenColsUpdateOneLane(cols[1..], lanes, lanes', col);
      var lane0 := Lane(lanes, cols[0]);
      var rest := FlattenCols(cols[1..], lanes);
      var rest' := FlattenCols(cols[1..], lanes');
      // lane0 + rest' should be NoDup
      ConcatDisjoint(lane0, rest);
      forall y | SeqContains(lane0, y)
        ensures !SeqContains(rest', y)
      {
        assert !SeqContains(rest, y);
        assert SeqContains(rest', y) <==> SeqContains(rest, y);
      }
      ConcatNoDupDisjoint(lane0, rest');
      forall y
        ensures SeqContains(FlattenCols(cols, lanes'), y) <==> SeqContains(FlattenCols(cols, lanes), y)
      {
        ConcatContains(lane0, rest', y);
        ConcatContains(lane0, rest, y);
      }
    }
  }

  lemma ConcatNoDupDisjoint<T>(a: seq<T>, b: seq<T>)
    requires NoDupSeq(a)
    requires NoDupSeq(b)
    requires forall x :: SeqContains(a, x) ==> !SeqContains(b, x)
    ensures NoDupSeq(a + b)
  {
    forall i, j | 0 <= i < j < |a + b|
      ensures (a + b)[i] != (a + b)[j]
    {
      if i < |a| && j < |a| {
      } else if i < |a| && j >= |a| {
        var ai := (a + b)[i];
        var bj := (a + b)[j];
        assert ai == a[i];
        assert bj == b[j - |a|];
        assert SeqContains(a, ai);
        if ai == bj {
          assert SeqContains(b, bj);
        }
      } else {
        assert (a + b)[i] == b[i - |a|];
        assert (a + b)[j] == b[j - |a|];
      }
    }
  }

  // FlattenCols for cross-column move: remove from src, insert into dest
  lemma FlattenColsCrossColMove(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, src: ColId, toCol: ColId, id: CardId, k: nat)
    requires NoDupSeq(cols)
    requires src in cols && toCol in cols
    requires src != toCol
    requires src in lanes && toCol in lanes
    requires SeqContains(Lane(lanes, src), id)
    requires k <= |Lane(lanes, toCol)|
    requires NoDupSeq(FlattenCols(cols, lanes))
    ensures NoDupSeq(FlattenCols(cols, lanes[src := RemoveFirst(Lane(lanes, src), id)][toCol := InsertAt(Lane(lanes, toCol), k, id)]))
    ensures forall y :: SeqContains(FlattenCols(cols, lanes[src := RemoveFirst(Lane(lanes, src), id)][toCol := InsertAt(Lane(lanes, toCol), k, id)]), y)
                   <==> SeqContains(FlattenCols(cols, lanes), y)
  {
    var srcLane := Lane(lanes, src);
    var dstLane := Lane(lanes, toCol);
    var srcLane' := RemoveFirst(srcLane, id);
    var dstLane' := InsertAt(dstLane, k, id);
    var lanes' := lanes[src := srcLane'][toCol := dstLane'];

    LaneNoDupFromFlattened(cols, lanes, src);
    LaneNoDupFromFlattened(cols, lanes, toCol);

    // id is in srcLane, not in dstLane (due to NoDupSeq of FlattenCols)
    AllIdsContains(cols, lanes, id);
    FlatColsUnique(cols, lanes, src, toCol, id);
    assert !SeqContains(dstLane, id);

    // srcLane' = srcLane - {id}, dstLane' = dstLane + {id}
    RemoveFirstPreservesNoDup(srcLane, id);
    InsertAtPreservesNoDup(dstLane, k, id);

    // Contents of lanes':
    // - other lanes unchanged
    // - srcLane' has everything in srcLane except id
    // - dstLane' has everything in dstLane plus id

    // Prove lane contents
    forall y
      ensures SeqContains(Lane(lanes', src), y) <==> SeqContains(Lane(lanes, src), y) && y != id
    {
      assert Lane(lanes', src) == srcLane';
      assert Lane(lanes, src) == srcLane;
      RemoveFirstNoDupContains(srcLane, id, y);
    }
    forall y
      ensures SeqContains(Lane(lanes', toCol), y) <==> SeqContains(Lane(lanes, toCol), y) || y == id
    {
      assert Lane(lanes', toCol) == dstLane';
      assert Lane(lanes, toCol) == dstLane;
      InsertAtContains(dstLane, k, id, y);
    }

    FlattenColsTwoLaneUpdate(cols, lanes, lanes', src, toCol, id);
  }

  lemma FlatColsUnique(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, col1: ColId, col2: ColId, id: CardId)
    requires NoDupSeq(cols)
    requires col1 in cols && col2 in cols
    requires col1 != col2
    requires NoDupSeq(FlattenCols(cols, lanes))
    requires SeqContains(Lane(lanes, col1), id)
    ensures !SeqContains(Lane(lanes, col2), id)
  {
    AllIdsContains(cols, lanes, id);
    if SeqContains(Lane(lanes, col2), id) {
      // id appears in both lanes, which means it appears twice in FlattenCols
      SeqContainsMeansInSeq(Lane(lanes, col1), id);
      SeqContainsMeansInSeq(Lane(lanes, col2), id);
      var i1 :| 0 <= i1 < |Lane(lanes, col1)| && Lane(lanes, col1)[i1] == id;
      var i2 :| 0 <= i2 < |Lane(lanes, col2)| && Lane(lanes, col2)[i2] == id;
      // Find col1 and col2 indices in cols
      ColInColsWitness(cols, col1);
      ColInColsWitness(cols, col2);
      var c1 :| 0 <= c1 < |cols| && cols[c1] == col1;
      var c2 :| 0 <= c2 < |cols| && cols[c2] == col2;
      assert c1 != c2;
      // Both positions contribute id to FlattenCols
      FlatColsPositions(cols, lanes, c1, i1, c2, i2);
    }
  }

  lemma FlatColsPositions(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, c1: nat, i1: nat, c2: nat, i2: nat)
    requires c1 < |cols| && c2 < |cols| && c1 != c2
    requires i1 < |Lane(lanes, cols[c1])| && i2 < |Lane(lanes, cols[c2])|
    requires Lane(lanes, cols[c1])[i1] == Lane(lanes, cols[c2])[i2]
    requires NoDupSeq(FlattenCols(cols, lanes))
    ensures false
  {
    var id := Lane(lanes, cols[c1])[i1];
    var flat := FlattenCols(cols, lanes);
    // Calculate positions of id in flat
    var pos1 := FlatColsPosition(cols, lanes, c1, i1);
    var pos2 := FlatColsPosition(cols, lanes, c2, i2);
    FlatColsPositionValid(cols, lanes, c1, i1);
    FlatColsPositionValid(cols, lanes, c2, i2);
    assert flat[pos1] == id;
    assert flat[pos2] == id;
    if c1 < c2 {
      FlatColsPositionOrder(cols, lanes, c1, i1, c2, i2);
      assert pos1 < pos2;
    } else {
      FlatColsPositionOrder(cols, lanes, c2, i2, c1, i1);
      assert pos2 < pos1;
    }
  }

  lemma FlatColsPositionValid(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, c: nat, i: nat)
    requires c < |cols|
    requires i < |Lane(lanes, cols[c])|
    ensures FlatColsPosition(cols, lanes, c, i) < |FlattenCols(cols, lanes)|
    ensures FlattenCols(cols, lanes)[FlatColsPosition(cols, lanes, c, i)] == Lane(lanes, cols[c])[i]
  {
    if c == 0 {
      assert FlatColsPosition(cols, lanes, c, i) == i;
      assert FlattenCols(cols, lanes) == Lane(lanes, cols[0]) + FlattenCols(cols[1..], lanes);
    } else {
      FlatColsPositionValid(cols[1..], lanes, c-1, i);
      assert cols[1..][c-1] == cols[c];
    }
  }

  lemma FlatColsPositionOrder(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, c1: nat, i1: nat, c2: nat, i2: nat)
    requires c1 < c2 < |cols|
    requires i1 < |Lane(lanes, cols[c1])|
    requires i2 < |Lane(lanes, cols[c2])|
    ensures FlatColsPosition(cols, lanes, c1, i1) < FlatColsPosition(cols, lanes, c2, i2)
  {
    if c1 == 0 {
      assert FlatColsPosition(cols, lanes, c1, i1) == i1;
      assert FlatColsPosition(cols, lanes, c2, i2) == |Lane(lanes, cols[0])| + FlatColsPosition(cols[1..], lanes, c2-1, i2);
      FlatColsPositionNonNeg(cols[1..], lanes, c2-1, i2);
      assert i1 < |Lane(lanes, cols[0])|;
    } else {
      FlatColsPositionOrder(cols[1..], lanes, c1-1, i1, c2-1, i2);
    }
  }

  lemma FlatColsPositionNonNeg(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, c: nat, i: nat)
    requires c < |cols|
    requires i < |Lane(lanes, cols[c])|
    ensures FlatColsPosition(cols, lanes, c, i) >= 0
  {}

  lemma FlattenColsTwoLaneUpdate(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, lanes': map<ColId, seq<CardId>>, src: ColId, toCol: ColId, id: CardId)
    requires NoDupSeq(cols)
    requires src in cols && toCol in cols
    requires src != toCol
    requires src in lanes && toCol in lanes
    requires NoDupSeq(FlattenCols(cols, lanes))
    requires SeqContains(Lane(lanes, src), id)
    requires !SeqContains(Lane(lanes, toCol), id)
    requires NoDupSeq(Lane(lanes, src))
    requires NoDupSeq(Lane(lanes, toCol))
    requires NoDupSeq(Lane(lanes', src))
    requires NoDupSeq(Lane(lanes', toCol))
    requires forall c :: c in cols && c != src && c != toCol ==> Lane(lanes', c) == Lane(lanes, c)
    requires forall y :: SeqContains(Lane(lanes', src), y) <==> SeqContains(Lane(lanes, src), y) && y != id
    requires forall y :: SeqContains(Lane(lanes', toCol), y) <==> SeqContains(Lane(lanes, toCol), y) || y == id
    ensures NoDupSeq(FlattenCols(cols, lanes'))
    ensures forall y :: SeqContains(FlattenCols(cols, lanes'), y) <==> SeqContains(FlattenCols(cols, lanes), y)
  {
    FlattenColsTwoLaneUpdateHelper(cols, lanes, lanes', src, toCol, id);
  }

  // Helper for FindColumnOf
  lemma FindColumnOfFound(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, id: CardId)
    requires exists i :: 0 <= i < |cols| && SeqContains(Lane(lanes, cols[i]), id)
    ensures FindColumnOf(cols, lanes, id) in cols
    ensures SeqContains(Lane(lanes, FindColumnOf(cols, lanes, id)), id)
  {
    if |cols| == 0 {
      var i :| 0 <= i < |cols| && SeqContains(Lane(lanes, cols[i]), id);
      assert false;
    } else if SeqContains(Lane(lanes, cols[0]), id) {
      assert FindColumnOf(cols, lanes, id) == cols[0];
      assert cols[0] in cols;
    } else {
      var i :| 0 <= i < |cols| && SeqContains(Lane(lanes, cols[i]), id);
      if i == 0 {
        assert SeqContains(Lane(lanes, cols[0]), id);
        assert false;
      }
      assert i > 0;
      assert SeqContains(Lane(lanes, cols[i]), id);
      assert cols[i] == cols[1..][i-1];
      assert i - 1 < |cols[1..]|;
      assert SeqContains(Lane(lanes, cols[1..][i-1]), id);
      assert forall c :: c in cols[1..] ==> c in cols;
      FindColumnOfFound(cols[1..], lanes, id);
      assert FindColumnOf(cols[1..], lanes, id) in cols[1..];
      assert FindColumnOf(cols, lanes, id) == FindColumnOf(cols[1..], lanes, id);
    }
  }

  lemma FindColumnOfInv(m: Model, id: CardId)
    requires Inv(m)
    requires id in m.cards
    ensures FindColumnOf(m.cols, m.lanes, id) in m.cols
    ensures SeqContains(Lane(m.lanes, FindColumnOf(m.cols, m.lanes, id)), id)
  {
    assert OccursInLanes(m, id);
    var i :| 0 <= i < |m.cols| && (exists j :: 0 <= j < |Lane(m.lanes, m.cols[i])| && Lane(m.lanes, m.cols[i])[j] == id);
    var j :| 0 <= j < |Lane(m.lanes, m.cols[i])| && Lane(m.lanes, m.cols[i])[j] == id;
    assert Lane(m.lanes, m.cols[i])[j] == id;
    assert SeqContains(Lane(m.lanes, m.cols[i]), id);
    FindColumnOfFound(m.cols, m.lanes, id);
  }

  lemma OccursInLanesEquivSeqContains(m: Model, id: CardId)
    ensures OccursInLanes(m, id) <==> (exists i :: 0 <= i < |m.cols| && SeqContains(Lane(m.lanes, m.cols[i]), id))
  {
    if OccursInLanes(m, id) {
      var i :| 0 <= i < |m.cols| && (exists j :: 0 <= j < |Lane(m.lanes, m.cols[i])| && Lane(m.lanes, m.cols[i])[j] == id);
      var j :| 0 <= j < |Lane(m.lanes, m.cols[i])| && Lane(m.lanes, m.cols[i])[j] == id;
      assert SeqContains(Lane(m.lanes, m.cols[i]), id);
    }
    if exists i :: 0 <= i < |m.cols| && SeqContains(Lane(m.lanes, m.cols[i]), id) {
      var i :| 0 <= i < |m.cols| && SeqContains(Lane(m.lanes, m.cols[i]), id);
      SeqContainsMeansInSeq(Lane(m.lanes, m.cols[i]), id);
      var j :| 0 <= j < |Lane(m.lanes, m.cols[i])| && Lane(m.lanes, m.cols[i])[j] == id;
      OccursInLanesWitness(m, id, i, j);
    }
  }

  lemma OccursInLanesEquivSeqContainsLanes(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, id: CardId)
    ensures (exists i :: 0 <= i < |cols| && SeqContains(Lane(lanes, cols[i]), id)) <==> SeqContains(FlattenCols(cols, lanes), id)
  {
    AllIdsContains(cols, lanes, id);
  }

  // Single lane update: add id to one lane
  lemma FlattenColsSingleLaneAdd(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, lanes': map<ColId, seq<CardId>>, toCol: ColId, id: CardId)
    requires NoDupSeq(cols)
    requires toCol in cols
    requires NoDupSeq(FlattenCols(cols, lanes))
    requires !SeqContains(FlattenCols(cols, lanes), id)  // id not currently in any lane
    requires NoDupSeq(Lane(lanes', toCol))
    requires forall c :: c in cols && c != toCol ==> Lane(lanes', c) == Lane(lanes, c)
    requires forall y :: SeqContains(Lane(lanes', toCol), y) <==> SeqContains(Lane(lanes, toCol), y) || y == id
    ensures NoDupSeq(FlattenCols(cols, lanes'))
    ensures forall y :: SeqContains(FlattenCols(cols, lanes'), y) <==> SeqContains(FlattenCols(cols, lanes), y) || y == id
  {
    if |cols| == 0 {
    } else if cols[0] == toCol {
      NoDupSeqNotInTail(cols, toCol);
      FlattenColsUnchanged(cols[1..], lanes, lanes', toCol);
      var rest := FlattenCols(cols[1..], lanes);
      ConcatNoDup(Lane(lanes, toCol), rest);
      ConcatDisjoint(Lane(lanes, toCol), rest);
      ConcatContains(Lane(lanes, toCol), rest, id);
      assert !SeqContains(Lane(lanes, toCol), id) && !SeqContains(rest, id);
      // lane' and rest are disjoint
      forall y | SeqContains(Lane(lanes', toCol), y)
        ensures !SeqContains(rest, y)
      {
        if y == id {
          assert !SeqContains(rest, id);
        } else {
          assert SeqContains(Lane(lanes, toCol), y);
        }
      }
      ConcatNoDupDisjoint(Lane(lanes', toCol), rest);
      forall y
        ensures SeqContains(FlattenCols(cols, lanes'), y) <==> SeqContains(FlattenCols(cols, lanes), y) || y == id
      {
        ConcatContains(Lane(lanes', toCol), rest, y);
        ConcatContains(Lane(lanes, toCol), rest, y);
      }
    } else {
      assert cols[0] != toCol;
      assert Lane(lanes', cols[0]) == Lane(lanes, cols[0]);
      assert toCol in cols[1..];
      ConcatNoDup(Lane(lanes, cols[0]), FlattenCols(cols[1..], lanes));
      ConcatContains(Lane(lanes, cols[0]), FlattenCols(cols[1..], lanes), id);
      FlattenColsSingleLaneAdd(cols[1..], lanes, lanes', toCol, id);
      var lane0 := Lane(lanes, cols[0]);
      var rest' := FlattenCols(cols[1..], lanes');
      ConcatDisjoint(lane0, FlattenCols(cols[1..], lanes));
      forall y | SeqContains(lane0, y)
        ensures !SeqContains(rest', y)
      {
        assert !SeqContains(FlattenCols(cols[1..], lanes), y);
        if y == id {
          assert !SeqContains(lane0, id);
        }
      }
      ConcatNoDupDisjoint(lane0, rest');
      forall y
        ensures SeqContains(FlattenCols(cols, lanes'), y) <==> SeqContains(FlattenCols(cols, lanes), y) || y == id
      {
        ConcatContains(lane0, rest', y);
        ConcatContains(lane0, FlattenCols(cols[1..], lanes), y);
      }
    }
  }

  // Single lane update: remove id from one lane
  lemma FlattenColsSingleLaneRemove(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, lanes': map<ColId, seq<CardId>>, src: ColId, id: CardId)
    requires NoDupSeq(cols)
    requires src in cols
    requires NoDupSeq(FlattenCols(cols, lanes))
    requires SeqContains(Lane(lanes, src), id)  // id is in the source lane
    requires NoDupSeq(Lane(lanes', src))
    requires forall c :: c in cols && c != src ==> Lane(lanes', c) == Lane(lanes, c)
    requires forall y :: SeqContains(Lane(lanes', src), y) <==> SeqContains(Lane(lanes, src), y) && y != id
    ensures NoDupSeq(FlattenCols(cols, lanes'))
    ensures forall y :: SeqContains(FlattenCols(cols, lanes'), y) <==> SeqContains(FlattenCols(cols, lanes), y) && y != id
  {
    if |cols| == 0 {
    } else if cols[0] == src {
      NoDupSeqNotInTail(cols, src);
      FlattenColsUnchanged(cols[1..], lanes, lanes', src);
      var rest := FlattenCols(cols[1..], lanes);
      ConcatNoDup(Lane(lanes, src), rest);
      ConcatDisjoint(Lane(lanes, src), rest);
      // lane' and rest are disjoint (lane' is subset of lane)
      forall y | SeqContains(Lane(lanes', src), y)
        ensures !SeqContains(rest, y)
      {
        assert SeqContains(Lane(lanes, src), y);
      }
      ConcatNoDupDisjoint(Lane(lanes', src), rest);
      forall y
        ensures SeqContains(FlattenCols(cols, lanes'), y) <==> SeqContains(FlattenCols(cols, lanes), y) && y != id
      {
        ConcatContains(Lane(lanes', src), rest, y);
        ConcatContains(Lane(lanes, src), rest, y);
        if y == id {
          // id was in Lane(lanes, src), now removed
          FlatColsUniqueInLane(cols, lanes, src, id);
        }
      }
    } else {
      assert cols[0] != src;
      assert Lane(lanes', cols[0]) == Lane(lanes, cols[0]);
      assert src in cols[1..];
      ConcatNoDup(Lane(lanes, cols[0]), FlattenCols(cols[1..], lanes));
      ConcatContains(Lane(lanes, cols[0]), FlattenCols(cols[1..], lanes), id);
      // id is in src's lane, and src is in cols[1..], so id is in FlattenCols(cols[1..], lanes)
      AllIdsContains(cols[1..], lanes, id);
      FlattenColsSingleLaneRemove(cols[1..], lanes, lanes', src, id);
      var lane0 := Lane(lanes, cols[0]);
      var rest' := FlattenCols(cols[1..], lanes');
      ConcatDisjoint(lane0, FlattenCols(cols[1..], lanes));
      forall y | SeqContains(lane0, y)
        ensures !SeqContains(rest', y)
      {
        assert !SeqContains(FlattenCols(cols[1..], lanes), y);
        // rest' is subset of FlattenCols(cols[1..], lanes)
      }
      ConcatNoDupDisjoint(lane0, rest');
      forall y
        ensures SeqContains(FlattenCols(cols, lanes'), y) <==> SeqContains(FlattenCols(cols, lanes), y) && y != id
      {
        ConcatContains(lane0, rest', y);
        ConcatContains(lane0, FlattenCols(cols[1..], lanes), y);
        if y == id {
          // id is in FlattenCols(cols[1..], lanes), not in lane0
          FlatColsUniqueInLane(cols, lanes, src, id);
          assert !SeqContains(lane0, id);
        }
      }
    }
  }

  lemma FlatColsUniqueInLane(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, col: ColId, id: CardId)
    requires NoDupSeq(cols)
    requires col in cols
    requires NoDupSeq(FlattenCols(cols, lanes))
    requires SeqContains(Lane(lanes, col), id)
    ensures forall c :: c in cols && c != col ==> !SeqContains(Lane(lanes, c), id)
  {
    forall c | c in cols && c != col
      ensures !SeqContains(Lane(lanes, c), id)
    {
      if SeqContains(Lane(lanes, c), id) {
        FlatColsUnique(cols, lanes, col, c, id);
      }
    }
  }

  lemma FlattenColsTwoLaneUpdateHelper(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, lanes': map<ColId, seq<CardId>>, src: ColId, toCol: ColId, id: CardId)
    requires NoDupSeq(cols)
    requires src in cols && toCol in cols
    requires src != toCol
    requires NoDupSeq(FlattenCols(cols, lanes))
    requires SeqContains(Lane(lanes, src), id)
    requires !SeqContains(Lane(lanes, toCol), id)
    requires NoDupSeq(Lane(lanes', src))
    requires NoDupSeq(Lane(lanes', toCol))
    requires forall c :: c in cols && c != src && c != toCol ==> Lane(lanes', c) == Lane(lanes, c)
    requires forall y :: SeqContains(Lane(lanes', src), y) <==> SeqContains(Lane(lanes, src), y) && y != id
    requires forall y :: SeqContains(Lane(lanes', toCol), y) <==> SeqContains(Lane(lanes, toCol), y) || y == id
    ensures NoDupSeq(FlattenCols(cols, lanes'))
    ensures forall y :: SeqContains(FlattenCols(cols, lanes'), y) <==> SeqContains(FlattenCols(cols, lanes), y)
    decreases |cols|
  {
    if |cols| == 0 {
    } else {
      var col0 := cols[0];
      var lane0 := Lane(lanes, col0);
      var lane0' := Lane(lanes', col0);
      var rest := FlattenCols(cols[1..], lanes);
      var rest' := FlattenCols(cols[1..], lanes');

      ConcatNoDup(lane0, rest);

      if col0 == src {
        // lane0' = lane0 - {id}
        // toCol in cols[1..] (since toCol != src and toCol in cols)
        NoDupSeqNotInTail(cols, src);
        assert forall c :: c in cols[1..] ==> c != src;
        assert toCol != src;
        assert toCol in cols;
        assert toCol in cols[1..];
        // src is NOT in cols[1..], so use single-update lemma for rest
        // id is in lane0 (which is Lane(lanes, src)), so id not in rest
        ConcatNoDup(lane0, rest);
        ConcatContains(lane0, rest, id);
        assert SeqContains(lane0, id);
        ConcatDisjoint(lane0, rest);
        assert !SeqContains(rest, id);
        FlattenColsSingleLaneAdd(cols[1..], lanes, lanes', toCol, id);

        // Now show lane0' + rest' is NoDup
        ConcatDisjoint(lane0, rest);
        // lane0' subset of lane0, and lane0 disjoint from rest
        forall y | SeqContains(lane0', y)
          ensures !SeqContains(rest', y)
        {
          assert SeqContains(lane0, y);
          assert !SeqContains(rest, y);
          // rest' has same elements as rest
          assert SeqContains(rest', y) <==> SeqContains(rest, y);
        }
        ConcatNoDupDisjoint(lane0', rest');

        forall y
          ensures SeqContains(FlattenCols(cols, lanes'), y) <==> SeqContains(FlattenCols(cols, lanes), y)
        {
          ConcatContains(lane0', rest', y);
          ConcatContains(lane0, rest, y);
          if SeqContains(lane0', y) {
            assert SeqContains(lane0, y);
          }
          if SeqContains(lane0, y) {
            if y == id {
              // id moved to toCol, which is in rest'
              assert SeqContains(rest', id);
            } else {
              assert SeqContains(lane0', y);
            }
          }
        }
      } else if col0 == toCol {
        // lane0' = lane0 + {id}
        // src must be in cols[1..] (since src != toCol and src in cols)
        NoDupSeqNotInTail(cols, toCol);
        assert forall c :: c in cols[1..] ==> c != toCol;
        assert src != toCol;
        assert src in cols;
        assert src in cols[1..];
        // toCol is NOT in cols[1..], so use single-update lemma for rest
        // id is in Lane(lanes, src) and src is in cols[1..]
        FlattenColsSingleLaneRemove(cols[1..], lanes, lanes', src, id);

        ConcatDisjoint(lane0, rest);
        // rest' = rest - {id}
        // lane0' = lane0 + {id}
        // id was in rest (since src in cols[1..]), now in lane0'
        AllIdsContains(cols[1..], lanes, id);
        assert SeqContains(rest, id);

        forall y | SeqContains(lane0', y)
          ensures !SeqContains(rest', y)
        {
          if y == id {
            // id not in rest'
            assert !SeqContains(rest', id);
          } else {
            assert SeqContains(lane0, y);
            assert !SeqContains(rest, y);
            assert SeqContains(rest', y) <==> SeqContains(rest, y);
          }
        }
        ConcatNoDupDisjoint(lane0', rest');

        forall y
          ensures SeqContains(FlattenCols(cols, lanes'), y) <==> SeqContains(FlattenCols(cols, lanes), y)
        {
          ConcatContains(lane0', rest', y);
          ConcatContains(lane0, rest, y);
          if y == id {
            assert SeqContains(lane0', id);
            assert SeqContains(rest, id);
          }
        }
      } else {
        // col0 is neither src nor toCol
        assert lane0' == lane0;
        if src in cols[1..] && toCol in cols[1..] {
          FlattenColsTwoLaneUpdateHelper(cols[1..], lanes, lanes', src, toCol, id);
        } else if src in cols[1..] {
          assert toCol == col0;
          assert false;
        } else if toCol in cols[1..] {
          assert src == col0;
          assert false;
        } else {
          // Neither in cols[1..], but both in cols, so one must be col0
          assert src == col0 || toCol == col0;
          assert false;
        }

        ConcatDisjoint(lane0, rest);
        forall y | SeqContains(lane0', y)
          ensures !SeqContains(rest', y)
        {
          assert SeqContains(lane0, y);
          assert !SeqContains(rest, y);
          assert SeqContains(rest', y) <==> SeqContains(rest, y);
        }
        ConcatNoDupDisjoint(lane0', rest');

        forall y
          ensures SeqContains(FlattenCols(cols, lanes'), y) <==> SeqContains(FlattenCols(cols, lanes), y)
        {
          ConcatContains(lane0', rest', y);
          ConcatContains(lane0, rest, y);
        }
      }
    }
  }

  // Helper lemma: if id is in a sequence, it's contained
  lemma SeqContainsWitness<T>(s: seq<T>, x: T, idx: nat)
    requires idx < |s|
    requires s[idx] == x
    ensures SeqContains(s, x)
  {}

  // Helper: OccursInLanes with a witness
  lemma OccursInLanesWitness(m: Model, id: CardId, colIdx: nat, posIdx: nat)
    requires colIdx < |m.cols|
    requires posIdx < |Lane(m.lanes, m.cols[colIdx])|
    requires Lane(m.lanes, m.cols[colIdx])[posIdx] == id
    ensures OccursInLanes(m, id)
  {}

  // AllIds contains exactly what's in the lanes
  lemma AllIdsContains(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, id: CardId)
    ensures SeqContains(FlattenCols(cols, lanes), id) <==>
            exists i :: 0 <= i < |cols| && SeqContains(Lane(lanes, cols[i]), id)
  {
    if |cols| == 0 {
    } else {
      AllIdsContains(cols[1..], lanes, id);
      ConcatContains(Lane(lanes, cols[0]), FlattenCols(cols[1..], lanes), id);
      if SeqContains(FlattenCols(cols, lanes), id) {
        if SeqContains(Lane(lanes, cols[0]), id) {
          assert SeqContains(Lane(lanes, cols[0]), id);
        } else {
          assert SeqContains(FlattenCols(cols[1..], lanes), id);
          var i :| 0 <= i < |cols[1..]| && SeqContains(Lane(lanes, cols[1..][i]), id);
          assert cols[1..][i] == cols[i+1];
        }
      }
      if exists i :: 0 <= i < |cols| && SeqContains(Lane(lanes, cols[i]), id) {
        var i :| 0 <= i < |cols| && SeqContains(Lane(lanes, cols[i]), id);
        if i == 0 {
          assert SeqContains(Lane(lanes, cols[0]), id);
        } else {
          assert SeqContains(Lane(lanes, cols[i]), id);
          assert cols[i] == cols[1..][i-1];
          assert SeqContains(FlattenCols(cols[1..], lanes), id);
        }
      }
    }
  }

  lemma SeqContainsMeansInSeq<T>(s: seq<T>, x: T)
    requires SeqContains(s, x)
    ensures exists k :: 0 <= k < |s| && s[k] == x
  {
    var i :| 0 <= i < |s| && s[i] == x;
  }

  lemma ConcatContains<T>(a: seq<T>, b: seq<T>, x: T)
    ensures SeqContains(a + b, x) <==> SeqContains(a, x) || SeqContains(b, x)
  {
    if SeqContains(a + b, x) {
      var i :| 0 <= i < |a + b| && (a + b)[i] == x;
      if i < |a| {
        assert a[i] == x;
      } else {
        assert b[i - |a|] == x;
      }
    }
    if SeqContains(a, x) {
      var i :| 0 <= i < |a| && a[i] == x;
      assert (a + b)[i] == x;
    }
    if SeqContains(b, x) {
      var i :| 0 <= i < |b| && b[i] == x;
      assert (a + b)[|a| + i] == x;
    }
  }

  // If head of NoDupSeq equals x, then x is not in tail
  lemma NoDupSeqNotInTail<T>(s: seq<T>, x: T)
    requires |s| > 0
    requires NoDupSeq(s)
    requires s[0] == x
    ensures forall c :: c in s[1..] ==> c != x
  {
    forall c | c in s[1..]
      ensures c != x
    {
      if c == x {
        var i :| 0 <= i < |s[1..]| && s[1..][i] == c;
        assert s[i+1] == c == x;
        assert s[0] == x;
        assert 0 < i + 1;
      }
    }
  }

  // NoDupSeq preserved when appending a fresh element
  lemma NoDupSeqAppend<T>(s: seq<T>, x: T)
    requires NoDupSeq(s)
    requires !SeqContains(s, x)
    ensures NoDupSeq(s + [x])
  {
    var s' := s + [x];
    forall i, j | 0 <= i < j < |s'|
      ensures s'[i] != s'[j]
    {
      if j < |s| {
        assert s'[i] == s[i];
        assert s'[j] == s[j];
      } else {
        assert j == |s|;
        assert s'[j] == x;
        if s'[i] == x {
          assert s[i] == x;
          assert SeqContains(s, x);
          assert false;
        }
      }
    }
  }

  // Helper for updating a single lane
  lemma FlattenColsUpdateLane(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, col: ColId, newLane: seq<CardId>)
    requires col in lanes
    requires col in cols
    ensures forall c :: c in cols && c != col ==> Lane(lanes[col := newLane], c) == Lane(lanes, c)
  {}

  lemma FlattenColsAppendToLane(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, col: ColId, x: CardId)
    requires col in lanes
    requires col in cols
    requires NoDupSeq(cols)
    requires NoDupSeq(FlattenCols(cols, lanes))
    requires !SeqContains(FlattenCols(cols, lanes), x)
    ensures NoDupSeq(FlattenCols(cols, lanes[col := Lane(lanes, col) + [x]]))
  {
    var lanes' := lanes[col := Lane(lanes, col) + [x]];
    FlattenColsAppendToLaneHelper(cols, lanes, col, x);
  }

  lemma FlattenColsAppendToLaneHelper(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, col: ColId, x: CardId)
    requires col in lanes
    requires col in cols
    requires NoDupSeq(cols)
    requires NoDupSeq(FlattenCols(cols, lanes))
    requires !SeqContains(FlattenCols(cols, lanes), x)
    ensures NoDupSeq(FlattenCols(cols, lanes[col := Lane(lanes, col) + [x]]))
  {
    var lanes' := lanes[col := Lane(lanes, col) + [x]];
    if |cols| == 0 {
    } else if cols[0] == col {
      // The first column is the one we're updating
      var rest := FlattenCols(cols[1..], lanes);
      var rest' := FlattenCols(cols[1..], lanes');
      // lanes' agrees with lanes on all columns except col
      // Since col == cols[0] and NoDupSeq(cols), col not in cols[1..]
      NoDupSeqNotInTail(cols, col);
      assert forall c :: c in cols[1..] ==> c != col;
      FlattenColsUnchanged(cols[1..], lanes, lanes', col);
      assert rest' == rest;
      // Original: Lane(lanes, col) + rest, which is NoDup and x not in it
      // New: (Lane(lanes, col) + [x]) + rest
      var lane := Lane(lanes, col);
      ConcatContains(lane, rest, x);
      assert !SeqContains(lane, x) && !SeqContains(rest, x);
      NoDupSeqAppend(lane + rest, x);
      // Now need to show (lane + [x]) + rest is NoDup
      assert lane + rest == FlattenCols(cols, lanes);
      assert (lane + [x]) + rest == lane + ([x] + rest);
      NoDupSeqInsert(lane, rest, x);
    } else {
      // First column is not col, so lane unchanged
      assert Lane(lanes', cols[0]) == Lane(lanes, cols[0]);
      var lane0 := Lane(lanes, cols[0]);
      var rest := FlattenCols(cols[1..], lanes);
      var rest' := FlattenCols(cols[1..], lanes');
      // col must be in cols[1..]
      assert col in cols[1..];
      // rest is NoDup (from original being NoDup)
      ConcatNoDup(lane0, rest);
      // x not in rest
      ConcatContains(lane0, rest, x);
      assert !SeqContains(rest, x);
      // By induction
      FlattenColsAppendToLaneHelper(cols[1..], lanes, col, x);
      assert NoDupSeq(rest');
      // Also x not in lane0
      assert !SeqContains(lane0, x);
      // Need lane0 + rest' NoDup
      // rest' has all elements of rest plus x
      FlattenColsAppendContent(cols[1..], lanes, col, x);
      // lane0 and rest are disjoint (from NoDupSeq(lane0 + rest))
      ConcatDisjoint(lane0, rest);
      // rest' = rest ∪ {x}, and x not in lane0, so lane0 and rest' are disjoint
      ConcatNoDupFreshSubset(lane0, rest, rest', x);
    }
  }

  lemma ConcatDisjoint<T>(a: seq<T>, b: seq<T>)
    requires NoDupSeq(a + b)
    ensures forall x :: SeqContains(a, x) ==> !SeqContains(b, x)
  {
    forall y | SeqContains(a, y)
      ensures !SeqContains(b, y)
    {
      if SeqContains(b, y) {
        SeqContainsMeansInSeq(a, y);
        SeqContainsMeansInSeq(b, y);
        var i :| 0 <= i < |a| && a[i] == y;
        var j :| 0 <= j < |b| && b[j] == y;
        assert (a + b)[i] == y;
        assert (a + b)[|a| + j] == y;
        assert i < |a| + j;
      }
    }
  }

  lemma ConcatNoDupFreshSubset<T>(a: seq<T>, b: seq<T>, b': seq<T>, x: T)
    requires NoDupSeq(a + b)
    requires NoDupSeq(b')
    requires !SeqContains(a, x)
    requires forall y :: SeqContains(b', y) <==> SeqContains(b, y) || y == x
    ensures NoDupSeq(a + b')
  {
    ConcatDisjoint(a, b);
    forall i, j | 0 <= i < j < |a + b'|
      ensures (a + b')[i] != (a + b')[j]
    {
      if i < |a| && j < |a| {
        assert (a + b')[i] == a[i];
        assert (a + b')[j] == a[j];
        assert (a + b)[i] == a[i];
        assert (a + b)[j] == a[j];
      } else if i < |a| && j >= |a| {
        var ai := (a + b')[i];
        var bj := (a + b')[j];
        assert ai == a[i];
        assert bj == b'[j - |a|];
        assert SeqContains(a, ai);
        assert SeqContains(b', bj);
        // bj is either in b or is x
        if bj == x {
          // x not in a
        } else {
          assert SeqContains(b, bj);
          // a and b are disjoint, so ai != bj
        }
      } else {
        // both in b'
        assert (a + b')[i] == b'[i - |a|];
        assert (a + b')[j] == b'[j - |a|];
      }
    }
  }

  lemma FlattenColsUnchanged(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, lanes': map<ColId, seq<CardId>>, col: ColId)
    requires forall c :: c in cols ==> c != col
    requires forall c :: c in cols ==> Lane(lanes', c) == Lane(lanes, c)
    ensures FlattenCols(cols, lanes') == FlattenCols(cols, lanes)
  {
    if |cols| == 0 {
    } else {
      assert forall c :: c in cols[1..] ==> c in cols;
      FlattenColsUnchanged(cols[1..], lanes, lanes', col);
    }
  }

  lemma ConcatNoDup<T>(a: seq<T>, b: seq<T>)
    requires NoDupSeq(a + b)
    ensures NoDupSeq(a) && NoDupSeq(b)
  {
    forall i, j | 0 <= i < j < |a|
      ensures a[i] != a[j]
    {
      assert (a + b)[i] == a[i];
      assert (a + b)[j] == a[j];
    }
    forall i, j | 0 <= i < j < |b|
      ensures b[i] != b[j]
    {
      assert (a + b)[|a| + i] == b[i];
      assert (a + b)[|a| + j] == b[j];
    }
  }

  lemma NoDupSeqInsert<T>(a: seq<T>, b: seq<T>, x: T)
    requires NoDupSeq(a + b)
    requires !SeqContains(a, x)
    requires !SeqContains(b, x)
    ensures NoDupSeq((a + [x]) + b)
  {
    var s := (a + [x]) + b;
    assert s == a + [x] + b;
    forall i, j | 0 <= i < j < |s|
      ensures s[i] != s[j]
    {
      if i < |a| && j < |a| {
        assert s[i] == a[i];
        assert s[j] == a[j];
        assert (a + b)[i] == a[i];
        assert (a + b)[j] == a[j];
      } else if i < |a| && j == |a| {
        assert s[i] == a[i];
        assert s[j] == x;
        if a[i] == x {
          assert SeqContains(a, x);
        }
      } else if i < |a| && j > |a| {
        assert s[i] == a[i];
        assert s[j] == b[j - |a| - 1];
        assert (a + b)[i] == a[i];
        assert (a + b)[|a| + (j - |a| - 1)] == b[j - |a| - 1];
      } else if i == |a| && j > |a| {
        assert s[i] == x;
        assert s[j] == b[j - |a| - 1];
        if x == b[j - |a| - 1] {
          assert SeqContains(b, x);
        }
      } else {
        assert i > |a| && j > |a|;
        assert s[i] == b[i - |a| - 1];
        assert s[j] == b[j - |a| - 1];
        assert (a + b)[|a| + (i - |a| - 1)] == b[i - |a| - 1];
        assert (a + b)[|a| + (j - |a| - 1)] == b[j - |a| - 1];
      }
    }
  }

  lemma FlattenColsAppendContent(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, col: ColId, x: CardId)
    requires col in cols
    requires col in lanes
    ensures forall y :: SeqContains(FlattenCols(cols, lanes[col := Lane(lanes, col) + [x]]), y) <==>
                        SeqContains(FlattenCols(cols, lanes), y) || y == x
  {
    var lanes' := lanes[col := Lane(lanes, col) + [x]];
    forall y
      ensures SeqContains(FlattenCols(cols, lanes'), y) <==> SeqContains(FlattenCols(cols, lanes), y) || y == x
    {
      AllIdsContains(cols, lanes', y);
      AllIdsContains(cols, lanes, y);
      if SeqContains(FlattenCols(cols, lanes'), y) {
        var i :| 0 <= i < |cols| && SeqContains(Lane(lanes', cols[i]), y);
        if cols[i] == col {
          ConcatContains(Lane(lanes, col), [x], y);
          assert Lane(lanes', col) == Lane(lanes, col) + [x];
        } else {
          assert Lane(lanes', cols[i]) == Lane(lanes, cols[i]);
        }
      }
      if SeqContains(FlattenCols(cols, lanes), y) {
        var i :| 0 <= i < |cols| && SeqContains(Lane(lanes, cols[i]), y);
        if cols[i] == col {
          ConcatContains(Lane(lanes, col), [x], y);
        } else {
          assert Lane(lanes', cols[i]) == Lane(lanes, cols[i]);
        }
      }
      if y == x {
        // Find col in cols
        ColInColsWitness(cols, col);
        var i :| 0 <= i < |cols| && cols[i] == col;
        assert Lane(lanes', col) == Lane(lanes, col) + [x];
        assert (Lane(lanes, col) + [x])[|Lane(lanes, col)|] == x;
        assert SeqContains(Lane(lanes', col), x);
      }
    }
  }

  lemma ColInColsWitness(cols: seq<ColId>, col: ColId)
    requires col in cols
    ensures exists i :: 0 <= i < |cols| && cols[i] == col
  {
    var i :| 0 <= i < |cols| && cols[i] == col;
  }

  lemma ConcatNoDupWithFreshAppend<T>(a: seq<T>, b: seq<T>, x: T)
    requires NoDupSeq(a + b)
    requires !SeqContains(a, x)
    requires !SeqContains(b, x)
    ensures NoDupSeq(a + (b + [x]))
  {
    assert a + (b + [x]) == (a + b) + [x];
    NoDupSeqAppend(a + b, x);
  }

  // NoDupSeq when appending an element not in the sequence
  lemma NoDupSeqAppendFresh<T>(s: seq<T>, x: T)
    requires NoDupSeq(s)
    requires !(x in s)
    ensures NoDupSeq(s + [x])
  {
    assert !SeqContains(s, x) by {
      if SeqContains(s, x) {
        SeqContainsMeansInSeq(s, x);
      }
    }
    NoDupSeqAppend(s, x);
  }

  // FlattenCols with appended empty lane
  lemma FlattenColsAppendEmpty(cols: seq<ColId>, lanes: map<ColId, seq<CardId>>, col: ColId)
    requires col in lanes
    requires Lane(lanes, col) == []
    ensures FlattenCols(cols + [col], lanes) == FlattenCols(cols, lanes)
  {
    if |cols| == 0 {
      assert FlattenCols(cols + [col], lanes) == FlattenCols([col], lanes);
      assert FlattenCols([col], lanes) == Lane(lanes, col) + FlattenCols([], lanes);
      assert Lane(lanes, col) == [];
    } else {
      assert (cols + [col])[0] == cols[0];
      assert (cols + [col])[1..] == cols[1..] + [col];
      FlattenColsAppendEmpty(cols[1..], lanes, col);
    }
  }

  // FlattenCols is the same when lanes agree on all columns
  lemma FlattenColsSameLanes(cols: seq<ColId>, lanes1: map<ColId, seq<CardId>>, lanes2: map<ColId, seq<CardId>>)
    requires forall c :: c in cols ==> Lane(lanes1, c) == Lane(lanes2, c)
    ensures FlattenCols(cols, lanes1) == FlattenCols(cols, lanes2)
  {
    if |cols| == 0 {
    } else {
      assert cols[0] in cols;
      FlattenColsSameLanes(cols[1..], lanes1, lanes2);
    }
  }

  // freshId not in AllIds when >= nextId and Inv holds
  lemma FreshIdNotInAllIds(m: Model, freshId: CardId)
    requires Inv(m)
    requires freshId >= m.nextId
    ensures !SeqContains(AllIds(m), freshId)
  {
    AllIdsContains(m.cols, m.lanes, freshId);
    if SeqContains(AllIds(m), freshId) {
      var i :| 0 <= i < |m.cols| && SeqContains(Lane(m.lanes, m.cols[i]), freshId);
      SeqContainsMeansInSeq(Lane(m.lanes, m.cols[i]), freshId);
      var j :| 0 <= j < |Lane(m.lanes, m.cols[i])| && Lane(m.lanes, m.cols[i])[j] == freshId;
      OccursInLanesWitness(m, freshId, i, j);
      assert OccursInLanes(m, freshId);
      assert freshId in m.cards;
      assert freshId < m.nextId;
    }
  }
}

module KanbanKernel refines Kernel {
  import D = KanbanDomain
}

module KanbanAppCore {
  import K = KanbanKernel
  import D = KanbanDomain

  function Init(): K.History {
    K.InitHistory()
  }

  // Action constructors
  function AddColumn(col: string, limit: nat): D.Action { D.AddColumn(col, limit) }
  function SetWip(col: string, limit: nat): D.Action { D.SetWip(col, limit) }
  function AddCard(col: string, title: string): D.Action { D.AddCard(col, title) }
  function MoveCard(id: nat, toCol: string, pos: int): D.Action { D.MoveCard(id, toCol, pos) }

  // State transitions
  function Dispatch(h: K.History, a: D.Action): K.History requires K.HistInv(h) { K.Do(h, a) }
  function Undo(h: K.History): K.History { K.Undo(h) }
  function Redo(h: K.History): K.History { K.Redo(h) }

  // Selectors
  function Present(h: K.History): D.Model { h.present }
  function CanUndo(h: K.History): bool { |h.past| > 0 }
  function CanRedo(h: K.History): bool { |h.future| > 0 }

  // Model accessors for JavaScript
  function GetCols(m: D.Model): seq<string> { m.cols }
  function GetLane(m: D.Model, col: string): seq<nat> { D.Lane(m.lanes, col) }
  function GetWip(m: D.Model, col: string): nat { D.Wip(m.wip, col) }
  function GetCardTitle(m: D.Model, id: nat): string {
    if id in m.cards then m.cards[id].title else ""
  }
}
