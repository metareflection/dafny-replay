// ColorWheel Domain Specification
// A verified color palette generator with mood + harmony constraints

module ColorWheelSpec {

  // ============================================================================
  // Core Types
  // ============================================================================

  datatype Color = Color(h: int, s: int, l: int)

  datatype Mood =
    | Vibrant      // S ≥ 70,  40 ≤ L ≤ 60
    | SoftMuted    // 20 ≤ S ≤ 45, 55 ≤ L ≤ 75
    | Pastel       // S ≤ 35,  L ≥ 75
    | DeepJewel    // S ≥ 60,  25 ≤ L ≤ 45
    | Earth        // 15 ≤ S ≤ 40, 30 ≤ L ≤ 60
    | Neon         // S ≥ 90,  50 ≤ L ≤ 65
    | Custom       // No S/L constraints

  datatype Harmony =
    | Complementary     // 2 base hues: [H₀, H₀+180°] + 3 variations
    | Triadic           // 3 base hues: [H₀, H₀+120°, H₀+240°] + 2 variations
    | Analogous         // 5 hues: [H₀-30°, H₀-15°, H₀, H₀+15°, H₀+30°]
    | SplitComplement   // 3 base hues: [H₀, H₀+150°, H₀+210°] + 2 variations
    | Square            // 4 base hues: [H₀, H₀+90°, H₀+180°, H₀+270°] + 1 variation
    | Custom            // No hue relationship

  datatype Model = Model(
    baseHue: int,                    // 0-359, the anchor hue
    mood: Mood,
    harmony: Harmony,
    colors: seq<Color>,              // Always exactly 5 colors
    contrastPair: (int, int),        // (foreground index, background index)
    // Cumulative palette adjustments (for UI slider display)
    adjustmentH: int,                // Cumulative hue adjustment
    adjustmentS: int,                // Cumulative saturation adjustment
    adjustmentL: int                 // Cumulative lightness adjustment
  )

  datatype Action =
    // randomSeeds: 10 values [0-100] for random S/L generation (2 per color)
    | GeneratePalette(baseHue: int, mood: Mood, harmony: Harmony, randomSeeds: seq<int>)
    | AdjustColor(index: int, deltaH: int, deltaS: int, deltaL: int)
    // AdjustPalette: Applies linked adjustment to ALL colors
    | AdjustPalette(deltaH: int, deltaS: int, deltaL: int)
    | SelectContrastPair(fg: int, bg: int)
    | SetColorDirect(index: int, color: Color)
    // randomSeeds: 10 values for regenerating colors with new mood
    | RegenerateMood(mood: Mood, randomSeeds: seq<int>)
    // randomSeeds: 10 values for regenerating colors with new harmony
    | RegenerateHarmony(harmony: Harmony, randomSeeds: seq<int>)
    // newBaseHue + randomSeeds: pick new base, regenerate
    | RandomizeBaseHue(newBaseHue: int, randomSeeds: seq<int>)

  // ============================================================================
  // Helper Functions
  // ============================================================================

  function Clamp(x: int, min: int, max: int): int {
    if x < min then min
    else if x > max then max
    else x
  }

  function NormalizeHue(h: int): int {
    var normalized := h % 360;
    if normalized < 0 then normalized + 360 else normalized
  }

  function ClampColor(c: Color): Color {
    Color(
      NormalizeHue(c.h),
      Clamp(c.s, 0, 100),
      Clamp(c.l, 0, 100)
    )
  }

  // ============================================================================
  // Mood Predicates
  // ============================================================================

  predicate ValidColor(c: Color) {
    0 <= c.h < 360 && 0 <= c.s <= 100 && 0 <= c.l <= 100
  }

  predicate ValidBaseHue(h: int) {
    0 <= h < 360
  }

  predicate ColorSatisfiesMood(c: Color, mood: Mood) {
    match mood
    case Vibrant    => c.s >= 70 && 40 <= c.l <= 60
    case SoftMuted  => 20 <= c.s <= 45 && 55 <= c.l <= 75
    case Pastel     => c.s <= 35 && c.l >= 75
    case DeepJewel  => c.s >= 60 && 25 <= c.l <= 45
    case Earth      => 15 <= c.s <= 40 && 30 <= c.l <= 60
    case Neon       => c.s >= 90 && 50 <= c.l <= 65
    case Custom     => true
  }

