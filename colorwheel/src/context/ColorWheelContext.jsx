import { createContext, useContext, useState } from 'react';
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

// Helper to get adjustment mode name
export const getAdjustmentModeName = (mode) => {
  if (!mode || mode.$tag === undefined) return 'Unknown';
  return mode.$tag === 0 ? 'Linked' : 'Independent';
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

export function ColorWheelProvider({ children }) {
  const [h, setH] = useState(() => App.Init());

  const model = App.Present(h);

  const dispatch = (action) => {
    const newH = App.Dispatch(h, action);
    setH(newH);
  };

  const undo = () => setH(App.Undo(h));
  const redo = () => setH(App.Redo(h));
  const canUndo = App.CanUndo(h);
  const canRedo = App.CanRedo(h);

  const value = {
    model,
    dispatch,
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
