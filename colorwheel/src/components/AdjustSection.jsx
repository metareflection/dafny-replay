import { useRef } from 'react';
import { useColorWheel } from '../context/ColorWheelContext';

export function AdjustSection() {
  const { model, preview, commitFrom, getRawPresent, App } = useColorWheel();

  // Track what we've applied during this drag (to compute deltas)
  const appliedRef = useRef({ h: 0, s: 0, l: 0 });
  // Baseline for commitFrom
  const baselineRef = useRef(null);

  const handleHChange = (newValue) => {
    const delta = newValue - appliedRef.current.h;
    if (delta !== 0) {
      preview(App.AdjustPalette(delta, 0, 0));
      appliedRef.current.h = newValue;
    }
  };

  const handleSChange = (newValue) => {
    const delta = newValue - appliedRef.current.s;
    if (delta !== 0) {
      preview(App.AdjustPalette(0, delta, 0));
      appliedRef.current.s = newValue;
    }
  };

  const handleLChange = (newValue) => {
    const delta = newValue - appliedRef.current.l;
    if (delta !== 0) {
      preview(App.AdjustPalette(0, 0, delta));
      appliedRef.current.l = newValue;
    }
  };

  const handlePointerDown = () => {
    baselineRef.current = getRawPresent();
    // Sync applied with current model values
    appliedRef.current = {
      h: model.adjustmentH,
      s: model.adjustmentS,
      l: model.adjustmentL,
    };
  };

  const handlePointerUp = () => {
    if (baselineRef.current) {
      commitFrom(baselineRef.current);
      baselineRef.current = null;
    }
  };

  // Slider values come directly from model
  const sliderH = model.adjustmentH;
  const sliderS = model.adjustmentS;
  const sliderL = model.adjustmentL;

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
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
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
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
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
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          className="slider"
        />
      </div>
    </section>
  );
}
