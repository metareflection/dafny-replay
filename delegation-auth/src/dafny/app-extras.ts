// App-specific convenience wrappers for delegation-auth
// This file adds helpers on top of the generated app.ts

import GeneratedApp from './app.ts';

// Cast _internal for access to Dafny runtime modules
const { _dafny } = GeneratedApp._internal as any;

// Helper to convert Dafny string to JS string
const dafnyStringToJs = (dafnyStr: any): string => {
  if (typeof dafnyStr === 'string') return dafnyStr;
  if (dafnyStr && typeof dafnyStr.toVerbatimString === 'function') {
    return dafnyStr.toVerbatimString(false);
  }
  return String(dafnyStr);
};

// Helper to convert BigNumber to JS number
const toNumber = (bn: any): number => {
  if (bn && typeof bn.toNumber === 'function') {
    return bn.toNumber();
  }
  return bn;
};

// Re-export everything from generated app, plus extras
const App = {
  ...GeneratedApp,

  // GetGrants: return array of {subject, capability} objects
  GetGrants: (m: any) => {
    const grants = m.dtor_grants;
    const result: { subject: string; capability: string }[] = [];
    for (const tuple of grants.Elements) {
      result.push({
        subject: dafnyStringToJs(tuple[0]),
        capability: dafnyStringToJs(tuple[1])
      });
    }
    return result;
  },

  // GetDelegations: return array of all delegations as {id, from, to, cap} objects
  GetDelegations: (m: any) => {
    const delegations = m.dtor_delegations;
    const result: { id: number; from: string; to: string; cap: string }[] = [];
    for (const key of delegations.Keys.Elements) {
      const deleg = delegations.get(key);
      result.push({
        id: toNumber(key),
        from: dafnyStringToJs(deleg.dtor_from),
        to: dafnyStringToJs(deleg.dtor_to),
        cap: dafnyStringToJs(deleg.dtor_cap)
      });
    }
    return result;
  },

  // GetReachable: return array of subject strings
  GetReachable: (m: any, cap: string) => {
    const reachable = GeneratedApp.GetReachable(m, cap);
    const result: string[] = [];
    for (const elem of reachable.Elements) {
      result.push(dafnyStringToJs(elem));
    }
    return result;
  },
};

export default App;
