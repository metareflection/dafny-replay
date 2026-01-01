include "ColorWheelSpec.dfy"

module ColorWheelSanity {
  import opened ColorWheelSpec

  // ============================================================================
  // NoOp Case Predicates
  // ============================================================================
  // These are ALL the cases where Apply(m, a) == m

  // --- Invalid Input Cases (guard failures) ---

  // Case 1: GeneratePalette with invalid parameters
  predicate NoOpGeneratePaletteInvalid(a: Action) {
    a.GeneratePalette? &&
    (!ValidBaseHue(a.baseHue) || !ValidRandomSeeds(a.randomSeeds))
  }

  // Case 2: AdjustColor with invalid index
  predicate NoOpAdjustColorInvalidIndex(a: Action) {
    a.AdjustColor? && (a.index < 0 || a.index >= 5)
  }

  // Case 3: SelectContrastPair with invalid indices
  predicate NoOpSelectContrastPairInvalid(a: Action) {
    a.SelectContrastPair? &&
    !(0 <= a.fg < 5 && 0 <= a.bg < 5)
  }

  // Case 4: SetColorDirect with invalid index
  predicate NoOpSetColorDirectInvalidIndex(a: Action) {
    a.SetColorDirect? && (a.index < 0 || a.index >= 5)
  }

  // Case 5: RegenerateMood with invalid randomSeeds
  predicate NoOpRegenerateMoodInvalid(a: Action) {
    a.RegenerateMood? && !ValidRandomSeeds(a.randomSeeds)
  }

  // Case 6: RegenerateHarmony with invalid randomSeeds
  predicate NoOpRegenerateHarmonyInvalid(a: Action) {
    a.RegenerateHarmony? && !ValidRandomSeeds(a.randomSeeds)
  }

  // Case 7: RandomizeBaseHue with invalid parameters
  predicate NoOpRandomizeBaseHueInvalid(a: Action) {
    a.RandomizeBaseHue? &&
    (!ValidBaseHue(a.newBaseHue) || !ValidRandomSeeds(a.randomSeeds))
  }

  // --- Zero-Effect Cases (operation produces identical result) ---

  // Case 8: AdjustColor with zero deltas (color already valid by invariant)
  predicate NoOpAdjustColorZeroDeltas(a: Action) {
    a.AdjustColor? &&
    0 <= a.index < 5 &&
    a.deltaH == 0 && a.deltaS == 0 && a.deltaL == 0
  }

  // Case 9: AdjustPalette with zero deltas
  predicate NoOpAdjustPaletteZeroDeltas(a: Action) {
    a.AdjustPalette? &&
    a.deltaH == 0 && a.deltaS == 0 && a.deltaL == 0
  }

  // Case 10: SelectContrastPair with same pair as current
  predicate NoOpSelectContrastPairSame(m: Model, a: Action) {
    a.SelectContrastPair? &&
    0 <= a.fg < 5 && 0 <= a.bg < 5 &&
    m.contrastPair == (a.fg, a.bg)
  }

  // Case 11: SetColorDirect where clamped color equals existing (and modes preserved)
  predicate NoOpSetColorDirectSameColor(m: Model, a: Action)
    requires |m.colors| == 5
  {
    a.SetColorDirect? &&
    0 <= a.index < 5 &&
    ClampColor(a.color) == m.colors[a.index] &&
    // Harmony preserved
    (m.harmony == Harmony.Custom ||
      (var expectedHues := AllHarmonyHues(m.baseHue, m.harmony);
       |expectedHues| == 5 && ClampColor(a.color).h == expectedHues[a.index])) &&
    // Mood preserved
    (m.mood == Mood.Custom || ColorSatisfiesMood(ClampColor(a.color), m.mood))
  }

