// ESM wrapper for Dafny-generated AppCore
// Provides a clean API for React without modifying generated code

import BigNumber from 'bignumber.js';

// Configure BigNumber as Dafny expects
BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

// Import the generated code as raw text
import replayCode from './Replay.cjs?raw';

// Set up the environment and evaluate the Dafny code
const require = (mod) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(`Unknown module: ${mod}`);
};

// Create a function that evaluates the code with proper scope
// Note: Don't pass BigNumber as param - the code declares it via require()
const initDafny = new Function('require', `
  ${replayCode}
  return { _dafny, ConcreteDomain, ConcreteKernel, AppCore };
`);

const { AppCore } = initDafny(require);

// Create a clean API wrapper
const App = {
  // Initialize a new history
  Init: () => AppCore.__default.Init(),

  // Action constructors
  Inc: () => AppCore.__default.Inc(),
  Dec: () => AppCore.__default.Dec(),

  // State transitions
  Dispatch: (h, a) => AppCore.__default.Dispatch(h, a),
  Undo: (h) => AppCore.__default.Undo(h),
  Redo: (h) => AppCore.__default.Redo(h),

  // Selectors
  Present: (h) => {
    const val = AppCore.__default.Present(h);
    // Convert BigNumber to JavaScript number for display
    return val.toNumber();
  },
  CanUndo: (h) => AppCore.__default.CanUndo(h),
  CanRedo: (h) => AppCore.__default.CanRedo(h),
};

export default App;
