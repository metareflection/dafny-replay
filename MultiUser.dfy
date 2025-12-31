// MultiUser.dfy
// Abstract wrapper that adds multi-user (authentication/authorization) to any Domain.
// Reusable for Kanban, Canon, ClearSplit, etc.

include "MultiCollaboration.dfy"

// =============================================================================
// MultiUserDomain: Wraps any Domain with user/membership
// =============================================================================
abstract module {:compile false} MultiUserDomain refines Domain {
  import Inner : Domain  // the wrapped domain

  type UserId = string

  // -------------------------------------------------------------------------
  // Model: wrap inner model with ownership/membership
  // -------------------------------------------------------------------------
  datatype Model = Model(
    inner: Inner.Model,
    owner: UserId,
    members: set<UserId>
  )

  // -------------------------------------------------------------------------
  // Actions: wrap inner actions with actor, add membership actions
  // -------------------------------------------------------------------------
  datatype Action =
    | InnerAction(actor: UserId, action: Inner.Action)
    | InviteMember(actor: UserId, user: UserId)
    | RemoveMember(actor: UserId, user: UserId)

  // -------------------------------------------------------------------------
  // Errors
  // -------------------------------------------------------------------------
  datatype Err =
    | InnerErr(e: Inner.Err)
    | Unauthorized

  function RejectErr(): Err { Unauthorized }

  // -------------------------------------------------------------------------
  // Authorization predicates
  // -------------------------------------------------------------------------
  predicate CanEdit(m: Model, actor: UserId) {
    actor in m.members
  }

  predicate CanManage(m: Model, actor: UserId) {
    actor == m.owner
  }

  // -------------------------------------------------------------------------
  // Invariant: owner always a member + inner invariant
  // -------------------------------------------------------------------------
  ghost predicate Inv(m: Model) {
    m.owner in m.members && Inner.Inv(m.inner)
  }

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------

  // Default init (empty owner/members - use InitWithOwner in practice)
  function Init(): Model {
    Model(Inner.Init(), "", {""})  // "" in {""} satisfies owner in members
  }

  // Initialize with a creator who becomes owner
  function InitWithOwner(creator: UserId): Model {
    Model(Inner.Init(), creator, {creator})
  }

  // -------------------------------------------------------------------------
  // Step function with authorization
  // -------------------------------------------------------------------------
  function TryStep(m: Model, a: Action): Result<Model, Err> {
    match a
      case InnerAction(actor, innerAction) =>
        if !CanEdit(m, actor) then Err(Unauthorized)
        else (
          match Inner.TryStep(m.inner, innerAction)
            case Ok(newInner) => Ok(Model(newInner, m.owner, m.members))
            case Err(e) => Err(InnerErr(e))
        )

      case InviteMember(actor, user) =>
        if !CanManage(m, actor) then Err(Unauthorized)
        else Ok(Model(m.inner, m.owner, m.members + {user}))

      case RemoveMember(actor, user) =>
        if !CanManage(m, actor) then Err(Unauthorized)
        else if user == m.owner then Err(Unauthorized)  // can't remove owner
        else Ok(Model(m.inner, m.owner, m.members - {user}))
  }

  // -------------------------------------------------------------------------
  // Collaboration: Rebase
  // -------------------------------------------------------------------------
  function Rebase(remote: Action, local: Action): Action {
    match (remote, local)
      // Inner actions: delegate rebasing
      case (InnerAction(_, remoteInner), InnerAction(localActor, localInner)) =>
        InnerAction(localActor, Inner.Rebase(remoteInner, localInner))

      // Membership actions don't affect inner actions
      case (InviteMember(_, _), InnerAction(_, _)) => local
      case (RemoveMember(_, _), InnerAction(_, _)) => local

      // Inner actions don't affect membership actions
      case (InnerAction(_, _), InviteMember(_, _)) => local
      case (InnerAction(_, _), RemoveMember(_, _)) => local

      // Membership actions: keep local (LWW)
      case (InviteMember(_, _), InviteMember(_, _)) => local
      case (InviteMember(_, _), RemoveMember(_, _)) => local
      case (RemoveMember(_, _), InviteMember(_, _)) => local
      case (RemoveMember(_, _), RemoveMember(_, _)) => local
  }

  // -------------------------------------------------------------------------
  // Collaboration: Candidates
  // -------------------------------------------------------------------------

  // Helper to wrap a sequence of inner actions
  function WrapCandidates(actor: UserId, innerCandidates: seq<Inner.Action>): seq<Action>
  {
    seq(|innerCandidates|, i requires 0 <= i < |innerCandidates| =>
        InnerAction(actor, innerCandidates[i]))
  }

  function Candidates(m: Model, a: Action): seq<Action> {
    match a
      case InnerAction(actor, innerAction) =>
        var innerCandidates := Inner.Candidates(m.inner, innerAction);
        WrapCandidates(actor, innerCandidates)
      case InviteMember(_, _) => [a]
      case RemoveMember(_, _) => [a]
  }

  // -------------------------------------------------------------------------
  // Collaboration: Explains (meaning preservation)
  // -------------------------------------------------------------------------
  ghost predicate Explains(orig: Action, cand: Action) {
    match (orig, cand)
      case (InnerAction(origActor, origInner), InnerAction(candActor, candInner)) =>
        origActor == candActor && Inner.Explains(origInner, candInner)
      case (InviteMember(_, _), InviteMember(_, _)) => orig == cand
      case (RemoveMember(_, _), RemoveMember(_, _)) => orig == cand
      case (_, _) => false
  }

  // -------------------------------------------------------------------------
  // Lemmas
  // -------------------------------------------------------------------------

  lemma InitSatisfiesInv()
    ensures Inv(Init())
  {
    Inner.InitSatisfiesInv();
  }

  lemma InitWithOwnerSatisfiesInv(creator: UserId)
    ensures Inv(InitWithOwner(creator))
  {
    Inner.InitSatisfiesInv();
  }

  lemma StepPreservesInv(m: Model, a: Action, m2: Model)
  {
    match a {
      case InnerAction(actor, innerAction) =>
        // TryStep succeeded, so actor was authorized and Inner.TryStep succeeded
        assert CanEdit(m, actor);
        var innerResult := Inner.TryStep(m.inner, innerAction);
        assert innerResult.Ok?;
        Inner.StepPreservesInv(m.inner, innerAction, m2.inner);

      case InviteMember(actor, user) =>
        // Adding a member preserves owner in members
        assert m.owner in m.members;
        assert m2.members == m.members + {user};
        assert m.owner in m2.members;

      case RemoveMember(actor, user) =>
        // Removing non-owner preserves owner in members
        assert user != m.owner;  // enforced by TryStep
        assert m2.members == m.members - {user};
        assert m.owner in m2.members;
    }
  }

  // Helper lemma: if inner action is in wrapped candidates, inner is in inner candidates
  lemma WrapCandidatesContains(actor: UserId, innerCandidates: seq<Inner.Action>, innerAction: Inner.Action)
    requires innerAction in innerCandidates
    ensures InnerAction(actor, innerAction) in WrapCandidates(actor, innerCandidates)
  {
    var i :| 0 <= i < |innerCandidates| && innerCandidates[i] == innerAction;
    assert WrapCandidates(actor, innerCandidates)[i] == InnerAction(actor, innerAction);
  }

  lemma CandidatesComplete(m: Model, orig: Action, aGood: Action, m2: Model)
  {
    match (orig, aGood) {
      case (InnerAction(origActor, origInner), InnerAction(goodActor, goodInner)) =>
        // By Explains: origActor == goodActor and Inner.Explains(origInner, goodInner)
        assert origActor == goodActor;
        assert Inner.Explains(origInner, goodInner);

        // TryStep succeeded, so Inner.TryStep succeeded
        assert CanEdit(m, goodActor);
        var innerResult := Inner.TryStep(m.inner, goodInner);
        assert innerResult.Ok?;

        // By Inner.CandidatesComplete: goodInner in Inner.Candidates
        Inner.CandidatesComplete(m.inner, origInner, goodInner, m2.inner);
        assert goodInner in Inner.Candidates(m.inner, origInner);

        // Therefore wrapped action is in wrapped candidates
        WrapCandidatesContains(origActor, Inner.Candidates(m.inner, origInner), goodInner);
        assert aGood == InnerAction(origActor, goodInner);
        assert Candidates(m, orig) == WrapCandidates(origActor, Inner.Candidates(m.inner, origInner));

      case (InviteMember(_, _), InviteMember(_, _)) =>
        assert orig == aGood;
        assert Candidates(m, orig) == [orig];

      case (RemoveMember(_, _), RemoveMember(_, _)) =>
        assert orig == aGood;
        assert Candidates(m, orig) == [orig];

      case (_, _) =>
        // Explains is false for mismatched action types
        assert false;
    }
  }
}

// =============================================================================
// MultiUser: Server kernel with multi-user domain
// =============================================================================
abstract module {:compile false} MultiUser refines MultiCollaboration {
  import D : MultiUserDomain
}
