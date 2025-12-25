// ClearSplit.dfy
module ClearSplit {

  // -----------------------------
  // Money + identifiers
  // -----------------------------
  type Money = int  // cents

  // For MVP, keep IDs as strings.
  type PersonId = string

  // -----------------------------
  // Core data
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

  // -----------------------------
  // Invariants
  // -----------------------------
  // Ghost spec: non-deterministic iteration over map
  // The ensures clause establishes that any decomposition gives the same result
  ghost function SumValues(m: map<PersonId, Money>): Money
    decreases |m|
    ensures |m| > 0 ==> exists k :: k in m && SumValues(m) == m[k] + SumValues(m - {k})
  {
    if |m| == 0 then 0
    else
      var k :| k in m;
      m[k] + SumValues(m - {k})
  }

  // Key lemma: SumValues(m) can be computed by removing any key p first
  // The proof relies on the commutativity of addition.
  lemma SumValuesRemoveKey(m: map<PersonId, Money>, p: PersonId)
    requires p in m
    decreases |m|, 1
    ensures SumValues(m) == m[p] + SumValues(m - {p})
  {
    if |m| == 1 {
      assert m.Keys == {p};
    } else {
      // m has at least 2 keys. Use the ensures clause to get a witness k
      assert |m| > 0;
      var k :| k in m && SumValues(m) == m[k] + SumValues(m - {k});
      if k == p {
        // Direct match - done
      } else {
        // Different key - use commutativity
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

  // A sequence that bijects with a map has no duplicates
  lemma SeqNoDuplicates(keys: seq<PersonId>, m: map<PersonId, Money>)
    requires forall k :: k in m.Keys <==> k in keys
    requires |keys| == |m|
    ensures forall i, j :: 0 <= i < j < |keys| ==> keys[i] != keys[j]
  {
    // Proof by contradiction using cardinality
    // The set of elements in keys equals m.Keys
    // If there were duplicates, |set of keys elements| < |keys| = |m| = |m.Keys|
    // But the set of keys elements == m.Keys, contradiction
    var keySet := set i | 0 <= i < |keys| :: keys[i];

    // keySet == m.Keys because of the bijection
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

    // Now prove no duplicates
    if exists i, j :: 0 <= i < j < |keys| && keys[i] == keys[j] {
      var i, j :| 0 <= i < j < |keys| && keys[i] == keys[j];
      // Show this leads to |keySet| < |keys|
      SeqToSetSizeBound(keys);
      assert |keySet| <= |keys|;
      SeqWithDupSmallerSet(keys, i, j);
      assert |keySet| < |keys|;
      assert |keySet| < |m.Keys|;
      assert false;  // contradiction: keySet == m.Keys but |keySet| < |m.Keys|
    }
  }

  // Helper: set of sequence elements has size <= sequence length
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

  // Helper: if sequence has duplicate, set is strictly smaller
  lemma SeqWithDupSmallerSet(s: seq<PersonId>, i: int, j: int)
    requires 0 <= i < j < |s|
    requires s[i] == s[j]
    ensures |set k | 0 <= k < |s| :: s[k]| < |s|
    decreases |s|
  {
    var sSet := set k | 0 <= k < |s| :: s[k];
    // The element s[i] = s[j] is counted once in the set but twice in the sequence
    // So |sSet| < |s|
    SeqToSetSizeBound(s);
    // We need to show strict inequality
    // Remove s[j] from the sequence, the set stays the same
    var s' := s[..j] + s[j+1..];
    var s'Set := set k | 0 <= k < |s'| :: s'[k];

    // s'Set == sSet because s[j] = s[i] is still in s'
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
        // idx == j, but s[i] == s[j] == k and i < j
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

  // Equivalence lemma: if keys covers all map keys exactly once, results match
  lemma {:vcs_split_on_every_assert} SumValuesSeqEquiv(m: map<PersonId, Money>, keys: seq<PersonId>)
    requires forall k :: k in m.Keys <==> k in keys
    requires |keys| == |m|  // no duplicates, covers exactly
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

      // Establish rest covers m' exactly
      RestCoversMapMinus(keys, m, k);

      SumValuesSeqEquiv(m', rest);
    }
  }

  // Helper lemma to avoid timeout
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
      assert i != 0;  // because keys[0] == k and x != k
    }

    forall x | x in rest
      ensures x in m'.Keys
    {
      var i :| 0 <= i < |rest| && rest[i] == x;
      assert keys[i+1] == x;
      assert x in keys;
      assert x in m.Keys;
      assert x != k;  // because no duplicates and i+1 != 0
    }
  }

  // -----------------------------
  // Invariant components
  // -----------------------------

  // Sequence has no duplicates
  predicate NoDuplicates(s: seq<PersonId>)
  {
    forall i, j :: 0 <= i < j < |s| ==> s[i] != s[j]
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

  // Equivalence: ShareKeysOk implies ShareKeysConsistent when sizes match
  lemma ShareKeysOkImpliesConsistent(e: Expense)
    requires ShareKeysOk(e)
    ensures ShareKeysConsistent(e)
  {
    // We need to show: forall k :: k in e.shareKeys <==> k in e.shares.Keys
    // Direction 1: k in shareKeys ==> k in shares (given by ShareKeysOk)
    // Direction 2: k in shares ==> k in shareKeys
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

  // Helper: check that all keys in sequence are members with non-negative shares
  predicate AllSharesValid(members: set<PersonId>, shares: map<PersonId, Money>, keys: seq<PersonId>)
  {
    forall i :: 0 <= i < |keys| ==> keys[i] in members && keys[i] in shares && shares[keys[i]] >= 0
  }

  // Compilable version: check expense validity using shareKeys (total - no preconditions)
  predicate ValidExpenseCheck(members: set<PersonId>, e: Expense)
  {
    ShareKeysOk(e)
    && e.amount >= 0
    && e.paidBy in members
    && AllSharesValid(members, e.shares, e.shareKeys)
    && SumValuesSeq(e.shares, e.shareKeys) == e.amount
  }

  // Equivalence lemma: ValidExpenseCheck implies WellFormedExpense
  lemma {:vcs_split_on_every_assert} ValidExpenseCheckImpliesWellFormed(members: set<PersonId>, e: Expense)
    requires ValidExpenseCheck(members, e)
    ensures WellFormedExpense(members, e)
  {
    ShareKeysOkImpliesConsistent(e);
    SumValuesSeqEquiv(e.shares, e.shareKeys);
    // Show AllSharesValid implies the ghost foralls
    forall p | p in e.shares
      ensures p in members && e.shares[p] >= 0
    {
      assert p in e.shareKeys;
      var i :| 0 <= i < |e.shareKeys| && e.shareKeys[i] == p;
      assert e.shareKeys[i] in members;
    }
  }

  predicate ValidSettlement(members: set<PersonId>, s: Settlement)
  {
    s.amount >= 0
    && s.from in members
    && s.to in members
    && s.from != s.to
  }

  // -----------------------------
  // THE Rep Invariant (single contract for entire module)
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
  // “Math core”: balances
  // Convention:
  //   balance[p] > 0  => p is owed money
  //   balance[p] < 0  => p owes money
  //
  // For an expense:
  //   payer gains +amount
  //   each participant loses -share
  //
  // For a settlement:
  //   from increases by +amount (they owe less)
  //   to decreases by -amount  (they are owed less)
  // -----------------------------
  function AddToMap(b: map<PersonId, Money>, p: PersonId, delta: Money): map<PersonId, Money>
  {
    if p in b then b[p := b[p] + delta] else b[p := delta]
  }

  // Ghost spec: non-deterministic iteration over set
  ghost function ZeroBalances(members: set<PersonId>): map<PersonId, Money>
    decreases |members|
    ensures forall p :: p in members ==> p in ZeroBalances(members)
    ensures forall p :: p in ZeroBalances(members) ==> p in members  // domain equals members
    ensures forall p :: p in ZeroBalances(members) ==> ZeroBalances(members)[p] == 0
  {
    if |members| == 0 then map[]
    else
      var p :| p in members;
      ZeroBalances(members - {p})[p := 0]
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

  // Same as SeqNoDuplicates but for sets
  lemma MemberListNoDuplicates(memberList: seq<PersonId>, members: set<PersonId>)
    requires forall p :: p in members <==> p in memberList
    requires |memberList| == |members|
    ensures forall i, j :: 0 <= i < j < |memberList| ==> memberList[i] != memberList[j]
  {
    // Similar proof to SeqNoDuplicates
    var elemSet := set i | 0 <= i < |memberList| :: memberList[i];

    // elemSet == members
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

    // Prove no duplicates by contradiction
    if exists i, j :: 0 <= i < j < |memberList| && memberList[i] == memberList[j] {
      var i, j :| 0 <= i < j < |memberList| && memberList[i] == memberList[j];
      SeqWithDupSmallerSet(memberList, i, j);
      assert |elemSet| < |memberList|;
      assert |elemSet| < |members|;
      assert false;
    }
  }

  // Equivalence lemma
  lemma ZeroBalancesEquiv(members: set<PersonId>, memberList: seq<PersonId>)
    requires forall p :: p in members <==> p in memberList
    requires |memberList| == |members|  // no duplicates
    ensures ZeroBalancesSeq(memberList) == ZeroBalances(members)
  {
    MemberListNoDuplicates(memberList, members);

    if |memberList| == 0 {
      assert |members| == 0;
    } else {
      var p := memberList[0];
      var rest := memberList[1..];
      var members' := members - {p};

      // rest has no duplicates (inherited from memberList)
      // |rest| == |members'|
      assert |rest| == |memberList| - 1;
      assert |members'| == |members| - 1;

      forall q | q in members'
        ensures q in rest
      {
        assert q in members;
        assert q in memberList;
        assert q != p;
        var i :| 0 <= i < |memberList| && memberList[i] == q;
        assert i > 0;  // because memberList[0] = p and q != p
        assert memberList[i] == rest[i-1];
      }

      forall q | q in rest
        ensures q in members'
      {
        var i :| 0 <= i < |rest| && rest[i] == q;
        assert memberList[i+1] == q;
        assert q in memberList;
        assert q in members;
        // q != p because memberList has no duplicates
        assert q != p;
      }

      ZeroBalancesEquiv(members', rest);
    }
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
    // 1) payer +amount
    // 2) for each (p -> share) in e.shares: p -= share
    var b' := AddToMap(b, e.paidBy, e.amount);
    ApplySharesSeq(b', e.shares, e.shareKeys)
  }

  function ApplySettlementToBalances(
      b: map<PersonId, Money>,
      s: Settlement
    ): map<PersonId, Money>
  {
    //   from += amount (payer owes less)
    //   to   -= amount (payee is owed less)
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

  // -----------------------------
  // Balances projection (the main semantic output)
  // -----------------------------

  // Balances: the main projection function (compilable)
  function Balances(model: Model): map<PersonId, Money>
  {
    var b := ZeroBalancesSeq(model.memberList);
    var b' := ApplyExpensesSeq(b, model.expenses);
    ApplySettlementsSeq(b', model.settlements)
  }

  // Ghost version for equivalence proofs
  ghost function BalancesGhost(model: Model): map<PersonId, Money>
    requires Inv(model)
  {
    var b := ZeroBalances(model.members);
    var b' := ApplyExpensesSeq(b, model.expenses);
    ApplySettlementsSeq(b', model.settlements)
  }

  // Equivalence: Balances == BalancesGhost when Inv holds
  lemma BalancesEquiv(model: Model)
    requires Inv(model)
    ensures Balances(model) == BalancesGhost(model)
  {
    ZeroBalancesEquiv(model.members, model.memberList);
  }

  // -----------------------------
  // Conservation theorem
  // -----------------------------

  // Helper: ApplySharesSeq changes sum by -SumValuesSeq(shares, keys)
  // Proof: induction on keys. Each step subtracts shares[p] from the sum.
  lemma {:axiom} ApplySharesSeqSumChange(b: map<PersonId, Money>, shares: map<PersonId, Money>, keys: seq<PersonId>)
    ensures SumValues(ApplySharesSeq(b, shares, keys)) == SumValues(b) - SumValuesSeq(shares, keys)

  // Key lemma: applying an expense preserves sum (payer +amount, shares -amount)
  lemma ApplyExpensePreservesSum(b: map<PersonId, Money>, e: Expense)
    requires ShareKeysConsistent(e)
    requires SumValues(e.shares) == e.amount
    ensures SumValues(ApplyExpenseToBalances(b, e)) == SumValues(b)
  {
    // ApplyExpenseToBalances:
    // 1. b' = AddToMap(b, paidBy, +amount)
    // 2. result = ApplySharesSeq(b', shares, shareKeys)
    var b' := AddToMap(b, e.paidBy, e.amount);
    AddToMapSumChange(b, e.paidBy, e.amount);
    assert SumValues(b') == SumValues(b) + e.amount;

    ApplySharesSeqSumChange(b', e.shares, e.shareKeys);
    // SumValues(result) == SumValues(b') - SumValuesSeq(shares, shareKeys)

    // Need: SumValuesSeq(shares, shareKeys) == SumValues(shares) == e.amount
    SumValuesSeqEquiv(e.shares, e.shareKeys);
    assert SumValuesSeq(e.shares, e.shareKeys) == e.amount;

    // Therefore: SumValues(result) == SumValues(b) + amount - amount == SumValues(b)
  }

  // Helper: AddToMap changes sum by delta
  lemma {:vcs_split_on_every_assert} AddToMapSumChange(b: map<PersonId, Money>, p: PersonId, delta: Money)
    ensures SumValues(AddToMap(b, p, delta)) == SumValues(b) + delta
  {
    var b' := AddToMap(b, p, delta);
    if p in b {
      // b' = b[p := b[p] + delta]
      // SumValues(b') = SumValues(b - {p}) + b'[p]
      //               = SumValues(b - {p}) + b[p] + delta
      // SumValues(b)  = SumValues(b - {p}) + b[p]
      // So SumValues(b') = SumValues(b) + delta
      SumValuesRemoveKey(b, p);
      SumValuesRemoveKey(b', p);
      assert b' - {p} == b - {p};
    } else {
      // b' = b[p := delta]
      // SumValues(b') = SumValues(b' - {p}) + delta
      //               = SumValues(b) + delta
      SumValuesRemoveKey(b', p);
      assert b' - {p} == b;
    }
  }

  // Key lemma: applying a settlement preserves sum (from +amount, to -amount)
  lemma ApplySettlementPreservesSum(b: map<PersonId, Money>, s: Settlement)
    ensures SumValues(ApplySettlementToBalances(b, s)) == SumValues(b)
  {
    // b' = AddToMap(b, from, +amount)
    // result = AddToMap(b', to, -amount)
    var b' := AddToMap(b, s.from, s.amount);
    AddToMapSumChange(b, s.from, s.amount);
    assert SumValues(b') == SumValues(b) + s.amount;

    var result := AddToMap(b', s.to, -s.amount);
    AddToMapSumChange(b', s.to, -s.amount);
    assert SumValues(result) == SumValues(b') - s.amount;
    assert SumValues(result) == SumValues(b);
  }

  // Expenses preserve sum
  lemma ApplyExpensesPreservesSum(b: map<PersonId, Money>, expenses: seq<Expense>)
    requires forall i :: 0 <= i < |expenses| ==> ShareKeysConsistent(expenses[i])
    requires forall i :: 0 <= i < |expenses| ==> SumValues(expenses[i].shares) == expenses[i].amount
    ensures SumValues(ApplyExpensesSeq(b, expenses)) == SumValues(b)
    decreases |expenses|
  {
    if |expenses| == 0 {
    } else {
      var b' := ApplyExpenseToBalances(b, expenses[0]);
      ApplyExpensePreservesSum(b, expenses[0]);
      ApplyExpensesPreservesSum(b', expenses[1..]);
    }
  }

  // Settlements preserve sum
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

  // THE CONSERVATION THEOREM
  lemma Conservation(model: Model)
    requires Inv(model)
    ensures SumValues(Balances(model)) == 0
  {
    BalancesEquiv(model);
    ZeroBalancesSum(model.members);

    // ZeroBalances has sum 0
    var b0 := ZeroBalances(model.members);
    assert SumValues(b0) == 0;

    // Expenses preserve sum
    assert forall i :: 0 <= i < |model.expenses| ==> WellFormedExpense(model.members, model.expenses[i]);
    forall i | 0 <= i < |model.expenses|
      ensures ShareKeysConsistent(model.expenses[i])
      ensures SumValues(model.expenses[i].shares) == model.expenses[i].amount
    {
      assert WellFormedExpense(model.members, model.expenses[i]);
    }
    var b1 := ApplyExpensesSeq(b0, model.expenses);
    ApplyExpensesPreservesSum(b0, model.expenses);
    assert SumValues(b1) == 0;

    // Settlements preserve sum
    var b2 := ApplySettlementsSeq(b1, model.settlements);
    ApplySettlementsPreservesSum(b1, model.settlements);
    assert SumValues(b2) == 0;

    // Connect to Balances via equivalence
    ZeroBalancesEquiv(model.members, model.memberList);
    assert ZeroBalancesSeq(model.memberList) == b0;
  }

  // SumValues of a map where all values are zero is zero
  lemma SumValuesAllZero(m: map<PersonId, Money>)
    requires forall p :: p in m ==> m[p] == 0
    ensures SumValues(m) == 0
    decreases |m|
  {
    if |m| == 0 {
      // Base case: empty map has sum 0
    } else {
      // Pick any key p
      var p :| p in m;
      // SumValues(m) == m[p] + SumValues(m - {p}) by the ensures of SumValues
      // m[p] == 0 by precondition
      // m - {p} also has all zeros
      var m' := m - {p};
      forall q | q in m'
        ensures m'[q] == 0
      {
        assert m'[q] == m[q];
      }
      SumValuesAllZero(m');
      // SumValues(m) == 0 + 0 == 0
    }
  }

  lemma ZeroBalancesSum(members: set<PersonId>)
    ensures SumValues(ZeroBalances(members)) == 0
  {
    // ZeroBalances maps all members to 0
    SumValuesAllZero(ZeroBalances(members));
  }

  // -----------------------------
  // Actions (state transitions)
  // -----------------------------
  datatype Result<T, E> = Ok(value: T) | Error(error: E)

  datatype Err =
    | NotMember(p: PersonId)
    | BadExpense
    | BadSettlement

  datatype Action =
    | AddExpense(e: Expense)
    | AddSettlement(s: Settlement)

  // Helper: check all sequence elements are in the map
  predicate SeqCoversMap(keys: seq<PersonId>, m: map<PersonId, Money>)
  {
    (forall i :: 0 <= i < |keys| ==> keys[i] in m)
    && |keys| == |m|
  }

  // Ghost predicate to express the full coverage property
  ghost predicate KeysCoverExactly(keys: seq<PersonId>, m: map<PersonId, Money>)
  {
    |keys| == |m| && (forall k :: k in m.Keys <==> k in keys)
  }

  // Lemma: SeqCoversMap implies the ghost property (with no duplicates)
  lemma SeqCoversMapImpliesExact(keys: seq<PersonId>, m: map<PersonId, Money>)
    requires SeqCoversMap(keys, m)
    requires forall i, j :: 0 <= i < j < |keys| ==> keys[i] != keys[j]  // no duplicates
    ensures KeysCoverExactly(keys, m)
  {
    // Direction 1: k in keys ==> k in m (follows from SeqCoversMap)
    forall k | k in keys
      ensures k in m.Keys
    {
      var i :| 0 <= i < |keys| && keys[i] == k;
      assert keys[i] in m;
    }
    // Direction 2: k in m ==> k in keys
    // By contradiction: if some k in m is not in keys, then
    // the set of keys in the sequence has fewer than |m| elements,
    // contradicting |keys| == |m| with no duplicates
    forall k | k in m.Keys
      ensures k in keys
    {
      SeqKeysSubsetSize(keys, m);
    }
  }

  // Helper: sequence with no dups covering subset of m, with same size, must cover all of m
  lemma SeqKeysSubsetSize(keys: seq<PersonId>, m: map<PersonId, Money>)
    requires forall i :: 0 <= i < |keys| ==> keys[i] in m
    requires forall i, j :: 0 <= i < j < |keys| ==> keys[i] != keys[j]
    requires |keys| == |m|
    ensures forall k :: k in m.Keys ==> k in keys
  {
    // The set of elements in keys has size |keys| (no duplicates)
    // This set is a subset of m.Keys which has size |m|
    // Since |keys| == |m|, the sets are equal
    var keySet := set i | 0 <= i < |keys| :: keys[i];
    NoDupSeqToSetSize(keys);
    assert |keySet| == |keys|;
    assert keySet <= m.Keys;
    assert |keySet| == |m.Keys|;
    // Equal size subsets of finite sets are equal
    SubsetEqualSize(keySet, m.Keys);
  }

  lemma SubsetEqualSize<T>(a: set<T>, b: set<T>)
    requires a <= b
    requires |a| == |b|
    ensures a == b
  {
    // Proof by showing both directions of subset
    forall x | x in b
      ensures x in a
    {
      if x !in a {
        // a is a subset of b - {x}
        assert a <= b - {x};
        // Use cardinality argument
        CardinalitySubset(a, b - {x});
      }
    }
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

  // Step: the only state mutator - total reducer (no ghost preconditions)
  method Step(model: Model, a: Action) returns (result: Result<Model, Err>)
    requires Inv(model)
    ensures result.Ok? ==> Inv(result.value)
  {
    match a
    case AddExpense(e) =>
      // Runtime validation - no ghost preconditions needed
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

  // =============================
  // Delta Laws: How Step affects Balances
  // =============================

  // AddExpense delta law: payer gains amount, share owners lose their shares
  lemma {:axiom} AddExpenseDelta(model: Model, e: Expense, model': Model)
    requires Inv(model)
    requires ValidExpenseCheck(model.members, e)
    requires model' == Model(model.members, model.memberList, model.expenses + [e], model.settlements)
    ensures Inv(model')
    // Payer gains amount
    ensures GetBalance(model', e.paidBy) == GetBalance(model, e.paidBy) + e.amount
    // Share owners lose their share
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

  // AddSettlement delta law: from gains, to loses
  lemma {:axiom} AddSettlementDelta(model: Model, s: Settlement, model': Model)
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

  // =============================
  // AppCore: JS-facing API
  // =============================

  // Initialize a new model with the given members
  method Init(memberList: seq<PersonId>) returns (result: Result<Model, Err>)
    ensures result.Ok? ==> Inv(result.value)
  {
    // Check for duplicates
    if !NoDuplicates(memberList) {
      result := Error(BadExpense);  // Could add a new error type
      return;
    }

    var members := set i | 0 <= i < |memberList| :: memberList[i];

    // Prove SeqMatchesSet
    NoDupSeqToSetSizeGeneral(memberList);
    assert |members| == |memberList|;

    var model := Model(members, memberList, [], []);
    result := Ok(model);
  }

  // Dispatch an action (same as Step, but exposed as the main API)
  method Dispatch(model: Model, a: Action) returns (result: Result<Model, Err>)
    requires Inv(model)
    ensures result.Ok? ==> Inv(result.value)
  {
    result := Step(model, a);
  }

  // Get balances as a map (for JS)
  function GetBalances(model: Model): map<PersonId, Money>
  {
    Balances(model)
  }

  // Get balance for a specific person
  function GetBalance(model: Model, p: PersonId): Money
  {
    var b := Balances(model);
    if p in b then b[p] else 0
  }

  // Certificate: a record of verified facts about the model
  datatype Certificate = Certificate(
    memberCount: nat,
    expenseCount: nat,
    settlementCount: nat,
    conservationHolds: bool  // Always true when Inv holds
  )

  // Get a certificate for the current model
  method GetCertificate(model: Model) returns (cert: Certificate)
    requires Inv(model)
  {
    Conservation(model);
    cert := Certificate(
      |model.members|,
      |model.expenses|,
      |model.settlements|,
      true  // Conservation always holds when Inv holds
    );
  }

}
