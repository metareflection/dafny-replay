// ClearSplitEffectStateMachine: Verified effect orchestration for ClearSplit
//
// Concrete refinement of EffectStateMachine for the ClearSplit domain.
// This is compiled separately and used by EffectManager.js.

include "../kernels/EffectStateMachine.dfy"
include "ClearSplitMultiCollaboration.dfy"

module ClearSplitEffectStateMachine refines EffectStateMachine {
  import MC = ClearSplitMultiCollaboration
}

// Cross-group balance calculation
module ClearSplitCrossGroup {
  import C = ClearSplit

  type Money = C.Money
  type Model = C.Model

  // A single group entry for cross-group calculations
  datatype GroupEntry = GroupEntry(
    groupName: string,
    displayName: string,  // User's name in this group
    model: Model
  )

  // Cross-group balance result for a single group
  datatype GroupBalance = GroupBalance(
    groupName: string,
    balance: Money
  )

  // Aggregate cross-group summary
  datatype CrossGroupSummary = CrossGroupSummary(
    totalOwed: Money,    // Sum of positive balances (others owe you)
    totalOwes: Money,    // Sum of negative balances as positive (you owe others)
    netBalance: Money,   // totalOwed - totalOwes
    groups: seq<GroupBalance>
  )

  // Get balance for a single group entry
  function GetGroupBalance(entry: GroupEntry): GroupBalance {
    var balance := C.GetBalance(entry.model, entry.displayName);
    GroupBalance(entry.groupName, balance)
  }

  // Compute all group balances
  function ComputeGroupBalances(groups: seq<GroupEntry>): seq<GroupBalance>
    decreases |groups|
  {
    if |groups| == 0 then []
    else [GetGroupBalance(groups[0])] + ComputeGroupBalances(groups[1..])
  }

  // Sum positive balances (money owed to user)
  function SumPositive(balances: seq<GroupBalance>): Money
    decreases |balances|
  {
    if |balances| == 0 then 0
    else
      var b := balances[0].balance;
      (if b > 0 then b else 0) + SumPositive(balances[1..])
  }

  // Sum negative balances as positive (money user owes)
  function SumNegative(balances: seq<GroupBalance>): Money
    decreases |balances|
  {
    if |balances| == 0 then 0
    else
      var b := balances[0].balance;
      (if b < 0 then -b else 0) + SumNegative(balances[1..])
  }

  // Compute the full cross-group summary
  function ComputeCrossGroupSummary(groups: seq<GroupEntry>): CrossGroupSummary {
    var balances := ComputeGroupBalances(groups);
    var totalOwed := SumPositive(balances);
    var totalOwes := SumNegative(balances);
    CrossGroupSummary(totalOwed, totalOwes, totalOwed - totalOwes, balances)
  }

  // ==========================================================================
  // LEMMAS: Verified properties of cross-group calculations
  // ==========================================================================

  // Sum of all balances in a sequence
  function SumAllBalances(balances: seq<GroupBalance>): Money
    decreases |balances|
  {
    if |balances| == 0 then 0
    else balances[0].balance + SumAllBalances(balances[1..])
  }

  // Lemma: SumPositive is always non-negative
  lemma SumPositiveNonNegative(balances: seq<GroupBalance>)
    ensures SumPositive(balances) >= 0
    decreases |balances|
  {
    if |balances| == 0 {
    } else {
      SumPositiveNonNegative(balances[1..]);
    }
  }

  // Lemma: SumNegative is always non-negative
  lemma SumNegativeNonNegative(balances: seq<GroupBalance>)
    ensures SumNegative(balances) >= 0
    decreases |balances|
  {
    if |balances| == 0 {
    } else {
      SumNegativeNonNegative(balances[1..]);
    }
  }

  // Lemma: ComputeGroupBalances preserves length
  lemma ComputeGroupBalancesLength(groups: seq<GroupEntry>)
    ensures |ComputeGroupBalances(groups)| == |groups|
    decreases |groups|
  {
    if |groups| == 0 {
    } else {
      ComputeGroupBalancesLength(groups[1..]);
    }
  }

  // Lemma: Each computed balance matches GetBalance for the entry
  lemma ComputeGroupBalancesCorrect(groups: seq<GroupEntry>, i: nat)
    requires i < |groups|
    ensures i < |ComputeGroupBalances(groups)|
    ensures ComputeGroupBalances(groups)[i].balance == C.GetBalance(groups[i].model, groups[i].displayName)
    ensures ComputeGroupBalances(groups)[i].groupName == groups[i].groupName
    decreases |groups|
  {
    ComputeGroupBalancesLength(groups);
    if i == 0 {
    } else {
      ComputeGroupBalancesCorrect(groups[1..], i - 1);
    }
  }

  // Lemma: Net balance equals sum of all individual balances
  // SumPositive - SumNegative == SumAllBalances
  lemma NetBalanceEqualsSum(balances: seq<GroupBalance>)
    ensures SumPositive(balances) - SumNegative(balances) == SumAllBalances(balances)
    decreases |balances|
  {
    if |balances| == 0 {
    } else {
      NetBalanceEqualsSum(balances[1..]);
      var b := balances[0].balance;
      // Case split on sign of b
      if b > 0 {
        assert SumPositive(balances) == b + SumPositive(balances[1..]);
        assert SumNegative(balances) == SumNegative(balances[1..]);
      } else if b < 0 {
        assert SumPositive(balances) == SumPositive(balances[1..]);
        assert SumNegative(balances) == -b + SumNegative(balances[1..]);
      } else {
        assert SumPositive(balances) == SumPositive(balances[1..]);
        assert SumNegative(balances) == SumNegative(balances[1..]);
      }
    }
  }