  // Case 12: AdjustColor with non-zero deltas but clamping produces same color
  // (e.g., color at S=100, deltaS=+10 -> still S=100)
  predicate NoOpAdjustColorClampedSame(m: Model, a: Action)
    requires |m.colors| == 5
  {
    a.AdjustColor? &&
    0 <= a.index < 5 &&
    var oldColor := m.colors[a.index];
    var newColor := ClampColor(Color(oldColor.h + a.deltaH, oldColor.s + a.deltaS, oldColor.l + a.deltaL));
    newColor == oldColor &&
    // Harmony not broken (hue didn't change conceptually)
    (m.harmony == Harmony.Custom ||
      (var expectedHues := AllHarmonyHues(m.baseHue, m.harmony);
       |expectedHues| == 5 && newColor.h == expectedHues[a.index])) &&
    // Mood not broken
    (m.mood == Mood.Custom || ColorSatisfiesMood(newColor, m.mood))
  }

  // --- Coincidental Match Cases (regeneration happens to produce same result) ---

  // Case 13: GeneratePalette that happens to produce identical model
  predicate NoOpGeneratePaletteCoincidental(m: Model, a: Action)
    requires Inv(m)
  {
    a.GeneratePalette? &&
    ValidBaseHue(a.baseHue) && ValidRandomSeeds(a.randomSeeds) &&
    m.baseHue == a.baseHue &&
    m.mood == a.mood &&
    m.harmony == a.harmony &&
    m.colors == GeneratePaletteColors(a.baseHue, a.mood, a.harmony, a.randomSeeds) &&
    m.adjustmentH == 0 && m.adjustmentS == 0 && m.adjustmentL == 0
  }

  // Case 14: RegenerateMood that happens to produce identical model
  predicate NoOpRegenerateMoodCoincidental(m: Model, a: Action)
    requires Inv(m)
  {
    a.RegenerateMood? &&
    ValidRandomSeeds(a.randomSeeds) &&
    m.mood == a.mood &&
    m.colors == GeneratePaletteColors(m.baseHue, a.mood, m.harmony, a.randomSeeds) &&
    m.adjustmentH == 0 && m.adjustmentS == 0 && m.adjustmentL == 0
  }

  // Case 15: RegenerateHarmony that happens to produce identical model
  predicate NoOpRegenerateHarmonyCoincidental(m: Model, a: Action)
    requires Inv(m)
  {
    a.RegenerateHarmony? &&
    ValidRandomSeeds(a.randomSeeds) &&
    m.harmony == a.harmony &&
    m.colors == GeneratePaletteColors(m.baseHue, m.mood, a.harmony, a.randomSeeds) &&
    m.adjustmentH == 0 && m.adjustmentS == 0 && m.adjustmentL == 0
  }

  // Case 16: RandomizeBaseHue that happens to produce identical model
  predicate NoOpRandomizeBaseHueCoincidental(m: Model, a: Action)
    requires Inv(m)
  {
    a.RandomizeBaseHue? &&
    ValidBaseHue(a.newBaseHue) && ValidRandomSeeds(a.randomSeeds) &&
    m.baseHue == a.newBaseHue &&
    m.colors == GeneratePaletteColors(a.newBaseHue, m.mood, m.harmony, a.randomSeeds) &&
    m.adjustmentH == 0 && m.adjustmentS == 0 && m.adjustmentL == 0
  }

  // ============================================================================
  // Main Predicate: Complete enumeration of all NoOp cases
  // ============================================================================

  predicate IsNoOp(m: Model, a: Action)
    requires Inv(m)
  {
    // Invalid input cases
    NoOpGeneratePaletteInvalid(a) ||
    NoOpAdjustColorInvalidIndex(a) ||
    NoOpSelectContrastPairInvalid(a) ||
    NoOpSetColorDirectInvalidIndex(a) ||
    NoOpRegenerateMoodInvalid(a) ||
    NoOpRegenerateHarmonyInvalid(a) ||
    NoOpRandomizeBaseHueInvalid(a) ||
    // Zero-effect cases
    NoOpAdjustColorZeroDeltas(a) ||
    NoOpAdjustPaletteZeroDeltas(a) ||
    NoOpSelectContrastPairSame(m, a) ||
    NoOpSetColorDirectSameColor(m, a) ||
    NoOpAdjustColorClampedSame(m, a) ||
    // Coincidental match cases
    NoOpGeneratePaletteCoincidental(m, a) ||
    NoOpRegenerateMoodCoincidental(m, a) ||
    NoOpRegenerateHarmonyCoincidental(m, a) ||
    NoOpRandomizeBaseHueCoincidental(m, a)
  }

