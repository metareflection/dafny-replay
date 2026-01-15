include "../kernels/Replay.dfy"

module CounterDomain refines Domain {
  type Model = int

  datatype Action = Inc | Dec

  predicate Inv(m: Model) {
    m >= 0
  }

  function Init(): Model {
    0
  }

  function Apply(m: Model, a: Action): Model {
    match a
    case Inc => m + 1
    case Dec => m - 1
  }

  function Normalize(m: Model): Model {
    if m < 0 then 0 else m
  }

  lemma InitSatisfiesInv()
    ensures Inv(Init())
  {
  }

  lemma StepPreservesInv(m: Model, a: Action)
    ensures Inv(Normalize(Apply(m, a)))
  {
  }
}

module CounterKernel refines Kernel {
  import D = CounterDomain
}

module AppCore {
  import K = CounterKernel
  import D = CounterDomain

  function Init(): K.History { K.InitHistory() }

  function Inc(): D.Action { D.Inc }
  function Dec(): D.Action { D.Dec }

  function Dispatch(h: K.History, a: D.Action): K.History requires K.HistInv(h) { K.Do(h, a) }
  function Undo(h: K.History): K.History { K.Undo(h) }
  function Redo(h: K.History): K.History { K.Redo(h) }

  function Present(h: K.History): D.Model { h.present }
  function CanUndo(h: K.History): bool { |h.past| > 0 }
  function CanRedo(h: K.History): bool { |h.future| > 0 }
}

module AppCoreTest {
  import A = AppCore
  import D = CounterDomain

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
