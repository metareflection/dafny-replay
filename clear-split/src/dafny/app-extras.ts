// App-specific convenience wrappers for clear-split
// Provides {ok, model} return pattern and derives shareKeys automatically

import GeneratedApp from './app.ts';

// Cast _internal for access to Dafny runtime modules
const { _dafny, ClearSplitAppCore } = GeneratedApp._internal as any;

// Helper to convert Dafny map to JS object with number values
const balancesMapToJs = (dafnyMap: any) => {
  const obj: Record<string, number> = {};
  if (dafnyMap && dafnyMap.Keys) {
    for (const k of dafnyMap.Keys.Elements) {
      const v = dafnyMap.get(k);
      // Convert Dafny string key to JS string
      const jsKey = typeof k === 'string' ? k :
                    (k.toVerbatimString ? k.toVerbatimString(false) : Array.from(k).join(''));
      obj[jsKey] = v && typeof v.toNumber === 'function' ? v.toNumber() : v;
    }
  }
  return obj;
};

const App = {
  ...GeneratedApp,

  // Init with array of member names - returns {ok, model} or {ok: false, error}
  Init: (members: string[]) => {
    const memberSeq = _dafny.Seq.of(...members.map((m: string) => _dafny.Seq.UnicodeFromString(m)));
    const result = ClearSplitAppCore.__default.Init(memberSeq);
    if (result.is_Ok) {
      return { ok: true, model: result.dtor_value };
    } else {
      return { ok: false, error: GeneratedApp.errToJson(result.dtor_error) };
    }
  },

  // Create expense - derives shareKeys from shares object
  // Uses GeneratedApp.MakeExpense which properly converts strings
  MakeExpense: (paidBy: string, amountCents: number, shares: Record<string, number>) => {
    const shareKeys = Object.keys(shares);
    return GeneratedApp.MakeExpense(paidBy, amountCents, shares, shareKeys);
  },

  // MakeSettlement - just delegate to generated (same signature)
  // GeneratedApp.MakeSettlement already converts strings properly

  // Dispatch an action - returns {ok, model} or {ok: false, error}
  Dispatch: (model: any, action: any) => {
    const result = ClearSplitAppCore.__default.Dispatch(model, action);
    if (result.is_Ok) {
      return { ok: true, model: result.dtor_value };
    } else {
      return { ok: false, error: GeneratedApp.errToJson(result.dtor_error) };
    }
  },

  // Balances as JS object {member: cents, ...}
  Balances: (model: any) => {
    const dafnyMap = ClearSplitAppCore.__default.Balances(model);
    return balancesMapToJs(dafnyMap);
  },

  // GetCertificate - returns JS object with number values
  GetCertificate: (model: any) => {
    const cert = ClearSplitAppCore.__default.GetCertificate(model);
    return GeneratedApp.certificateToJson(cert);
  },
};

export default App;
