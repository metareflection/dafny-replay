import { ColorWheelProvider, useColorWheel } from './context/ColorWheelContext';
import {
  GenerateSection,
  AdjustSection,
  DirectEditSection,
  Palette,
  ContrastSection,
  HistoryControls,
} from './components';
import './App.css';

function Dashboard() {
  const { model } = useColorWheel();
  const [contrastFg, contrastBg] = model.contrastPair || [0, 1];

  return (
    <div className="dashboard">
      {/* Left Panel - Controls */}
      <div className="panel panel-controls">
        <div className="panel-header">
          <h1>ColorWheel</h1>
          <span className="subtitle">Verified Palette Generator</span>
        </div>

        <GenerateSection />
        <AdjustSection />
        <DirectEditSection />
        <HistoryControls />
      </div>

      {/* Right Panel - Colors View */}
      <div className="panel panel-view">
        <Palette contrastFg={contrastFg} contrastBg={contrastBg} />
        <ContrastSection />
        <div className="footer-text">
          All state transitions verified by Dafny
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ColorWheelProvider>
      <div className="app">
        <Dashboard />
      </div>
    </ColorWheelProvider>
  );
}

export default App;
