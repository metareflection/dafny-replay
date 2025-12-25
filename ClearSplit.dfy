// Expense splitting with verified conservation of money

// =============================
// Abstract Specification Module
// =============================
// This module defines the user-facing API and guarantees.
// All types, predicates, functions, and key lemma signatures are here.

abstract module ClearSplitSpec {

  // -----------------------------
  // Money + identifiers
  // -----------------------------
  type Money = int  // cents

  // For MVP, keep IDs as strings.
  type PersonId = string

  // -----------------------------
  // Core data types
  // -----------------------------
  datatype Expense = Expense(
    paidBy: PersonId,
    amount: Money,
    // Each entry is how much that person "consumed" from this expense.
    // Convention: shares are >= 0 and sum(shares) = amount.
    shares: map<PersonId, Money>,
    // Keys for iterating over shares (for compiled code)
    shareKeys: seq<PersonId>
  )

  datatype Settlement = Settlement(
    from: PersonId,
    to: PersonId,
    amount: Money
  )

  datatype Model = Model(
    members: set<PersonId>,
    memberList: seq<PersonId>,  // For compiled iteration, must match members
    expenses: seq<Expense>,
    settlements: seq<Settlement>
  )

  datatype Result<T, E> = Ok(value: T) | Error(error: E)

  datatype Err =
    | NotMember(p: PersonId)
    | BadExpense
    | BadSettlement

  datatype Action =
    | AddExpense(e: Expense)
    | AddSettlement(s: Settlement)

  datatype Certificate = Certificate(
    memberCount: nat,
    expenseCount: nat,
    settlementCount: nat,
    conservationHolds: bool  // Always true when Inv holds
  )

  // -----------------------------
  // Core predicates
  // -----------------------------

  // Sequence has no duplicates
  predicate NoDuplicates(s: seq<PersonId>)
  {
    forall i, j :: 0 <= i < j < |s| ==> s[i] != s[j]
  }

  // Ghost spec: non-deterministic sum over map values
  ghost function SumValues(m: map<PersonId, Money>): Money
    decreases |m|
    ensures |m| > 0 ==> exists k :: k in m && SumValues(m) == m[k] + SumValues(m - {k})

  // Compilable version: iterate over a sequence of keys
  function SumValuesSeq(m: map<PersonId, Money>, keys: seq<PersonId>): Money
    decreases |keys|
  {
    if |keys| == 0 then 0
    else
      var k := keys[0];
      var rest := keys[1..];
      if k in m then m[k] + SumValuesSeq(m - {k}, rest)
      else SumValuesSeq(m, rest)
  }

  // Sequence bijectively matches set
  ghost predicate SeqMatchesSet(s: seq<PersonId>, set_: set<PersonId>)
  {
    |s| == |set_|
    && NoDuplicates(s)
    && (forall p :: p in s <==> p in set_)
  }

  // shareKeys bijectively matches shares.Keys (ghost spec)
  ghost predicate ShareKeysConsistent(e: Expense)
  {
    |e.shareKeys| == |e.shares|
    && NoDuplicates(e.shareKeys)
    && (forall k :: k in e.shareKeys <==> k in e.shares.Keys)
  }

  // Compilable check: all shareKeys are in shares and sizes match
  predicate ShareKeysOk(e: Expense)
  {
    |e.shareKeys| == |e.shares|
    && NoDuplicates(e.shareKeys)
    && (forall i :: 0 <= i < |e.shareKeys| ==> e.shareKeys[i] in e.shares)
  }

  // Helper: check that all keys in sequence are members with non-negative shares
  predicate AllSharesValid(members: set<PersonId>, shares: map<PersonId, Money>, keys: seq<PersonId>)
  {
    forall i :: 0 <= i < |keys| ==> keys[i] in members && keys[i] in shares && shares[keys[i]] >= 0
  }

  // Compilable version: check expense validity using shareKeys
  predicate ValidExpenseCheck(members: set<PersonId>, e: Expense)
  {
    ShareKeysOk(e)
    && e.amount >= 0
    && e.paidBy in members
    && AllSharesValid(members, e.shares, e.shareKeys)
    && SumValuesSeq(e.shares, e.shareKeys) == e.amount
  }

  predicate ValidSettlement(members: set<PersonId>, s: Settlement)
  {
    s.amount >= 0
    && s.from in members
    && s.to in members
    && s.from != s.to
  }

  // Ghost spec for valid expense (semantic validity)
  ghost predicate ValidExpense(members: set<PersonId>, e: Expense)
  {
    e.amount >= 0
    && e.paidBy in members
    && (forall p :: p in e.shares ==> p in members)
    && (forall p :: p in e.shares ==> e.shares[p] >= 0)
    && SumValues(e.shares) == e.amount
  }

  // Well-formed expense: semantic + structural (shareKeys consistent)
  ghost predicate WellFormedExpense(members: set<PersonId>, e: Expense)
  {
    ShareKeysConsistent(e) && ValidExpense(members, e)
  }

  // -----------------------------
  // THE Rep Invariant
  // -----------------------------
  ghost predicate Inv(model: Model)
  {
    // 1. MemberList consistency: memberList bijectively matches members
    SeqMatchesSet(model.memberList, model.members)
    // 2. All expenses are well-formed
    && (forall i :: 0 <= i < |model.expenses| ==> WellFormedExpense(model.members, model.expenses[i]))
    // 3. All settlements are valid
    && (forall i :: 0 <= i < |model.settlements| ==> ValidSettlement(model.members, model.settlements[i]))
  }

  // -----------------------------
  // Balance computation
  // -----------------------------

  function AddToMap(b: map<PersonId, Money>, p: PersonId, delta: Money): map<PersonId, Money>
  {
    if p in b then b[p := b[p] + delta] else b[p := delta]
  }

  // Compilable version: iterate over a sequence
  function ZeroBalancesSeq(memberList: seq<PersonId>): map<PersonId, Money>
    decreases |memberList|
    ensures forall p :: p in memberList ==> p in ZeroBalancesSeq(memberList)
    ensures forall p :: p in ZeroBalancesSeq(memberList) ==> ZeroBalancesSeq(memberList)[p] == 0
  {
    if |memberList| == 0 then map[]
    else
      var p := memberList[0];
      ZeroBalancesSeq(memberList[1..])[p := 0]
  }

  // Helper: apply shares to balances using a sequence of keys
  function ApplySharesSeq(
      b: map<PersonId, Money>,
      shares: map<PersonId, Money>,
      keys: seq<PersonId>
    ): map<PersonId, Money>
    decreases |keys|
  {
    if |keys| == 0 then b
    else
      var p := keys[0];
      var rest := keys[1..];
      if p in shares then
        ApplySharesSeq(AddToMap(b, p, -shares[p]), shares, rest)
      else
        ApplySharesSeq(b, shares, rest)
  }