  // Lemma: CrossGroupSummary has correct netBalance
  lemma CrossGroupSummaryNetCorrect(groups: seq<GroupEntry>)
    ensures ComputeCrossGroupSummary(groups).netBalance ==
            ComputeCrossGroupSummary(groups).totalOwed - ComputeCrossGroupSummary(groups).totalOwes
  {
    // Follows directly from construction
  }

  // Lemma: CrossGroupSummary totals are non-negative
  lemma CrossGroupSummaryTotalsNonNegative(groups: seq<GroupEntry>)
    ensures ComputeCrossGroupSummary(groups).totalOwed >= 0
    ensures ComputeCrossGroupSummary(groups).totalOwes >= 0
  {
    var balances := ComputeGroupBalances(groups);
    SumPositiveNonNegative(balances);
    SumNegativeNonNegative(balances);
  }

  // Lemma: CrossGroupSummary netBalance equals sum of all group balances
  lemma CrossGroupSummaryNetEqualsSum(groups: seq<GroupEntry>)
    ensures ComputeCrossGroupSummary(groups).netBalance ==
            SumAllBalances(ComputeCrossGroupSummary(groups).groups)
  {
    var balances := ComputeGroupBalances(groups);
    NetBalanceEqualsSum(balances);
  }
}

// Extend ClearSplitMultiAppCore with Effect State Machine functions
module ClearSplitEffectAppCore refines ClearSplitMultiAppCore {
  import E = ClearSplitEffectStateMachine
  import CG = ClearSplitCrossGroup

  type EffectState = E.EffectState
  type EffectEvent = E.Event
  type EffectCommand = E.Command

  // Cross-group types
  type GroupEntry = CG.GroupEntry
  type GroupBalance = CG.GroupBalance
  type CrossGroupSummary = CG.CrossGroupSummary

  // Initialize effect state
  function EffectInit(version: nat, model: D.Model): EffectState {
    E.Init(version, model)
  }

  // The verified Step function
  function EffectStep(es: EffectState, event: EffectEvent): (EffectState, EffectCommand) {
    E.Step(es, event)
  }

  // State accessors
  function EffectIsOnline(es: EffectState): bool { E.IsOnline(es) }
  function EffectIsIdle(es: EffectState): bool { E.IsIdle(es) }
  function EffectHasPending(es: EffectState): bool { E.HasPending(es) }
  function EffectPendingCount(es: EffectState): nat { E.PendingCount(es) }
  function EffectGetClient(es: EffectState): ClientState { es.client }
  function EffectGetServerVersion(es: EffectState): nat { es.serverVersion }

  // Event constructors
  function EffectUserAction(action: Action): EffectEvent {
    E.Event.UserAction(action)
  }
  function EffectDispatchAccepted(version: nat, model: D.Model): EffectEvent {
    E.Event.DispatchAccepted(version, model)
  }
  function EffectDispatchConflict(version: nat, model: D.Model): EffectEvent {
    E.Event.DispatchConflict(version, model)
  }
  function EffectDispatchRejected(version: nat, model: D.Model): EffectEvent {
    E.Event.DispatchRejected(version, model)
  }
  function EffectNetworkError(): EffectEvent { E.Event.NetworkError }
  function EffectNetworkRestored(): EffectEvent { E.Event.NetworkRestored }
  function EffectManualGoOffline(): EffectEvent { E.Event.ManualGoOffline }
  function EffectManualGoOnline(): EffectEvent { E.Event.ManualGoOnline }
  function EffectTick(): EffectEvent { E.Event.Tick }

  // Command inspection
  function EffectIsNoOp(cmd: EffectCommand): bool { cmd.NoOp? }
  function EffectIsSendDispatch(cmd: EffectCommand): bool { cmd.SendDispatch? }
  function EffectGetBaseVersion(cmd: EffectCommand): nat
    requires cmd.SendDispatch?
  { cmd.baseVersion }
  function EffectGetAction(cmd: EffectCommand): Action
    requires cmd.SendDispatch?
  { cmd.action }

  // --- Cross-group functions ---

  // Create a group entry for cross-group calculation
  function MakeGroupEntry(groupName: string, displayName: string, model: Model): GroupEntry {
    CG.GroupEntry(groupName, displayName, model)
  }

  // Compute cross-group summary from a list of group entries
  function ComputeCrossGroupSummary(groups: seq<GroupEntry>): CrossGroupSummary {
    CG.ComputeCrossGroupSummary(groups)
  }

  // Accessors for CrossGroupSummary
  function GetTotalOwed(summary: CrossGroupSummary): Money { summary.totalOwed }
  function GetTotalOwes(summary: CrossGroupSummary): Money { summary.totalOwes }
  function GetNetBalance(summary: CrossGroupSummary): Money { summary.netBalance }
  function GetGroupBalances(summary: CrossGroupSummary): seq<GroupBalance> { summary.groups }

  // Accessors for GroupBalance
  function GetGroupBalanceName(gb: GroupBalance): string { gb.groupName }
  function GetGroupBalanceAmount(gb: GroupBalance): Money { gb.balance }
}
