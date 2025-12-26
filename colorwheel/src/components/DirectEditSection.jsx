import { useState } from 'react';
import { useColorWheel, hslToCSS } from '../context/ColorWheelContext';
import { ColorPicker } from './ColorPicker';

export function DirectEditSection() {
  const { model, dispatch, App } = useColorWheel();

  const [directIndex, setDirectIndex] = useState(0);
  const [directH, setDirectH] = useState(model.colors[0]?.h ?? 180);
  const [directS, setDirectS] = useState(model.colors[0]?.s ?? 70);
  const [directL, setDirectL] = useState(model.colors[0]?.l ?? 50);

  const handleDirectIndexChange = (i) => {
    setDirectIndex(i);
    setDirectH(model.colors[i].h);
    setDirectS(model.colors[i].s);
    setDirectL(model.colors[i].l);
  };

  const handleSetColorDirect = () => {
    dispatch(App.SetColorDirect(directIndex, directH, directS, directL));
  };

  const directColorChanged =
    directH !== model.colors[directIndex]?.h ||
    directS !== model.colors[directIndex]?.s ||
    directL !== model.colors[directIndex]?.l;

  return (
    <section className="section">
      <h3>Direct Edit</h3>
      <div className="field">
        <label>Color</label>
        <ColorPicker
          colors={model.colors}
          selectedIndex={directIndex}
          onSelect={handleDirectIndexChange}
        />
      </div>
      <div className="direct-row">
        <div
          className="direct-preview"
          style={{ backgroundColor: hslToCSS(directH, directS, directL) }}
        />
        <div className="direct-sliders">
          <div className="field compact">
            <label>H: {directH}°</label>
            <input
              type="range"
              min="0"
              max="359"
              value={directH}
              onChange={(e) => setDirectH(Number(e.target.value))}
              className="slider hue-slider"
            />
          </div>
          <div className="field compact">
            <label>S: {directS}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={directS}
              onChange={(e) => setDirectS(Number(e.target.value))}
              className="slider"
            />
          </div>
          <div className="field compact">
            <label>L: {directL}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={directL}
              onChange={(e) => setDirectL(Number(e.target.value))}
              className="slider"
            />
          </div>
        </div>
      </div>
      <button
        className="btn btn-primary"
        onClick={handleSetColorDirect}
        disabled={!directColorChanged}
      >
        Set Color
      </button>
    </section>
  );
}
