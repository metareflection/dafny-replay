// App-specific convenience wrappers for colorwheel
// This file adds helpers on top of the generated app.js

import GeneratedApp from './app.js';

const { ColorWheelSpec } = GeneratedApp._internal;

// Re-export everything from generated app, plus extras
const App = {
  ...GeneratedApp,

  // Wrapper for SetColorDirect that accepts JSON color {h, s, l}
  SetColorDirect: (index, colorJson) => {
    const color = GeneratedApp.Color(colorJson.h, colorJson.s, colorJson.l);
    return GeneratedApp.SetColorDirect(index, color);
  },

  // Mood variants as objects (for App.Mood.Vibrant pattern)
  Mood: {
    Vibrant: ColorWheelSpec.Mood.create_Vibrant(),
    SoftMuted: ColorWheelSpec.Mood.create_SoftMuted(),
    Pastel: ColorWheelSpec.Mood.create_Pastel(),
    DeepJewel: ColorWheelSpec.Mood.create_DeepJewel(),
    Earth: ColorWheelSpec.Mood.create_Earth(),
    Neon: ColorWheelSpec.Mood.create_Neon(),
    Custom: ColorWheelSpec.Mood.create_Custom(),
  },

  // Harmony variants as objects (for App.Harmony.Complementary pattern)
  Harmony: {
    Complementary: ColorWheelSpec.Harmony.create_Complementary(),
    Triadic: ColorWheelSpec.Harmony.create_Triadic(),
    Analogous: ColorWheelSpec.Harmony.create_Analogous(),
    SplitComplement: ColorWheelSpec.Harmony.create_SplitComplement(),
    Square: ColorWheelSpec.Harmony.create_Square(),
    Custom: ColorWheelSpec.Harmony.create_Custom(),
  },
};

export default App;
