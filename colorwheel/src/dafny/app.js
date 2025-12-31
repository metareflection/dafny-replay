// ESM wrapper for Dafny-generated ColorWheel AppCore
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

const { _dafny, ColorWheelSpec, AppCore } = initDafny(require);

// Helper to convert JS number to BigNumber for Dafny
const bn = (n) => new BigNumber(n);

// Helper to create Dafny sequence from JS array of BigNumbers
const seq = (arr) => _dafny.Seq.of(...arr);

// Create a clean API wrapper
const App = {
  // Initialize a new history
  Init: () => AppCore.__default.Init(),

  // Action constructors
  GeneratePalette: (baseHue, mood, harmony, randomSeeds) =>
    AppCore.__default.GeneratePalette(bn(baseHue), mood, harmony, seq(randomSeeds.map(bn))),

  AdjustColor: (index, deltaH, deltaS, deltaL) =>
    AppCore.__default.AdjustColor(bn(index), bn(deltaH), bn(deltaS), bn(deltaL)),

  AdjustPalette: (deltaH, deltaS, deltaL) =>
    AppCore.__default.AdjustPalette(bn(deltaH), bn(deltaS), bn(deltaL)),

  SetAdjustmentMode: (mode) =>
    AppCore.__default.SetAdjustmentMode(mode),

  SelectContrastPair: (fg, bg) =>
    AppCore.__default.SelectContrastPair(bn(fg), bn(bg)),

  SetColorDirect: (index, color) =>
    AppCore.__default.SetColorDirect(bn(index), ColorWheelSpec.Color.create_Color(bn(color.h), bn(color.s), bn(color.l))),

  RegenerateMood: (mood, randomSeeds) =>
    AppCore.__default.RegenerateMood(mood, seq(randomSeeds.map(bn))),

  RegenerateHarmony: (harmony, randomSeeds) =>
    AppCore.__default.RegenerateHarmony(harmony, seq(randomSeeds.map(bn))),

  RandomizeBaseHue: (newBaseHue, randomSeeds) =>
    AppCore.__default.RandomizeBaseHue(bn(newBaseHue), seq(randomSeeds.map(bn))),

  // State transitions
  Dispatch: (h, a) => AppCore.__default.Dispatch(h, a),
  Preview: (h, a) => AppCore.__default.Preview(h, a),
  CommitFrom: (h, baseline) => AppCore.__default.CommitFrom(h, baseline),
  Undo: (h) => AppCore.__default.Undo(h),
  Redo: (h) => AppCore.__default.Redo(h),

  // Selectors
  Present: (h) => AppCore.__default.Present(h),
  CanUndo: (h) => AppCore.__default.CanUndo(h),
  CanRedo: (h) => AppCore.__default.CanRedo(h),

  // Types - expose Dafny type singletons for use in React
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
  Color: ColorWheelSpec.Color,
};

export default App;
