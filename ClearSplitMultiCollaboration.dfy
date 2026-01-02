// ClearSplitMultiCollaboration: Verified expense splitting with multi-user collaboration
//
// This wraps the ClearSplit domain with MultiCollaboration support.
// Since AddExpense and AddSettlement are append-only operations,
// reconciliation is trivially simple: no conflicts can occur.

include "MultiCollaboration.dfy"
include "ClearSplit.dfy"

module ClearSplitDomain refines Domain {
  import C = ClearSplit

  // The Model is just the ClearSplit Model
  // Note: We assume a pre-initialized model (members already set)
  type Model = C.Model

  // Actions are the ClearSplit actions
  datatype Action = AddExpense(e: C.Expense) | AddSettlement(s: C.Settlement)

  // Errors
  datatype Err = BadExpense | BadSettlement | Rejected

  function RejectErr(): Err { Rejected }

  // Invariant delegates to ClearSplit
  ghost predicate Inv(m: Model) {
    C.Inv(m)
  }

  // Initial model (empty with no members - real apps initialize with members)
  function Init(): Model {
    C.Model({}, [], [], [])
  }

  // Apply action
  function TryStep(m: Model, a: Action): Result<Model, Err> {
    match a
      case AddExpense(e) =>
        if C.ValidExpenseCheck(m.members, e) then
          Ok(C.Model(m.members, m.memberList, m.expenses + [e], m.settlements))
        else
          Err(BadExpense)
      case AddSettlement(s) =>
        if C.ValidSettlement(m.members, s) then
          Ok(C.Model(m.members, m.memberList, m.expenses, m.settlements + [s]))
        else
          Err(BadSettlement)
  }

  // Lemmas

  lemma InitSatisfiesInv()
    ensures Inv(Init())
  {
    // Empty model with no members trivially satisfies Inv
  }

  lemma StepPreservesInv(m: Model, a: Action, m2: Model)
  {
    match a {
      case AddExpense(e) =>
        C.ValidExpenseCheckImpliesWellFormed(m.members, e);
      case AddSettlement(s) =>
        // ValidSettlement check ensures settlement is valid
    }
  }

  // --- Collaboration hooks ---

  // Rebase: Since expenses and settlements are append-only and don't reference
  // each other, there are no conflicts. Rebasing is just identity.
  function Rebase(remote: Action, local: Action): Action {
    local  // No transformation needed
  }

  // Explains: Since rebasing is identity, a candidate explains the original
  // if and only if they are equal.
  ghost predicate Explains(orig: Action, cand: Action) {
    orig == cand
  }

  // Candidates: Just the action itself. Append-only operations don't need
  // fallback candidates - they either succeed (members valid) or fail.
  function Candidates(m: Model, a: Action): seq<Action> {
    [a]
  }

  lemma CandidatesComplete(m: Model, orig: Action, aGood: Action, m2: Model)
  {
    // Since Explains requires orig == aGood, and Candidates returns [orig],
    // we have aGood in [orig].
    assert aGood == orig;
    assert Candidates(m, orig) == [orig];
  }
}

module ClearSplitMultiCollaboration refines MultiCollaboration {
  import D = ClearSplitDomain
}

// =============================================================================
// ClearSplitMultiAppCore: JS-friendly wrappers
// =============================================================================
module ClearSplitMultiAppCore {
  import C = ClearSplit
  import D = ClearSplitDomain
  import MC = ClearSplitMultiCollaboration

  // Re-export types
  type Model = D.Model
  type Action = D.Action
  type ClientState = MC.ClientState
  type ServerState = MC.ServerState
  type Reply = MC.Reply
  type Money = C.Money
  type PersonId = C.PersonId

  // --- Initialization ---

  // Create initial server state with given members
  function InitServerWithMembers(memberList: seq<PersonId>): ServerState
    requires C.NoDuplicates(memberList)
  {
    var members := set i | 0 <= i < |memberList| :: memberList[i];
    var model := C.Model(members, memberList, [], []);
    MC.ServerState(model, [], [])
  }

  // Initialize client from server
  function InitClientFromServer(server: ServerState): ClientState {
    MC.InitClientFromServer(server)
  }

  // Initialize client from version and model
  function InitClient(version: nat, model: Model): ClientState {
    MC.InitClient(version, model)
  }

  // --- Action constructors ---

  function MakeExpense(paidBy: PersonId, amount: Money, shares: map<PersonId, Money>, shareKeys: seq<PersonId>): C.Expense {
    C.Expense(paidBy, amount, shares, shareKeys)
  }

  function MakeSettlement(from: PersonId, to: PersonId, amount: Money): C.Settlement {
    C.Settlement(from, to, amount)
  }

  function AddExpense(e: C.Expense): Action {
    D.AddExpense(e)
  }

  function AddSettlement(s: C.Settlement): Action {
    D.AddSettlement(s)
  }

  // --- Client operations ---

  function ClientLocalDispatch(client: ClientState, action: Action): ClientState {
    MC.ClientLocalDispatch(client, action)
  }

  function HandleRealtimeUpdate(client: ClientState, serverVersion: nat, serverModel: Model): ClientState {
    MC.HandleRealtimeUpdate(client, serverVersion, serverModel)
  }

  function ClientAcceptReply(client: ClientState, newVersion: nat, newPresent: Model): ClientState {
    MC.ClientAcceptReply(client, newVersion, newPresent)
  }

  function ClientRejectReply(client: ClientState, freshVersion: nat, freshModel: Model): ClientState {
    MC.ClientRejectReply(client, freshVersion, freshModel)
  }

  // --- Server operations (for Edge Function) ---

  function ServerDispatch(server: ServerState, baseVersion: nat, action: Action): (ServerState, Reply)
    requires baseVersion <= MC.Version(server)
    requires D.Inv(server.present)
  {
    MC.Dispatch(server, baseVersion, action)
  }

  function ServerVersion(server: ServerState): nat {
    MC.Version(server)
  }

  // --- Accessors ---

  function ClientModel(client: ClientState): Model {
    MC.ClientModel(client)
  }

  function ClientVersion(client: ClientState): nat {
    MC.ClientVersion(client)
  }

  function PendingCount(client: ClientState): nat {
    MC.PendingCount(client)
  }

  function IsAccepted(reply: Reply): bool {
    reply.Accepted?
  }

  function IsRejected(reply: Reply): bool {
    reply.Rejected?
  }

  // --- Model accessors (delegate to ClearSplit) ---

  function Balances(model: Model): map<PersonId, Money> {
    C.Balances(model)
  }

  function GetBalance(model: Model, p: PersonId): Money {
    C.GetBalance(model, p)
  }

  function Members(model: Model): seq<PersonId> {
    model.memberList
  }

  function Expenses(model: Model): seq<C.Expense> {
    model.expenses
  }

  function Settlements(model: Model): seq<C.Settlement> {
    model.settlements
  }

  // Get first pending action (for dispatch)
  function GetFirstPending(client: ClientState): Action
    requires |client.pending| > 0
  {
    client.pending[0]
  }

  function HasPending(client: ClientState): bool {
    |client.pending| > 0
  }
}