  // Returns (minS, maxS, minL, maxL) bounds for a given mood
  function MoodBounds(mood: Mood): (int, int, int, int) {
    match mood
    case Vibrant    => (70, 100, 40, 60)
    case SoftMuted  => (20, 45, 55, 75)
    case Pastel     => (0, 35, 75, 100)
    case DeepJewel  => (60, 100, 25, 45)
    case Earth      => (15, 40, 30, 60)
    case Neon       => (90, 100, 50, 65)
    case Custom     => (0, 100, 0, 100)
  }

  // Map a random seed [0-100] to a value in [min, max]
  function RandomInRange(seed: int, min: int, max: int): int
    requires 0 <= seed <= 100
    requires min <= max
  {
    if min == max then min
    else min + (seed * (max - min)) / 100
  }

  // Generate random (S, L) within mood bounds using two random seeds
  function RandomSLForMood(mood: Mood, seedS: int, seedL: int): (int, int)
    requires 0 <= seedS <= 100
    requires 0 <= seedL <= 100
  {
    var (minS, maxS, minL, maxL) := MoodBounds(mood);
    (RandomInRange(seedS, minS, maxS), RandomInRange(seedL, minL, maxL))
  }

  // Golden ratio approximation * 100 = 61.8 ≈ 62
  // Golden ratio distribution avoids clustering and maximizes visual distinction
  const GoldenOffset: int := 62

  // Generate (S, L) using golden ratio distribution for maximum variance
  // Each color's position is offset by golden ratio, ensuring even distribution
  // and dramatic changes between regenerations
  function GoldenSLForMood(mood: Mood, colorIndex: int, seedS: int, seedL: int): (int, int)
    requires 0 <= colorIndex < 5
    requires 0 <= seedS <= 100
    requires 0 <= seedL <= 100
  {
    var (minS, maxS, minL, maxL) := MoodBounds(mood);

    // Golden ratio offset creates mathematically optimal distribution
    // Using different multipliers for S and L to avoid correlation
    var spreadS := (seedS + colorIndex * GoldenOffset) % 101;
    var spreadL := (seedL + colorIndex * 38) % 101;  // 38 ≈ 62 * 0.618 (nested golden)

    (RandomInRange(spreadS, minS, maxS), RandomInRange(spreadL, minL, maxL))
  }

  // ============================================================================
  // Harmony Functions
  // ============================================================================

  // Returns the base harmony hues (before padding to 5)
  function BaseHarmonyHues(baseHue: int, harmony: Harmony): seq<int> {
    match harmony
    case Complementary   => [baseHue, NormalizeHue(baseHue + 180)]
    case Triadic         => [baseHue, NormalizeHue(baseHue + 120), NormalizeHue(baseHue + 240)]
    case Analogous       => [NormalizeHue(baseHue - 30), NormalizeHue(baseHue - 15),
                             baseHue, NormalizeHue(baseHue + 15), NormalizeHue(baseHue + 30)]
    case SplitComplement => [baseHue, NormalizeHue(baseHue + 150), NormalizeHue(baseHue + 210)]
    case Square          => [baseHue, NormalizeHue(baseHue + 90),
                             NormalizeHue(baseHue + 180), NormalizeHue(baseHue + 270)]
    case Custom          => [] // No constraint
  }

  // Hue spread offset for creating variation in repeated hues
  // 35° provides better visual distinction than 20° while staying within harmony "feel"
  const HueSpread: int := 35

  // Returns all 5 hues for a harmony (with spreading for variety)
  // Instead of repeating exact hues, we spread them by ±HueSpread degrees
  function AllHarmonyHues(baseHue: int, harmony: Harmony): seq<int> {
    var base := BaseHarmonyHues(baseHue, harmony);
    if harmony == Harmony.Custom then []
    else if |base| == 5 then base  // Analogous: already 5 distinct hues
    else if |base| == 4 then
      // Square: add midpoint between first two hues
      base + [NormalizeHue(baseHue + 45)]
    else if |base| == 3 then
      // Triadic/Split: spread the first two base hues
      base + [NormalizeHue(base[0] + HueSpread), NormalizeHue(base[1] - HueSpread)]
    else if |base| == 2 then
      // Complementary: spread both base hues
      base + [NormalizeHue(base[0] + HueSpread),
              NormalizeHue(base[1] + HueSpread),
              NormalizeHue(base[0] - HueSpread)]
    else []
  }

