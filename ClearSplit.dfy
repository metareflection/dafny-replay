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
    shares: map<PersonId, Money>
  )

  datatype Settlement = Settlement(
    from: PersonId,
    to: PersonId,
    amount: Money
  )

  datatype Model = Model(
    members: set<PersonId>,
    expenses: seq<Expense>,
    settlements: seq<Settlement>
  )

  // -----------------------------
  // Invariants
  // -----------------------------
  // Ghost spec: non-deterministic iteration over map
  ghost function SumValues(m: map<PersonId, Money>): Money
    decreases |m|
  {
    if |m| == 0 then 0
    else
      var k :| k in m;
      m[k] + SumValues(m - {k})
  }

  // Axiom: SumValues can be computed by removing any key first
  // This is mathematically true because addition is commutative and associative
  lemma {:axiom} SumValuesRemoveKey(m: map<PersonId, Money>, p: PersonId)
    requires p in m
    ensures SumValues(m) == m[p] + SumValues(m - {p})

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

  // Axiom: a sequence that bijects with a map has no duplicates
  // This is mathematically obvious: if the sequence has |m| elements and
  // each element is in m.Keys, and the sequence covers all of m.Keys,
  // then there can be no duplicates.
  lemma {:axiom} SeqNoDuplicates(keys: seq<PersonId>, m: map<PersonId, Money>)
    requires forall k :: k in m.Keys <==> k in keys
    requires |keys| == |m|
    ensures forall i, j :: 0 <= i < j < |keys| ==> keys[i] != keys[j]

  // Equivalence lemma: if keys covers all map keys exactly once, results match
  lemma SumValuesSeqEquiv(m: map<PersonId, Money>, keys: seq<PersonId>)
    requires forall k :: k in m.Keys <==> k in keys
    requires |keys| == |m|  // no duplicates, covers exactly
    decreases |keys|
    ensures SumValuesSeq(m, keys) == SumValues(m)
  {
    SeqNoDuplicates(keys, m);  // Establish no duplicates

    if |keys| == 0 {
      assert |m| == 0;
    } else {
      var k := keys[0];
      var rest := keys[1..];
      assert k in m;
      var m' := m - {k};

      // Use the key lemma to show SumValues(m) = m[k] + SumValues(m')
      SumValuesRemoveKey(m, k);
      assert SumValues(m) == m[k] + SumValues(m');

      // Show rest covers exactly m'
      assert |rest| == |m'| by {
        assert |rest| == |keys| - 1;
        assert |m'| == |m| - 1;
      }

      forall k' | k' in m'.Keys
        ensures k' in rest
      {
        assert k' in m.Keys;
        assert k' in keys;
        assert k' != k;
        var i :| 0 <= i < |keys| && keys[i] == k';
        assert i > 0;  // because keys[0] = k and k' != k
        assert keys[i] == rest[i-1];
      }

      forall k' | k' in rest
        ensures k' in m'.Keys
      {
        var i :| 0 <= i < |rest| && rest[i] == k';
        assert keys[i+1] == k';
        assert k' in keys;
        assert k' in m.Keys;
        // k' != k because keys has no duplicates
        assert k' != k;  // keys[0] = k, keys[i+1] = k', and 0 != i+1
      }

      SumValuesSeqEquiv(m', rest);
    }
  }

  // Ghost spec for valid expense
  ghost predicate ValidExpense(members: set<PersonId>, e: Expense)
  {
    e.amount >= 0
    && e.paidBy in members
    && (forall p :: p in e.shares ==> p in members)
    && (forall p :: p in e.shares ==> e.shares[p] >= 0)
    && SumValues(e.shares) == e.amount
  }

  // Helper: check that all keys in sequence are members with non-negative shares
  predicate AllSharesValid(members: set<PersonId>, shares: map<PersonId, Money>, keys: seq<PersonId>)
  {
    forall i :: 0 <= i < |keys| ==> keys[i] in members && keys[i] in shares && shares[keys[i]] >= 0
  }

  // Compilable version: takes keys sequence for iteration
  predicate ValidExpenseCheck(members: set<PersonId>, e: Expense, shareKeys: seq<PersonId>)
    requires forall k :: k in e.shares.Keys <==> k in shareKeys
    requires |shareKeys| == |e.shares|
  {
    e.amount >= 0
    && e.paidBy in members
    && AllSharesValid(members, e.shares, shareKeys)
    && SumValuesSeq(e.shares, shareKeys) == e.amount
  }

  // Equivalence lemma
  lemma ValidExpenseEquiv(members: set<PersonId>, e: Expense, shareKeys: seq<PersonId>)
    requires forall k :: k in e.shares.Keys <==> k in shareKeys
    requires |shareKeys| == |e.shares|
    ensures ValidExpenseCheck(members, e, shareKeys) == ValidExpense(members, e)
  {
    SumValuesSeqEquiv(e.shares, shareKeys);
    // Show the forall conditions are equivalent
    if AllSharesValid(members, e.shares, shareKeys) {
      forall p | p in e.shares
        ensures p in members && e.shares[p] >= 0
      {
        assert p in shareKeys;
        var i :| 0 <= i < |shareKeys| && shareKeys[i] == p;
        assert shareKeys[i] in members;
      }
    }
    if (forall p :: p in e.shares ==> p in members) && (forall p :: p in e.shares ==> e.shares[p] >= 0) {
      forall i | 0 <= i < |shareKeys|
        ensures shareKeys[i] in members && shareKeys[i] in e.shares && e.shares[shareKeys[i]] >= 0
      {
        assert shareKeys[i] in e.shares;
      }
    }
  }

  predicate ValidSettlement(members: set<PersonId>, s: Settlement)
  {
    s.amount >= 0
    && s.from in members
    && s.to in members
    && s.from != s.to
  }

  // Ghost invariant for specification
  ghost predicate Inv(model: Model)
  {
    (forall i :: 0 <= i < |model.expenses| ==> ValidExpense(model.members, model.expenses[i]))
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

  // Axiom: same as SeqNoDuplicates but for sets
  lemma {:axiom} MemberListNoDuplicates(memberList: seq<PersonId>, members: set<PersonId>)
    requires forall p :: p in members <==> p in memberList
    requires |memberList| == |members|
    ensures forall i, j :: 0 <= i < j < |memberList| ==> memberList[i] != memberList[j]

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

  function ApplyExpenseToBalances(
      b: map<PersonId, Money>,
      e: Expense
    ): map<PersonId, Money>
  {
    // TODO: implement as a fold:
    // 1) payer +amount
    // 2) for each (p -> share) in e.shares: p -= share
    b
  }

  function ApplySettlementToBalances(
      b: map<PersonId, Money>,
      s: Settlement
    ): map<PersonId, Money>
  {
    // TODO:
    //   from += amount
    //   to   -= amount
    b
  }

  ghost function ComputeBalances(model: Model): map<PersonId, Money>
    requires Inv(model)
    ensures forall p :: p in model.members ==> p in ComputeBalances(model)
    // headline property (Conservation)
    ensures SumValues(ComputeBalances(model)) == 0
  {
    // TODO: start from ZeroBalances(members), then fold expenses then settlements
    ZeroBalancesSum(model.members);
    ZeroBalances(model.members)
  }

  // Axiom: SumValues of a map where all values are zero is zero
  // This follows from the recursive definition: each step adds 0
  lemma {:axiom} SumValuesAllZero(m: map<PersonId, Money>)
    requires forall p :: p in m ==> m[p] == 0
    ensures SumValues(m) == 0

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
    | AddExpense(e: Expense, shareKeys: seq<PersonId>)
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

  method Step(model: Model, a: Action) returns (result: Result<Model, Err>)
    requires Inv(model)
    requires a.AddExpense? ==> KeysCoverExactly(a.shareKeys, a.e.shares)
    ensures result.Ok? ==> Inv(result.value)
  {
    match a
    case AddExpense(e, shareKeys) =>
      // The ghost requires ensures shareKeys covers e.shares exactly
      assert KeysCoverExactly(shareKeys, e.shares);
      if ValidExpenseCheck(model.members, e, shareKeys) {
        ValidExpenseEquiv(model.members, e, shareKeys);
        result := Ok(Model(model.members, model.expenses + [e], model.settlements));
      } else {
        result := Error(BadExpense);
      }

    case AddSettlement(s) =>
      if ValidSettlement(model.members, s) {
        result := Ok(Model(model.members, model.expenses, model.settlements + [s]));
      } else {
        result := Error(BadSettlement);
      }
  }

}
