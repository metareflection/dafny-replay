import { useState } from 'react';
import { useColorWheel } from '../context/ColorWheelContext';

export function AdjustSection() {
  const { dispatch, App } = useColorWheel();

  // Slider positions (total adjustment from baseline)
  const [sliderH, setSliderH] = useState(0);
  const [sliderS, setSliderS] = useState(0);
  const [sliderL, setSliderL] = useState(0);
  // Track what we've already applied (to compute incremental deltas)
  const [appliedH, setAppliedH] = useState(0);
  const [appliedS, setAppliedS] = useState(0);
  const [appliedL, setAppliedL] = useState(0);

  const resetSliders = () => {
    setSliderH(0);
    setSliderS(0);
    setSliderL(0);
    setAppliedH(0);
    setAppliedS(0);
    setAppliedL(0);
  };

  // Instant dispatch using AdjustPalette - proven to always affect ALL colors
  const handleHChange = (newValue) => {
    const delta = newValue - appliedH;
    if (delta !== 0) {
      dispatch(App.AdjustPalette(delta, 0, 0));
      setAppliedH(newValue);
    }
    setSliderH(newValue);
  };

  const handleSChange = (newValue) => {
    const delta = newValue - appliedS;
    if (delta !== 0) {
      dispatch(App.AdjustPalette(0, delta, 0));
      setAppliedS(newValue);
    }
    setSliderS(newValue);
  };

  const handleLChange = (newValue) => {
    const delta = newValue - appliedL;
    if (delta !== 0) {
      dispatch(App.AdjustPalette(0, 0, delta));
      setAppliedL(newValue);
    }
    setSliderL(newValue);
  };

  return (
    <section className="section">
      <h3>Adjust Palette</h3>
      <div className="field">
        <label>H: <span className={sliderH > 0 ? 'positive' : sliderH < 0 ? 'negative' : ''}>{sliderH > 0 ? '+' : ''}{sliderH}°</span></label>
        <input
          type="range"
          min="-180"
          max="180"
          value={sliderH}
          onChange={(e) => handleHChange(Number(e.target.value))}
          className="slider"
        />
      </div>
      <div className="field">
        <label>S: <span className={sliderS > 0 ? 'positive' : sliderS < 0 ? 'negative' : ''}>{sliderS > 0 ? '+' : ''}{sliderS}%</span></label>
        <input
          type="range"
          min="-50"
          max="50"
          value={sliderS}
          onChange={(e) => handleSChange(Number(e.target.value))}
          className="slider"
        />
      </div>
      <div className="field">
        <label>L: <span className={sliderL > 0 ? 'positive' : sliderL < 0 ? 'negative' : ''}>{sliderL > 0 ? '+' : ''}{sliderL}%</span></label>
        <input
          type="range"
          min="-50"
          max="50"
          value={sliderL}
          onChange={(e) => handleLChange(Number(e.target.value))}
          className="slider"
        />
      </div>
      <button
        className="btn"
        onClick={resetSliders}
        disabled={sliderH === 0 && sliderS === 0 && sliderL === 0}
      >
        Reset
      </button>
    </section>
  );
}