  // Check if a color palette's hues match the expected harmony pattern
  predicate HuesMatchHarmony(colors: seq<Color>, baseHue: int, harmony: Harmony) {
    if harmony == Harmony.Custom then true
    else
      var expectedHues := AllHarmonyHues(baseHue, harmony);
      |colors| == 5 && |expectedHues| == 5 &&
      forall i | 0 <= i < 5 :: colors[i].h == expectedHues[i]
  }

  // ============================================================================
  // Main Invariant
  // ============================================================================

  predicate Inv(m: Model) {
    && ValidBaseHue(m.baseHue)
    && |m.colors| == 5
    && (forall i | 0 <= i < 5 :: ValidColor(m.colors[i]))
    && 0 <= m.contrastPair.0 < 5
    && 0 <= m.contrastPair.1 < 5
    // Mood constraint: all colors satisfy mood (unless Custom)
    && (m.mood != Mood.Custom ==>
          forall i | 0 <= i < 5 :: ColorSatisfiesMood(m.colors[i], m.mood))
    // Harmony constraint: hues follow harmony pattern (unless Custom)
    && HuesMatchHarmony(m.colors, m.baseHue, m.harmony)
  }

  // ============================================================================
  // Initial State
  // ============================================================================

  function Init(): Model {
    var randomSeeds := [50, 50, 50, 50, 50, 50, 50, 50, 50, 50];
    var baseHue := 180;  // Start with blue
    var mood := Vibrant;
    var harmony := Complementary;
    var colors := GeneratePaletteColors(baseHue, mood, harmony, randomSeeds);
    Model(baseHue, mood, harmony, colors, (0, 1), 0, 0, 0)
  }

  // ============================================================================
  // Color Generation
  // ============================================================================

  predicate ValidRandomSeeds(seeds: seq<int>) {
    |seeds| == 10 && (forall i | 0 <= i < 10 :: 0 <= seeds[i] <= 100)
  }

  // Check if all colors in a sequence satisfy a mood constraint
  predicate AllColorsSatisfyMood(colors: seq<Color>, mood: Mood)
    requires |colors| == 5
  {
    forall i | 0 <= i < 5 :: ColorSatisfiesMood(colors[i], mood)
  }

  // Generate a color with given hue using golden ratio S/L distribution
  function GenerateColorGolden(h: int, mood: Mood, colorIndex: int, seedS: int, seedL: int): Color
    requires 0 <= h < 360
    requires 0 <= colorIndex < 5
    requires 0 <= seedS <= 100
    requires 0 <= seedL <= 100
  {
    var (s, l) := GoldenSLForMood(mood, colorIndex, seedS, seedL);
    Color(h, s, l)
  }

  // Generate a full 5-color palette using golden ratio S/L distribution
  function GeneratePaletteColors(baseHue: int, mood: Mood, harmony: Harmony, randomSeeds: seq<int>): seq<Color>
    requires ValidBaseHue(baseHue)
    requires ValidRandomSeeds(randomSeeds)
  {
    var hues := AllHarmonyHues(baseHue, harmony);

    if |hues| != 5 then
      // Fallback for Custom harmony: use baseHue for all
      [GenerateColorGolden(baseHue, mood, 0, randomSeeds[0], randomSeeds[1]),
       GenerateColorGolden(baseHue, mood, 1, randomSeeds[2], randomSeeds[3]),
       GenerateColorGolden(baseHue, mood, 2, randomSeeds[4], randomSeeds[5]),
       GenerateColorGolden(baseHue, mood, 3, randomSeeds[6], randomSeeds[7]),
       GenerateColorGolden(baseHue, mood, 4, randomSeeds[8], randomSeeds[9])]
    else
      [GenerateColorGolden(hues[0], mood, 0, randomSeeds[0], randomSeeds[1]),
       GenerateColorGolden(hues[1], mood, 1, randomSeeds[2], randomSeeds[3]),
       GenerateColorGolden(hues[2], mood, 2, randomSeeds[4], randomSeeds[5]),
       GenerateColorGolden(hues[3], mood, 3, randomSeeds[6], randomSeeds[7]),
       GenerateColorGolden(hues[4], mood, 4, randomSeeds[8], randomSeeds[9])]
  }

  // ============================================================================
  // State Transitions (Apply)
  // ============================================================================

