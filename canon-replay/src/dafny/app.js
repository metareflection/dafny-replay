// ESM wrapper for Dafny-generated CanonDomain (with undo/redo via Replay kernel)
// Provides a clean API for React without modifying generated code

import BigNumber from 'bignumber.js';

// Configure BigNumber as Dafny expects
BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

// Import the generated code as raw text
import canonReplayCode from './CanonReplay.cjs?raw';

// Set up the environment and evaluate the Dafny code
const require = (mod) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(`Unknown module: ${mod}`);
};

// Create a function that evaluates the code with proper scope
const initDafny = new Function('require', `
  ${canonReplayCode}
  return { _dafny, CanonDomain, CanonKernel, AppCore, Canon };
`);

const { _dafny, CanonKernel, AppCore, Canon } = initDafny(require);

// Helper to convert JS string to Dafny string
const toDafnyString = (s) => _dafny.Seq.UnicodeFromString(s);

// Helper to convert Dafny string to JS string
const fromDafnyString = (seq) => seq.toVerbatimString(false);

// Helper to convert JS node to Dafny Node
const toDafnyNode = (node) => {
  return Canon.Node.create_Node(
    toDafnyString(node.id),
    new BigNumber(Math.round(node.x)),
    new BigNumber(Math.round(node.y))
  );
};

// Helper to convert Dafny Node to JS node
const fromDafnyNode = (dNode) => ({
  id: fromDafnyString(dNode.dtor_id),
  x: dNode.dtor_x.toNumber(),
  y: dNode.dtor_y.toNumber(),
});

// Helper to convert JS string array to Dafny seq of strings
const toDafnyStringSeq = (ids) => {
  return _dafny.Seq.of(...ids.map(toDafnyString));
};

// Helper to extract nodes map to JS array (from Model)
const extractNodes = (model) => {
  const nodes = [];
  const nodesMap = model.dtor_nodes;
  for (const key of nodesMap.Keys.Elements) {
    const dNode = nodesMap.get(key);
    nodes.push(fromDafnyNode(dNode));
  }
  return nodes;
};

// Helper to extract constraints to JS array (from Model)
const extractConstraints = (model) => {
  const constraints = [];
  const cs = model.dtor_constraints;
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    const cid = c.dtor_cid.toNumber();
    const targets = [];
    const ts = c.dtor_targets;
    for (let j = 0; j < ts.length; j++) {
      targets.push(fromDafnyString(ts[j]));
    }
    const axis = c.dtor_axis.is_X ? 'X' : 'Y';
    if (c.is_Align) {
      constraints.push({ type: 'Align', cid, targets, axis });
    } else if (c.is_EvenSpace) {
      constraints.push({ type: 'EvenSpace', cid, targets, axis });
    }
  }
  return constraints;
};

// Helper to extract edges to JS array (from Model)
const extractEdges = (model) => {
  const edges = [];
  const es = model.dtor_edges;
  for (let i = 0; i < es.length; i++) {
    const e = es[i];
    edges.push({
      from: fromDafnyString(e.dtor_from),
      to: fromDafnyString(e.dtor_to),
    });
  }
  return edges;
};

// Create a clean API wrapper
const App = {
  // Initialize a new history with initial nodes
  Init: (nodes) => {
    // Start with empty history
    let h = AppCore.__default.Init();
    // Dispatch AddNode for each initial node
    for (const node of nodes) {
      const action = AppCore.__default.AddNode(
        toDafnyString(node.id),
        new BigNumber(Math.round(node.x)),
        new BigNumber(Math.round(node.y))
      );
      h = AppCore.__default.Dispatch(h, action);
    }
    // Clear history so initial nodes aren't undoable
    // Create fresh history with current present, empty past/future
    const present = h.dtor_present;
    return CanonKernel.History.create_History(
      _dafny.Seq.of(), // empty past
      present,
      _dafny.Seq.of()  // empty future
    );
  },

  // Action constructors
  AddNode: (id, x, y) => AppCore.__default.AddNode(
    toDafnyString(id),
    new BigNumber(Math.round(x)),
    new BigNumber(Math.round(y))
  ),

  MoveNode: (id, x, y) => AppCore.__default.MoveNode(
    toDafnyString(id),
    new BigNumber(Math.round(x)),
    new BigNumber(Math.round(y))
  ),

  AddAlign: (selectedIds) => AppCore.__default.AddAlign(toDafnyStringSeq(selectedIds)),

  AddEvenSpace: (selectedIds) => AppCore.__default.AddEvenSpace(toDafnyStringSeq(selectedIds)),

  AddEdge: (from, to) => AppCore.__default.AddEdge(toDafnyString(from), toDafnyString(to)),

  DeleteEdge: (from, to) => AppCore.__default.DeleteEdge(toDafnyString(from), toDafnyString(to)),

  DeleteConstraint: (cid) => AppCore.__default.DeleteConstraint(new BigNumber(cid)),

  RemoveNode: (nodeId) => AppCore.__default.RemoveNode(toDafnyString(nodeId)),

  // State transitions
  Dispatch: (h, action) => AppCore.__default.Dispatch(h, action),
  Undo: (h) => AppCore.__default.Undo(h),
  Redo: (h) => AppCore.__default.Redo(h),

  // Selectors
  CanUndo: (h) => AppCore.__default.CanUndo(h),
  CanRedo: (h) => AppCore.__default.CanRedo(h),

  // Extract data from history's present model
  GetNodes: (h) => extractNodes(h.dtor_present),
  GetEdges: (h) => extractEdges(h.dtor_present),
  GetConstraints: (h) => extractConstraints(h.dtor_present),

  // Update node positions in history's present (for drag preview)
  // Returns new history with updated present, same past/future
  SetNodes: (h, jsNodes) => {
    const model = h.dtor_present;
    // Build new nodes map from JS nodes
    const newNodesMap = jsNodes.reduce((map, n) => {
      const dNode = toDafnyNode(n);
      return map.update(toDafnyString(n.id), dNode);
    }, _dafny.Map.Empty);

    // Create new model with updated nodes
    const newModel = Canon.Model.create_Model(
      newNodesMap,
      model.dtor_edges,
      model.dtor_constraints,
      model.dtor_nextCid
    );

    // Return history with updated present
    return CanonKernel.History.create_History(
      h.dtor_past,
      newModel,
      h.dtor_future
    );
  },

  // Apply Canon (constraint solver) to history's present
  // Returns new history with canonicalized present
  Canon: (h) => {
    const model = h.dtor_present;
    const canonModel = Canon.__default.Canon(model);
    return CanonKernel.History.create_History(
      h.dtor_past,
      canonModel,
      h.dtor_future
    );
  },
};

export default App;
