import { useState, useEffect, useRef } from 'react';
import { useColorWheel, hslToCSS } from '../context/ColorWheelContext';

export function Palette({ contrastFg, contrastBg }) {
  const { model, dispatch, preview, commitFrom, getRawPresent, App } = useColorWheel();

  // Which color is being edited (null = none)
  const [editingIndex, setEditingIndex] = useState(null);
  // Local slider values for the color being edited
  const [editH, setEditH] = useState(0);
  const [editS, setEditS] = useState(0);
  const [editL, setEditL] = useState(0);
  // Baseline for commitFrom
  const baselineRef = useRef(null);

  // When a color is clicked, start editing it
  const handleColorClick = (index) => {
    if (editingIndex === index) {
      // Clicking same color closes the editor
      setEditingIndex(null);
    } else {
      // Switch to Independent mode for direct edits
      if (model.adjustmentMode?.$tag !== 1) {
        dispatch(App.SetAdjustmentMode(App.AdjustmentMode.Independent));
      }
      // Initialize sliders with current color values
      const color = model.colors[index];
      setEditH(color.h);
      setEditS(color.s);
      setEditL(color.l);
      setEditingIndex(index);
    }
  };

  // Close editor when clicking outside
  const handleClose = (e) => {
    e.stopPropagation();
    setEditingIndex(null);
  };

  // Use preview during drag (doesn't pollute undo history)
  const handleHChange = (newValue) => {
    setEditH(newValue);
    preview(App.SetColorDirect(editingIndex, { h: newValue, s: editS, l: editL }));
  };

  const handleSChange = (newValue) => {
    setEditS(newValue);
    preview(App.SetColorDirect(editingIndex, { h: editH, s: newValue, l: editL }));
  };

  const handleLChange = (newValue) => {
    setEditL(newValue);
    preview(App.SetColorDirect(editingIndex, { h: editH, s: editS, l: newValue }));
  };

  const handlePointerDown = () => {
    baselineRef.current = getRawPresent();
  };

  const handlePointerUp = () => {
    if (baselineRef.current) {
      commitFrom(baselineRef.current);
      baselineRef.current = null;
    }
  };

  // Sync local state if model changes externally (e.g., undo/redo)
  useEffect(() => {
    if (editingIndex !== null && model.colors[editingIndex]) {
      const color = model.colors[editingIndex];
      setEditH(color.h);
      setEditS(color.s);
      setEditL(color.l);
    }
  }, [model.colors, editingIndex]);

  return (
    <div className="palette">
      {model.colors.map((color, i) => (
        <div
          key={i}
          className={`color-swatch ${i === contrastFg ? 'selected-fg' : ''} ${i === contrastBg ? 'selected-bg' : ''} ${editingIndex === i ? 'editing' : ''}`}
          style={{ backgroundColor: hslToCSS(color.h, color.s, color.l) }}
          onClick={() => handleColorClick(i)}
        >
          {editingIndex === i ? (
            <div className="color-editor" onClick={(e) => e.stopPropagation()}>
              <button className="close-btn" onClick={handleClose}>×</button>
              <div className="editor-field">
                <label>H: {editH}°</label>
                <input
                  type="range"
                  min="0"
                  max="359"
                  value={editH}
                  onChange={(e) => handleHChange(Number(e.target.value))}
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  className="slider hue-slider"
                />
              </div>
              <div className="editor-field">
                <label>S: {editS}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editS}
                  onChange={(e) => handleSChange(Number(e.target.value))}
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  className="slider"
                />
              </div>
              <div className="editor-field">
                <label>L: {editL}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editL}
                  onChange={(e) => handleLChange(Number(e.target.value))}
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  className="slider"
                />
              </div>
            </div>
          ) : (
            <div className="color-info">
              <span>H:{color.h}°</span>
              <span>S:{color.s}%</span>
              <span>L:{color.l}%</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
