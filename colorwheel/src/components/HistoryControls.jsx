import { useColorWheel } from '../context/ColorWheelContext';

export function HistoryControls() {
  const { undo, redo, canUndo, canRedo } = useColorWheel();

  return (
    <div className="history-row">
      <button className="btn btn-small" onClick={undo} disabled={!canUndo}>
        Undo
      </button>
      <button className="btn btn-small" onClick={redo} disabled={!canRedo}>
        Redo
      </button>
    </div>
  );
}
