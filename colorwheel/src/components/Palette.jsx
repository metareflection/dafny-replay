import { useColorWheel, hslToCSS } from '../context/ColorWheelContext';

export function Palette({ contrastFg, contrastBg }) {
  const { model } = useColorWheel();

  return (
    <div className="palette">
      {model.colors.map((color, i) => (
        <div
          key={i}
          className={`color-swatch ${i === contrastFg ? 'selected-fg' : ''} ${i === contrastBg ? 'selected-bg' : ''}`}
          style={{ backgroundColor: hslToCSS(color.h, color.s, color.l) }}
        >
          <div className="color-info">
            <span>H:{color.h}°</span>
            <span>S:{color.s}%</span>
            <span>L:{color.l}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
