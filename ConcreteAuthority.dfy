include "Authority.dfy"

module ConcreteDomain refines Domain {
  type Model = int
  datatype Action = Inc | Dec

  predicate Inv(m: Model) { m >= 0 }

  function TryStep(m: Model, a: Action): TryStepResult {
    match a
      case Inc => Ok(m + 1)
      case Dec =>
        if m == 0 then Invalid("cannot decrement at 0")
        else Ok(m - 1)
  }

  lemma TryStepOkPreservesInv(m: Model, a: Action)
  {
  }
}

module ConcreteServer refines ServerKernel {
  import D = ConcreteDomain
}
