abstract module {:compile false} Domain {
  type Model
  type Action

  ghost predicate Inv(m: Model)

  function Apply(m: Model, a: Action): Model
  function Normalize(m: Model): Model

  lemma StepPreservesInv(m: Model, a: Action)
    requires Inv(m)
    ensures Inv(Normalize(Apply(m,a)))
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

  ghost predicate HistInv(h: History) {
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

