include "Replay.dfy"

module DelegationAuthDomain refines Domain {

  // --------------------------
  // Basic types
  // --------------------------
  type Subject = string
  type Capability = string
  type EdgeId = nat

  datatype Deleg = Deleg(from: Subject, to: Subject, cap: Capability)

  datatype Model = Model(
    subjects: set<Subject>,
    grants: set<(Subject, Capability)>,
    delegations: map<EdgeId, Deleg>,
    nextEdge: EdgeId
  )

  datatype Action =
    | AddSubject(s: Subject)
    | Grant(s: Subject, cap: Capability)
    | Delegate(from: Subject, to: Subject, cap: Capability)
    | Revoke(eid: EdgeId)

  // --------------------------
  // Invariant (structural)
  // --------------------------
  ghost predicate Inv(m: Model)
  {
    // All grant subjects exist
    (forall sc :: sc in m.grants ==> sc.0 in m.subjects) &&

    // All delegation endpoints exist
    (forall eid :: eid in m.delegations ==>
        m.delegations[eid].from in m.subjects &&
        m.delegations[eid].to   in m.subjects) &&

    // Freshness of ids: no stored id >= nextEdge
    (forall eid :: eid in m.delegations ==> eid < m.nextEdge)
  }

  function Normalize(m: Model): Model { m }

  // --------------------------
  // Apply (total, no-op on invalid)
  // --------------------------
  function Apply(m: Model, a: Action): Model
  {
    match m
    case Model(subjects, grants, delegations, nextEdge) =>
      match a
      case AddSubject(s) =>
        if s in subjects then m
        else Model(subjects + {s}, grants, delegations, nextEdge)

      case Grant(s, cap) =>
        if !(s in subjects) then m
        else Model(subjects, grants + {(s, cap)}, delegations, nextEdge)

      case Delegate(from, to, cap) =>
        if !(from in subjects && to in subjects) then m
        else
          var eid := nextEdge;
          Model(subjects,
                grants,
                delegations[eid := Deleg(from, to, cap)],
                nextEdge + 1)

      case Revoke(eid) =>
        if !(eid in delegations) then m
        else Model(subjects, grants, delegations - {eid}, nextEdge)
  }

  // --------------------------
  // Executable reachability (bounded closure)
  // ReachN(m, cap, n): subjects reachable for cap in <= n delegation steps from grants.
  // Reach(m, cap) = ReachN(m, cap, |subjects|).
  // --------------------------

  function GrantRoots(m: Model, cap: Capability): set<Subject>
  {
    set s | s in m.subjects && (s, cap) in m.grants
  }

  function Propagate(m: Model, cap: Capability, S: set<Subject>): set<Subject>
  {
    set t | t in m.subjects &&
      exists eid ::
        eid in m.delegations &&
        m.delegations[eid].cap == cap &&
        m.delegations[eid].from in S &&
        t == m.delegations[eid].to
  }

  function ReachN(m: Model, cap: Capability, n: nat): set<Subject>
    decreases n
  {
    if n == 0 then GrantRoots(m, cap)
    else
      var prev := ReachN(m, cap, n - 1);
      prev + Propagate(m, cap, prev)
  }

  function Reach(m: Model, cap: Capability): set<Subject>
  {
    ReachN(m, cap, |m.subjects|)
  }

  function Can(m: Model, s: Subject, cap: Capability): bool
  {
    s in Reach(m, cap)
  }

  // --------------------------
  // Ghost spec: HasCap
  //
  // We define a bounded derivability predicate to match the bounded ReachN.
  // HasCap(m,s,cap) := exists n <= |subjects| . DerivableN(m,s,cap,n)
  // --------------------------

  ghost predicate DerivableN(m: Model, s: Subject, cap: Capability, n: nat)
    decreases n
  {
    if n == 0 then (s, cap) in m.grants
    else
      DerivableN(m, s, cap, n - 1) ||
      exists eid ::
        eid in m.delegations &&
        m.delegations[eid].cap == cap &&
        m.delegations[eid].to == s &&
        DerivableN(m, m.delegations[eid].from, cap, n - 1)
  }

  ghost predicate HasCap(m: Model, s: Subject, cap: Capability)
  {
    exists n: nat :: n <= |m.subjects| && DerivableN(m, s, cap, n)
  }

  // Bridge theorem: executable Reach matches ghost HasCap
  lemma ReachCorrect(m: Model, s: Subject, cap: Capability)
    requires Inv(m)
    ensures (s in Reach(m, cap)) <==> HasCap(m, s, cap)
  {
    var N := |m.subjects|;
    ReachNEquivDerivableN(m, s, cap, N);
    // Forward: s in Reach(m, cap) ==> HasCap(m, s, cap)
    if s in Reach(m, cap) {
      assert DerivableN(m, s, cap, N);
      assert N <= N;
      assert HasCap(m, s, cap);
    }
    // Backward: HasCap(m, s, cap) ==> s in Reach(m, cap)
    if HasCap(m, s, cap) {
      var n: nat :| n <= N && DerivableN(m, s, cap, n);
      ReachNEquivDerivableN(m, s, cap, n);
      assert s in ReachN(m, cap, n);
      ReachNMonotoneGeneral(m, cap, n, N);
      assert s in ReachN(m, cap, N);
    }
  }

