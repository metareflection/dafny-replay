import { useState } from 'react';
import { useColorWheel, getMoodName, getHarmonyName, getMoodByTag, getHarmonyByTag, randomSeeds } from '../context/ColorWheelContext';

export function GenerateSection() {
  const { model, dispatch, App } = useColorWheel();

  const [selectedMoodTag, setSelectedMoodTag] = useState(model.mood?.$tag ?? 0);
  const [selectedHarmonyTag, setSelectedHarmonyTag] = useState(model.harmony?.$tag ?? 0);

  const isShift =
    selectedMoodTag === (model.mood?.$tag ?? -1) &&
    selectedHarmonyTag === (model.harmony?.$tag ?? -1);

  const handleGenerateOrShift = () => {
    const mood = getMoodByTag(selectedMoodTag);
    const harmony = getHarmonyByTag(selectedHarmonyTag);
    dispatch(App.GeneratePalette(model.baseHue, mood, harmony, randomSeeds()));
  };

  const handleRegenerate = () => {
    const newHue = Math.floor(Math.random() * 360);
    dispatch(App.RandomizeBaseHue(newHue, randomSeeds()));
  };

  const handleHueChange = (newHue) => {
    const mood = getMoodByTag(selectedMoodTag);
    const harmony = getHarmonyByTag(selectedHarmonyTag);
    dispatch(App.GeneratePalette(newHue, mood, harmony, randomSeeds()));
  };

  return (
    <section className="section">
      <h3>Generate</h3>
      <div className="field">
        <label>Mood</label>
        <select
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
      <div className="field">
        <label>Harmony</label>
        <select
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
      <div className="field">
        <label>Base Hue: {model.baseHue}°</label>
        <input
          type="range"
          className="hue-slider"
          min="0"
          max="359"
          value={model.baseHue}
          onChange={(e) => handleHueChange(Number(e.target.value))}
        />
      </div>
      <div className="button-row">
        <button className="btn btn-primary" onClick={handleGenerateOrShift}>
          {isShift ? 'Shift' : 'Generate'}
        </button>
        <button className="btn" onClick={handleRegenerate}>
          Randomize
        </button>
      </div>
      <div className="status-text">
        {getMoodName(model.mood)} + {getHarmonyName(model.harmony)}
      </div>
    </section>
  );
}
