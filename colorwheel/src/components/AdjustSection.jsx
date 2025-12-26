import { useState } from 'react';
import { useColorWheel, getAdjustmentModeName } from '../context/ColorWheelContext';
import { ColorPicker } from './ColorPicker';

export function AdjustSection() {
  const { model, dispatch, App } = useColorWheel();

  const [adjustIndex, setAdjustIndex] = useState(0);
  const [deltaH, setDeltaH] = useState(0);
  const [deltaS, setDeltaS] = useState(0);
  const [deltaL, setDeltaL] = useState(0);

  const currentModeTag = model.adjustmentMode?.$tag ?? 1;

  const handleAdjustmentModeChange = (mode) => {
    const modeValue = mode === 'linked' ? App.AdjustmentMode.Linked : App.AdjustmentMode.Independent;
    dispatch(App.SetAdjustmentMode(modeValue));
  };

  const handleAdjustColor = () => {
    if (deltaH !== 0 || deltaS !== 0 || deltaL !== 0) {
      console.log('AdjustColor:', {
        adjustIndex,
        deltaH,
        deltaS,
        deltaL,
        currentMode: getAdjustmentModeName(model.adjustmentMode),
        currentModeTag: model.adjustmentMode?.$tag
      });
      dispatch(App.AdjustColor(adjustIndex, deltaH, deltaS, deltaL));
      setDeltaH(0);
      setDeltaS(0);
      setDeltaL(0);
    }
  };

  return (
    <section className="section">
      <h3>Adjust</h3>
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
      {currentModeTag === 1 && (
        <div className="field">
          <label>Target</label>
          <ColorPicker
            colors={model.colors}
            selectedIndex={adjustIndex}
            onSelect={setAdjustIndex}
          />
        </div>
      )}
      <div className="field">
        <label>H: <span className={deltaH > 0 ? 'positive' : deltaH < 0 ? 'negative' : ''}>{deltaH > 0 ? '+' : ''}{deltaH}°</span></label>
        <input
          type="range"
          min="-180"
          max="180"
          value={deltaH}
          onChange={(e) => setDeltaH(Number(e.target.value))}
          className="slider"
        />
      </div>
      <div className="field">
        <label>S: <span className={deltaS > 0 ? 'positive' : deltaS < 0 ? 'negative' : ''}>{deltaS > 0 ? '+' : ''}{deltaS}%</span></label>
        <input
          type="range"
          min="-50"
          max="50"
          value={deltaS}
          onChange={(e) => setDeltaS(Number(e.target.value))}
          className="slider"
        />
      </div>
      <div className="field">
        <label>L: <span className={deltaL > 0 ? 'positive' : deltaL < 0 ? 'negative' : ''}>{deltaL > 0 ? '+' : ''}{deltaL}%</span></label>
        <input
          type="range"
          min="-50"
          max="50"
          value={deltaL}
          onChange={(e) => setDeltaL(Number(e.target.value))}
          className="slider"
        />
      </div>
      <button
        className="btn btn-primary"
        onClick={handleAdjustColor}
        disabled={deltaH === 0 && deltaS === 0 && deltaL === 0}
      >
        Apply
      </button>
    </section>
  );
}
