// ESM wrapper for Dafny-generated AppCore
// Provides a clean API for React without modifying generated code

import BigNumber from 'bignumber.js';

// Configure BigNumber as Dafny expects
BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

// Import the generated code as raw text
import colorWheelCode from './ColorWheel.cjs?raw';

// Set up the environment and evaluate the Dafny code
const require = (mod) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(`Unknown module: ${mod}`);
};

// Create a function that evaluates the code with proper scope
const initDafny = new Function('require', `
  ${colorWheelCode}
  return { _dafny, ColorWheelSpec, ColorWheelDomain, ColorWheelKernel, AppCore };
`);

const { _dafny, AppCore, ColorWheelSpec } = initDafny(require);

// Helper to convert BigNumber to JS number
const toNumber = (bn) => bn.toNumber ? bn.toNumber() : bn;

// Helper to create random seeds (Dafny needs BigNumbers in a Seq)
const randomSeeds = () => {
  const seeds = Array(10).fill(0).map(() => new BigNumber(Math.floor(Math.random() * 101)));
  return _dafny.Seq.of(...seeds);
};

// Create a clean API wrapper
const App = {
  // Initialize a new history
  Init: () => AppCore.__default.Init(),

  // Action constructors
  GeneratePalette: (baseHue, mood, harmony) =>
    AppCore.__default.GeneratePalette(new BigNumber(baseHue), mood, harmony, randomSeeds()),

  AdjustColor: (index, deltaH, deltaS, deltaL) =>
    AppCore.__default.AdjustColor(new BigNumber(index), new BigNumber(deltaH), new BigNumber(deltaS), new BigNumber(deltaL)),

  SetAdjustmentMode: (mode) =>
    AppCore.__default.SetAdjustmentMode(mode),

  SelectContrastPair: (fg, bg) =>
    AppCore.__default.SelectContrastPair(new BigNumber(fg), new BigNumber(bg)),

  SetColorDirect: (index, h, s, l) =>
    AppCore.__default.SetColorDirect(
      new BigNumber(index),
      ColorWheelSpec.Color.create_Color(new BigNumber(h), new BigNumber(s), new BigNumber(l))
    ),

  RegenerateMood: (mood) =>
    AppCore.__default.RegenerateMood(mood, randomSeeds()),

  RegenerateHarmony: (harmony) =>
    AppCore.__default.RegenerateHarmony(harmony, randomSeeds()),

  RandomizeBaseHue: () =>
    AppCore.__default.RandomizeBaseHue(new BigNumber(Math.floor(Math.random() * 360)), randomSeeds()),

  // State transitions
  Dispatch: (h, a) => AppCore.__default.Dispatch(h, a),
  Undo: (h) => AppCore.__default.Undo(h),
  Redo: (h) => AppCore.__default.Redo(h),

  // Selectors
  Present: (h) => {
    const model = AppCore.__default.Present(h);
    console.log('Raw model from Dafny:', model);

    // Extract colors from Dafny sequence
    const colors = [];
    for (let i = 0; i < model.dtor_colors.length; i++) {
      const c = model.dtor_colors[i];
      colors.push({
        h: toNumber(c.dtor_h),
        s: toNumber(c.dtor_s),
        l: toNumber(c.dtor_l),
      });
    }

    const result = {
      baseHue: toNumber(model.dtor_baseHue),
      mood: model.dtor_mood,
      harmony: model.dtor_harmony,
      colors: colors,
      adjustmentMode: model.dtor_adjustmentMode,
      contrastPair: [toNumber(model.dtor_contrastPair[0]), toNumber(model.dtor_contrastPair[1])],
    };

    console.log('Converted model:', result);
    return result;
  },
  CanUndo: (h) => AppCore.__default.CanUndo(h),
  CanRedo: (h) => AppCore.__default.CanRedo(h),

  // Datatype constructors
  Mood: {
    Vibrant: ColorWheelSpec.Mood.create_Vibrant(),
    SoftMuted: ColorWheelSpec.Mood.create_SoftMuted(),
    Pastel: ColorWheelSpec.Mood.create_Pastel(),
    DeepJewel: ColorWheelSpec.Mood.create_DeepJewel(),
    Earth: ColorWheelSpec.Mood.create_Earth(),
    Neon: ColorWheelSpec.Mood.create_Neon(),
    Custom: ColorWheelSpec.Mood.create_Custom(),
  },

  Harmony: {
    Complementary: ColorWheelSpec.Harmony.create_Complementary(),
    Triadic: ColorWheelSpec.Harmony.create_Triadic(),
    Analogous: ColorWheelSpec.Harmony.create_Analogous(),
    SplitComplement: ColorWheelSpec.Harmony.create_SplitComplement(),
    Square: ColorWheelSpec.Harmony.create_Square(),
    Custom: ColorWheelSpec.Harmony.create_Custom(),
  },

  AdjustmentMode: {
    Linked: ColorWheelSpec.AdjustmentMode.create_Linked(),
    Independent: ColorWheelSpec.AdjustmentMode.create_Independent(),
  },
};

export default App;
