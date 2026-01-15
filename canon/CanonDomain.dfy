include "../kernels/Replay.dfy"
include "Canon.dfy"

module CanonDomain refines Domain {
  import C = Canon

  type Model = C.Model

  datatype Action =
    | AddNode(id: C.NodeId, x: int, y: int)
    | AddAlign(sel: seq<C.NodeId>)
    | AddEvenSpace(sel: seq<C.NodeId>)
    | AddEdge(from: C.NodeId, to: C.NodeId)
    | DeleteConstraint(cid: int)
    | DeleteEdge(from: C.NodeId, to: C.NodeId)
    | RemoveNode(nodeId: C.NodeId)
    | MoveNode(id: C.NodeId, newX: int, newY: int)

  predicate Inv(m: Model) {
    C.Inv(m)
  }

  function Init(): Model {
    C.Empty()
  }

  function Apply(m: Model, a: Action): Model {
    match a
    case AddNode(id, x, y) =>
      AddNodeImpl(m, id, x, y)
    case AddAlign(sel) =>
      C.AddAlign(m, sel)
    case AddEvenSpace(sel) =>
      C.AddEvenSpace(m, sel)
    case AddEdge(from, to) =>
      C.AddEdge(m, from, to)
    case DeleteConstraint(cid) =>
      C.DeleteConstraint(m, cid)
    case DeleteEdge(from, to) =>
      C.DeleteEdge(m, from, to)
    case RemoveNode(nodeId) =>
      C.RemoveNode(m, nodeId)
    case MoveNode(id, newX, newY) =>
      MoveNodeImpl(m, id, newX, newY)
  }

  // Helper: add a node (if id not already present)
  function AddNodeImpl(m: Model, id: C.NodeId, x: int, y: int): Model
  {
    if id in m.nodes then m
    else
      var n := C.Node(id, x, y);
      C.Model(m.nodes[id := n], m.edges, m.constraints, m.nextCid)
  }

  lemma AddNodeImplPreservesInv(m: Model, id: C.NodeId, x: int, y: int)
    requires C.Inv(m)
    ensures C.Inv(AddNodeImpl(m, id, x, y))
  {
  }

  // Helper: move a node to new coordinates
  function MoveNodeImpl(m: Model, id: C.NodeId, newX: int, newY: int): Model
  {
    if id !in m.nodes then m
    else
      var n := C.Node(id, newX, newY);
      C.Model(m.nodes[id := n], m.edges, m.constraints, m.nextCid)
  }

  lemma MoveNodeImplPreservesInv(m: Model, id: C.NodeId, newX: int, newY: int)
    requires C.Inv(m)
    ensures C.Inv(MoveNodeImpl(m, id, newX, newY))
  {
  }

  // Normalize is identity - Canon is called separately (outside Replay)
  function Normalize(m: Model): Model {
    m
  }

  lemma InitSatisfiesInv()
    ensures Inv(Init())
  {
  }

  lemma StepPreservesInv(m: Model, a: Action)
  {
    match a
    case AddNode(id, x, y) =>
      AddNodeImplPreservesInv(m, id, x, y);
    case AddAlign(sel) =>
      C.AddAlignPreservesInv(m, sel);
    case AddEvenSpace(sel) =>
      C.AddEvenSpacePreservesInv(m, sel);
    case AddEdge(from, to) =>
      C.AddEdgePreservesInv(m, from, to);
    case DeleteConstraint(cid) =>
      C.DeleteConstraintPreservesInv(m, cid);
    case DeleteEdge(from, to) =>
      C.DeleteEdgePreservesInv(m, from, to);
    case RemoveNode(nodeId) =>
      C.RemoveNodePreservesInv(m, nodeId);
    case MoveNode(id, newX, newY) =>
      MoveNodeImplPreservesInv(m, id, newX, newY);
  }
}

module CanonKernel refines Kernel {
  import D = CanonDomain
}

module AppCore {
  import K = CanonKernel
  import D = CanonDomain
  import C = Canon

  // Initialize empty canvas
  function Init(): K.History {
    K.InitHistory()
  }

  // Action constructors
  function AddNode(id: C.NodeId, x: int, y: int): D.Action {
    D.AddNode(id, x, y)
  }

  function AddAlign(sel: seq<C.NodeId>): D.Action {
    D.AddAlign(sel)
  }

  function AddEvenSpace(sel: seq<C.NodeId>): D.Action {
    D.AddEvenSpace(sel)
  }

  function AddEdge(from: C.NodeId, to: C.NodeId): D.Action {
    D.AddEdge(from, to)
  }

  function DeleteConstraint(cid: int): D.Action {
    D.DeleteConstraint(cid)
  }

  function DeleteEdge(from: C.NodeId, to: C.NodeId): D.Action {
    D.DeleteEdge(from, to)
  }

  function RemoveNode(x: C.NodeId): D.Action {
    D.RemoveNode(x)
  }

  function MoveNode(id: C.NodeId, newX: int, newY: int): D.Action {
    D.MoveNode(id, newX, newY)
  }

  // State transitions
  function Dispatch(h: K.History, a: D.Action): K.History requires K.HistInv(h) { K.Do(h, a) }
  function Undo(h: K.History): K.History { K.Undo(h) }
  function Redo(h: K.History): K.History { K.Redo(h) }

  // Apply Canon to the present model, preserving history
  function CanonHistory(h: K.History): K.History
    requires K.HistInv(h)
    ensures K.HistInv(CanonHistory(h))
  {
    K.History(h.past, C.Canon(h.present), h.future)
  }

  // Selectors
  function Present(h: K.History): D.Model { h.present }
  function CanUndo(h: K.History): bool { |h.past| > 0 }
  function CanRedo(h: K.History): bool { |h.future| > 0 }

  // Convenience accessors for the model
  function Nodes(h: K.History): map<C.NodeId, C.Node> { h.present.nodes }
  function Edges(h: K.History): seq<C.Edge> { h.present.edges }
  function Constraints(h: K.History): seq<C.Constraint> { h.present.constraints }
}
