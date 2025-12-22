include "Authority.dfy"

module ConcreteDomain refines Domain {
  type Model = int
  datatype Action = Inc | Dec

  predicate Inv(m: Model) { m >= 0 }

  function TryStep(m: Model, a: Action): TryStepResult {
    match a
      case Inc => Ok(m + 1)
      case Dec =>
        if m == 0 then Invalid("cannot decrement at 0")
        else Ok(m - 1)
  }

  lemma TryStepOkPreservesInv(m: Model, a: Action)
  {
  }
}

module ConcreteServer refines ServerKernel {
  import D = ConcreteDomain
}

// AppCore exposes server API for JavaScript
module AppCore {
  import S = ConcreteServer
  import D = ConcreteDomain

  // Server state type alias
  type ServerState = S.S

  // Initialize server with starting value
  function InitServer(initial: int): S.S {
    S.S(0, if initial >= 0 then initial else 0)
  }

  // Action constructors
  function Inc(): D.Action { D.Inc }
  function Dec(): D.Action { D.Dec }

  // Sync endpoint - get current state
  function Sync(s: S.S): S.SyncResponse {
    S.Sync(s)
  }

  // Dispatch endpoint - process action from client
  function Dispatch(s: S.S, clientVer: nat, a: D.Action): (S.S, S.Response) {
    S.Dispatch(s, clientVer, a)
  }

  // Helper to extract version from server state
  function GetVersion(s: S.S): nat { s.ver }

  // Helper to extract present value from server state
  function GetPresent(s: S.S): int { s.present }

  // Response inspection helpers
  function IsSuccess(r: S.Response): bool { r.res.Success? }
  function IsStale(r: S.Response): bool { r.res.Failure? && r.res.reason.Stale? }
  function IsInvalid(r: S.Response): bool { r.res.Failure? && r.res.reason.InvalidAction? }
  function GetInvalidMsg(r: S.Response): string
    requires IsInvalid(r)
  { r.res.reason.msg }
  function GetResponseVersion(r: S.Response): nat { r.ver }
  function GetSuccessValue(r: S.Response): int
    requires IsSuccess(r)
  { r.res.present }
}
