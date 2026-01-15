/*
ColorWheelProps.dfy - Behavioral Properties of the ColorWheel Spec

== Commutativity with SelectContrastPair ==

SelectContrastPairCommutesWithAdjustColor:
  Selecting a contrast pair and adjusting a color can be done in either
  order -- the result is the same.

SelectContrastPairCommutesWithAdjustPalette:
  Selecting a contrast pair and adjusting the entire palette can be done
  in either order -- the result is the same.

SelectContrastPairCommutesWithSetColorDirect:
  Selecting a contrast pair and setting a color directly can be done in
  either order -- the result is the same.

SelectContrastPairIdempotent:
  Selecting the same contrast pair twice is the same as selecting it once.

== AdjustColor Commutativity ==

AdjustColorCommutes:
  Adjusting two different colors can be done in either order -- the result
  is the same.

AdjustColorIndependentColors:
  When adjusting two different colors, the final color values are the same
  regardless of order.

AdjustColorMoodMonotonic:
  When adjusting two different colors, the final mood is the same regardless
  of order. (If either adjustment breaks the mood to Custom, both paths end
  up at Custom.)

AdjustColorHarmonyMonotonic:
  When adjusting two different colors, the final harmony is the same
  regardless of order. (If either adjustment breaks the harmony to Custom,
  both paths end up at Custom.)

== GeneratePalette Properties ==

GeneratePaletteResetsAdjustments:
  Generating a new palette resets all cumulative adjustments (H, S, L) to zero.

GeneratePaletteIdempotent:
  Generating a palette with the same parameters twice in a row produces the
  same result as doing it once.

== Monotonicity of Degradation ==

MoodOnlyDegradesToCustom:
  AdjustColor can only change mood from a named mood to Custom, never the
  reverse. Once mood is Custom, AdjustColor keeps it Custom.

HarmonyOnlyDegradesToCustom:
  AdjustColor can only change harmony from a named harmony to Custom, never
  the reverse. Once harmony is Custom, AdjustColor keeps it Custom.

== Reachability ==

CanReachAnyColor:
  From any valid model, any valid color can be set at any index using
  SetColorDirect (though this may degrade mood/harmony to Custom).

CanRecoverMood:
  From any model (even with Custom mood), any named mood can be restored
  using RegenerateMood with appropriate seeds.

CanRecoverHarmony:
  From any model (even with Custom harmony), any named harmony can be
  restored using RegenerateHarmony with appropriate seeds.

== Field Independence ==

ContrastPairIndependentOfColors:
  AdjustColor, AdjustPalette, and SetColorDirect never change contrastPair.

ColorsIndependentOfContrastPair:
  SelectContrastPair never changes colors, mood, harmony, or baseHue.

== Domain-Specific: Harmony Geometry ==

ComplementaryAre180Apart:
  When harmony is Complementary, the first two base hues differ by exactly 180 degrees.

TriadicAre120Apart:
  When harmony is Triadic, the three base hues are 120 degrees apart.

AnalogousWithin30:
  When harmony is Analogous, all five hues are within 30 degrees of baseHue.
*/

include "ColorWheelSpec.dfy"
include "ColorWheelProof.dfy"

module ColorWheelProps {
  import opened ColorWheelSpec
  import ColorWheelProof

  // ============================================================================
  // Step function (Normalize ∘ Apply) - the actual state transition
  // ============================================================================

  function Step(m: Model, a: Action): Model
    requires Inv(m)
  {
    Normalize(Apply(m, a))
  }

  lemma StepPreservesInv(m: Model, a: Action)
    requires Inv(m)
    ensures Inv(Step(m, a))
  {
    ColorWheelProof.StepPreservesInv(m, a);
  }

  // ============================================================================
  // Commutativity Properties (using Step for proper invariant preservation)
  // ============================================================================

  // SelectContrastPair only modifies contrastPair, so it commutes with
  // any action that doesn't modify contrastPair

