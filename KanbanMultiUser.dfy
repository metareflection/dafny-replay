// KanbanMultiUser.dfy
// Multi-user Kanban: combines MultiUser wrapper with KanbanDomain.
// Each project has an owner, members, and a Kanban board.

include "MultiUser.dfy"
include "KanbanMultiCollaboration.dfy"

// =============================================================================
// KanbanMultiUserDomain: Instantiate MultiUserDomain with KanbanDomain
// =============================================================================
module KanbanMultiUserDomain refines MultiUserDomain {
  import Inner = KanbanDomain
}

// =============================================================================
// KanbanMultiUser: Server kernel for multi-user Kanban
// =============================================================================
module KanbanMultiUser refines MultiUser {
  import D = KanbanMultiUserDomain
}

// =============================================================================
// KanbanMultiUserAppCore: Client-side API (compiled, JS-friendly)
// =============================================================================
module KanbanMultiUserAppCore {
  import K = KanbanDomain
  import MU = KanbanMultiUserDomain
  import MC = KanbanMultiUser

  // -------------------------------------------------------------------------
  // Type aliases for clarity
  // -------------------------------------------------------------------------
  type UserId = MU.UserId
  type Model = MU.Model
  type Action = MU.Action
  type ServerState = MC.ServerState
  type Reply = MC.Reply

  // -------------------------------------------------------------------------
  // Server initialization
  // -------------------------------------------------------------------------

  // Create a new project with an owner
  function InitProject(owner: UserId): ServerState
  {
    var model := MU.InitWithOwner(owner);
    MC.ServerState(model, [], [])
  }

  // -------------------------------------------------------------------------
  // Action constructors
  // -------------------------------------------------------------------------

  // Board actions (wrapped with actor)
  function AddColumn(actor: UserId, col: K.ColId, limit: nat): Action {
    MU.InnerAction(actor, K.AddColumn(col, limit))
  }

  function SetWip(actor: UserId, col: K.ColId, limit: nat): Action {
    MU.InnerAction(actor, K.SetWip(col, limit))
  }

  function AddCard(actor: UserId, col: K.ColId, title: string): Action {
    MU.InnerAction(actor, K.AddCard(col, title))
  }

  function MoveCard(actor: UserId, id: K.CardId, toCol: K.ColId, place: K.Place): Action {
    MU.InnerAction(actor, K.MoveCard(id, toCol, place))
  }

  function EditTitle(actor: UserId, id: K.CardId, title: string): Action {
    MU.InnerAction(actor, K.EditTitle(id, title))
  }

  // Placement helpers
  function AtEnd(): K.Place { K.AtEnd }
  function Before(anchor: K.CardId): K.Place { K.Before(anchor) }
  function After(anchor: K.CardId): K.Place { K.After(anchor) }

  // Membership actions
  function InviteMember(actor: UserId, user: UserId): Action {
    MU.InviteMember(actor, user)
  }

  function RemoveMember(actor: UserId, user: UserId): Action {
    MU.RemoveMember(actor, user)
  }

  // -------------------------------------------------------------------------
  // Server dispatch
  // -------------------------------------------------------------------------
  function Dispatch(server: ServerState, baseVersion: nat, action: Action): (ServerState, Reply)
    requires baseVersion <= MC.Version(server)
    requires MU.Inv(server.present)
  {
    MC.Dispatch(server, baseVersion, action)
  }

  // -------------------------------------------------------------------------
  // Model accessors
  // -------------------------------------------------------------------------

  function GetOwner(m: Model): UserId {
    m.owner
  }

  function GetMembers(m: Model): set<UserId> {
    m.members
  }

  function IsMember(m: Model, user: UserId): bool {
    user in m.members
  }

  function IsOwner(m: Model, user: UserId): bool {
    user == m.owner
  }

  // Board accessors (delegate to inner)
  function GetCols(m: Model): seq<K.ColId> {
    m.inner.cols
  }

  function GetLanes(m: Model): map<K.ColId, seq<K.CardId>> {
    m.inner.lanes
  }

  function GetWip(m: Model): map<K.ColId, nat> {
    m.inner.wip
  }

  function GetCards(m: Model): map<K.CardId, K.Card> {
    m.inner.cards
  }

  function GetNextId(m: Model): nat {
    m.inner.nextId
  }

  // -------------------------------------------------------------------------
  // Server state accessors
  // -------------------------------------------------------------------------

  function ServerVersion(server: ServerState): nat {
    MC.Version(server)
  }

  function ServerModel(server: ServerState): Model {
    server.present
  }

  ghost function CheckInv(m: Model): bool {
    m.owner in m.members && K.Inv(m.inner)
  }

  // -------------------------------------------------------------------------
  // Reply inspection
  // -------------------------------------------------------------------------

  function IsAccepted(reply: Reply): bool {
    reply.Accepted?
  }

  function IsRejected(reply: Reply): bool {
    reply.Rejected?
  }

  function IsUnauthorized(reply: Reply): bool {
    reply.Rejected? && reply.reason == MC.DomainInvalid
  }
}
