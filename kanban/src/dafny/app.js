// ESM wrapper for Dafny-generated KanbanAppCore
// Provides a clean API for React without modifying generated code

import BigNumber from 'bignumber.js';

// Configure BigNumber as Dafny expects
BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

// Import the generated code as raw text
import kanbanCode from './Kanban.cjs?raw';

// Set up the environment and evaluate the Dafny code
const require = (mod) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(`Unknown module: ${mod}`);
};

// Create a function that evaluates the code with proper scope
const initDafny = new Function('require', `
  ${kanbanCode}
  return { _dafny, KanbanDomain, KanbanKernel, KanbanAppCore };
`);

const { _dafny, KanbanAppCore } = initDafny(require);

// Helper to convert Dafny seq to JS array
const seqToArray = (seq) => {
  const arr = [];
  for (let i = 0; i < seq.length; i++) {
    arr.push(seq[i]);
  }
  return arr;
};

// Helper to convert BigNumber to JS number
const toNumber = (bn) => {
  if (bn && typeof bn.toNumber === 'function') {
    return bn.toNumber();
  }
  return bn;
};

// Create a clean API wrapper
const App = {
  // Initialize a new history
  Init: () => KanbanAppCore.__default.Init(),

  // Action constructors
  AddColumn: (col, limit) => KanbanAppCore.__default.AddColumn(
    _dafny.Seq.UnicodeFromString(col),
    new BigNumber(limit)
  ),
  SetWip: (col, limit) => KanbanAppCore.__default.SetWip(
    _dafny.Seq.UnicodeFromString(col),
    new BigNumber(limit)
  ),
  AddCard: (col, title) => KanbanAppCore.__default.AddCard(
    _dafny.Seq.UnicodeFromString(col),
    _dafny.Seq.UnicodeFromString(title)
  ),
  MoveCard: (id, toCol, pos) => KanbanAppCore.__default.MoveCard(
    new BigNumber(id),
    _dafny.Seq.UnicodeFromString(toCol),
    new BigNumber(pos)
  ),

  // State transitions
  Dispatch: (h, a) => KanbanAppCore.__default.Dispatch(h, a),
  Undo: (h) => KanbanAppCore.__default.Undo(h),
  Redo: (h) => KanbanAppCore.__default.Redo(h),

  // Selectors
  Present: (h) => KanbanAppCore.__default.Present(h),
  CanUndo: (h) => KanbanAppCore.__default.CanUndo(h),
  CanRedo: (h) => KanbanAppCore.__default.CanRedo(h),

  // Model accessors
  GetCols: (m) => {
    const cols = KanbanAppCore.__default.GetCols(m);
    return seqToArray(cols).map(col => col.toVerbatimString(false));
  },
  GetLane: (m, col) => {
    const lane = KanbanAppCore.__default.GetLane(m, _dafny.Seq.UnicodeFromString(col));
    return seqToArray(lane).map(id => toNumber(id));
  },
  GetWip: (m, col) => {
    const wip = KanbanAppCore.__default.GetWip(m, _dafny.Seq.UnicodeFromString(col));
    return toNumber(wip);
  },
  GetCardTitle: (m, id) => {
    const title = KanbanAppCore.__default.GetCardTitle(m, new BigNumber(id));
    return title.toVerbatimString(false);
  },
};

export default App;
