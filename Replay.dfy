abstract module {:compile false} Domain {
  type Model
  type Action

  predicate Inv(m: Model)

  function Apply(m: Model, a: Action): Model
  function Normalize(m: Model): Model

  lemma StepPreservesInv(m: Model, a: Action)
    requires Inv(m)
    ensures Inv(Normalize(Apply(m,a)))
}

module ConcreteDomain refines Domain {
  type Model = int

  datatype Action = Inc | Dec

  predicate Inv(m: Model) {
    m >= 0
  }

  function Apply(m: Model, a: Action): Model {
    match a
    case Inc => m + 1
    case Dec => m - 1
  }

  function Normalize(m: Model): Model {
    if m < 0 then 0 else m
  }

  lemma StepPreservesInv(m: Model, a: Action)
    ensures Inv(Normalize(Apply(m, a)))
  {
  }
}

abstract module {:compile false} Kernel {
  import D : Domain

  function Step(m: D.Model, a: D.Action): D.Model {
    D.Normalize(D.Apply(m, a))
  }

  datatype History =
    History(past: seq<D.Model>, present: D.Model, future: seq<D.Model>)

  function Do(h: History, a: D.Action): History {
    History(h.past + [h.present], Step(h.present, a), [])
  }

  function Undo(h: History): History {
    if |h.past| == 0 then h
    else
      var i := |h.past| - 1;
      History(h.past[..i], h.past[i], [h.present] + h.future)
  }

  function Redo(h: History): History {
    if |h.future| == 0 then h
    else
      History(h.past + [h.present], h.future[0], h.future[1..])
  }

  lemma DoPreservesInv(h: History, a: D.Action)
    requires D.Inv(h.present)
    ensures  D.Inv(Do(h, a).present)
  {
    D.StepPreservesInv(h.present, a);
  }

  predicate HistInv(h: History) {
    (forall i | 0 <= i < |h.past| :: D.Inv(h.past[i])) &&
    D.Inv(h.present) &&
    (forall j | 0 <= j < |h.future| :: D.Inv(h.future[j]))
  }

  lemma UndoPreservesHistInv(h: History)
    requires HistInv(h)
    ensures  HistInv(Undo(h))
  {
  }

  lemma RedoPreservesHistInv(h: History)
    requires HistInv(h)
    ensures  HistInv(Redo(h))
  {
  }

  lemma DoPreservesHistInv(h: History, a: D.Action)
    requires HistInv(h)
    ensures  HistInv(Do(h, a))
  {
    D.StepPreservesInv(h.present, a);
  }
}

module ConcreteKernel refines Kernel {
  import D = ConcreteDomain
}

module AppCore {
  import K = ConcreteKernel
  import D = ConcreteDomain

  function Init(): K.History { K.History([], 0, []) }

  // Action constructors (React calls these)
  function Inc(): D.Action { D.Inc }
  function Dec(): D.Action { D.Dec }

  function Dispatch(h: K.History, a: D.Action): K.History { K.Do(h, a) }
  function Undo(h: K.History): K.History { K.Undo(h) }
  function Redo(h: K.History): K.History { K.Redo(h) }

  // UI selectors (React calls these)
  function Present(h: K.History): D.Model { h.present }
  function CanUndo(h: K.History): bool { |h.past| > 0 }
  function CanRedo(h: K.History): bool { |h.future| > 0 }
}

module AppCoreTest {
  import A = AppCore
  import D = ConcreteDomain

  method Test() {
    var h := A.Init();
    h := A.Dispatch(h, D.Dec);
    assert A.Present(h) == 0;
    h := A.Dispatch(h, D.Inc);
    assert A.Present(h) == 1;
    h := A.Undo(h);
    assert A.Present(h) == 0;
    h := A.Redo(h);
    assert A.Present(h) == 1;
  }
}
