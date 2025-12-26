import { useState } from 'react'
import App from './dafny/app.js'
import './App.css'

// Helper to convert HSL to CSS string
const hslToCSS = (h, s, l) => `hsl(${h}, ${s}%, ${l}%)`;

// Helper to get mood name
const getMoodName = (mood) => {
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
const getHarmonyName = (harmony) => {
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
const getMoodByTag = (tag) => {
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
const getHarmonyByTag = (tag) => {
  switch (tag) {
    case 0: return App.Harmony.Complementary;
    case 1: return App.Harmony.Triadic;
    case 2: return App.Harmony.Analogous;
    case 3: return App.Harmony.SplitComplement;
    case 4: return App.Harmony.Square;
    default: return App.Harmony.Complementary;
  }
};

function ColorWheel() {
  const [h, setH] = useState(() => {
    console.log('Initializing app...');
    const initial = App.Init();
    console.log('Initial history:', initial);
    return initial;
  });

  const model = App.Present(h);
  console.log('Current model:', model);

  // Local state for selections (before Generate is clicked)
  const [selectedMoodTag, setSelectedMoodTag] = useState(model.mood?.$tag ?? 0);
  const [selectedHarmonyTag, setSelectedHarmonyTag] = useState(model.harmony?.$tag ?? 0);

  const dispatch = (action) => {
    console.log('Dispatching action:', action);
    const newH = App.Dispatch(h, action);
    console.log('New history:', newH);
    setH(newH);
  };
  const undo = () => setH(App.Undo(h));
  const redo = () => setH(App.Redo(h));

  // Check if selected settings match current model (for Generate vs Shift label)
  const isShift =
    selectedMoodTag === (model.mood?.$tag ?? -1) &&
    selectedHarmonyTag === (model.harmony?.$tag ?? -1);

  // Generate/Shift: regenerates S/L values with current base hue
  const handleGenerateOrShift = () => {
    const mood = getMoodByTag(selectedMoodTag);
    const harmony = getHarmonyByTag(selectedHarmonyTag);
    dispatch(App.GeneratePalette(model.baseHue, mood, harmony));
  };

  // Re-generate: picks new random base hue for completely new palette
  const handleRegenerate = () => {
    dispatch(App.RandomizeBaseHue());
  };

  // Handle manual base hue change from slider
  const handleHueChange = (newHue) => {
    const mood = getMoodByTag(selectedMoodTag);
    const harmony = getHarmonyByTag(selectedHarmonyTag);
    dispatch(App.GeneratePalette(newHue, mood, harmony));
  };

  return (
    <div className="app">
      <header>
        <h1>ColorWheel</h1>
        <p className="subtitle">Verified Color Palette Generator</p>
      </header>

      <div className="controls">
        <div className="control-row">
          <div className="control-group">
            <label htmlFor="mood-select">Mood</label>
            <select
              id="mood-select"
              value={selectedMoodTag}
              onChange={(e) => setSelectedMoodTag(Number(e.target.value))}
            >
              <option value={0}>Vibrant</option>
              <option value={1}>Soft/Muted</option>
              <option value={2}>Pastel</option>
              <option value={3}>Deep/Jewel</option>
              <option value={4}>Earth</option>
              <option value={5}>Neon</option>
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="harmony-select">Harmony</label>
            <select
              id="harmony-select"
              value={selectedHarmonyTag}
              onChange={(e) => setSelectedHarmonyTag(Number(e.target.value))}
            >
              <option value={0}>Complementary</option>
              <option value={1}>Triadic</option>
              <option value={2}>Analogous</option>
              <option value={3}>Split-Complement</option>
              <option value={4}>Square</option>
            </select>
          </div>

          <button className="generate-btn" onClick={handleGenerateOrShift}>
            {isShift ? 'Shift' : 'Generate'}
          </button>

          <button className="regenerate-btn" onClick={handleRegenerate}>
            Re-generate
          </button>
        </div>

        <div className="control-group hue-control">
          <label htmlFor="hue-slider">Base Hue: {model.baseHue}°</label>
          <div className="hue-slider-container">
            <input
              type="range"
              id="hue-slider"
              className="hue-slider"
              min="0"
              max="359"
              value={model.baseHue}
              onChange={(e) => handleHueChange(Number(e.target.value))}
            />
            <div
              className="hue-indicator"
              style={{ backgroundColor: `hsl(${model.baseHue}, 100%, 50%)` }}
            />
          </div>
        </div>

        <div className="current-settings">
          <span>Current: {getMoodName(model.mood)} + {getHarmonyName(model.harmony)}</span>
        </div>
      </div>

      <div className="palette">
        {model.colors.map((color, i) => (
          <div
            key={i}
            className="color-swatch"
            style={{ backgroundColor: hslToCSS(color.h, color.s, color.l) }}
          >
            <div className="color-info">
              <div>H: {color.h}°</div>
              <div>S: {color.s}%</div>
              <div>L: {color.l}%</div>
            </div>
          </div>
        ))}
      </div>

      <div className="history-controls">
        <button onClick={undo} disabled={!App.CanUndo(h)}>Undo</button>
        <button onClick={redo} disabled={!App.CanRedo(h)}>Redo</button>
      </div>

      <footer>
        <p className="info">
          All state transitions are verified by Dafny.
          <br />
          Mood and harmony constraints are preserved by construction.
        </p>
      </footer>
    </div>
  );
}

export default ColorWheel;