  // ============================================================================
  // Helper Lemmas
  // ============================================================================

  // Helper lemma: ClampColor is idempotent on valid colors
  lemma ClampColorIdempotent(c: Color)
    requires ValidColor(c)
    ensures ClampColor(c) == c
  {
    assert 0 <= c.h < 360;
    assert c.h % 360 == c.h;
    assert NormalizeHue(c.h) == c.h;
    assert Clamp(c.s, 0, 100) == c.s;
    assert Clamp(c.l, 0, 100) == c.l;
  }

  // Helper lemma: AdjustColor with zero deltas is a NoOp
  lemma AdjustColorZeroDeltasIsNoOp(m: Model, index: int)
    requires Inv(m)
    requires 0 <= index < 5
    ensures Apply(m, AdjustColor(index, 0, 0, 0)) == m
  {
    var oldColor := m.colors[index];
    assert ValidColor(oldColor);
    ClampColorIdempotent(oldColor);

    var newColor := ClampColor(Color(oldColor.h, oldColor.s, oldColor.l));
    assert newColor == oldColor;

    var expectedHues := AllHarmonyHues(m.baseHue, m.harmony);
    if |expectedHues| == 5 {
      assert HuesMatchHarmony(m.colors, m.baseHue, m.harmony);
      assert m.colors[index].h == expectedHues[index];
    }
    var hueChanged := |expectedHues| == 5 && newColor.h != expectedHues[index];
    assert !hueChanged;

    if m.mood != Mood.Custom {
      assert ColorSatisfiesMood(oldColor, m.mood);
    }

    var newColors := m.colors[index := newColor];
    assert newColors == m.colors;
  }

  // Helper lemma: AdjustPalette with zero deltas is a NoOp
  lemma AdjustPaletteZeroDeltasIsNoOp(m: Model)
    requires Inv(m)
    ensures Apply(m, AdjustPalette(0, 0, 0)) == m
  {
    var newBaseHue := NormalizeHue(m.baseHue + 0);
    assert ValidBaseHue(m.baseHue);
    assert m.baseHue % 360 == m.baseHue;
    assert newBaseHue == m.baseHue;

    var newHues := AllHarmonyHues(newBaseHue, m.harmony);
    var oldHues := AllHarmonyHues(m.baseHue, m.harmony);
    assert newHues == oldHues;

    forall i | 0 <= i < 5
      ensures ValidColor(m.colors[i])
    {}

    if |newHues| == 5 {
      forall i | 0 <= i < 5
        ensures AdjustColorSL(m.colors[i], newHues[i], 0, 0) == m.colors[i]
      {
        var c := m.colors[i];
        assert HuesMatchHarmony(m.colors, m.baseHue, m.harmony);
        assert c.h == oldHues[i];
      }
    } else {
      forall i | 0 <= i < 5
        ensures AdjustColorSL(m.colors[i], NormalizeHue(m.colors[i].h + 0), 0, 0) == m.colors[i]
      {
        var c := m.colors[i];
        assert ValidColor(c);
        assert NormalizeHue(c.h) == c.h;
      }
    }

    var adjusted := ApplyLinkedAdjustment(m, 0, 0, 0);
    assert adjusted == m;
  }

  // ============================================================================
  // Main Theorem: If Apply(m, a) == m, then IsNoOp(m, a)
  // ============================================================================

