import { useColorWheel, hslToCSS } from '../context/ColorWheelContext';
import { ColorPicker } from './ColorPicker';

export function ContrastSection() {
  const { model, dispatch, App } = useColorWheel();

  const [contrastFg, contrastBg] = model.contrastPair || [0, 1];

  const handleContrastPairChange = (fg, bg) => {
    dispatch(App.SelectContrastPair(fg, bg));
  };

  return (
    <div className="contrast-section">
      <div className="contrast-header">
        <span>Contrast Pair</span>
      </div>
      <div className="contrast-row">
        <div className="contrast-picker">
          <label>FG</label>
          <ColorPicker
            colors={model.colors}
            selectedIndex={contrastFg}
            onSelect={(i) => handleContrastPairChange(i, contrastBg)}
            size="small"
          />
        </div>
        <div className="contrast-picker">
          <label>BG</label>
          <ColorPicker
            colors={model.colors}
            selectedIndex={contrastBg}
            onSelect={(i) => handleContrastPairChange(contrastFg, i)}
            size="small"
          />
        </div>
        <div
          className="contrast-preview"
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
  );
}
