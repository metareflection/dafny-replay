// ESM wrapper for Dafny-generated Canon module
// Provides a clean API for React without modifying generated code

import BigNumber from 'bignumber.js';

// Configure BigNumber as Dafny expects
BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

// Import the generated code as raw text
import canonCode from './Canon.cjs?raw';

// Set up the environment and evaluate the Dafny code
const require = (mod) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(`Unknown module: ${mod}`);
};

// Create a function that evaluates the code with proper scope
const initDafny = new Function('require', `
  ${canonCode}
  return { _dafny, Canon };
`);

const { _dafny, Canon } = initDafny(require);

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

// Helper to convert JS nodes array to Dafny seq
const toDafnyNodeSeq = (nodes) => {
  return _dafny.Seq.of(...nodes.map(toDafnyNode));
};

// Helper to convert JS string array to Dafny seq of strings
const toDafnyStringSeq = (ids) => {
  return _dafny.Seq.of(...ids.map(toDafnyString));
};

// Helper to extract nodes map to JS array
const extractNodes = (model) => {
  const nodes = [];
  const nodesMap = model.dtor_nodes;
  for (const key of nodesMap.Keys.Elements) {
    const dNode = nodesMap.get(key);
    nodes.push(fromDafnyNode(dNode));
  }
  return nodes;
};

// Helper to extract constraints to JS array
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

// Create a clean API wrapper
const App = {
  // Initialize empty model
  Empty: () => Canon.__default.Empty(),

  // Initialize from JS nodes array
  Init: (nodes) => Canon.__default.Init(toDafnyNodeSeq(nodes)),

  // Add alignment constraint for selected nodes
  AddAlign: (model, selectedIds) => {
    return Canon.__default.AddAlign(model, toDafnyStringSeq(selectedIds));
  },

  // Add even spacing constraint for selected nodes
  AddEvenSpace: (model, selectedIds) => {
    return Canon.__default.AddEvenSpace(model, toDafnyStringSeq(selectedIds));
  },

  // Delete constraint by id
  DeleteConstraint: (model, cid) => {
    return Canon.__default.DeleteConstraint(model, new BigNumber(cid));
  },

  // Remove a node from the model
  RemoveNode: (model, nodeId) => {
    return Canon.__default.RemoveNode(model, toDafnyString(nodeId));
  },

  // Apply all constraints (canonicalize)
  Canon: (model) => Canon.__default.Canon(model),

  // Update node positions from JS (rebuild model with new node positions)
  SetNodes: (model, jsNodes) => {
    // Build new nodes map from JS nodes
    const newNodesMap = jsNodes.reduce((map, n) => {
      const dNode = toDafnyNode(n);
      return map.update(toDafnyString(n.id), dNode);
    }, _dafny.Map.Empty);

    // Return model with updated nodes, same constraints and nextCid
    return Canon.Model.create_Model(
      newNodesMap,
      model.dtor_constraints,
      model.dtor_nextCid
    );
  },

  // Extract nodes as JS array
  GetNodes: (model) => extractNodes(model),

  // Extract constraints as JS array
  GetConstraints: (model) => extractConstraints(model),
};

export default App;