  lemma CheckNoOps(m: Model, a: Action)
    requires Inv(m)
    requires m == Apply(m, a)
    ensures IsNoOp(m, a)
  {
    match a {
      case GeneratePalette(baseHue, mood, harmony, randomSeeds) =>
        if !ValidBaseHue(baseHue) || !ValidRandomSeeds(randomSeeds) {
          assert NoOpGeneratePaletteInvalid(a);
        } else {
          // Valid params - must be a coincidental match
          var newColors := GeneratePaletteColors(baseHue, mood, harmony, randomSeeds);
          var result := m.(baseHue := baseHue, mood := mood, harmony := harmony,
                          colors := newColors,
                          adjustmentH := 0, adjustmentS := 0, adjustmentL := 0);
          assert m == result;
          assert m.baseHue == baseHue;
          assert m.mood == mood;
          assert m.harmony == harmony;
          assert m.colors == newColors;
          assert m.adjustmentH == 0;
          assert m.adjustmentS == 0;
          assert m.adjustmentL == 0;
          assert NoOpGeneratePaletteCoincidental(m, a);
        }

      case AdjustColor(index, deltaH, deltaS, deltaL) =>
        if index < 0 || index >= 5 {
          assert NoOpAdjustColorInvalidIndex(a);
        } else if deltaH == 0 && deltaS == 0 && deltaL == 0 {
          assert NoOpAdjustColorZeroDeltas(a);
        } else {
          // Non-zero deltas but result is same - clamping absorbed the change
          var oldColor := m.colors[index];
          var newColor := ClampColor(Color(oldColor.h + deltaH, oldColor.s + deltaS, oldColor.l + deltaL));
          var result := ApplyIndependentAdjustment(m, index, deltaH, deltaS, deltaL);
          assert m == result;
          // Since m == result and colors changed from m.colors to m.colors[index := newColor],
          // we must have newColor == oldColor
          assert m.colors == result.colors;
          assert result.colors == m.colors[index := newColor];
          assert m.colors[index] == newColor;
          assert newColor == oldColor;
          // Harmony and mood must be preserved too
          assert result.harmony == m.harmony;
          assert result.mood == m.mood;
          assert NoOpAdjustColorClampedSame(m, a);
        }

      case AdjustPalette(deltaH, deltaS, deltaL) =>
        if deltaH == 0 && deltaS == 0 && deltaL == 0 {
          assert NoOpAdjustPaletteZeroDeltas(a);
        } else {
          // Non-zero deltas would at minimum change adjustmentH/S/L
          var adjusted := ApplyLinkedAdjustment(m, deltaH, deltaS, deltaL);
          var result := adjusted.(adjustmentH := m.adjustmentH + deltaH,
                                  adjustmentS := m.adjustmentS + deltaS,
                                  adjustmentL := m.adjustmentL + deltaL);
          assert m == result;
          // This means m.adjustmentH == m.adjustmentH + deltaH, etc.
          // Which implies deltaH == 0, deltaS == 0, deltaL == 0
          // Contradiction!
          assert m.adjustmentH == m.adjustmentH + deltaH;
          assert deltaH == 0;
          assert m.adjustmentS == m.adjustmentS + deltaS;
          assert deltaS == 0;
          assert m.adjustmentL == m.adjustmentL + deltaL;
          assert deltaL == 0;
          // So we're back to zero deltas case
          assert NoOpAdjustPaletteZeroDeltas(a);
        }

      case SelectContrastPair(fg, bg) =>
        if !(0 <= fg < 5 && 0 <= bg < 5) {
          assert NoOpSelectContrastPairInvalid(a);
        } else {
          // Valid indices - pair must be same as current
          assert m == m.(contrastPair := (fg, bg));
          assert m.contrastPair == (fg, bg);
          assert NoOpSelectContrastPairSame(m, a);
        }

      case SetColorDirect(index, color) =>
        if index < 0 || index >= 5 {
          assert NoOpSetColorDirectInvalidIndex(a);
        } else {
          var clampedColor := ClampColor(color);
          var result := ApplySetColorDirect(m, index, color);
          assert m == result;
          assert m.colors == result.colors;
          assert result.colors == m.colors[index := clampedColor];
          assert m.colors[index] == clampedColor;
          assert clampedColor == m.colors[index];
          // Harmony and mood preserved
          assert result.harmony == m.harmony;
          assert result.mood == m.mood;
          assert NoOpSetColorDirectSameColor(m, a);
        }

      case RegenerateMood(mood, randomSeeds) =>
        if !ValidRandomSeeds(randomSeeds) {
          assert NoOpRegenerateMoodInvalid(a);
        } else {
          var newColors := GeneratePaletteColors(m.baseHue, mood, m.harmony, randomSeeds);
          var result := m.(mood := mood, colors := newColors,
                          adjustmentH := 0, adjustmentS := 0, adjustmentL := 0);
          assert m == result;
          assert m.mood == mood;
          assert m.colors == newColors;
          assert m.adjustmentH == 0;
          assert m.adjustmentS == 0;
          assert m.adjustmentL == 0;
          assert NoOpRegenerateMoodCoincidental(m, a);
        }

      case RegenerateHarmony(harmony, randomSeeds) =>
        if !ValidRandomSeeds(randomSeeds) {
          assert NoOpRegenerateHarmonyInvalid(a);
        } else {
          var newColors := GeneratePaletteColors(m.baseHue, m.mood, harmony, randomSeeds);
          var result := m.(harmony := harmony, colors := newColors,
                          adjustmentH := 0, adjustmentS := 0, adjustmentL := 0);
          assert m == result;
          assert m.harmony == harmony;
          assert m.colors == newColors;
          assert m.adjustmentH == 0;
          assert m.adjustmentS == 0;
          assert m.adjustmentL == 0;
          assert NoOpRegenerateHarmonyCoincidental(m, a);
        }

      case RandomizeBaseHue(newBaseHue, randomSeeds) =>
        if !ValidBaseHue(newBaseHue) || !ValidRandomSeeds(randomSeeds) {
          assert NoOpRandomizeBaseHueInvalid(a);
        } else {
          var newColors := GeneratePaletteColors(newBaseHue, m.mood, m.harmony, randomSeeds);
          var result := m.(baseHue := newBaseHue, colors := newColors,
                          adjustmentH := 0, adjustmentS := 0, adjustmentL := 0);
          assert m == result;
          assert m.baseHue == newBaseHue;
          assert m.colors == newColors;
          assert m.adjustmentH == 0;
          assert m.adjustmentS == 0;
          assert m.adjustmentL == 0;
          assert NoOpRandomizeBaseHueCoincidental(m, a);
        }
    }
  }