  lemma SelectContrastPairCommutesWithAdjustColor(
    m: Model, fg: int, bg: int, idx: int, dH: int, dS: int, dL: int)
    requires Inv(m)
    requires 0 <= fg < 5 && 0 <= bg < 5
    ensures Step(Step(m, SelectContrastPair(fg, bg)), AdjustColor(idx, dH, dS, dL))
         == Step(Step(m, AdjustColor(idx, dH, dS, dL)), SelectContrastPair(fg, bg))
  {
    // SelectContrastPair only changes contrastPair
    // AdjustColor only changes colors, mood, harmony
    // Normalize preserves this independence
    StepPreservesInv(m, SelectContrastPair(fg, bg));
    StepPreservesInv(m, AdjustColor(idx, dH, dS, dL));
  }

  lemma SelectContrastPairCommutesWithAdjustPalette(
    m: Model, fg: int, bg: int, dH: int, dS: int, dL: int)
    requires Inv(m)
    requires 0 <= fg < 5 && 0 <= bg < 5
    ensures Step(Step(m, SelectContrastPair(fg, bg)), AdjustPalette(dH, dS, dL))
         == Step(Step(m, AdjustPalette(dH, dS, dL)), SelectContrastPair(fg, bg))
  {
    StepPreservesInv(m, SelectContrastPair(fg, bg));
    StepPreservesInv(m, AdjustPalette(dH, dS, dL));
  }

  lemma SelectContrastPairCommutesWithSetColorDirect(
    m: Model, fg: int, bg: int, idx: int, c: Color)
    requires Inv(m)
    requires 0 <= fg < 5 && 0 <= bg < 5
    ensures Step(Step(m, SelectContrastPair(fg, bg)), SetColorDirect(idx, c))
         == Step(Step(m, SetColorDirect(idx, c)), SelectContrastPair(fg, bg))
  {
    StepPreservesInv(m, SelectContrastPair(fg, bg));
    StepPreservesInv(m, SetColorDirect(idx, c));
  }

  // SelectContrastPair is idempotent
  lemma SelectContrastPairIdempotent(m: Model, fg: int, bg: int)
    requires Inv(m)
    requires 0 <= fg < 5 && 0 <= bg < 5
    ensures Step(Step(m, SelectContrastPair(fg, bg)), SelectContrastPair(fg, bg))
         == Step(m, SelectContrastPair(fg, bg))
  {
    StepPreservesInv(m, SelectContrastPair(fg, bg));
  }

  // ============================================================================
  // AdjustColor on different indices commutes
  // ============================================================================

  // Key insight: mood/harmony degradation to Custom is monotonic
  // Once Custom, stays Custom - so order doesn't affect final state

  lemma AdjustColorCommutes(
    m: Model, i: int, j: int,
    dH1: int, dS1: int, dL1: int,
    dH2: int, dS2: int, dL2: int)
    requires Inv(m)
    requires 0 <= i < 5 && 0 <= j < 5 && i != j
    ensures Step(Step(m, AdjustColor(i, dH1, dS1, dL1)), AdjustColor(j, dH2, dS2, dL2))
         == Step(Step(m, AdjustColor(j, dH2, dS2, dL2)), AdjustColor(i, dH1, dS1, dL1))
  {
    StepPreservesInv(m, AdjustColor(i, dH1, dS1, dL1));
    StepPreservesInv(m, AdjustColor(j, dH2, dS2, dL2));

    // Both paths produce same colors, mood, and harmony
    AdjustColorIndependentColors(m, i, j, dH1, dS1, dL1, dH2, dS2, dL2);
    AdjustColorMoodMonotonic(m, i, j, dH1, dS1, dL1, dH2, dS2, dL2);
    AdjustColorHarmonyMonotonic(m, i, j, dH1, dS1, dL1, dH2, dS2, dL2);
  }