  function Apply(m: Model, a: Action): Model
  requires Inv(m)
  {
    match a
    case GeneratePalette(baseHue, mood, harmony, randomSeeds) =>
      if !ValidBaseHue(baseHue) || !ValidRandomSeeds(randomSeeds) then m
      else
        var colors := GeneratePaletteColors(baseHue, mood, harmony, randomSeeds);
        m.(baseHue := baseHue, mood := mood, harmony := harmony, colors := colors,
           adjustmentH := 0, adjustmentS := 0, adjustmentL := 0)

    case AdjustColor(index, deltaH, deltaS, deltaL) =>
      if index < 0 || index >= |m.colors| then m
      else
        ApplyIndependentAdjustment(m, index, deltaH, deltaS, deltaL)

    // AdjustPalette: Applies linked adjustment to all colors
    case AdjustPalette(deltaH, deltaS, deltaL) =>
      var adjusted := ApplyLinkedAdjustment(m, deltaH, deltaS, deltaL);
      adjusted.(adjustmentH := m.adjustmentH + deltaH,
                adjustmentS := m.adjustmentS + deltaS,
                adjustmentL := m.adjustmentL + deltaL)

    case SelectContrastPair(fg, bg) =>
      if 0 <= fg < 5 && 0 <= bg < 5 then
        m.(contrastPair := (fg, bg))
      else m

    case SetColorDirect(index, color) =>
      if index < 0 || index >= |m.colors| then m
      else
        ApplySetColorDirect(m, index, color)

    case RegenerateMood(mood, randomSeeds) =>
      if !ValidRandomSeeds(randomSeeds) then m
      else
        var colors := GeneratePaletteColors(m.baseHue, mood, m.harmony, randomSeeds);
        m.(mood := mood, colors := colors, adjustmentH := 0, adjustmentS := 0, adjustmentL := 0)

    case RegenerateHarmony(harmony, randomSeeds) =>
      if !ValidRandomSeeds(randomSeeds) then m
      else
        var colors := GeneratePaletteColors(m.baseHue, m.mood, harmony, randomSeeds);
        m.(harmony := harmony, colors := colors, adjustmentH := 0, adjustmentS := 0, adjustmentL := 0)

    case RandomizeBaseHue(newBaseHue, randomSeeds) =>
      if !ValidBaseHue(newBaseHue) || !ValidRandomSeeds(randomSeeds) then m
      else
        var colors := GeneratePaletteColors(newBaseHue, m.mood, m.harmony, randomSeeds);
        m.(baseHue := newBaseHue, colors := colors, adjustmentH := 0, adjustmentS := 0, adjustmentL := 0)
  }

  // ============================================================================
  // Linked Adjustment: Shift all colors together
  // ============================================================================

  function ApplyLinkedAdjustment(m: Model, deltaH: int, deltaS: int, deltaL: int): Model
    requires |m.colors| == 5
    requires forall i | 0 <= i < 5 :: ValidColor(m.colors[i])
  {
    // Shift baseHue and regenerate harmony hues
    var newBaseHue := NormalizeHue(m.baseHue + deltaH);
    var newHues := AllHarmonyHues(newBaseHue, m.harmony);

    // Adjust S and L for all colors, preserving hues
    var adjustedColors :=
      if |newHues| == 5 then
        [AdjustColorSL(m.colors[0], newHues[0], deltaS, deltaL),
         AdjustColorSL(m.colors[1], newHues[1], deltaS, deltaL),
         AdjustColorSL(m.colors[2], newHues[2], deltaS, deltaL),
         AdjustColorSL(m.colors[3], newHues[3], deltaS, deltaL),
         AdjustColorSL(m.colors[4], newHues[4], deltaS, deltaL)]
      else (
        // Custom harmony: shift each color's hue by deltaH, adjust S/L
        [AdjustColorSL(m.colors[0], NormalizeHue(m.colors[0].h + deltaH), deltaS, deltaL),
         AdjustColorSL(m.colors[1], NormalizeHue(m.colors[1].h + deltaH), deltaS, deltaL),
         AdjustColorSL(m.colors[2], NormalizeHue(m.colors[2].h + deltaH), deltaS, deltaL),
         AdjustColorSL(m.colors[3], NormalizeHue(m.colors[3].h + deltaH), deltaS, deltaL),
         AdjustColorSL(m.colors[4], NormalizeHue(m.colors[4].h + deltaH), deltaS, deltaL)]
      );

    // Check if any color breaks mood bounds
    var moodBroken := m.mood != Mood.Custom &&
                      exists i | 0 <= i < 5 :: !ColorSatisfiesMood(adjustedColors[i], m.mood);

    var newMood := if moodBroken then Mood.Custom else m.mood;

    m.(baseHue := newBaseHue, colors := adjustedColors, mood := newMood)
  }

