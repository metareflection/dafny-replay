// ESM wrapper for Dafny-generated ClearSplitAppCore
// Provides a clean API for React without modifying generated code

import BigNumber from 'bignumber.js';

// Configure BigNumber as Dafny expects
BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

// Import the generated code as raw text
import clearSplitCode from './ClearSplit.cjs?raw';

// Set up the environment and evaluate the Dafny code
const require = (mod) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(`Unknown module: ${mod}`);
};

// Create a function that evaluates the code with proper scope
const initDafny = new Function('require', `
  ${clearSplitCode}
  return { _dafny, ClearSplit, ClearSplitAppCore };
`);

const { _dafny, ClearSplitAppCore } = initDafny(require);

// Helper to convert JS array to Dafny seq
const toSeq = (arr) => _dafny.Seq.of(...arr);

// Helper to convert Dafny seq to JS array
const fromSeq = (seq) => {
  const arr = [];
  for (let i = 0; i < seq.length; i++) {
    arr.push(seq[i]);
  }
  return arr;
};

// Helper to convert JS object to Dafny map
const toMap = (obj) => {
  let m = _dafny.Map.Empty;
  for (const [k, v] of Object.entries(obj)) {
    m = m.update(k, new BigNumber(v));
  }
  return m;
};

// Helper to convert Dafny map to JS object
// Dafny Map extends Array with [key, value] pairs
const fromMap = (dafnyMap) => {
  const obj = {};
  for (let i = 0; i < dafnyMap.length; i++) {
    const [key, val] = dafnyMap[i];
    obj[key] = val instanceof BigNumber ? val.toNumber() : val;
  }
  return obj;
};

// Create a clean API wrapper
const App = {
  // Initialize with an array of member names
  Init: (members) => {
    const memberSeq = toSeq(members);
    const result = ClearSplitAppCore.__default.Init(memberSeq);
    if (result.is_Ok) {
      return { ok: true, model: result.value };
    } else {
      return { ok: false, error: result.error };
    }
  },

  // Create an expense
  // shares: { personId: amountInCents, ... }
  MakeExpense: (paidBy, amountCents, shares) => {
    const shareKeys = Object.keys(shares);
    return ClearSplitAppCore.__default.MakeExpense(
      paidBy,
      new BigNumber(amountCents),
      toMap(shares),
      toSeq(shareKeys)
    );
  },

  // Create a settlement
  MakeSettlement: (from, to, amountCents) => {
    return ClearSplitAppCore.__default.MakeSettlement(
      from,
      to,
      new BigNumber(amountCents)
    );
  },

  // Action constructors
  AddExpense: (expense) => ClearSplitAppCore.__default.AddExpense(expense),
  AddSettlement: (settlement) => ClearSplitAppCore.__default.AddSettlement(settlement),

  // Dispatch an action
  Dispatch: (model, action) => {
    const result = ClearSplitAppCore.__default.Dispatch(model, action);
    if (result.is_Ok) {
      return { ok: true, model: result.value };
    } else {
      return { ok: false, error: result.error };
    }
  },

  // Get all balances as JS object
  Balances: (model) => {
    const dafnyMap = ClearSplitAppCore.__default.Balances(model);
    return fromMap(dafnyMap);
  },

  // Get balance for a specific person
  GetBalance: (model, personId) => {
    const val = ClearSplitAppCore.__default.GetBalance(model, personId);
    return val instanceof BigNumber ? val.toNumber() : val;
  },

  // Get member list
  Members: (model) => {
    return fromSeq(ClearSplitAppCore.__default.Members(model));
  },

  // Get expenses as JS array
  Expenses: (model) => {
    const expenses = ClearSplitAppCore.__default.Expenses(model);
    return fromSeq(expenses).map(e => ({
      paidBy: e.paidBy,
      amount: e.amount instanceof BigNumber ? e.amount.toNumber() : e.amount,
      shares: fromMap(e.shares),
      shareKeys: fromSeq(e.shareKeys)
    }));
  },

  // Get settlements as JS array
  Settlements: (model) => {
    const settlements = ClearSplitAppCore.__default.Settlements(model);
    return fromSeq(settlements).map(s => ({
      from: s.dtor_from,  // 'from' is a reserved word, Dafny uses dtor_from
      to: s.to,
      amount: s.amount instanceof BigNumber ? s.amount.toNumber() : s.amount
    }));
  },

  // Get certificate
  GetCertificate: (model) => {
    const cert = ClearSplitAppCore.__default.GetCertificate(model);
    return {
      memberCount: cert.memberCount instanceof BigNumber ? cert.memberCount.toNumber() : cert.memberCount,
      expenseCount: cert.expenseCount instanceof BigNumber ? cert.expenseCount.toNumber() : cert.expenseCount,
      settlementCount: cert.settlementCount instanceof BigNumber ? cert.settlementCount.toNumber() : cert.settlementCount,
      conservationHolds: cert.conservationHolds
    };
  },
};

export default App;