  // Helper: Colors at different indices are set independently
  lemma AdjustColorIndependentColors(
    m: Model, i: int, j: int,
    dH1: int, dS1: int, dL1: int,
    dH2: int, dS2: int, dL2: int)
    requires Inv(m)
    requires 0 <= i < 5 && 0 <= j < 5 && i != j
    ensures var m_ij := Step(Step(m, AdjustColor(i, dH1, dS1, dL1)), AdjustColor(j, dH2, dS2, dL2));
            var m_ji := Step(Step(m, AdjustColor(j, dH2, dS2, dL2)), AdjustColor(i, dH1, dS1, dL1));
            m_ij.colors == m_ji.colors
  {
    StepPreservesInv(m, AdjustColor(i, dH1, dS1, dL1));
    StepPreservesInv(m, AdjustColor(j, dH2, dS2, dL2));

    var a_i := AdjustColor(i, dH1, dS1, dL1);
    var a_j := AdjustColor(j, dH2, dS2, dL2);

    // Color at index i after a_i
    var newColor_i := ClampColor(Color(
      m.colors[i].h + dH1,
      m.colors[i].s + dS1,
      m.colors[i].l + dL1
    ));

    // Color at index j after a_j
    var newColor_j := ClampColor(Color(
      m.colors[j].h + dH2,
      m.colors[j].s + dS2,
      m.colors[j].l + dL2
    ));

    // Path i then j: colors[i] = newColor_i, colors[j] = newColor_j
    // Path j then i: colors[j] = newColor_j, colors[i] = newColor_i
    // Same result since i != j
  }

  // Helper: Mood degradation is symmetric - both paths yield same final mood
  lemma AdjustColorMoodMonotonic(
    m: Model, i: int, j: int,
    dH1: int, dS1: int, dL1: int,
    dH2: int, dS2: int, dL2: int)
    requires Inv(m)
    requires 0 <= i < 5 && 0 <= j < 5 && i != j
    ensures var m_ij := Step(Step(m, AdjustColor(i, dH1, dS1, dL1)), AdjustColor(j, dH2, dS2, dL2));
            var m_ji := Step(Step(m, AdjustColor(j, dH2, dS2, dL2)), AdjustColor(i, dH1, dS1, dL1));
            m_ij.mood == m_ji.mood
  {
    StepPreservesInv(m, AdjustColor(i, dH1, dS1, dL1));
    StepPreservesInv(m, AdjustColor(j, dH2, dS2, dL2));

    var newColor_i := ClampColor(Color(
      m.colors[i].h + dH1, m.colors[i].s + dS1, m.colors[i].l + dL1));
    var newColor_j := ClampColor(Color(
      m.colors[j].h + dH2, m.colors[j].s + dS2, m.colors[j].l + dL2));

    var breaks_i := m.mood != Mood.Custom && !ColorSatisfiesMood(newColor_i, m.mood);
    var breaks_j := m.mood != Mood.Custom && !ColorSatisfiesMood(newColor_j, m.mood);

    // Case analysis: degradation to Custom is monotonic
    // Both paths end up with same mood
  }

  // Helper: Harmony degradation is symmetric
  lemma AdjustColorHarmonyMonotonic(
    m: Model, i: int, j: int,
    dH1: int, dS1: int, dL1: int,
    dH2: int, dS2: int, dL2: int)
    requires Inv(m)
    requires 0 <= i < 5 && 0 <= j < 5 && i != j
    ensures var m_ij := Step(Step(m, AdjustColor(i, dH1, dS1, dL1)), AdjustColor(j, dH2, dS2, dL2));
            var m_ji := Step(Step(m, AdjustColor(j, dH2, dS2, dL2)), AdjustColor(i, dH1, dS1, dL1));
            m_ij.harmony == m_ji.harmony
  {
    StepPreservesInv(m, AdjustColor(i, dH1, dS1, dL1));
    StepPreservesInv(m, AdjustColor(j, dH2, dS2, dL2));

    var newColor_i := ClampColor(Color(
      m.colors[i].h + dH1, m.colors[i].s + dS1, m.colors[i].l + dL1));
    var newColor_j := ClampColor(Color(
      m.colors[j].h + dH2, m.colors[j].s + dS2, m.colors[j].l + dL2));

    var expectedHues := AllHarmonyHues(m.baseHue, m.harmony);

    var breaks_i := m.harmony != Harmony.Custom &&
                    |expectedHues| == 5 && newColor_i.h != expectedHues[i];
    var breaks_j := m.harmony != Harmony.Custom &&
                    |expectedHues| == 5 && newColor_j.h != expectedHues[j];

    // Degradation to Custom is monotonic - both paths yield same harmony
  }

