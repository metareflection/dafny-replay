# ColorWheel Verification Status

## Proven (Dafny-verified)

| Property | Location | Description |
|----------|----------|-------------|
| `StepPreservesInv` | ColorWheelProof.dfy | `Inv(m) ==> Inv(Normalize(Apply(m, a)))` for all actions |
| `ValidBaseHue` | via Normalize | Base hue always in [0, 360) |
| `ValidColors` | via Normalize | All 5 colors have valid h/s/l ranges |
| `ValidContrastPair` | via Normalize | Contrast indices in [0, 5) |
| `MoodConstraint` | via Normalize | Non-Custom mood implies all colors satisfy it |
| `HarmonyConstraint` | via Normalize | Non-Custom harmony implies hues match pattern |

## Not Proven (shipped as-is)

| Property | Reason |
|----------|--------|
| Initial state satisfies `Inv` | No `InitModel` function in spec |
| `Apply` preserves specific semantics | Only proven that `Normalize` repairs any violations |
| Generated JS matches Dafny semantics | Translation trusted, not verified |
| UI correctly calls spec functions | Runtime integration not verified |

## Key Insight

The proof relies on `Normalize` being a "repair" function - it forces the invariant to hold by:
- Clamping values to valid ranges
- Falling back to `Custom` mood/harmony when constraints are violated

This means `Apply` can produce arbitrary intermediate states; `Normalize` always fixes them.