  // Optional: monotonicity / closure facts (often useful)
  lemma ReachNMonotone(m: Model, cap: Capability, n: nat)
    ensures ReachN(m, cap, n) <= ReachN(m, cap, n + 1)
  {
  }

  // --------------------------
  // Required lemma for dafny-replay
  // --------------------------
  lemma StepPreservesInv(m: Model, a: Action)
  {
  }

  // --------------------------
  // Helper lemmas (at end of module)
  // --------------------------

  lemma ReachNImpliesDerivableN(m: Model, s: Subject, cap: Capability, n: nat)
    requires Inv(m)
    requires s in ReachN(m, cap, n)
    ensures DerivableN(m, s, cap, n)
    decreases n
  {
    if n == 0 {
      // Base case: s in GrantRoots means (s, cap) in m.grants
    } else {
      var prev := ReachN(m, cap, n - 1);
      if s in prev {
        ReachNImpliesDerivableN(m, s, cap, n - 1);
      } else {
        // s in Propagate(m, cap, prev)
        var eid :| eid in m.delegations &&
                   m.delegations[eid].cap == cap &&
                   m.delegations[eid].from in prev &&
                   s == m.delegations[eid].to;
        var from := m.delegations[eid].from;
        ReachNImpliesDerivableN(m, from, cap, n - 1);
      }
    }
  }

  lemma DerivableNImpliesReachN(m: Model, s: Subject, cap: Capability, n: nat)
    requires Inv(m)
    requires DerivableN(m, s, cap, n)
    ensures s in ReachN(m, cap, n)
    decreases n
  {
    if n == 0 {
      // DerivableN(m, s, cap, 0) means (s, cap) in m.grants
      // Inv(m) ensures s in m.subjects
    } else {
      if DerivableN(m, s, cap, n - 1) {
        DerivableNImpliesReachN(m, s, cap, n - 1);
        ReachNMonotone(m, cap, n - 1);
      } else {
        var eid :| eid in m.delegations &&
                   m.delegations[eid].cap == cap &&
                   m.delegations[eid].to == s &&
                   DerivableN(m, m.delegations[eid].from, cap, n - 1);
        var from := m.delegations[eid].from;
        DerivableNImpliesReachN(m, from, cap, n - 1);
        // Now from in ReachN(m, cap, n-1), so s in Propagate(m, cap, ReachN(m, cap, n-1))
      }
    }
  }

  lemma ReachNEquivDerivableN(m: Model, s: Subject, cap: Capability, n: nat)
    requires Inv(m)
    ensures (s in ReachN(m, cap, n)) <==> DerivableN(m, s, cap, n)
  {
    if s in ReachN(m, cap, n) {
      ReachNImpliesDerivableN(m, s, cap, n);
    }
    if DerivableN(m, s, cap, n) {
      DerivableNImpliesReachN(m, s, cap, n);
    }
  }

  lemma ReachNMonotoneGeneral(m: Model, cap: Capability, n: nat, k: nat)
    requires n <= k
    ensures ReachN(m, cap, n) <= ReachN(m, cap, k)
    decreases k - n
  {
    if n == k {
    } else {
      ReachNMonotone(m, cap, k - 1);
      ReachNMonotoneGeneral(m, cap, n, k - 1);
    }
  }

}

module DelegationAuthKernel refines Kernel {
  import D = DelegationAuthDomain
}

module DelegationAuthAppCore {
  import K = DelegationAuthKernel
  import D = DelegationAuthDomain

  function Init(): K.History {
    var m := D.Model({}, {}, map[], 0);
    K.History([], m, [])
  }

  // Action constructors
  function AddSubject(s: string): D.Action { D.AddSubject(s) }
  function Grant(s: string, cap: string): D.Action { D.Grant(s, cap) }
  function Delegate(from: string, to: string, cap: string): D.Action { D.Delegate(from, to, cap) }
  function Revoke(eid: nat): D.Action { D.Revoke(eid) }

  // State transitions
  function Dispatch(h: K.History, a: D.Action): K.History { K.Do(h, a) }
  function Undo(h: K.History): K.History { K.Undo(h) }
  function Redo(h: K.History): K.History { K.Redo(h) }

  // Selectors
  function Present(h: K.History): D.Model { h.present }
  function CanUndo(h: K.History): bool { |h.past| > 0 }
  function CanRedo(h: K.History): bool { |h.future| > 0 }

  // Model accessors for JavaScript
  // Note: Sets and maps are returned directly; JS wrapper handles conversion
  function GetSubjects(m: D.Model): set<string> {
    m.subjects
  }

  function GetGrants(m: D.Model): set<(string, string)> {
    m.grants
  }

  function GetDelegations(m: D.Model): map<nat, D.Deleg> {
    m.delegations
  }

  function CheckCan(m: D.Model, s: string, cap: string): bool {
    D.Can(m, s, cap)
  }

  function GetReachable(m: D.Model, cap: string): set<string> {
    D.Reach(m, cap)
  }
}
