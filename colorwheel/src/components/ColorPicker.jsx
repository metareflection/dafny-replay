import { hslToCSS } from '../context/ColorWheelContext';

// Reusable color picker button row
export function ColorPicker({ colors, selectedIndex, onSelect, size = 'normal' }) {
  return (
    <div className="color-buttons">
      {colors.map((color, i) => (
        <button
          key={i}
          className={`color-pick-btn ${size === 'small' ? 'small' : ''} ${i === selectedIndex ? 'active' : ''}`}
          style={{ backgroundColor: hslToCSS(color.h, color.s, color.l) }}
          onClick={() => onSelect(i)}
        />
      ))}
    </div>
  );
}
