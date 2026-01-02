// App-specific convenience wrappers for canon
// Provides naming aliases and persistence functions

import GeneratedApp from './app.js';
import BigNumber from 'bignumber.js';

const { _dafny, CanonDomain, CanonKernel, AppCore } = GeneratedApp._internal;

const App = {
  ...GeneratedApp,

  // Naming aliases (app uses GetX, generated has X)
  GetPresent: (h) => GeneratedApp.Present(h),
  GetNodes: (h) => {
    const nodesMap = AppCore.__default.Nodes(h);
    const result = [];
    if (nodesMap && nodesMap.Keys) {
      for (const k of nodesMap.Keys.Elements) {
        const v = nodesMap.get(k);
        result.push(GeneratedApp.nodeToJson(v));
      }
    }
    return result;
  },
  GetEdges: (h) => GeneratedApp.Edges(h),
  GetConstraints: (h) => GeneratedApp.Constraints(h),

  // Init with initial nodes array
  Init: (initialNodes) => {
    if (!initialNodes || initialNodes.length === 0) {
      return AppCore.__default.Init();
    }
    // Start with empty history, then add each node
    let h = AppCore.__default.Init();
    for (const node of initialNodes) {
      const action = CanonDomain.Action.create_AddNode(
        _dafny.Seq.UnicodeFromString(node.id),
        new BigNumber(node.x),
        new BigNumber(node.y)
      );
      h = AppCore.__default.Dispatch(h, action);
    }
    return h;
  },

  // Canon - apply constraints to canonicalize positions
  Canon: (h) => GeneratedApp.CanonHistory(h),

  // Persistence
  Serialize: (model) => {
    return GeneratedApp.modelToJson(model);
  },

  Load: (data, existingHistory) => {
    try {
      const model = GeneratedApp.modelFromJson(data);
      // Create a new history with the loaded model (History is in CanonKernel)
      return CanonKernel.History.create_History(
        _dafny.Seq.of(),  // empty past
        model,
        _dafny.Seq.of()   // empty future
      );
    } catch (e) {
      console.error('Failed to load:', e);
      return existingHistory || AppCore.__default.Init();
    }
  },
};

export default App;
