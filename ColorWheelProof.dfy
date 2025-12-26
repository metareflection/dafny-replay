include "ColorWheelSpec.dfy"

module ColorWheelProof {
  import opened CWSpec = ColorWheelSpec

  lemma StepPreservesInv(m: Model, a: Action)
  requires Inv(m)
  ensures Inv(Normalize(Apply(m, a)))
  {
    var applied := Apply(m, a);
    var normalized := Normalize(applied);

    // The key insight: Normalize is designed to ensure the invariant holds.
    // We prove each part of the invariant separately.

    NormalizeEnsuresValidBaseHue(applied);
    NormalizeEnsuresColorCount(applied);
    NormalizeEnsuresValidColors(applied);
    NormalizeEnsuresValidContrastPair(applied);
    NormalizeEnsuresMoodConstraint(applied);
    NormalizeEnsuresHarmonyConstraint(applied);
  }

  // Helper lemma: NormalizeHue produces a valid hue in [0, 360)
  lemma NormalizeHueValid(h: int)
  ensures 0 <= NormalizeHue(h) < 360
  {
    var normalized := h % 360;
    if normalized < 0 {
      assert normalized + 360 >= 0;
      assert normalized + 360 < 360;
    } else {
      assert 0 <= normalized < 360;
    }
  }

  lemma NormalizeEnsuresValidBaseHue(m: Model)
  ensures ValidBaseHue(Normalize(m).baseHue)
  {
    NormalizeHueValid(m.baseHue);
  }

  lemma NormalizeEnsuresColorCount(m: Model)
  ensures |Normalize(m).colors| == 5
  {
    // Normalize explicitly constructs a 5-element sequence
  }

  lemma ClampColorValid(c: Color)
  ensures ValidColor(ClampColor(c))
  {
    NormalizeHueValid(c.h);
    // Clamp ensures s and l are in [0, 100]
  }

  lemma NormalizeEnsuresValidColors(m: Model)
  ensures forall i | 0 <= i < 5 :: ValidColor(Normalize(m).colors[i])
  {
    var normalized := Normalize(m);
    if |m.colors| == 5 {
      ClampColorValid(m.colors[0]);
      ClampColorValid(m.colors[1]);
      ClampColorValid(m.colors[2]);
      ClampColorValid(m.colors[3]);
      ClampColorValid(m.colors[4]);
    } else {
      // Default colors Color(0,0,0) are valid
    }
  }

  lemma NormalizeEnsuresValidContrastPair(m: Model)
  ensures 0 <= Normalize(m).contrastPair.0 < 5
  ensures 0 <= Normalize(m).contrastPair.1 < 5
  {
    // Normalize checks bounds and falls back to (0, 1) if invalid
  }

  // Compute normalizedColors as done in Normalize
  function NormalizedColors(m: Model): seq<Color> {
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
    ]
  }

  // Key helper: Normalize(m).colors == NormalizedColors(m)
  lemma NormalizeColorsEquality(m: Model)
  ensures Normalize(m).colors == NormalizedColors(m)
  {
    // Should follow directly from Normalize's definition
  }

  // Key lemma: if Normalize(m).mood != Custom, then the check on colors passed
  lemma NormalizeMoodImpliesCheck(m: Model)
  requires Normalize(m).mood != Mood.Custom
  ensures m.mood != Mood.Custom
  ensures Normalize(m).mood == m.mood
  ensures AllColorsSatisfyMood(NormalizedColors(m), m.mood)
  {
    // From Normalize's definition, mood can only be non-Custom if:
    // 1. m.mood != Custom (otherwise first branch gives Custom)
    // 2. The forall check passed (otherwise last branch gives Custom)
    // 3. In that case, Normalize(m).mood == m.mood

    var nc := NormalizedColors(m);
    NormalizeColorsEquality(m);
    assert Normalize(m).colors == nc;

    // Case analysis on m.mood
    if m.mood == Mood.Custom {
      // Then Normalize(m).mood == Custom, contradicting requires
      assert false;
    }

    // m.mood != Custom, so Normalize's finalMood was computed as:
    // if (forall check) then m.mood else Custom
    // Since Normalize(m).mood != Custom, the check must have passed

    // The check is on Normalize's internal normalizedColors, which equals nc
    // So MoodCheckPasses(nc, m.mood) must be true

    // Expand what Normalize computes for the colors and mood
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

    // These are the same
    assert normalizedColors == nc;

    // The forall check Normalize uses internally
    var internalCheck := forall i | 0 <= i < 5 :: ColorSatisfiesMood(normalizedColors[i], m.mood);

    // This is equivalent to AllColorsSatisfyMood since sequences are equal
    assert internalCheck == AllColorsSatisfyMood(nc, m.mood);

    // Normalize's mood result depends on this internal check
    // If m.mood != Custom and internalCheck is true, result is m.mood
    // If m.mood != Custom and internalCheck is false, result is Custom

    // Compute what Normalize's finalMood would be
    var finalMood :=
      if m.mood == Mood.Custom then Mood.Custom
      else if internalCheck then m.mood
      else Mood.Custom;

    // Try to help Dafny see that Normalize(m).mood == finalMood
    // by computing all other fields too
    var normalizedBaseHue := NormalizeHue(m.baseHue);
    var normalizedContrastPair :=
      if 0 <= m.contrastPair.0 < 5 && 0 <= m.contrastPair.1 < 5 then m.contrastPair
      else (0, 1);
    var finalHarmony :=
      if m.harmony == Harmony.Custom then Harmony.Custom
      else if HuesMatchHarmony(normalizedColors, normalizedBaseHue, m.harmony) then m.harmony
      else Harmony.Custom;

    // Assert each field (some may succeed, helping with the others)
    assert Normalize(m).baseHue == normalizedBaseHue;
    assert Normalize(m).colors == normalizedColors;
    assert Normalize(m).contrastPair == normalizedContrastPair;
    assert Normalize(m).harmony == finalHarmony;

    // Now Normalize uses AllColorsSatisfyMood which we can call directly
    // Dafny can connect the predicate call in Normalize with ours
    assert Normalize(m).mood == finalMood;

    // Since Normalize(m).mood != Custom (from requires) and m.mood != Custom,
    // finalMood must equal m.mood, which means internalCheck was true
    assert AllColorsSatisfyMood(nc, m.mood);
  }

  lemma NormalizeEnsuresMoodConstraint(m: Model)
  ensures Normalize(m).mood != Mood.Custom ==>
          forall i | 0 <= i < 5 :: ColorSatisfiesMood(Normalize(m).colors[i], Normalize(m).mood)
  {
    if Normalize(m).mood != Mood.Custom {
      NormalizeMoodImpliesCheck(m);
      NormalizeColorsEquality(m);
      // Now: Normalize(m).colors == NormalizedColors(m)
      // And: forall i :: ColorSatisfiesMood(NormalizedColors(m)[i], m.mood)
      // And: Normalize(m).mood == m.mood
      assert forall i | 0 <= i < 5 :: ColorSatisfiesMood(Normalize(m).colors[i], Normalize(m).mood);
    }
  }

  lemma NormalizeEnsuresHarmonyConstraint(m: Model)
  ensures HuesMatchHarmony(Normalize(m).colors, Normalize(m).baseHue, Normalize(m).harmony)
  {
    var normalized := Normalize(m);
    // If harmony is Custom, HuesMatchHarmony is trivially true
    // Otherwise, Normalize verifies hues match or switches to Custom
  }
}
