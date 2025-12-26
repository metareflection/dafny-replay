include "ColorWheelSpec.dfy"

module ColorWheelProof {
  import opened CWSpec = ColorWheelSpec

  lemma StepPreservesInv(m: Model, a: Action)
  requires Inv(m)
  ensures Inv(Normalize(Apply(m, a)))
  {
    assume {:axiom} false;// TODO: Actual proof here
  }
}
