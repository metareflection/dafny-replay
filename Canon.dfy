module Canon {

  // ------------------------------------------------------------
  // Core goal (MVP):
  // - Nodes have center coordinates (int).
  // - UI selects a set/list of nodes (seq<NodeId> from React).
  // - Actions create first-class constraints: Align, EvenSpace.
  // - Canon = re-apply all constraints in order (deterministic).
  // - Ordering for EvenSpace is computed on the fly from geometry.
  // - Axis (X vs Y) is inferred from the selection.
  // ------------------------------------------------------------

  type NodeId = string

  datatype Node = Node(id: NodeId, x: int, y: int) // centers

  datatype Axis = X | Y

  datatype Constraint =
    | Align(cid: int, targets: seq<NodeId>, axis: Axis)
    | EvenSpace(cid: int, targets: seq<NodeId>, axis: Axis)

  datatype Model = Model(
    nodes: map<NodeId, Node>,
    constraints: seq<Constraint>,
    nextCid: int
  )

  // ----------------------------
  // Helper predicates for verification
  // ----------------------------

  predicate AllIn(xs: seq<NodeId>, nodes: map<NodeId, Node>) {
    forall i :: 0 <= i < |xs| ==> xs[i] in nodes
  }

  predicate ConstraintTargetsValid(c: Constraint, nodes: map<NodeId, Node>) {
    match c
    case Align(_, targets, _) => AllIn(targets, nodes)
    case EvenSpace(_, targets, _) => AllIn(targets, nodes)
  }

  predicate AllConstraintsValid(cs: seq<Constraint>, nodes: map<NodeId, Node>) {
    forall i :: 0 <= i < |cs| ==> ConstraintTargetsValid(cs[i], nodes)
  }

  ghost predicate Inv(m: Model) {
    AllConstraintsValid(m.constraints, m.nodes)
  }

  predicate Contains(xs: seq<NodeId>, x: NodeId) {
    exists i :: 0 <= i < |xs| && xs[i] == x
  }

  predicate Mentions(c: Constraint, x: NodeId) {
    match c
    case Align(_, targets, _) => Contains(targets, x)
    case EvenSpace(_, targets, _) => Contains(targets, x)
  }

  // If targets are all in nodes and don't contain x, they're still in nodes - {x}
  lemma AllInMinusLemma(targets: seq<NodeId>, nodes: map<NodeId, Node>, x: NodeId)
    requires AllIn(targets, nodes)
    requires !Contains(targets, x)
    ensures AllIn(targets, nodes - {x})
  {
    forall i | 0 <= i < |targets|
      ensures targets[i] in (nodes - {x})
    {
      assert targets[i] in nodes;
      assert targets[i] != x;
    }
  }

  lemma ConstraintValidMinusLemma(c: Constraint, nodes: map<NodeId, Node>, x: NodeId)
    requires ConstraintTargetsValid(c, nodes)
    requires !Mentions(c, x)
    ensures ConstraintTargetsValid(c, nodes - {x})
  {
    match c
    case Align(_, targets, _) => AllInMinusLemma(targets, nodes, x);
    case EvenSpace(_, targets, _) => AllInMinusLemma(targets, nodes, x);
  }

  predicate NoneMatch(cs: seq<Constraint>, x: NodeId) {
    forall i :: 0 <= i < |cs| ==> !Mentions(cs[i], x)
  }

  lemma AllConstraintsValidMinusLemma(cs: seq<Constraint>, nodes: map<NodeId, Node>, x: NodeId)
    requires AllConstraintsValid(cs, nodes)
    requires NoneMatch(cs, x)
    ensures AllConstraintsValid(cs, nodes - {x})
  {
    forall i | 0 <= i < |cs|
      ensures ConstraintTargetsValid(cs[i], nodes - {x})
    {
      ConstraintValidMinusLemma(cs[i], nodes, x);
    }
  }

  // ----------------------------
  // Axis-generic helpers (no v/h duplication)
  // ----------------------------

  function Coord(n: Node, axis: Axis): int {
    if axis == X then n.x else n.y
  }

  function SetCoord(n: Node, axis: Axis, v: int): Node {
    if axis == X then Node(n.id, v, n.y) else Node(n.id, n.x, v)
  }

  // ----------------------------
  // AppCore-like API
  // ----------------------------

  function Empty(): (result: Model)
    ensures Inv(result)
  {
    Model(map[], [], 0)
  }

  // Build from a seq of nodes (last writer wins on duplicate ids).
  function Init(ns: seq<Node>): (result: Model)
    ensures Inv(result)
  {
    Model(NodesFromSeq(ns), [], 0)
  }

  // UI passes selected ids (possibly with duplicates or missing).
  // Filter to present nodes to maintain Inv.
  function AddAlign(m: Model, sel: seq<NodeId>): (result: Model)
    requires Inv(m)
    ensures Inv(result)
  {
    var targets := FilterPresent(m.nodes, Dedup(sel));
    if |targets| <= 1 then m else
      var axis := InferAxis(m, targets);
      var c := Constraint.Align(m.nextCid, targets, axis);
      Model(m.nodes, m.constraints + [c], m.nextCid + 1)
  }

  function AddEvenSpace(m: Model, sel: seq<NodeId>): (result: Model)
    requires Inv(m)
    ensures Inv(result)
  {
    var targets := FilterPresent(m.nodes, Dedup(sel));
    if |targets| <= 2 then m else
      var axis := InferAxis(m, targets);
      var c := Constraint.EvenSpace(m.nextCid, targets, axis);
      Model(m.nodes, m.constraints + [c], m.nextCid + 1)
  }

  // Delete constraint by cid (first-class constraints).
  function DeleteConstraint(m: Model, cid: int): (result: Model)
    requires Inv(m)
    ensures Inv(result)
  {
    Model(m.nodes, FilterOutCid(m.constraints, cid, m.nodes), m.nextCid)
  }

  // Remove a node and shrink constraints that mention it (drop degenerate ones).
  function RemoveNode(m: Model, x: NodeId): (result: Model)
    requires Inv(m)
    ensures Inv(result)
  {
    if x !in m.nodes then m
    else
      var cs2 := ShrinkConstraints(m.constraints, x, 0, [], m.nodes);
      // cs2 constraints are still valid wrt old nodes, and none mention x
      var nodes2 := m.nodes - {x};
      AllConstraintsValidMinusLemma(cs2, m.nodes, x);
      Model(nodes2, cs2, m.nextCid)
  }

  // Canon = apply constraints sequentially, deterministic.
  function Canon(m: Model): (result: Model)
    requires Inv(m)
    ensures Inv(result)
  {
    ApplyAll(Model(m.nodes, m.constraints, m.nextCid), 0)
  }

  // ----------------------------
  // Constraint application
  // ----------------------------

  function ApplyAll(m: Model, i: nat): (result: Model)
    requires Inv(m)
    ensures Inv(result)
    decreases |m.constraints| - i
  {
    if i >= |m.constraints| then m
    else ApplyAll(ApplyOne(m, m.constraints[i]), i + 1)
  }

  function ApplyOne(m: Model, c: Constraint): (result: Model)
    requires Inv(m)
    requires ConstraintTargetsValid(c, m.nodes)
    ensures Inv(result)
  {
    match c
    case Align(_, targets, axis) =>
      Model(ApplyAlignNodes(m.nodes, targets, axis), m.constraints, m.nextCid)
    case EvenSpace(_, targets, axis) =>
      Model(ApplyEvenSpaceNodes(m.nodes, targets, axis), m.constraints, m.nextCid)
  }

  // Align: set Coord to mean anchor for all targets.
  function ApplyAlignNodes(nodes: map<NodeId, Node>, targets: seq<NodeId>, axis: Axis): (result: map<NodeId, Node>)
    requires AllIn(targets, nodes)
    ensures result.Keys == nodes.Keys
  {
    if |targets| == 0 then nodes
    else
      var anchor := MeanAlong(nodes, targets, axis);
      ApplyAlignNodesFrom(nodes, targets, axis, anchor, 0)
  }

  function ApplyAlignNodesFrom(nodes: map<NodeId, Node>, targets: seq<NodeId>, axis: Axis, anchor: int, i: nat): (result: map<NodeId, Node>)
    ensures result.Keys == nodes.Keys
    decreases |targets| - i
  {
    if i >= |targets| then nodes
    else
      var id := targets[i];
      if id in nodes then
        var n := nodes[id];
        var n2 := SetCoord(n, axis, anchor);
        ApplyAlignNodesFrom(nodes[id := n2], targets, axis, anchor, i + 1)
      else
        ApplyAlignNodesFrom(nodes, targets, axis, anchor, i + 1)
  }

  // EvenSpace:
  // 1) compute order on the fly by sorting by Coord along axis
  // 2) evenly space between endpoints (integer step)
  function ApplyEvenSpaceNodes(nodes: map<NodeId, Node>, targets: seq<NodeId>, axis: Axis): (result: map<NodeId, Node>)
    ensures result.Keys == nodes.Keys
  {
    var ordered := OrderTargets(nodes, targets, axis);
    if |ordered| <= 2 then nodes
    else
      // endpoints
      var a := Coord(nodes[ordered[0]], axis);
      var b := Coord(nodes[ordered[|ordered|-1]], axis);
      var k := |ordered|;
      var step := (b - a) / (k - 1); // int division, MVP
      ApplyEvenSpaceNodesFrom(nodes, ordered, axis, a, step, 0)
  }

  function ApplyEvenSpaceNodesFrom(nodes: map<NodeId, Node>, ordered: seq<NodeId>, axis: Axis, a: int, step: int, i: nat): (result: map<NodeId, Node>)
    requires AllIn(ordered, nodes)
    ensures result.Keys == nodes.Keys
    decreases |ordered| - i
  {
    if i >= |ordered| then nodes
    else
      var id := ordered[i];
      // Ordered list only contains ids in nodes (by construction of OrderTargets).
      var n := nodes[id];
      var pos := a + i * step;
      var n2 := SetCoord(n, axis, pos);
      ApplyEvenSpaceNodesFrom(nodes[id := n2], ordered, axis, a, step, i + 1)
  }

  // ----------------------------
  // Inference (shared by Align + EvenSpace)
  // ----------------------------

  // Axis inference: choose the “dominant” spread direction of the selection.
  // If spreadX >= spreadY => treat as row-ish, so align/space along Y (horizontal align).
  // Else => column-ish, align/space along X (vertical align).
  function InferAxis(m: Model, targets: seq<NodeId>): Axis {
    var rx := RangeAlong(m.nodes, targets, X);
    var ry := RangeAlong(m.nodes, targets, Y);
    if rx >= ry then Y else X
  }

  // Range along axis for ids that exist in nodes; 0 if <2 present.
  function RangeAlong(nodes: map<NodeId, Node>, targets: seq<NodeId>, axis: Axis): int {
    var present := FilterPresent(nodes, Dedup(targets));
    if |present| <= 1 then 0
    else
      var mn := MinAlong(nodes, present, axis);
      var mx := MaxAlong(nodes, present, axis);
      mx - mn
  }

  // ----------------------------
  // Ordering on the fly
  // ----------------------------

  // Returns ids that (1) exist in nodes, (2) are deduped, (3) sorted by Coord(axis) asc.
  function OrderTargets(nodes: map<NodeId, Node>, targets: seq<NodeId>, axis: Axis): (result: seq<NodeId>)
    ensures AllIn(result, nodes)
  {
    var present := FilterPresent(nodes, Dedup(targets));
    InsertionSortByAxis(nodes, present, axis, 0, [])
  }

  // Insertion sort (O(n^2), fine for MVP diagrams).
  function InsertionSortByAxis(nodes: map<NodeId, Node>, xs: seq<NodeId>, axis: Axis, i: nat, acc: seq<NodeId>): (result: seq<NodeId>)
    requires AllIn(xs, nodes)
    requires AllIn(acc, nodes)
    ensures AllIn(result, nodes)
    decreases |xs| - i
  {
    if i >= |xs| then acc
    else
      var id := xs[i];
      var acc2 := InsertByAxis(nodes, acc, id, axis);
      InsertionSortByAxis(nodes, xs, axis, i + 1, acc2)
  }

  // Insert id into already-sorted acc.
  function InsertByAxis(nodes: map<NodeId, Node>, acc: seq<NodeId>, id: NodeId, axis: Axis): (result: seq<NodeId>)
    requires id in nodes
    requires AllIn(acc, nodes)
    ensures AllIn(result, nodes)
  {
    InsertByAxisFrom(nodes, acc, id, axis, 0)
  }

  function InsertByAxisFrom(nodes: map<NodeId, Node>, acc: seq<NodeId>, id: NodeId, axis: Axis, i: nat): (result: seq<NodeId>)
    requires id in nodes
    requires AllIn(acc, nodes)
    ensures AllIn(result, nodes)
    decreases |acc| - i
  {
    if i >= |acc| then acc + [id]
    else
      var a := acc[i];
      if Coord(nodes[id], axis) <= Coord(nodes[a], axis)
      then acc[..i] + [id] + acc[i..]
      else InsertByAxisFrom(nodes, acc, id, axis, i + 1)
  }

  // ----------------------------
  // Sequence utilities (executable-friendly)
  // ----------------------------

  // Remove all occurrences of x from xs.
  function RemoveFromSeq(xs: seq<NodeId>, x: NodeId, nodes: map<NodeId, Node>): (result: seq<NodeId>)
    requires AllIn(xs, nodes)
    ensures !Contains(result, x)
    ensures AllIn(result, nodes)
  {
    RemoveFromSeqFrom(xs, x, 0, [], nodes)
  }

  function RemoveFromSeqFrom(xs: seq<NodeId>, x: NodeId, i: nat, acc: seq<NodeId>, nodes: map<NodeId, Node>): (result: seq<NodeId>)
    requires AllIn(xs, nodes)
    requires AllIn(acc, nodes)
    requires !Contains(acc, x)
    ensures !Contains(result, x)
    ensures AllIn(result, nodes)
    decreases |xs| - i
  {
    if i >= |xs| then acc
    else if xs[i] == x
         then RemoveFromSeqFrom(xs, x, i + 1, acc, nodes)
         else RemoveFromSeqFrom(xs, x, i + 1, acc + [xs[i]], nodes)
  }

  // Deduplicate while preserving first occurrence order.
  function Dedup(xs: seq<NodeId>): seq<NodeId> {
    DedupFrom(xs, 0, {}, [])
  }

  function DedupFrom(xs: seq<NodeId>, i: nat, seen: set<NodeId>, acc: seq<NodeId>): seq<NodeId>
    decreases |xs| - i
  {
    if i >= |xs| then acc
    else
      var x := xs[i];
      if x in seen
      then DedupFrom(xs, i + 1, seen, acc)
      else DedupFrom(xs, i + 1, seen + {x}, acc + [x])
  }

  // Keep only ids that exist in nodes (preserve order).
  function FilterPresent(nodes: map<NodeId, Node>, xs: seq<NodeId>): (result: seq<NodeId>)
    ensures AllIn(result, nodes)
  {
    FilterPresentFrom(nodes, xs, 0, [])
  }

  function FilterPresentFrom(nodes: map<NodeId, Node>, xs: seq<NodeId>, i: nat, acc: seq<NodeId>): (result: seq<NodeId>)
    requires AllIn(acc, nodes)
    ensures AllIn(result, nodes)
    decreases |xs| - i
  {
    if i >= |xs| then acc
    else
      var x := xs[i];
      if x in nodes
      then FilterPresentFrom(nodes, xs, i + 1, acc + [x])
      else FilterPresentFrom(nodes, xs, i + 1, acc)
  }

  // Build nodes map from seq.
  function NodesFromSeq(ns: seq<Node>): map<NodeId, Node> {
    NodesFromSeqFrom(ns, 0, map[])
  }

  function NodesFromSeqFrom(ns: seq<Node>, i: nat, acc: map<NodeId, Node>): map<NodeId, Node>
    decreases |ns| - i
  {
    if i >= |ns| then acc
    else
      var n := ns[i];
      NodesFromSeqFrom(ns, i + 1, acc[n.id := n])
  }

  // Filter out constraint id
  function FilterOutCid(cs: seq<Constraint>, cid: int, nodes: map<NodeId, Node>): (result: seq<Constraint>)
    requires AllConstraintsValid(cs, nodes)
    ensures AllConstraintsValid(result, nodes)
  {
    FilterOutCidFrom(cs, cid, 0, [], nodes)
  }

  function FilterOutCidFrom(cs: seq<Constraint>, cid: int, i: nat, acc: seq<Constraint>, nodes: map<NodeId, Node>): (result: seq<Constraint>)
    requires AllConstraintsValid(cs, nodes)
    requires AllConstraintsValid(acc, nodes)
    ensures AllConstraintsValid(result, nodes)
    decreases |cs| - i
  {
    if i >= |cs| then acc
    else
      var c := cs[i];
      if CidOf(c) == cid then
        FilterOutCidFrom(cs, cid, i + 1, acc, nodes)
      else
        FilterOutCidFrom(cs, cid, i + 1, acc + [c], nodes)
  }

  function CidOf(c: Constraint): int {
    match c
    case Align(cid, _, _) => cid
    case EvenSpace(cid, _, _) => cid
  }

  // Shrink one constraint by removing x from targets; return (keep, shrunken)
  // Drop if too small (Align needs >=2, EvenSpace needs >=3)
  function ShrinkConstraint(c: Constraint, x: NodeId, nodes: map<NodeId, Node>): (result: (bool, Constraint))
    requires ConstraintTargetsValid(c, nodes)
    // If kept, doesn't mention x and is still valid
    ensures result.0 ==> !Mentions(result.1, x)
    ensures result.0 ==> ConstraintTargetsValid(result.1, nodes)
  {
    match c
    case Align(cid, targets, axis) =>
      var t2 := RemoveFromSeq(targets, x, nodes);
      if |t2| < 2 then (false, c) else (true, Align(cid, t2, axis))
    case EvenSpace(cid, targets, axis) =>
      var t2 := RemoveFromSeq(targets, x, nodes);
      if |t2| < 3 then (false, c) else (true, EvenSpace(cid, t2, axis))
  }

  // Shrink all constraints, dropping degenerate ones
  function ShrinkConstraints(cs: seq<Constraint>, x: NodeId, i: nat, acc: seq<Constraint>, nodes: map<NodeId, Node>): (result: seq<Constraint>)
    requires AllConstraintsValid(cs, nodes)
    requires AllConstraintsValid(acc, nodes)
    requires NoneMatch(acc, x)
    ensures AllConstraintsValid(result, nodes)
    ensures NoneMatch(result, x)
    decreases |cs| - i
  {
    if i >= |cs| then acc
    else
      var c := cs[i];
      var (keep, c2) := ShrinkConstraint(c, x, nodes);
      // c2 targets are a subsequence of c targets, so still in nodes
      if keep
      then ShrinkConstraints(cs, x, i + 1, acc + [c2], nodes)
      else ShrinkConstraints(cs, x, i + 1, acc, nodes)
  }

  // Min/Max along an axis for a non-empty seq of ids present in nodes.
  // (For MVP we assume caller ensured non-empty and present.)
  function MinAlong(nodes: map<NodeId, Node>, xs: seq<NodeId>, axis: Axis): int
    requires |xs| > 0
    requires AllIn(xs, nodes)
  {
    MinAlongFrom(nodes, xs, axis, 1, Coord(nodes[xs[0]], axis))
  }

  function MinAlongFrom(nodes: map<NodeId, Node>, xs: seq<NodeId>, axis: Axis, i: nat, cur: int): int
    requires AllIn(xs, nodes)
    decreases |xs| - i
  {
    if i >= |xs| then cur
    else
      var v := Coord(nodes[xs[i]], axis);
      MinAlongFrom(nodes, xs, axis, i + 1, if v < cur then v else cur)
  }

  function MaxAlong(nodes: map<NodeId, Node>, xs: seq<NodeId>, axis: Axis): int
    requires |xs| > 0
    requires AllIn(xs, nodes)
  {
    MaxAlongFrom(nodes, xs, axis, 1, Coord(nodes[xs[0]], axis))
  }

  function MaxAlongFrom(nodes: map<NodeId, Node>, xs: seq<NodeId>, axis: Axis, i: nat, cur: int): int
    requires AllIn(xs, nodes)
    decreases |xs| - i
  {
    if i >= |xs| then cur
    else
      var v := Coord(nodes[xs[i]], axis);
      MaxAlongFrom(nodes, xs, axis, i + 1, if v > cur then v else cur)
  }

  function SumAlong(nodes: map<NodeId, Node>, xs: seq<NodeId>, axis: Axis): int
    requires |xs| > 0
    requires AllIn(xs, nodes)
  {
    SumAlongFrom(nodes, xs, axis, 0, 0)
  }

  function SumAlongFrom(nodes: map<NodeId, Node>, xs: seq<NodeId>, axis: Axis, i: nat, acc: int): int
    requires AllIn(xs, nodes)
    decreases |xs| - i
  {
    if i >= |xs| then acc
    else SumAlongFrom(nodes, xs, axis, i + 1, acc + Coord(nodes[xs[i]], axis))
  }

  function MeanAlong(nodes: map<NodeId, Node>, xs: seq<NodeId>, axis: Axis): int
    requires |xs| > 0
    requires AllIn(xs, nodes)
  {
    SumAlong(nodes, xs, axis) / |xs|
  }
}