  // Helper: Adjust a color's S and L while setting a specific hue
  function AdjustColorSL(c: Color, newHue: int, deltaS: int, deltaL: int): Color
    requires 0 <= newHue < 360
  {
    var newS := Clamp(c.s + deltaS, 0, 100);
    var newL := Clamp(c.l + deltaL, 0, 100);
    Color(newHue, newS, newL)
  }

  // ============================================================================
  // Independent Adjustment: Adjust only one color
  // ============================================================================

  function ApplyIndependentAdjustment(m: Model, index: int, deltaH: int, deltaS: int, deltaL: int): Model
    requires 0 <= index < 5
    requires |m.colors| == 5
  {
    var oldColor := m.colors[index];
    var newColor := ClampColor(Color(
      oldColor.h + deltaH,
      oldColor.s + deltaS,
      oldColor.l + deltaL
    ));

    // Check if hue changed and no longer matches harmony
    var expectedHues := AllHarmonyHues(m.baseHue, m.harmony);
    var hueChanged := |expectedHues| == 5 && newColor.h != expectedHues[index];
    var harmonyBroken := m.harmony != Harmony.Custom && hueChanged;

    // Check if mood bounds broken
    var moodBroken := m.mood != Mood.Custom && !ColorSatisfiesMood(newColor, m.mood);

    var newColors := m.colors[index := newColor];
    var newHarmony := if harmonyBroken then Harmony.Custom else m.harmony;
    var newMood := if moodBroken then Mood.Custom else m.mood;

    m.(colors := newColors, harmony := newHarmony, mood := newMood)
  }

  // ============================================================================
  // SetColorDirect: Try to preserve mood/harmony when possible
  // ============================================================================

  function ApplySetColorDirect(m: Model, index: int, color: Color): Model
    requires 0 <= index < 5
    requires |m.colors| == 5
  {
    var clampedColor := ClampColor(color);

    // Check if new color matches expected harmony hue
    var expectedHues := AllHarmonyHues(m.baseHue, m.harmony);
    var hueMatches := |expectedHues| == 5 && clampedColor.h == expectedHues[index];
    var harmonyPreserved := m.harmony == Harmony.Custom || hueMatches;

    // Check if new color satisfies current mood
    var moodPreserved := m.mood == Mood.Custom || ColorSatisfiesMood(clampedColor, m.mood);

    var newColors := m.colors[index := clampedColor];
    var newHarmony := if harmonyPreserved then m.harmony else Harmony.Custom;
    var newMood := if moodPreserved then m.mood else Mood.Custom;

    m.(colors := newColors, harmony := newHarmony, mood := newMood)
  }

  // ============================================================================
  // Normalize: Ensure invariant holds
  // ============================================================================

  function Normalize(m: Model): Model {
    // Ensure baseHue is in valid range
    var normalizedBaseHue := NormalizeHue(m.baseHue);

    // Ensure all colors are valid (clamped)
    // If we don't have exactly 5 colors, create defaults
    var normalizedColors :=
      if |m.colors| == 5 then [
        ClampColor(m.colors[0]),
        ClampColor(m.colors[1]),
        ClampColor(m.colors[2]),
        ClampColor(m.colors[3]),
        ClampColor(m.colors[4])
      ]
      else [
        Color(0, 0, 0),
        Color(0, 0, 0),
        Color(0, 0, 0),
        Color(0, 0, 0),
        Color(0, 0, 0)
      ];

    // Ensure contrast pair indices are valid
    var normalizedContrastPair :=
      if 0 <= m.contrastPair.0 < 5 && 0 <= m.contrastPair.1 < 5 then
        m.contrastPair
      else
        (0, 1);

    // If mood is not Custom, verify all colors satisfy it; otherwise switch to Custom
    var finalMood :=
      if m.mood == Mood.Custom then Mood.Custom
      else if AllColorsSatisfyMood(normalizedColors, m.mood) then m.mood
      else Mood.Custom;

    // If harmony is not Custom, verify hues match; otherwise switch to Custom
    var finalHarmony :=
      if m.harmony == Harmony.Custom then Harmony.Custom
      else if HuesMatchHarmony(normalizedColors, normalizedBaseHue, m.harmony) then m.harmony
      else Harmony.Custom;

    m.(
      baseHue := normalizedBaseHue,
      colors := normalizedColors,
      contrastPair := normalizedContrastPair,
      mood := finalMood,
      harmony := finalHarmony
    )
  }
}
