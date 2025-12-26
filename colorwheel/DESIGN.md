# ColorWheel Design Decisions

## 1. Padding Strategy ✓

For harmonies with < 5 base hues, we repeat base hues to fill to 5:

- **Complementary** (2 base): `[H₀, H₀+180°, H₀, H₀+180°, H₀]` — 3 variations
- **Triadic** (3 base): `[H₀, H₀+120°, H₀+240°, H₀, H₀+120°]` — 2 variations
- **Square** (4 base): `[H₀, H₀+90°, H₀+180°, H₀+270°, H₀]` — 1 variation
- **Analogous** (5 base): `[H₀-30°, H₀-15°, H₀, H₀+15°, H₀+30°]` — naturally 5

Then for each hue, we generate S/L values that satisfy the mood using random values within mood bounds.

**Decision**: This approach is confirmed.

## 2. Color Generation ✓

`GenerateColorForHue(h, mood, seedS, seedL)` uses random seeds to pick S and L values within the mood's bounds:

- Each mood defines (minS, maxS, minL, maxL) bounds
- Two random seeds (integers 0-100) per color are used to pick S and L within these bounds
- This ensures all colors satisfy the mood while having random diversity

**Implementation**:
- `GeneratePalette` action takes a `randomSeeds: seq<int>` parameter (10 values, 2 per color)
- JavaScript layer provides truly random values
- Dafny verification uses these deterministic seeds

**Decision**: Random generation within mood bounds is implemented.

## 3. Custom Harmony Behavior ✓

When `harmony == Custom`, we fall back to using `baseHue` for all 5 colors (monochromatic).

**Decision**: Monochromatic fallback is confirmed.

## 4. Adjustment Behavior ✓

### Linked Mode:
- Adjusting color `i` means adjusting ALL colors
- `deltaH`: Shift `baseHue` by delta, regenerate all hues (harmony preserved)
- `deltaS`, `deltaL`: Add delta to ALL colors' S/L, then clamp to [0, 100]
- If any color breaks mood bounds after adjustment → switch to `Custom` mood
- Harmony is preserved (since we shift baseHue, not individual hues)

### Independent Mode:
- Adjust only color `i`
- If adjusted hue ≠ expected harmony hue → switch to `Custom` harmony
- If adjusted S/L breaks mood bounds → switch to `Custom` mood
- All other colors remain unchanged

**Decision**: Confirmed.

## 5. SetColorDirect Behavior ✓

When directly setting a color (e.g., from a color picker):
- **Try to preserve mood/harmony** if the new color happens to satisfy them
- When switching to Custom (mood or harmony), **preserve all other colors as-is**
- Only the color being changed should change

**Decision**: Preserve structure when possible, confirmed.
