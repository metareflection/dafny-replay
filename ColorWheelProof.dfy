include "ColorWheelSpec.dfy"

module ColorWheelProof {
  import opened CWSpec = ColorWheelSpec

  lemma {:axiom} StepPreservesInv(m: Model, a: Action)
    ensures Inv(m) ==> Inv(Apply(m, a))
  {
    // TODO: Actual proof here
  }
}
