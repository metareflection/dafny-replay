// App-specific convenience wrappers for canon
// Provides naming aliases and persistence functions

import GeneratedApp from './app.ts';
import BigNumber from 'bignumber.js';

// Cast _internal for access to Dafny runtime modules
const { _dafny, CanonDomain, CanonKernel, AppCore } = GeneratedApp._internal as any;

const App = {
  ...GeneratedApp,

  // Naming aliases (app uses GetX, generated has X)
  GetPresent: (h: any) => GeneratedApp.Present(h),
  GetNodes: (h: any) => {
    const nodesMap = AppCore.__default.Nodes(h);
    const result: any[] = [];
    if (nodesMap && nodesMap.Keys) {
      for (const k of nodesMap.Keys.Elements) {
        const v = nodesMap.get(k);
        result.push(GeneratedApp.nodeToJson(v));
      }
    }
    return result;
  },
  GetEdges: (h: any) => GeneratedApp.Edges(h),
  GetConstraints: (h: any) => GeneratedApp.Constraints(h),

  // Init with initial nodes array
  Init: (initialNodes?: { id: string; x: number; y: number }[]) => {
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
  Canon: (h: any) => GeneratedApp.CanonHistory(h),

  // Persistence
  Serialize: (model: any) => {
    return GeneratedApp.modelToJson(model);
  },

  Load: (data: any, existingHistory?: any) => {
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