  // ============================================================================
  // Converse: If IsNoOp(m, a), then Apply(m, a) == m
  // ============================================================================

  lemma NoOpImpliesUnchanged(m: Model, a: Action)
    requires Inv(m)
    requires IsNoOp(m, a)
    ensures Apply(m, a) == m
  {
    if NoOpAdjustColorZeroDeltas(a) {
      AdjustColorZeroDeltasIsNoOp(m, a.index);
    } else if NoOpAdjustPaletteZeroDeltas(a) {
      AdjustPaletteZeroDeltasIsNoOp(m);
    } else if NoOpSelectContrastPairSame(m, a) {
      assert Apply(m, a) == m.(contrastPair := (a.fg, a.bg));
      assert m.contrastPair == (a.fg, a.bg);
    } else if NoOpSetColorDirectSameColor(m, a) {
      var clampedColor := ClampColor(a.color);
      assert clampedColor == m.colors[a.index];
      var newColors := m.colors[a.index := clampedColor];
      assert newColors == m.colors;
    } else if NoOpAdjustColorClampedSame(m, a) {
      var oldColor := m.colors[a.index];
      var newColor := ClampColor(Color(oldColor.h + a.deltaH, oldColor.s + a.deltaS, oldColor.l + a.deltaL));
      assert newColor == oldColor;
      var newColors := m.colors[a.index := newColor];
      assert newColors == m.colors;
    } else if NoOpGeneratePaletteCoincidental(m, a) {
      var newColors := GeneratePaletteColors(a.baseHue, a.mood, a.harmony, a.randomSeeds);
      assert m.colors == newColors;
    } else if NoOpRegenerateMoodCoincidental(m, a) {
      var newColors := GeneratePaletteColors(m.baseHue, a.mood, m.harmony, a.randomSeeds);
      assert m.colors == newColors;
    } else if NoOpRegenerateHarmonyCoincidental(m, a) {
      var newColors := GeneratePaletteColors(m.baseHue, m.mood, a.harmony, a.randomSeeds);
      assert m.colors == newColors;
    } else if NoOpRandomizeBaseHueCoincidental(m, a) {
      var newColors := GeneratePaletteColors(a.newBaseHue, m.mood, m.harmony, a.randomSeeds);
      assert m.colors == newColors;
    }
    // Invalid input cases return m directly in Apply
  }
}
