import { createContext, useContext, useState, useRef } from 'react';
import App from '../dafny/app.js';

const ColorWheelContext = createContext(null);

// Helper to convert HSL to CSS string
export const hslToCSS = (h, s, l) => `hsl(${h}, ${s}%, ${l}%)`;

// Helper to get mood name
export const getMoodName = (mood) => {
  if (!mood || mood.$tag === undefined) return 'Unknown';
  const tag = mood.$tag;
  if (tag === 0) return 'Vibrant';
  if (tag === 1) return 'Soft/Muted';
  if (tag === 2) return 'Pastel';
  if (tag === 3) return 'Deep/Jewel';
  if (tag === 4) return 'Earth';
  if (tag === 5) return 'Neon';
  return 'Custom';
};

// Helper to get harmony name
export const getHarmonyName = (harmony) => {
  if (!harmony || harmony.$tag === undefined) return 'Unknown';
  const tag = harmony.$tag;
  if (tag === 0) return 'Complementary';
  if (tag === 1) return 'Triadic';
  if (tag === 2) return 'Analogous';
  if (tag === 3) return 'Split-Complement';
  if (tag === 4) return 'Square';
  return 'Custom';
};

// Map mood tag to App.Mood object
export const getMoodByTag = (tag) => {
  switch (tag) {
    case 0: return App.Mood.Vibrant;
    case 1: return App.Mood.SoftMuted;
    case 2: return App.Mood.Pastel;
    case 3: return App.Mood.DeepJewel;
    case 4: return App.Mood.Earth;
    case 5: return App.Mood.Neon;
    default: return App.Mood.Vibrant;
  }
};

// Map harmony tag to App.Harmony object
export const getHarmonyByTag = (tag) => {
  switch (tag) {
    case 0: return App.Harmony.Complementary;
    case 1: return App.Harmony.Triadic;
    case 2: return App.Harmony.Analogous;
    case 3: return App.Harmony.SplitComplement;
    case 4: return App.Harmony.Square;
    default: return App.Harmony.Complementary;
  }
};

// Helper to convert BigNumber to JS number
const toNum = (bn) => (bn && typeof bn.toNumber === 'function') ? bn.toNumber() : bn;

// Convert Dafny model to plain JS object with native numbers
const convertModel = (dafnyModel) => {
  if (!dafnyModel) return null;

  // Convert colors array (Dafny seq)
  const colors = [];
  const dafnyColors = dafnyModel.dtor_colors;
  if (dafnyColors) {
    for (let i = 0; i < dafnyColors.length; i++) {
      const c = dafnyColors[i];
      colors.push({
        h: toNum(c.dtor_h),
        s: toNum(c.dtor_s),
        l: toNum(c.dtor_l),
      });
    }
  }

  // Convert contrast pair
  const cp = dafnyModel.dtor_contrastPair;
  const contrastPair = cp ? [toNum(cp[0]), toNum(cp[1])] : [0, 1];

  return {
    baseHue: toNum(dafnyModel.dtor_baseHue),
    mood: dafnyModel.dtor_mood,
    harmony: dafnyModel.dtor_harmony,
    colors,
    contrastPair,
    adjustmentH: toNum(dafnyModel.dtor_adjustmentH),
    adjustmentS: toNum(dafnyModel.dtor_adjustmentS),
    adjustmentL: toNum(dafnyModel.dtor_adjustmentL),
  };
};

// Generate 10 random seeds in [0, 100]
export const randomSeeds = () => Array.from({ length: 10 }, () => Math.floor(Math.random() * 101));

export function ColorWheelProvider({ children }) {
  const [h, setH] = useState(() => App.Init());
  // Use ref to track current state for chained dispatches in same event handler
  const hRef = useRef(h);
  hRef.current = h;

  const model = convertModel(App.Present(h));

  const dispatch = (action) => {
    const newH = App.Dispatch(hRef.current, action);
    hRef.current = newH;
    setH(newH);
  };

  const preview = (action) => {
    const newH = App.Preview(hRef.current, action);
    hRef.current = newH;
    setH(newH);
  };

  const commitFrom = (baseline) => {
    const newH = App.CommitFrom(hRef.current, baseline);
    hRef.current = newH;
    setH(newH);
  };

  const getRawPresent = () => App.Present(hRef.current);

  const undo = () => {
    const newH = App.Undo(hRef.current);
    hRef.current = newH;
    setH(newH);
  };
  const redo = () => {
    const newH = App.Redo(hRef.current);
    hRef.current = newH;
    setH(newH);
  };
  const canUndo = App.CanUndo(h);
  const canRedo = App.CanRedo(h);

  const value = {
    model,
    dispatch,
    preview,
    commitFrom,
    getRawPresent,
    undo,
    redo,
    canUndo,
    canRedo,
    App, // expose App for action constructors
  };

  return (
    <ColorWheelContext.Provider value={value}>
      {children}
    </ColorWheelContext.Provider>
  );
}

export function useColorWheel() {
  const context = useContext(ColorWheelContext);
  if (!context) {
    throw new Error('useColorWheel must be used within a ColorWheelProvider');
  }
  return context;
}