  // ============================================================================
  // Non-Commutativity: GeneratePalette resets state
  // ============================================================================

  // GeneratePalette resets adjustmentH/S/L to 0, so order matters
  // This documents that GeneratePalette is a "checkpoint" operation

  lemma GeneratePaletteResetsAdjustments(m: Model, baseHue: int, mood: Mood,
                                          harmony: Harmony, seeds: seq<int>)
    requires Inv(m)
    requires ValidBaseHue(baseHue) && ValidRandomSeeds(seeds)
    ensures Step(m, GeneratePalette(baseHue, mood, harmony, seeds)).adjustmentH == 0
    ensures Step(m, GeneratePalette(baseHue, mood, harmony, seeds)).adjustmentS == 0
    ensures Step(m, GeneratePalette(baseHue, mood, harmony, seeds)).adjustmentL == 0
  {
  }

  // ============================================================================
  // Idempotence Properties
  // ============================================================================

  // GeneratePalette with same params is idempotent
  lemma GeneratePaletteIdempotent(m: Model, baseHue: int, mood: Mood,
                                   harmony: Harmony, seeds: seq<int>)
    requires Inv(m)
    requires ValidBaseHue(baseHue) && ValidRandomSeeds(seeds)
    ensures var m' := Step(m, GeneratePalette(baseHue, mood, harmony, seeds));
            Step(m', GeneratePalette(baseHue, mood, harmony, seeds)) == m'
  {
    StepPreservesInv(m, GeneratePalette(baseHue, mood, harmony, seeds));
  }

  // ============================================================================
  // Monotonicity of Degradation
  // ============================================================================

  // AdjustColor can only degrade mood to Custom, never restore it
  lemma MoodOnlyDegradesToCustom(m: Model, idx: int, dH: int, dS: int, dL: int)
    requires Inv(m)
    requires 0 <= idx < 5
    ensures var m' := Step(m, AdjustColor(idx, dH, dS, dL));
            m.mood == Mood.Custom ==> m'.mood == Mood.Custom
    ensures var m' := Step(m, AdjustColor(idx, dH, dS, dL));
            m'.mood != Mood.Custom ==> m'.mood == m.mood
  {
    StepPreservesInv(m, AdjustColor(idx, dH, dS, dL));
  }

  // AdjustColor can only degrade harmony to Custom, never restore it
  lemma HarmonyOnlyDegradesToCustom(m: Model, idx: int, dH: int, dS: int, dL: int)
    requires Inv(m)
    requires 0 <= idx < 5
    ensures var m' := Step(m, AdjustColor(idx, dH, dS, dL));
            m.harmony == Harmony.Custom ==> m'.harmony == Harmony.Custom
    ensures var m' := Step(m, AdjustColor(idx, dH, dS, dL));
            m'.harmony != Harmony.Custom ==> m'.harmony == m.harmony
  {
    StepPreservesInv(m, AdjustColor(idx, dH, dS, dL));
  }

  // ============================================================================
  // Reachability
  // ============================================================================

  // Any valid color can be set at any index
  lemma CanReachAnyColor(m: Model, idx: int, target: Color)
    requires Inv(m)
    requires 0 <= idx < 5
    requires ValidColor(target)
    ensures Step(m, SetColorDirect(idx, target)).colors[idx] == target
  {
    StepPreservesInv(m, SetColorDirect(idx, target));
  }

  // Any mood can be restored via RegenerateMood
  lemma CanRecoverMood(m: Model, targetMood: Mood, seeds: seq<int>)
    requires Inv(m)
    requires ValidRandomSeeds(seeds)
    ensures Step(m, RegenerateMood(targetMood, seeds)).mood == targetMood
  {
    StepPreservesInv(m, RegenerateMood(targetMood, seeds));
  }

  // Any harmony can be restored via RegenerateHarmony
  lemma CanRecoverHarmony(m: Model, targetHarmony: Harmony, seeds: seq<int>)
    requires Inv(m)
    requires ValidRandomSeeds(seeds)
    ensures Step(m, RegenerateHarmony(targetHarmony, seeds)).harmony == targetHarmony
  {
    StepPreservesInv(m, RegenerateHarmony(targetHarmony, seeds));
  }

  // ============================================================================
  // Field Independence
  // ============================================================================

  // AdjustColor never changes contrastPair
  lemma AdjustColorPreservesContrastPair(m: Model, idx: int, dH: int, dS: int, dL: int)
    requires Inv(m)
    ensures Step(m, AdjustColor(idx, dH, dS, dL)).contrastPair == m.contrastPair
  {
  }

  // AdjustPalette never changes contrastPair
  lemma AdjustPalettePreservesContrastPair(m: Model, dH: int, dS: int, dL: int)
    requires Inv(m)
    ensures Step(m, AdjustPalette(dH, dS, dL)).contrastPair == m.contrastPair
  {
  }

  // SetColorDirect never changes contrastPair
  lemma SetColorDirectPreservesContrastPair(m: Model, idx: int, c: Color)
    requires Inv(m)
    ensures Step(m, SetColorDirect(idx, c)).contrastPair == m.contrastPair
  {
  }

  // SelectContrastPair never changes colors
  lemma SelectContrastPairPreservesColors(m: Model, fg: int, bg: int)
    requires Inv(m)
    requires 0 <= fg < 5 && 0 <= bg < 5
    ensures Step(m, SelectContrastPair(fg, bg)).colors == m.colors
    ensures Step(m, SelectContrastPair(fg, bg)).mood == m.mood
    ensures Step(m, SelectContrastPair(fg, bg)).harmony == m.harmony
    ensures Step(m, SelectContrastPair(fg, bg)).baseHue == m.baseHue
  {
  }

  // ============================================================================
  // Domain-Specific: Harmony Geometry
  // ============================================================================

  // Complementary harmony: first two base hues are 180° apart
  lemma ComplementaryAre180Apart(m: Model)
    requires Inv(m)
    requires m.harmony == Harmony.Complementary
    ensures var hues := BaseHarmonyHues(m.baseHue, m.harmony);
            |hues| >= 2 && hues[1] == NormalizeHue(hues[0] + 180)
  {
  }

  // Triadic harmony: base hues are 120° apart
  lemma TriadicAre120Apart(m: Model)
    requires Inv(m)
    requires m.harmony == Harmony.Triadic
    ensures var hues := BaseHarmonyHues(m.baseHue, m.harmony);
            |hues| >= 3 &&
            hues[1] == NormalizeHue(hues[0] + 120) &&
            hues[2] == NormalizeHue(hues[0] + 240)
  {
  }

  // Analogous harmony: all hues within 30° of baseHue
  lemma AnalogousWithin30(m: Model)
    requires Inv(m)
    requires m.harmony == Harmony.Analogous
    ensures var hues := AllHarmonyHues(m.baseHue, m.harmony);
            |hues| == 5 &&
            hues[0] == NormalizeHue(m.baseHue - 30) &&
            hues[1] == NormalizeHue(m.baseHue - 15) &&
            hues[2] == m.baseHue &&
            hues[3] == NormalizeHue(m.baseHue + 15) &&
            hues[4] == NormalizeHue(m.baseHue + 30)
  {
  }
}
