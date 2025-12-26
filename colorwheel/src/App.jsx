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

function ColorWheel() {
  const [h, setH] = useState(() => {
    console.log('Initializing app...');
    const initial = App.Init();
    console.log('Initial history:', initial);
    return initial;
  });

  const model = App.Present(h);
  console.log('Current model:', model);

  const dispatch = (action) => {
    console.log('Dispatching action:', action);
    const newH = App.Dispatch(h, action);
    console.log('New history:', newH);
    setH(newH);
  };
  const undo = () => setH(App.Undo(h));
  const redo = () => setH(App.Redo(h));

  return (
    <div className="app">
      <header>
        <h1>ColorWheel</h1>
        <p className="subtitle">Verified Color Palette Generator</p>
      </header>

      <div className="controls">
        <div className="control-group">
          <label>Mood: {getMoodName(model.mood)}</label>
          <div className="button-row">
            <button onClick={() => dispatch(App.RegenerateMood(App.Mood.Vibrant))}>Vibrant</button>
            <button onClick={() => dispatch(App.RegenerateMood(App.Mood.SoftMuted))}>Soft</button>
            <button onClick={() => dispatch(App.RegenerateMood(App.Mood.Pastel))}>Pastel</button>
            <button onClick={() => dispatch(App.RegenerateMood(App.Mood.DeepJewel))}>Deep</button>
            <button onClick={() => dispatch(App.RegenerateMood(App.Mood.Earth))}>Earth</button>
            <button onClick={() => dispatch(App.RegenerateMood(App.Mood.Neon))}>Neon</button>
          </div>
        </div>

        <div className="control-group">
          <label>Harmony: {getHarmonyName(model.harmony)}</label>
          <div className="button-row">
            <button onClick={() => dispatch(App.RegenerateHarmony(App.Harmony.Complementary))}>Complementary</button>
            <button onClick={() => dispatch(App.RegenerateHarmony(App.Harmony.Triadic))}>Triadic</button>
            <button onClick={() => dispatch(App.RegenerateHarmony(App.Harmony.Analogous))}>Analogous</button>
            <button onClick={() => dispatch(App.RegenerateHarmony(App.Harmony.SplitComplement))}>Split</button>
            <button onClick={() => dispatch(App.RegenerateHarmony(App.Harmony.Square))}>Square</button>
          </div>
        </div>

        <div className="control-group">
          <label>Base Hue: {model.baseHue}°</label>
          <button onClick={() => dispatch(App.RandomizeBaseHue())}>Randomize</button>
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