  function ApplyExpenseToBalances(
      b: map<PersonId, Money>,
      e: Expense
    ): map<PersonId, Money>
  {
    var b' := AddToMap(b, e.paidBy, e.amount);
    ApplySharesSeq(b', e.shares, e.shareKeys)
  }

  function ApplySettlementToBalances(
      b: map<PersonId, Money>,
      s: Settlement
    ): map<PersonId, Money>
  {
    var b' := AddToMap(b, s.from, s.amount);
    AddToMap(b', s.to, -s.amount)
  }

  // Fold over expenses
  function ApplyExpensesSeq(
      b: map<PersonId, Money>,
      expenses: seq<Expense>
    ): map<PersonId, Money>
    decreases |expenses|
  {
    if |expenses| == 0 then b
    else
      var b' := ApplyExpenseToBalances(b, expenses[0]);
      ApplyExpensesSeq(b', expenses[1..])
  }

  // Fold over settlements
  function ApplySettlementsSeq(
      b: map<PersonId, Money>,
      settlements: seq<Settlement>
    ): map<PersonId, Money>
    decreases |settlements|
  {
    if |settlements| == 0 then b
    else
      var b' := ApplySettlementToBalances(b, settlements[0]);
      ApplySettlementsSeq(b', settlements[1..])
  }

  // Balances: the main projection function (compilable)
  function Balances(model: Model): map<PersonId, Money>
  {
    var b := ZeroBalancesSeq(model.memberList);
    var b' := ApplyExpensesSeq(b, model.expenses);
    ApplySettlementsSeq(b', model.settlements)
  }

  // Get balance for a specific person
  function GetBalance(model: Model, p: PersonId): Money
  {
    var b := Balances(model);
    if p in b then b[p] else 0
  }

  // -----------------------------
  // History explanation functions
  // -----------------------------

  function SumSeq(s: seq<Money>): Money
    decreases |s|
  {
    if |s| == 0 then 0
    else s[0] + SumSeq(s[1..])
  }

  function ExpenseDeltaForPerson(e: Expense, p: PersonId): Money
  {
    var payerDelta := if p == e.paidBy then e.amount else 0;
    var shareDelta := if p in e.shares then -e.shares[p] else 0;
    payerDelta + shareDelta
  }

  function ExpenseDeltas(expenses: seq<Expense>, p: PersonId): seq<Money>
    decreases |expenses|
  {
    if |expenses| == 0 then []
    else [ExpenseDeltaForPerson(expenses[0], p)] + ExpenseDeltas(expenses[1..], p)
  }

  function SettlementDeltaForPerson(s: Settlement, p: PersonId): Money
  {
    var fromDelta := if p == s.from then s.amount else 0;
    var toDelta := if p == s.to then -s.amount else 0;
    fromDelta + toDelta
  }

  function SettlementDeltas(settlements: seq<Settlement>, p: PersonId): seq<Money>
    decreases |settlements|
  {
    if |settlements| == 0 then []
    else [SettlementDeltaForPerson(settlements[0], p)] + SettlementDeltas(settlements[1..], p)
  }

  function ExplainExpenses(model: Model, p: PersonId): seq<Money>
  {
    ExpenseDeltas(model.expenses, p) + SettlementDeltas(model.settlements, p)
  }

  // =============================
  // USER-FACING GUARANTEES
  // =============================

  // THE CONSERVATION THEOREM: Sum of all balances is always zero
  lemma Conservation(model: Model)
    requires Inv(model)
    ensures SumValues(Balances(model)) == 0

  // AddExpense delta law: how adding an expense affects balances
  lemma AddExpenseDelta(model: Model, e: Expense, model': Model)
    requires Inv(model)
    requires ValidExpenseCheck(model.members, e)
    requires model' == Model(model.members, model.memberList, model.expenses + [e], model.settlements)
    ensures Inv(model')
    // Payer gains amount (when not a share owner)
    ensures e.paidBy !in e.shares ==>
      GetBalance(model', e.paidBy) == GetBalance(model, e.paidBy) + e.amount
    // Share owners (not payer) lose their share
    ensures forall p :: p in e.shares && p != e.paidBy ==>
      GetBalance(model', p) == GetBalance(model, p) - e.shares[p]
    // Payer who is also a share owner: net change is amount - share
    ensures e.paidBy in e.shares ==>
      GetBalance(model', e.paidBy) == GetBalance(model, e.paidBy) + e.amount - e.shares[e.paidBy]
    // Others unchanged
    ensures forall p :: p !in e.shares && p != e.paidBy ==>
      GetBalance(model', p) == GetBalance(model, p)
    // Conservation preserved
    ensures SumValues(Balances(model')) == 0

  // AddSettlement delta law: how adding a settlement affects balances
  lemma AddSettlementDelta(model: Model, s: Settlement, model': Model)
    requires Inv(model)
    requires ValidSettlement(model.members, s)
    requires model' == Model(model.members, model.memberList, model.expenses, model.settlements + [s])
    ensures Inv(model')
    // From gains amount (owes less)
    ensures s.from != s.to ==> GetBalance(model', s.from) == GetBalance(model, s.from) + s.amount
    // To loses amount (is owed less)
    ensures s.from != s.to ==> GetBalance(model', s.to) == GetBalance(model, s.to) - s.amount
    // Others unchanged
    ensures forall p :: p != s.from && p != s.to ==>
      GetBalance(model', p) == GetBalance(model, p)
    // Conservation preserved
    ensures SumValues(Balances(model')) == 0

  // ExplainSumsToBalance: the sum of all deltas for a person equals their balance
  lemma ExplainSumsToBalance(model: Model, p: PersonId)
    requires Inv(model)
    requires p in model.members
    ensures SumSeq(ExplainExpenses(model, p)) == GetBalance(model, p)

  // -----------------------------
  // State transition methods
  // -----------------------------

  // Step: the only state mutator - total reducer (no ghost preconditions)
  method Step(model: Model, a: Action) returns (result: Result<Model, Err>)
    requires Inv(model)
    ensures result.Ok? ==> Inv(result.value)

  // Initialize a new model with the given members
  method Init(memberList: seq<PersonId>) returns (result: Result<Model, Err>)
    ensures result.Ok? ==> Inv(result.value)

  // Get a certificate for the current model
  method GetCertificate(model: Model) returns (cert: Certificate)
    requires Inv(model)
}


// =============================
// Implementation Module
// =============================
// This module provides proofs of all the guarantees.

module ClearSplit refines ClearSplitSpec {

  // -----------------------------
  // SumValues implementation
  // -----------------------------
  ghost function SumValues(m: map<PersonId, Money>): Money
  {
    if |m| == 0 then 0
    else
      var k :| k in m;
      m[k] + SumValues(m - {k})
  }

  // -----------------------------
  // Helper lemmas for SumValues
  // -----------------------------

  // Key lemma: SumValues(m) can be computed by removing any key p first
  lemma SumValuesRemoveKey(m: map<PersonId, Money>, p: PersonId)
    requires p in m
    decreases |m|, 1
    ensures SumValues(m) == m[p] + SumValues(m - {p})
  {
    if |m| == 1 {
      assert |m.Keys| == 1;
      assert p in m.Keys;
      assert m.Keys == {p};
    } else {
      assert |m| > 0;
      var k :| k in m && SumValues(m) == m[k] + SumValues(m - {k});
      if k == p {
      } else {
        SumValuesAnyKey(m, p, k);
      }
    }
  }

  // Commutativity: any two decompositions give the same result
  lemma SumValuesAnyKey(m: map<PersonId, Money>, p: PersonId, q: PersonId)
    requires p in m
    requires q in m
    requires p != q
    decreases |m|, 0
    ensures m[p] + SumValues(m - {p}) == m[q] + SumValues(m - {q})
  {
    var mp := m - {p};
    var mq := m - {q};
    var mpq := m - {p} - {q};

    assert q in mp;
    assert p in mq;
    assert mp - {q} == mpq;
    assert mq - {p} == mpq;

    SumValuesRemoveKey(mp, q);
    SumValuesRemoveKey(mq, p);
  }

  // SumValues of a map where all values are zero is zero
  lemma SumValuesAllZero(m: map<PersonId, Money>)
    requires forall p :: p in m ==> m[p] == 0
    ensures SumValues(m) == 0
    decreases |m|
  {
    if |m| == 0 {
    } else {
      var p :| p in m;
      SumValuesRemoveKey(m, p);
      // SumValues(m) == m[p] + SumValues(m - {p}) == 0 + SumValues(m - {p})
      SumValuesAllZero(m - {p});
    }
  }

  // Helper: AddToMap changes sum by delta
  lemma {:vcs_split_on_every_assert} AddToMapSumChange(b: map<PersonId, Money>, p: PersonId, delta: Money)
    ensures SumValues(AddToMap(b, p, delta)) == SumValues(b) + delta
  {
    var b' := AddToMap(b, p, delta);
    if p in b {
      SumValuesRemoveKey(b, p);
      SumValuesRemoveKey(b', p);
      assert b' - {p} == b - {p};
    } else {
      SumValuesRemoveKey(b', p);
      assert b' - {p} == b;
    }
  }

  // -----------------------------
  // Sequence/set helpers
  // -----------------------------

  lemma SeqToSetSizeBound(s: seq<PersonId>)
    ensures |set i | 0 <= i < |s| :: s[i]| <= |s|
    decreases |s|
  {
    if |s| == 0 {
    } else {
      var init := s[..|s|-1];
      SeqToSetSizeBound(init);
      var initSet := set i | 0 <= i < |init| :: init[i];
      var fullSet := set i | 0 <= i < |s| :: s[i];
      assert fullSet == initSet + {s[|s|-1]};
    }
  }

  lemma SeqWithDupSmallerSet(s: seq<PersonId>, i: int, j: int)
    requires 0 <= i < j < |s|
    requires s[i] == s[j]
    ensures |set k | 0 <= k < |s| :: s[k]| < |s|
    decreases |s|
  {
    var sSet := set k | 0 <= k < |s| :: s[k];
    SeqToSetSizeBound(s);
    var s' := s[..j] + s[j+1..];
    var s'Set := set k | 0 <= k < |s'| :: s'[k];

    assert s[i] in s';
    forall k | k in sSet
      ensures k in s'Set
    {
      var idx :| 0 <= idx < |s| && s[idx] == k;
      if idx < j {
        assert s'[idx] == k;
      } else if idx > j {
        assert s'[idx-1] == k;
      } else {
        assert s'[i] == k;
      }
    }
    forall k | k in s'Set
      ensures k in sSet
    {
      var idx :| 0 <= idx < |s'| && s'[idx] == k;
      if idx < j {
        assert s[idx] == k;
      } else {
        assert s[idx+1] == k;
      }
    }
    assert s'Set == sSet;

    SeqToSetSizeBound(s');
    assert |sSet| == |s'Set| <= |s'| == |s| - 1 < |s|;
  }

  lemma SeqNoDuplicates(keys: seq<PersonId>, m: map<PersonId, Money>)
    requires forall k :: k in m.Keys <==> k in keys
    requires |keys| == |m|
    ensures forall i, j :: 0 <= i < j < |keys| ==> keys[i] != keys[j]
  {
    var keySet := set i | 0 <= i < |keys| :: keys[i];

    forall k | k in keySet
      ensures k in m.Keys
    {
      var i :| 0 <= i < |keys| && keys[i] == k;
      assert k in keys;
    }
    forall k | k in m.Keys
      ensures k in keySet
    {
      assert k in keys;
      var i :| 0 <= i < |keys| && keys[i] == k;
      assert k in keySet;
    }
    assert keySet == m.Keys;

    if exists i, j :: 0 <= i < j < |keys| && keys[i] == keys[j] {
      var i, j :| 0 <= i < j < |keys| && keys[i] == keys[j];
      SeqToSetSizeBound(keys);
      assert |keySet| <= |keys|;
      SeqWithDupSmallerSet(keys, i, j);
      assert |keySet| < |keys|;
      assert |keySet| < |m.Keys|;
      assert false;
    }
  }

  lemma NoDupSeqToSetSizeGeneral(s: seq<PersonId>)
    requires NoDuplicates(s)
    ensures |set i | 0 <= i < |s| :: s[i]| == |s|
    decreases |s|
  {
    if |s| == 0 {
    } else {
      var last := s[|s|-1];
      var init := s[..|s|-1];
      assert NoDuplicates(init);
      NoDupSeqToSetSizeGeneral(init);
      var initSet := set i | 0 <= i < |init| :: init[i];
      var fullSet := set i | 0 <= i < |s| :: s[i];
      assert last !in initSet;
      assert fullSet == initSet + {last};
    }
  }

  lemma NoDupSeqToSetSize(s: seq<PersonId>)
    requires forall i, j :: 0 <= i < j < |s| ==> s[i] != s[j]
    ensures |set i | 0 <= i < |s| :: s[i]| == |s|
    decreases |s|
  {
    if |s| == 0 {
    } else {
      var last := s[|s|-1];
      var init := s[..|s|-1];
      NoDupSeqToSetSize(init);
      var initSet := set i | 0 <= i < |init| :: init[i];
      var fullSet := set i | 0 <= i < |s| :: s[i];
      assert last !in initSet;
      assert fullSet == initSet + {last};
    }
  }

  // Helper: equal-size subset of finite set is the whole set
  lemma SubsetEqualSizeIsEqual<T>(a: set<T>, b: set<T>)
    requires a <= b
    requires |a| == |b|
    ensures a == b
  {
    if a != b {
      var x :| x in b && x !in a;
      assert a <= b - {x};
      CardinalitySubsetStrict(a, b, x);
    }
  }

  lemma CardinalitySubsetStrict<T>(a: set<T>, b: set<T>, x: T)
    requires a <= b
    requires x in b && x !in a
    ensures |a| < |b|
  {
    assert a <= b - {x};
    CardinalitySubset(a, b - {x});
    assert |b - {x}| == |b| - 1;
  }

  lemma CardinalitySubset<T>(a: set<T>, b: set<T>)
    requires a <= b
    ensures |a| <= |b|
    decreases |b|
  {
    if |b| == 0 {
      assert a == {};
    } else {
      var x :| x in b;
      if x in a {
        CardinalitySubset(a - {x}, b - {x});
      } else {
        CardinalitySubset(a, b - {x});
      }
    }
  }

  lemma SubsetEqualSize<T>(a: set<T>, b: set<T>)
    requires a <= b
    requires |a| == |b|
    ensures a == b
  {
    forall x | x in b
      ensures x in a
    {
      if x !in a {
        assert a <= b - {x};
        CardinalitySubset(a, b - {x});
      }
    }
  }

  // Equivalence: ShareKeysOk implies ShareKeysConsistent
  lemma ShareKeysOkImpliesConsistent(e: Expense)
    requires ShareKeysOk(e)
    ensures ShareKeysConsistent(e)
  {
    var keysInShares := set i | 0 <= i < |e.shareKeys| :: e.shareKeys[i];
    NoDupSeqToSetSizeGeneral(e.shareKeys);
    assert |keysInShares| == |e.shareKeys|;
    assert keysInShares <= e.shares.Keys;
    assert |keysInShares| == |e.shares.Keys|;
    SubsetEqualSizeIsEqual(keysInShares, e.shares.Keys);
    assert keysInShares == e.shares.Keys;

    forall k | k in e.shares.Keys
      ensures k in e.shareKeys
    {
      assert k in keysInShares;
      var i :| 0 <= i < |e.shareKeys| && e.shareKeys[i] == k;
    }
  }

  // Equivalence lemma: ValidExpenseCheck implies WellFormedExpense
  lemma {:vcs_split_on_every_assert} ValidExpenseCheckImpliesWellFormed(members: set<PersonId>, e: Expense)
    requires ValidExpenseCheck(members, e)
    ensures WellFormedExpense(members, e)
  {
    ShareKeysOkImpliesConsistent(e);
    SumValuesSeqEquiv(e.shares, e.shareKeys);
    forall p | p in e.shares
      ensures p in members && e.shares[p] >= 0
    {
      assert p in e.shareKeys;
      var i :| 0 <= i < |e.shareKeys| && e.shareKeys[i] == p;
      assert e.shareKeys[i] in members;
    }
  }

  // -----------------------------
  // SumValuesSeq equivalence
  // -----------------------------

  lemma {:vcs_split_on_every_assert} SumValuesSeqEquiv(m: map<PersonId, Money>, keys: seq<PersonId>)
    requires forall k :: k in m.Keys <==> k in keys
    requires |keys| == |m|
    decreases |keys|
    ensures SumValuesSeq(m, keys) == SumValues(m)
  {
    if |keys| == 0 {
    } else {
      var k := keys[0];
      var rest := keys[1..];
      var m' := m - {k};

      SeqNoDuplicates(keys, m);
      SumValuesRemoveKey(m, k);
      RestCoversMapMinus(keys, m, k);
      SumValuesSeqEquiv(m', rest);
    }
  }

  lemma RestCoversMapMinus(keys: seq<PersonId>, m: map<PersonId, Money>, k: PersonId)
    requires |keys| > 0
    requires k == keys[0]
    requires k in m
    requires forall x :: x in m.Keys <==> x in keys
    requires |keys| == |m|
    ensures forall x :: x in (m - {k}).Keys <==> x in keys[1..]
    ensures |keys[1..]| == |m - {k}|
  {
    var rest := keys[1..];
    var m' := m - {k};
    SeqNoDuplicates(keys, m);

    forall x | x in m'.Keys
      ensures x in rest
    {
      assert x in m.Keys && x != k;
      assert x in keys;
      var i :| 0 <= i < |keys| && keys[i] == x;
      assert i != 0;
    }

    forall x | x in rest
      ensures x in m'.Keys
    {
      var i :| 0 <= i < |rest| && rest[i] == x;
      assert keys[i+1] == x;
      assert x in keys;
      assert x in m.Keys;
      assert x != k;
    }
  }

  // -----------------------------
  // ZeroBalances equivalence
  // -----------------------------

  ghost function ZeroBalances(members: set<PersonId>): map<PersonId, Money>
    decreases |members|
    ensures forall p :: p in members ==> p in ZeroBalances(members)
    ensures forall p :: p in ZeroBalances(members) ==> p in members
    ensures forall p :: p in ZeroBalances(members) ==> ZeroBalances(members)[p] == 0
  {
    if |members| == 0 then map[]
    else
      var p :| p in members;
      ZeroBalances(members - {p})[p := 0]
  }

  lemma MemberListNoDuplicates(memberList: seq<PersonId>, members: set<PersonId>)
    requires forall p :: p in members <==> p in memberList
    requires |memberList| == |members|
    ensures forall i, j :: 0 <= i < j < |memberList| ==> memberList[i] != memberList[j]
  {
    var elemSet := set i | 0 <= i < |memberList| :: memberList[i];

    forall k | k in elemSet
      ensures k in members
    {
      var i :| 0 <= i < |memberList| && memberList[i] == k;
      assert k in memberList;
    }
    forall k | k in members
      ensures k in elemSet
    {
      assert k in memberList;
      var i :| 0 <= i < |memberList| && memberList[i] == k;
    }
    assert elemSet == members;

    if exists i, j :: 0 <= i < j < |memberList| && memberList[i] == memberList[j] {
      var i, j :| 0 <= i < j < |memberList| && memberList[i] == memberList[j];
      SeqWithDupSmallerSet(memberList, i, j);
      assert |elemSet| < |memberList|;
      assert |elemSet| < |members|;
      assert false;
    }
  }

  lemma ZeroBalancesEquiv(members: set<PersonId>, memberList: seq<PersonId>)
    requires forall p :: p in members <==> p in memberList
    requires |memberList| == |members|
    ensures ZeroBalancesSeq(memberList) == ZeroBalances(members)
  {
    MemberListNoDuplicates(memberList, members);

    if |memberList| == 0 {
      assert |members| == 0;
    } else {
      var p := memberList[0];
      var rest := memberList[1..];
      var members' := members - {p};

      assert |rest| == |memberList| - 1;
      assert |members'| == |members| - 1;

      forall q | q in members'
        ensures q in rest
      {
        assert q in members;
        assert q in memberList;
        assert q != p;
        var i :| 0 <= i < |memberList| && memberList[i] == q;
        assert i > 0;
        assert memberList[i] == rest[i-1];
      }

      forall q | q in rest
        ensures q in members'
      {
        var i :| 0 <= i < |rest| && rest[i] == q;
        assert memberList[i+1] == q;
        assert q in memberList;
        assert q in members;
        assert q != p;
      }

      ZeroBalancesEquiv(members', rest);
    }
  }

  lemma ZeroBalancesSum(members: set<PersonId>)
    ensures SumValues(ZeroBalances(members)) == 0
  {
    SumValuesAllZero(ZeroBalances(members));
  }

  // Ghost version for equivalence proofs
  ghost function BalancesGhost(model: Model): map<PersonId, Money>
    requires Inv(model)
  {
    var b := ZeroBalances(model.members);
    var b' := ApplyExpensesSeq(b, model.expenses);
    ApplySettlementsSeq(b', model.settlements)
  }

  lemma BalancesEquiv(model: Model)
    requires Inv(model)
    ensures Balances(model) == BalancesGhost(model)
  {
    ZeroBalancesEquiv(model.members, model.memberList);
  }

  // -----------------------------
  // Sum preservation helpers
  // -----------------------------

  lemma NoDupHeadNotInTail(keys: seq<PersonId>)
    requires |keys| > 0 && NoDuplicates(keys)
    ensures keys[0] !in keys[1..]
  {
    if keys[0] in keys[1..] {
      var i :| 0 <= i < |keys[1..]| && keys[1..][i] == keys[0];
      assert keys[i+1] == keys[0];
    }
  }

  lemma NoDupTail(keys: seq<PersonId>)
    requires |keys| > 0 && NoDuplicates(keys)
    ensures NoDuplicates(keys[1..])
  {}

  lemma SumValuesSeqRemoveNonMember(m: map<PersonId, Money>, p: PersonId, keys: seq<PersonId>)
    requires p !in keys
    ensures SumValuesSeq(m, keys) == SumValuesSeq(m - {p}, keys)
    decreases |keys|
  {
    if |keys| == 0 {
    } else {
      var k := keys[0];
      var rest := keys[1..];
      assert p !in rest;
      if k in m {
        if k in (m - {p}) {
          assert m[k] == (m - {p})[k];
          SumValuesSeqRemoveNonMember(m - {k}, p, rest);
          assert (m - {k}) - {p} == (m - {p}) - {k};
        } else {
          assert k == p;
          assert false;
        }
      } else {
        if k in (m - {p}) {
          assert false;
        } else {
          SumValuesSeqRemoveNonMember(m, p, rest);
        }
      }
    }
  }

  lemma ApplySharesSeqKeysUnchanged(b: map<PersonId, Money>, shares: map<PersonId, Money>, keys: seq<PersonId>)
    requires forall k :: k in shares.Keys ==> k in b.Keys
    ensures ApplySharesSeq(b, shares, keys).Keys == b.Keys
    decreases |keys|
  {
    if |keys| == 0 {
    } else {
      var p := keys[0];
      var rest := keys[1..];
      if p in shares {
        var b' := AddToMap(b, p, -shares[p]);
        assert b'.Keys == b.Keys;
        ApplySharesSeqKeysUnchanged(b', shares, rest);
      } else {
        ApplySharesSeqKeysUnchanged(b, shares, rest);
      }
    }
  }

  lemma AddToMapMinusCommutes(b: map<PersonId, Money>, p: PersonId, delta: Money, k: PersonId)
    requires p != k
    requires p in b
    ensures AddToMap(b, p, delta) - {k} == AddToMap(b - {k}, p, delta)
  {}

  lemma AddToMapSumChangeImplHelper(b: map<PersonId, Money>, p: PersonId, delta: Money, bKeys: seq<PersonId>)
    requires NoDuplicates(bKeys)
    requires forall k :: k in b.Keys <==> k in bKeys
    requires |bKeys| == |b|
    requires p in b
    requires p in bKeys
    ensures SumValuesSeq(AddToMap(b, p, delta), bKeys) == SumValuesSeq(b, bKeys) + delta
    decreases |bKeys|
  {
    if |bKeys| == 0 {
    } else {
      var k := bKeys[0];
      var rest := bKeys[1..];
      NoDupTail(bKeys);
      NoDupHeadNotInTail(bKeys);

      var b' := AddToMap(b, p, delta);

      if k == p {
        assert b' - {k} == b - {k};
      } else {
        AddToMapMinusCommutes(b, p, delta, k);
        AddToMapSumChangeImplHelper(b - {k}, p, delta, rest);
      }
    }
  }

  lemma AddToMapSumChangeImpl(b: map<PersonId, Money>, p: PersonId, delta: Money, bKeys: seq<PersonId>)
    requires NoDuplicates(bKeys)
    requires forall k :: k in b.Keys <==> k in bKeys
    requires |bKeys| == |b|
    requires p in b
    ensures SumValuesSeq(AddToMap(b, p, delta), bKeys) == SumValuesSeq(b, bKeys) + delta
  {
    AddToMapSumChangeImplHelper(b, p, delta, bKeys);
  }

  lemma ApplySharesSeqSumChangeImpl(
    b: map<PersonId, Money>, shares: map<PersonId, Money>,
    keys: seq<PersonId>, bKeys: seq<PersonId>)
    requires NoDuplicates(keys)
    requires NoDuplicates(bKeys)
    requires forall k :: k in b.Keys <==> k in bKeys
    requires |bKeys| == |b|
    requires forall k :: k in shares.Keys ==> k in b.Keys
    ensures SumValuesSeq(ApplySharesSeq(b, shares, keys), bKeys) == SumValuesSeq(b, bKeys) - SumValuesSeq(shares, keys)
    decreases |keys|
  {
    if |keys| == 0 {
    } else {
      var p := keys[0];
      var rest := keys[1..];
      NoDupTail(keys);
      NoDupHeadNotInTail(keys);

      if p in shares {
        var b' := AddToMap(b, p, -shares[p]);
        assert b'.Keys == b.Keys;
        SumValuesSeqRemoveNonMember(shares, p, rest);
        AddToMapSumChangeImpl(b, p, -shares[p], bKeys);
        ApplySharesSeqSumChangeImpl(b', shares, rest, bKeys);
      } else {
        ApplySharesSeqSumChangeImpl(b, shares, rest, bKeys);
      }
    }
  }

  lemma ApplySharesSeqSumChange(b: map<PersonId, Money>, shares: map<PersonId, Money>, keys: seq<PersonId>, bKeys: seq<PersonId>)
    requires NoDuplicates(keys)
    requires forall k :: k in shares.Keys <==> k in keys
    requires |keys| == |shares|
    requires NoDuplicates(bKeys)
    requires forall k :: k in b.Keys <==> k in bKeys
    requires |bKeys| == |b|
    requires forall k :: k in shares.Keys ==> k in b.Keys
    ensures SumValues(ApplySharesSeq(b, shares, keys)) == SumValues(b) - SumValuesSeq(shares, keys)
  {
    ApplySharesSeqSumChangeImpl(b, shares, keys, bKeys);
    ApplySharesSeqKeysUnchanged(b, shares, keys);
    SumValuesSeqEquiv(b, bKeys);
    SumValuesSeqEquiv(ApplySharesSeq(b, shares, keys), bKeys);
  }

  lemma ApplyExpensePreservesSum(b: map<PersonId, Money>, e: Expense, bKeys: seq<PersonId>)
    requires ShareKeysConsistent(e)
    requires SumValues(e.shares) == e.amount
    requires NoDuplicates(bKeys)
    requires forall k :: k in b.Keys <==> k in bKeys
    requires |bKeys| == |b|
    requires e.paidBy in b
    requires forall k :: k in e.shares.Keys ==> k in b.Keys
    ensures SumValues(ApplyExpenseToBalances(b, e)) == SumValues(b)
  {
    var b' := AddToMap(b, e.paidBy, e.amount);
    AddToMapSumChange(b, e.paidBy, e.amount);
    assert b'.Keys == b.Keys;

    ApplySharesSeqSumChange(b', e.shares, e.shareKeys, bKeys);
    SumValuesSeqEquiv(e.shares, e.shareKeys);
  }

  lemma ApplySettlementPreservesSum(b: map<PersonId, Money>, s: Settlement)
    ensures SumValues(ApplySettlementToBalances(b, s)) == SumValues(b)
  {
    var b' := AddToMap(b, s.from, s.amount);
    AddToMapSumChange(b, s.from, s.amount);
    assert SumValues(b') == SumValues(b) + s.amount;

    var result := AddToMap(b', s.to, -s.amount);
    AddToMapSumChange(b', s.to, -s.amount);
    assert SumValues(result) == SumValues(b') - s.amount;
    assert SumValues(result) == SumValues(b);
  }

  lemma ApplyExpenseKeysUnchanged(b: map<PersonId, Money>, e: Expense)
    requires e.paidBy in b.Keys
    requires forall k :: k in e.shares.Keys ==> k in b.Keys
    ensures ApplyExpenseToBalances(b, e).Keys == b.Keys
  {
    var b' := AddToMap(b, e.paidBy, e.amount);
    assert b'.Keys == b.Keys;
    ApplySharesSeqKeysUnchanged(b', e.shares, e.shareKeys);
  }

  lemma ApplyExpensesPreservesSum(b: map<PersonId, Money>, expenses: seq<Expense>, bKeys: seq<PersonId>)
    requires forall i :: 0 <= i < |expenses| ==> ShareKeysConsistent(expenses[i])
    requires forall i :: 0 <= i < |expenses| ==> SumValues(expenses[i].shares) == expenses[i].amount
    requires NoDuplicates(bKeys)
    requires forall k :: k in b.Keys <==> k in bKeys
    requires |bKeys| == |b|
    requires forall i :: 0 <= i < |expenses| ==> expenses[i].paidBy in b.Keys
    requires forall i :: 0 <= i < |expenses| ==> forall k :: k in expenses[i].shares.Keys ==> k in b.Keys
    ensures SumValues(ApplyExpensesSeq(b, expenses)) == SumValues(b)
    decreases |expenses|
  {
    if |expenses| == 0 {
    } else {
      var e := expenses[0];
      var b' := ApplyExpenseToBalances(b, e);
      ApplyExpensePreservesSum(b, e, bKeys);
      ApplyExpenseKeysUnchanged(b, e);
      ApplyExpensesPreservesSum(b', expenses[1..], bKeys);
    }
  }

  lemma ApplySettlementsPreservesSum(b: map<PersonId, Money>, settlements: seq<Settlement>)
    ensures SumValues(ApplySettlementsSeq(b, settlements)) == SumValues(b)
    decreases |settlements|
  {
    if |settlements| == 0 {
    } else {
      var b' := ApplySettlementToBalances(b, settlements[0]);
      ApplySettlementPreservesSum(b, settlements[0]);
      ApplySettlementsPreservesSum(b', settlements[1..]);
    }
  }

  // -----------------------------
  // CONSERVATION THEOREM PROOF
  // -----------------------------
  lemma Conservation(model: Model)
  {
    BalancesEquiv(model);
    ZeroBalancesSum(model.members);

    var b0 := ZeroBalances(model.members);
    assert SumValues(b0) == 0;
    assert b0.Keys == model.members;

    var bKeys := model.memberList;

    assert forall i :: 0 <= i < |model.expenses| ==> WellFormedExpense(model.members, model.expenses[i]);
    forall i | 0 <= i < |model.expenses|
      ensures ShareKeysConsistent(model.expenses[i])
      ensures SumValues(model.expenses[i].shares) == model.expenses[i].amount
      ensures model.expenses[i].paidBy in b0.Keys
      ensures forall k :: k in model.expenses[i].shares.Keys ==> k in b0.Keys
    {
      assert WellFormedExpense(model.members, model.expenses[i]);
    }
    var b1 := ApplyExpensesSeq(b0, model.expenses);
    ApplyExpensesPreservesSum(b0, model.expenses, bKeys);
    assert SumValues(b1) == 0;

    var b2 := ApplySettlementsSeq(b1, model.settlements);
    ApplySettlementsPreservesSum(b1, model.settlements);
    assert SumValues(b2) == 0;

    ZeroBalancesEquiv(model.members, model.memberList);
    assert ZeroBalancesSeq(model.memberList) == b0;
  }

  // -----------------------------
  // Delta law helpers
  // -----------------------------

  function GetFromMap(b: map<PersonId, Money>, p: PersonId): Money
  {
    if p in b then b[p] else 0
  }

  lemma AddToMapDelta(b: map<PersonId, Money>, q: PersonId, delta: Money, p: PersonId)
    ensures GetFromMap(AddToMap(b, q, delta), p) == GetFromMap(b, p) + (if p == q then delta else 0)
  {}

  lemma NoDuplicatesRest(keys: seq<PersonId>)
    requires |keys| > 0
    requires NoDuplicates(keys)
    ensures NoDuplicates(keys[1..])
  {
    var rest := keys[1..];
    forall i, j | 0 <= i < j < |rest|
      ensures rest[i] != rest[j]
    {
      assert keys[i+1] == rest[i];
      assert keys[j+1] == rest[j];
    }
  }

  lemma NoDuplicatesFirstNotInRest(keys: seq<PersonId>)
    requires |keys| > 0
    requires NoDuplicates(keys)
    ensures keys[0] !in keys[1..]
  {
    var first := keys[0];
    var rest := keys[1..];
    if first in rest {
      var i :| 0 <= i < |rest| && rest[i] == first;
      assert keys[i+1] == first;
      assert keys[0] == first;
      assert false;
    }
  }

  lemma ApplySharesDeltaAfterProcessed(b: map<PersonId, Money>, shares: map<PersonId, Money>, keys: seq<PersonId>, p: PersonId)
    requires p !in keys
    ensures GetFromMap(ApplySharesSeq(b, shares, keys), p) == GetFromMap(b, p)
    decreases |keys|
  {
    if |keys| == 0 {
    } else {
      var k := keys[0];
      var rest := keys[1..];
      assert p !in rest;
      if k in shares {
        var b' := AddToMap(b, k, -shares[k]);
        AddToMapDelta(b, k, -shares[k], p);
        assert k != p;
        ApplySharesDeltaAfterProcessed(b', shares, rest, p);
      } else {
        ApplySharesDeltaAfterProcessed(b, shares, rest, p);
      }
    }
  }

  lemma ApplySharesDelta(b: map<PersonId, Money>, shares: map<PersonId, Money>, keys: seq<PersonId>, p: PersonId)
    requires NoDuplicates(keys)
    ensures GetFromMap(ApplySharesSeq(b, shares, keys), p) ==
            GetFromMap(b, p) + (if p in shares && p in keys then -shares[p] else 0)
    decreases |keys|
  {
    if |keys| == 0 {
    } else {
      var k := keys[0];
      var rest := keys[1..];
      NoDuplicatesRest(keys);
      if k in shares {
        var b' := AddToMap(b, k, -shares[k]);
        AddToMapDelta(b, k, -shares[k], p);
        if k == p {
          NoDuplicatesFirstNotInRest(keys);
          ApplySharesDeltaAfterProcessed(b', shares, rest, p);
        } else {
          ApplySharesDelta(b', shares, rest, p);
        }
      } else {
        ApplySharesDelta(b, shares, rest, p);
      }
    }
  }

  lemma ApplyExpenseDeltaForPerson(b: map<PersonId, Money>, e: Expense, p: PersonId)
    requires NoDuplicates(e.shareKeys)
    requires forall k :: k in e.shares <==> k in e.shareKeys
    ensures GetFromMap(ApplyExpenseToBalances(b, e), p) == GetFromMap(b, p) + ExpenseDeltaForPerson(e, p)
  {
    var b' := AddToMap(b, e.paidBy, e.amount);
    AddToMapDelta(b, e.paidBy, e.amount, p);
    ApplySharesDelta(b', e.shares, e.shareKeys, p);
  }

  lemma ApplySettlementDeltaForPerson(b: map<PersonId, Money>, s: Settlement, p: PersonId)
    ensures GetFromMap(ApplySettlementToBalances(b, s), p) == GetFromMap(b, p) + SettlementDeltaForPerson(s, p)
  {
    var b' := AddToMap(b, s.from, s.amount);
    AddToMapDelta(b, s.from, s.amount, p);
    var result := AddToMap(b', s.to, -s.amount);
    AddToMapDelta(b', s.to, -s.amount, p);
  }

  lemma ApplyExpensesSeqConcat(b: map<PersonId, Money>, expenses1: seq<Expense>, expenses2: seq<Expense>)
    ensures ApplyExpensesSeq(b, expenses1 + expenses2) == ApplyExpensesSeq(ApplyExpensesSeq(b, expenses1), expenses2)
    decreases |expenses1|
  {
    if |expenses1| == 0 {
      assert expenses1 + expenses2 == expenses2;
    } else {
      var b' := ApplyExpenseToBalances(b, expenses1[0]);
      assert (expenses1 + expenses2)[0] == expenses1[0];
      assert (expenses1 + expenses2)[1..] == expenses1[1..] + expenses2;
      ApplyExpensesSeqConcat(b', expenses1[1..], expenses2);
    }
  }

  lemma ApplySettlementsSeqConcat(b: map<PersonId, Money>, settlements1: seq<Settlement>, settlements2: seq<Settlement>)
    ensures ApplySettlementsSeq(b, settlements1 + settlements2) == ApplySettlementsSeq(ApplySettlementsSeq(b, settlements1), settlements2)
    decreases |settlements1|
  {
    if |settlements1| == 0 {
      assert settlements1 + settlements2 == settlements2;
    } else {
      var b' := ApplySettlementToBalances(b, settlements1[0]);
      assert (settlements1 + settlements2)[0] == settlements1[0];
      assert (settlements1 + settlements2)[1..] == settlements1[1..] + settlements2;
      ApplySettlementsSeqConcat(b', settlements1[1..], settlements2);
    }
  }

  lemma SettlementsPreserveDelta(
    b1: map<PersonId, Money>,
    b1': map<PersonId, Money>,
    settlements: seq<Settlement>,
    p: PersonId,
    delta: Money
  )
    requires GetFromMap(b1', p) == GetFromMap(b1, p) + delta
    ensures GetFromMap(ApplySettlementsSeq(b1', settlements), p) ==
            GetFromMap(ApplySettlementsSeq(b1, settlements), p) + delta
    decreases |settlements|
  {
    if |settlements| == 0 {
    } else {
      var s := settlements[0];
      var b2 := ApplySettlementToBalances(b1, s);
      var b2' := ApplySettlementToBalances(b1', s);

      ApplySettlementDeltaForPerson(b1, s, p);
      ApplySettlementDeltaForPerson(b1', s, p);

      SettlementsPreserveDelta(b2, b2', settlements[1..], p, delta);
    }
  }

  lemma AddExpenseBalanceRelation(model: Model, e: Expense, model': Model)
    requires Inv(model)
    requires ValidExpenseCheck(model.members, e)
    requires model' == Model(model.members, model.memberList, model.expenses + [e], model.settlements)
    ensures forall p :: p == e.paidBy && p !in e.shares ==>
      GetBalance(model', p) == GetBalance(model, p) + e.amount
    ensures forall p :: p in e.shares && p != e.paidBy ==>
      GetBalance(model', p) == GetBalance(model, p) - e.shares[p]
    ensures e.paidBy in e.shares ==>
      GetBalance(model', e.paidBy) == GetBalance(model, e.paidBy) + e.amount - e.shares[e.paidBy]
    ensures forall p :: p !in e.shares && p != e.paidBy ==>
      GetBalance(model', p) == GetBalance(model, p)
  {
    ValidExpenseCheckImpliesWellFormed(model.members, e);

    var b0 := ZeroBalancesSeq(model.memberList);
    var b1 := ApplyExpensesSeq(b0, model.expenses);
    var b1' := ApplyExpensesSeq(b0, model.expenses + [e]);
    var b2 := ApplySettlementsSeq(b1, model.settlements);
    var b2' := ApplySettlementsSeq(b1', model.settlements);

    ApplyExpensesSeqConcat(b0, model.expenses, [e]);
    assert ApplyExpensesSeq(b1, [e]) == ApplyExpenseToBalances(b1, e);
    assert b1' == ApplyExpenseToBalances(b1, e);

    assert Balances(model) == b2;
    assert Balances(model') == b2';

    forall p
      ensures GetFromMap(b1', p) == GetFromMap(b1, p) + ExpenseDeltaForPerson(e, p)
    {
      ApplyExpenseDeltaForPerson(b1, e, p);
    }

    forall p
      ensures GetFromMap(b2', p) == GetFromMap(b2, p) + ExpenseDeltaForPerson(e, p)
    {
      SettlementsPreserveDelta(b1, b1', model.settlements, p, ExpenseDeltaForPerson(e, p));
    }

    forall p
      ensures GetBalance(model', p) == GetBalance(model, p) + ExpenseDeltaForPerson(e, p)
    {
      assert GetBalance(model, p) == GetFromMap(Balances(model), p);
      assert GetBalance(model', p) == GetFromMap(Balances(model'), p);
    }
  }

  lemma AddSettlementBalanceRelation(model: Model, s: Settlement, model': Model)
    requires Inv(model)
    requires ValidSettlement(model.members, s)
    requires model' == Model(model.members, model.memberList, model.expenses, model.settlements + [s])
    ensures s.from != s.to ==> GetBalance(model', s.from) == GetBalance(model, s.from) + s.amount
    ensures s.from != s.to ==> GetBalance(model', s.to) == GetBalance(model, s.to) - s.amount
    ensures forall p :: p != s.from && p != s.to ==>
      GetBalance(model', p) == GetBalance(model, p)
  {
    var b0 := ZeroBalancesSeq(model.memberList);
    var b1 := ApplyExpensesSeq(b0, model.expenses);
    var b2 := ApplySettlementsSeq(b1, model.settlements);
    var b2' := ApplySettlementsSeq(b1, model.settlements + [s]);

    ApplySettlementsSeqConcat(b1, model.settlements, [s]);
    assert ApplySettlementsSeq(b2, [s]) == ApplySettlementToBalances(b2, s);
    assert b2' == ApplySettlementToBalances(b2, s);

    assert Balances(model) == b2;
    assert Balances(model') == b2';

    forall p
      ensures GetFromMap(b2', p) == GetFromMap(b2, p) + SettlementDeltaForPerson(s, p)
    {
      ApplySettlementDeltaForPerson(b2, s, p);
    }

    forall p
      ensures GetBalance(model', p) == GetBalance(model, p) + SettlementDeltaForPerson(s, p)
    {
      assert GetBalance(model, p) == GetFromMap(Balances(model), p);
      assert GetBalance(model', p) == GetFromMap(Balances(model'), p);
    }
  }

  // -----------------------------
  // DELTA LAW PROOFS
  // -----------------------------

  lemma AddExpenseDelta(model: Model, e: Expense, model': Model)
  {
    ValidExpenseCheckImpliesWellFormed(model.members, e);
    AddExpenseBalanceRelation(model, e, model');
    Conservation(model');
  }

  lemma AddSettlementDelta(model: Model, s: Settlement, model': Model)
  {
    AddSettlementBalanceRelation(model, s, model');
    Conservation(model');
  }

  // -----------------------------
  // EXPLAIN SUMS TO BALANCE PROOF
  // -----------------------------

  lemma SumSeqConcat(a: seq<Money>, b: seq<Money>)
    ensures SumSeq(a + b) == SumSeq(a) + SumSeq(b)
    decreases |a|
  {
    if |a| == 0 {
      assert a + b == b;
    } else {
      calc {
        SumSeq(a + b);
        == { assert (a + b)[0] == a[0]; assert (a + b)[1..] == a[1..] + b; }
        a[0] + SumSeq(a[1..] + b);
        == { SumSeqConcat(a[1..], b); }
        a[0] + SumSeq(a[1..]) + SumSeq(b);
        ==
        SumSeq(a) + SumSeq(b);
      }
    }
  }

  lemma ApplyExpensesDeltaForPerson(b: map<PersonId, Money>, expenses: seq<Expense>, p: PersonId)
    requires forall i :: 0 <= i < |expenses| ==> ShareKeysConsistent(expenses[i])
    ensures GetFromMap(ApplyExpensesSeq(b, expenses), p) == GetFromMap(b, p) + SumSeq(ExpenseDeltas(expenses, p))
    decreases |expenses|
  {
    if |expenses| == 0 {
    } else {
      var e := expenses[0];
      var b' := ApplyExpenseToBalances(b, e);
      ApplyExpenseDeltaForPerson(b, e, p);
      ApplyExpensesDeltaForPerson(b', expenses[1..], p);
    }
  }

  lemma ApplySettlementsDeltaForPerson(b: map<PersonId, Money>, settlements: seq<Settlement>, p: PersonId)
    ensures GetFromMap(ApplySettlementsSeq(b, settlements), p) == GetFromMap(b, p) + SumSeq(SettlementDeltas(settlements, p))
    decreases |settlements|
  {
    if |settlements| == 0 {
    } else {
      var s := settlements[0];
      var b' := ApplySettlementToBalances(b, s);
      ApplySettlementDeltaForPerson(b, s, p);
      ApplySettlementsDeltaForPerson(b', settlements[1..], p);
    }
  }

  lemma ZeroBalancesSeqContains(memberList: seq<PersonId>, p: PersonId)
    requires p in memberList
    ensures p in ZeroBalancesSeq(memberList)
    decreases |memberList|
  {
    if |memberList| == 0 {
    } else if memberList[0] == p {
    } else {
      ZeroBalancesSeqContains(memberList[1..], p);
    }
  }

  lemma ExplainSumsToBalance(model: Model, p: PersonId)
  {
    var expDeltas := ExpenseDeltas(model.expenses, p);
    var setDeltas := SettlementDeltas(model.settlements, p);
    SumSeqConcat(expDeltas, setDeltas);

    var b0 := ZeroBalancesSeq(model.memberList);
    var b1 := ApplyExpensesSeq(b0, model.expenses);
    var b2 := ApplySettlementsSeq(b1, model.settlements);

    assert p in b0 by {
      ZeroBalancesSeqContains(model.memberList, p);
    }
    assert GetFromMap(b0, p) == 0;

    ApplyExpensesDeltaForPerson(b0, model.expenses, p);
    ApplySettlementsDeltaForPerson(b1, model.settlements, p);
  }

  // -----------------------------
  // METHOD IMPLEMENTATIONS
  // -----------------------------

  method Step(model: Model, a: Action) returns (result: Result<Model, Err>)
  {
    match a
    case AddExpense(e) =>
      if ValidExpenseCheck(model.members, e) {
        ValidExpenseCheckImpliesWellFormed(model.members, e);
        result := Ok(Model(model.members, model.memberList, model.expenses + [e], model.settlements));
      } else {
        result := Error(BadExpense);
      }

    case AddSettlement(s) =>
      if ValidSettlement(model.members, s) {
        result := Ok(Model(model.members, model.memberList, model.expenses, model.settlements + [s]));
      } else {
        result := Error(BadSettlement);
      }
  }

  method Init(memberList: seq<PersonId>) returns (result: Result<Model, Err>)
  {
    if !NoDuplicates(memberList) {
      result := Error(BadExpense);
      return;
    }
    var members := set i | 0 <= i < |memberList| :: memberList[i];
    NoDupSeqToSetSizeGeneral(memberList);
    result := Ok(Model(members, memberList, [], []));
  }

  method GetCertificate(model: Model) returns (cert: Certificate)
  {
    Conservation(model);
    cert := Certificate(
      |model.members|,
      |model.expenses|,
      |model.settlements|,
      true
    );
  }
}


// =============================
// AppCore: JS-facing API (delegation only)
// =============================
module ClearSplitAppCore {
  import C = ClearSplit

  // Type aliases
  type Model = C.Model
  type Action = C.Action
  type Money = C.Money
  type PersonId = C.PersonId
  type Certificate = C.Certificate

  // Initialize
  method Init(memberList: seq<PersonId>) returns (result: C.Result<Model, C.Err>)
    ensures result.Ok? ==> C.Inv(result.value)
  {
    result := C.Init(memberList);
  }

  // Action constructors
  function AddExpense(e: C.Expense): Action { C.AddExpense(e) }
  function AddSettlement(s: C.Settlement): Action { C.AddSettlement(s) }

  // Data constructors
  function MakeExpense(paidBy: PersonId, amount: Money, shares: map<PersonId, Money>, shareKeys: seq<PersonId>): C.Expense
  { C.Expense(paidBy, amount, shares, shareKeys) }

  function MakeSettlement(from: PersonId, to: PersonId, amount: Money): C.Settlement
  { C.Settlement(from, to, amount) }

  // Dispatch
  method Dispatch(model: Model, a: Action) returns (result: C.Result<Model, C.Err>)
    requires C.Inv(model)
    ensures result.Ok? ==> C.Inv(result.value)
  {
    result := C.Step(model, a);
  }

  // Projections
  function Balances(model: Model): map<PersonId, Money> { C.Balances(model) }
  function GetBalance(model: Model, p: PersonId): Money { C.GetBalance(model, p) }
  function Members(model: Model): seq<PersonId> { model.memberList }
  function Expenses(model: Model): seq<C.Expense> { model.expenses }
  function Settlements(model: Model): seq<C.Settlement> { model.settlements }

  // Certificate
  method GetCertificate(model: Model) returns (cert: Certificate)
    requires C.Inv(model)
  {
    cert := C.GetCertificate(model);
  }
}
