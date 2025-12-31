include "Replay.dfy"
include "ColorWheelSpec.dfy"
include "ColorWheelProof.dfy"

module ColorWheelDomain refines Domain {
  import opened CWSpec = ColorWheelSpec
  import opened Proof = ColorWheelProof

  type Model = CWSpec.Model
  type Action = CWSpec.Action

  ghost predicate Inv(m: Model) {
    CWSpec.Inv(m)
  }

  function Init(): Model {
    CWSpec.Init()
  }

  function Apply(m: Model, a: Action): Model {
    CWSpec.Apply(m, a)
  }

  function Normalize(m: Model): Model {
    CWSpec.Normalize(m)
  }

  lemma InitSatisfiesInv()
    ensures Inv(Init())
  {
    Proof.InitSatisfiesInv();
  }

  lemma StepPreservesInv(m: Model, a: Action)
  {
    Proof.StepPreservesInv(m, a);
  }
}

module ColorWheelKernel refines Kernel {
  import D = ColorWheelDomain
}

module AppCore {
  import K = ColorWheelKernel
  import D = ColorWheelDomain
  import CWSpec = ColorWheelSpec

  // Initialize with a default palette
  function Init(): K.History {
    K.InitHistory()
  }

  // Action constructors
  function GeneratePalette(baseHue: int, mood: CWSpec.Mood, harmony: CWSpec.Harmony, randomSeeds: seq<int>): D.Action {
    CWSpec.GeneratePalette(baseHue, mood, harmony, randomSeeds)
  }

  function AdjustColor(index: int, deltaH: int, deltaS: int, deltaL: int): D.Action {
    CWSpec.AdjustColor(index, deltaH, deltaS, deltaL)
  }

  // AdjustPalette: Always applies linked adjustment to ALL colors, regardless of mode
  function AdjustPalette(deltaH: int, deltaS: int, deltaL: int): D.Action {
    CWSpec.AdjustPalette(deltaH, deltaS, deltaL)
  }

  function SetAdjustmentMode(mode: CWSpec.AdjustmentMode): D.Action {
    CWSpec.SetAdjustmentMode(mode)
  }

  function SelectContrastPair(fg: int, bg: int): D.Action {
    CWSpec.SelectContrastPair(fg, bg)
  }

  function SetColorDirect(index: int, color: CWSpec.Color): D.Action {
    CWSpec.SetColorDirect(index, color)
  }

  function RegenerateMood(mood: CWSpec.Mood, randomSeeds: seq<int>): D.Action {
    CWSpec.RegenerateMood(mood, randomSeeds)
  }

  function RegenerateHarmony(harmony: CWSpec.Harmony, randomSeeds: seq<int>): D.Action {
    CWSpec.RegenerateHarmony(harmony, randomSeeds)
  }

  function RandomizeBaseHue(newBaseHue: int, randomSeeds: seq<int>): D.Action {
    CWSpec.RandomizeBaseHue(newBaseHue, randomSeeds)
  }

  // State transitions
  function Dispatch(h: K.History, a: D.Action): K.History requires K.HistInv(h) { K.Do(h, a) }
  function Undo(h: K.History): K.History { K.Undo(h) }
  function Redo(h: K.History): K.History { K.Redo(h) }

  // Selectors
  function Present(h: K.History): D.Model { h.present }
  function CanUndo(h: K.History): bool { |h.past| > 0 }
  function CanRedo(h: K.History): bool { |h.future| > 0 }
}
