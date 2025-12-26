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

// Helper to get adjustment mode name
const getAdjustmentModeName = (mode) => {
  if (!mode || mode.$tag === undefined) return 'Unknown';
  return mode.$tag === 0 ? 'Linked' : 'Independent';
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

  // Handle adjustment mode toggle
  const handleAdjustmentModeChange = (mode) => {
    const modeValue = mode === 'linked' ? App.AdjustmentMode.Linked : App.AdjustmentMode.Independent;
    dispatch(App.SetAdjustmentMode(modeValue));
  };

  // Get current adjustment mode tag (0 = Linked, 1 = Independent)
  const currentModeTag = model.adjustmentMode?.$tag ?? 1;

  // Handle contrast pair selection
  const handleContrastPairChange = (fg, bg) => {
    dispatch(App.SelectContrastPair(fg, bg));
  };

  // Get current contrast pair
  const [contrastFg, contrastBg] = model.contrastPair || [0, 1];

  // State for color adjustment controls
  const [adjustIndex, setAdjustIndex] = useState(0);
  const [deltaH, setDeltaH] = useState(0);
  const [deltaS, setDeltaS] = useState(0);
  const [deltaL, setDeltaL] = useState(0);

  // Handle color adjustment
  const handleAdjustColor = () => {
    if (deltaH !== 0 || deltaS !== 0 || deltaL !== 0) {
      dispatch(App.AdjustColor(adjustIndex, deltaH, deltaS, deltaL));
      // Reset sliders after applying
      setDeltaH(0);
      setDeltaS(0);
      setDeltaL(0);
    }
  };

  // State for direct color setting
  const [directIndex, setDirectIndex] = useState(0);
  const [directH, setDirectH] = useState(model.colors[0]?.h ?? 180);
  const [directS, setDirectS] = useState(model.colors[0]?.s ?? 70);
  const [directL, setDirectL] = useState(model.colors[0]?.l ?? 50);

  // Handle direct color index change - sync sliders to current color
  const handleDirectIndexChange = (i) => {
    setDirectIndex(i);
    setDirectH(model.colors[i].h);
    setDirectS(model.colors[i].s);
    setDirectL(model.colors[i].l);
  };

  // Handle set color direct
  const handleSetColorDirect = () => {
    dispatch(App.SetColorDirect(directIndex, directH, directS, directL));
  };

  // Check if direct color differs from current
  const directColorChanged =
    directH !== model.colors[directIndex]?.h ||
    directS !== model.colors[directIndex]?.s ||
    directL !== model.colors[directIndex]?.l;

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

        <div className="control-group">
          <label>Adjustment Mode</label>
          <div className="mode-toggle">
            <button
              className={`mode-btn ${currentModeTag === 0 ? 'active' : ''}`}
              onClick={() => handleAdjustmentModeChange('linked')}
            >
              Linked
            </button>
            <button
              className={`mode-btn ${currentModeTag === 1 ? 'active' : ''}`}
              onClick={() => handleAdjustmentModeChange('independent')}
            >
              Independent
            </button>
          </div>
          <span className="mode-hint">
            {currentModeTag === 0
              ? 'All colors adjust together'
              : 'Each color adjusts independently'}
          </span>
        </div>
      </div>

      <div className="palette">
        {model.colors.map((color, i) => (
          <div
            key={i}
            className={`color-swatch ${i === contrastFg ? 'selected-fg' : ''} ${i === contrastBg ? 'selected-bg' : ''}`}
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

      <div className="contrast-section">
        <h3>Contrast Pair</h3>
        <div className="contrast-controls">
          <div className="contrast-picker">
            <label>Foreground</label>
            <div className="color-buttons">
              {model.colors.map((color, i) => (
                <button
                  key={i}
                  className={`color-pick-btn ${i === contrastFg ? 'active' : ''}`}
                  style={{ backgroundColor: hslToCSS(color.h, color.s, color.l) }}
                  onClick={() => handleContrastPairChange(i, contrastBg)}
                  title={`Color ${i + 1}`}
                />
              ))}
            </div>
          </div>
          <div className="contrast-picker">
            <label>Background</label>
            <div className="color-buttons">
              {model.colors.map((color, i) => (
                <button
                  key={i}
                  className={`color-pick-btn ${i === contrastBg ? 'active' : ''}`}
                  style={{ backgroundColor: hslToCSS(color.h, color.s, color.l) }}
                  onClick={() => handleContrastPairChange(contrastFg, i)}
                  title={`Color ${i + 1}`}
                />
              ))}
            </div>
          </div>
          <div className="contrast-preview">
            <div
              className="preview-box"
              style={{
                backgroundColor: hslToCSS(
                  model.colors[contrastBg].h,
                  model.colors[contrastBg].s,
                  model.colors[contrastBg].l
                ),
                color: hslToCSS(
                  model.colors[contrastFg].h,
                  model.colors[contrastFg].s,
                  model.colors[contrastFg].l
                ),
              }}
            >
              Sample Text
            </div>
          </div>
        </div>
      </div>

      <div className="adjust-section">
        <h3>Adjust Colors</h3>
        <p className="adjust-mode-note">
          Mode: <strong>{currentModeTag === 0 ? 'Linked' : 'Independent'}</strong>
          {currentModeTag === 0
            ? ' - adjustments apply to all colors'
            : ' - adjustments apply to selected color only'}
        </p>

        {currentModeTag === 1 && (
          <div className="adjust-color-select">
            <label>Select Color to Adjust</label>
            <div className="color-buttons">
              {model.colors.map((color, i) => (
                <button
                  key={i}
                  className={`color-pick-btn ${i === adjustIndex ? 'active' : ''}`}
                  style={{ backgroundColor: hslToCSS(color.h, color.s, color.l) }}
                  onClick={() => setAdjustIndex(i)}
                  title={`Color ${i + 1}`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="adjust-sliders">
          <div className="adjust-slider-group">
            <label>
              Hue: <span className={deltaH > 0 ? 'positive' : deltaH < 0 ? 'negative' : ''}>{deltaH > 0 ? '+' : ''}{deltaH}°</span>
            </label>
            <input
              type="range"
              min="-180"
              max="180"
              value={deltaH}
              onChange={(e) => setDeltaH(Number(e.target.value))}
              className="adjust-slider hue-adjust"
            />
          </div>

          <div className="adjust-slider-group">
            <label>
              Saturation: <span className={deltaS > 0 ? 'positive' : deltaS < 0 ? 'negative' : ''}>{deltaS > 0 ? '+' : ''}{deltaS}%</span>
            </label>
            <input
              type="range"
              min="-50"
              max="50"
              value={deltaS}
              onChange={(e) => setDeltaS(Number(e.target.value))}
              className="adjust-slider sat-adjust"
            />
          </div>

          <div className="adjust-slider-group">
            <label>
              Lightness: <span className={deltaL > 0 ? 'positive' : deltaL < 0 ? 'negative' : ''}>{deltaL > 0 ? '+' : ''}{deltaL}%</span>
            </label>
            <input
              type="range"
              min="-50"
              max="50"
              value={deltaL}
              onChange={(e) => setDeltaL(Number(e.target.value))}
              className="adjust-slider light-adjust"
            />
          </div>
        </div>

        <button
          className="apply-adjust-btn"
          onClick={handleAdjustColor}
          disabled={deltaH === 0 && deltaS === 0 && deltaL === 0}
        >
          Apply Adjustment
        </button>
      </div>

      <div className="direct-color-section">
        <h3>Set Color Directly</h3>
        <p className="direct-note">Pick a color and set exact HSL values</p>

        <div className="direct-color-select">
          <label>Select Color to Edit</label>
          <div className="color-buttons">
            {model.colors.map((color, i) => (
              <button
                key={i}
                className={`color-pick-btn ${i === directIndex ? 'active' : ''}`}
                style={{ backgroundColor: hslToCSS(color.h, color.s, color.l) }}
                onClick={() => handleDirectIndexChange(i)}
                title={`Color ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="direct-editor">
          <div className="direct-preview-container">
            <div className="direct-preview-label">Preview</div>
            <div
              className="direct-preview"
              style={{ backgroundColor: hslToCSS(directH, directS, directL) }}
            />
            <div className="direct-preview-values">
              H: {directH}° S: {directS}% L: {directL}%
            </div>
          </div>

          <div className="direct-sliders">
            <div className="direct-slider-group">
              <label>Hue: {directH}°</label>
              <input
                type="range"
                min="0"
                max="359"
                value={directH}
                onChange={(e) => setDirectH(Number(e.target.value))}
                className="direct-slider hue-direct"
              />
            </div>

            <div className="direct-slider-group">
              <label>Saturation: {directS}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={directS}
                onChange={(e) => setDirectS(Number(e.target.value))}
                className="direct-slider sat-direct"
              />
            </div>

            <div className="direct-slider-group">
              <label>Lightness: {directL}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={directL}
                onChange={(e) => setDirectL(Number(e.target.value))}
                className="direct-slider light-direct"
              />
            </div>
          </div>
        </div>

        <button
          className="set-color-btn"
          onClick={handleSetColorDirect}
          disabled={!directColorChanged}
        >
          Set Color
        </button>
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
