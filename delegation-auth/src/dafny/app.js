// ESM wrapper for Dafny-generated DelegationAuthAppCore
// Provides a clean API for React without modifying generated code

import BigNumber from 'bignumber.js';

// Configure BigNumber as Dafny expects
BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

// Import the generated code as raw text
import delegationAuthCode from './DelegationAuth.cjs?raw';

// Set up the environment and evaluate the Dafny code
const require = (mod) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(`Unknown module: ${mod}`);
};

// Create a function that evaluates the code with proper scope
const initDafny = new Function('require', `
  ${delegationAuthCode}
  return { _dafny, DelegationAuthDomain, DelegationAuthKernel, DelegationAuthAppCore };
`);

const { _dafny, DelegationAuthAppCore } = initDafny(require);

// Helper to convert Dafny set to JS array
const setToArray = (dafnySet) => {
  const arr = [];
  for (const elem of dafnySet.Elements) {
    arr.push(elem);
  }
  return arr;
};

// Helper to convert Dafny string (seq<char>) to JS string
const dafnyStringToJs = (dafnyStr) => {
  if (typeof dafnyStr === 'string') return dafnyStr;
  if (dafnyStr && typeof dafnyStr.toVerbatimString === 'function') {
    return dafnyStr.toVerbatimString(false);
  }
  return String(dafnyStr);
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
  Init: () => DelegationAuthAppCore.__default.Init(),

  // Action constructors
  AddSubject: (s) => DelegationAuthAppCore.__default.AddSubject(
    _dafny.Seq.UnicodeFromString(s)
  ),
  Grant: (s, cap) => DelegationAuthAppCore.__default.Grant(
    _dafny.Seq.UnicodeFromString(s),
    _dafny.Seq.UnicodeFromString(cap)
  ),
  Delegate: (from, to, cap) => DelegationAuthAppCore.__default.Delegate(
    _dafny.Seq.UnicodeFromString(from),
    _dafny.Seq.UnicodeFromString(to),
    _dafny.Seq.UnicodeFromString(cap)
  ),
  Revoke: (eid) => DelegationAuthAppCore.__default.Revoke(
    new BigNumber(eid)
  ),

  // State transitions
  Dispatch: (h, a) => DelegationAuthAppCore.__default.Dispatch(h, a),
  Undo: (h) => DelegationAuthAppCore.__default.Undo(h),
  Redo: (h) => DelegationAuthAppCore.__default.Redo(h),

  // Selectors
  Present: (h) => DelegationAuthAppCore.__default.Present(h),
  CanUndo: (h) => DelegationAuthAppCore.__default.CanUndo(h),
  CanRedo: (h) => DelegationAuthAppCore.__default.CanRedo(h),

  // Model accessors
  GetSubjects: (m) => {
    const subjects = DelegationAuthAppCore.__default.GetSubjects(m);
    return setToArray(subjects).map(s => dafnyStringToJs(s));
  },

  GetGrants: (m) => {
    const grants = DelegationAuthAppCore.__default.GetGrants(m);
    return setToArray(grants).map(tuple => ({
      subject: dafnyStringToJs(tuple[0]),
      capability: dafnyStringToJs(tuple[1])
    }));
  },

  GetDelegations: (m) => {
    const delegations = DelegationAuthAppCore.__default.GetDelegations(m);
    const result = [];
    // Dafny maps have .Keys property which is a set
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

  CheckCan: (m, s, cap) => {
    return DelegationAuthAppCore.__default.CheckCan(
      m,
      _dafny.Seq.UnicodeFromString(s),
      _dafny.Seq.UnicodeFromString(cap)
    );
  },

  GetReachable: (m, cap) => {
    const reachable = DelegationAuthAppCore.__default.GetReachable(
      m,
      _dafny.Seq.UnicodeFromString(cap)
    );
    return setToArray(reachable).map(s => dafnyStringToJs(s));
  },
};

export default App;
