// Abstract protocol + server kernel (compile false), parameterized by a Domain.

abstract module {:compile false} Domain {
  type Model
  type Action

  ghost predicate Inv(m: Model)

  function Init(): Model

  // A partial step: either returns an updated model, or an invalid-action message.
  datatype TryStepResult =
    | Ok(m': Model)
    | Invalid(msg: string)

  function TryStep(m: Model, a: Action): TryStepResult

  lemma InitSatisfiesInv()
    ensures Inv(Init())

  lemma TryStepOkPreservesInv(m: Model, a: Action)
    requires Inv(m)
    ensures  TryStep(m,a).Ok? ==> Inv(TryStep(m,a).m')
}

abstract module {:compile false} ServerKernel {
  import D : Domain

  // Protocol types (nested to share D)
  datatype FailureReason =
    | Stale
    | InvalidAction(msg: string)

  datatype Result =
    | Success(present: D.Model)
    | Failure(reason: FailureReason)

  // Always returns the authoritative version;
  // present is returned only on Success.
  datatype Response =
    Response(ver: nat, res: Result)

  datatype SyncResponse =
    SyncResponse(ver: nat, present: D.Model)

  // Server state (single shared doc)
  datatype S =
    S(ver: nat, present: D.Model)

  // Total snapshot endpoint
  function Sync(s: S): SyncResponse
    ensures Sync(s).ver == s.ver
    ensures Sync(s).present == s.present
  {
    SyncResponse(s.ver, s.present)
  }

  // Dispatch: protocol + domain partiality.
  // - stale version => Failure(Stale), state unchanged
  // - invalid action => Failure(InvalidAction(msg)), state unchanged
  // - ok => Success(newPresent), state updated, version incremented
  function Dispatch(s: S, clientVer: nat, a: D.Action): (S, Response)
  {
    if clientVer != s.ver then
      (s, Response(s.ver, Failure(Stale)))
    else
      match D.TryStep(s.present, a)
        case Ok(m') =>
          (S(s.ver + 1, m'), Response(s.ver + 1, Success(m')))
        case Invalid(msg) =>
          (s, Response(s.ver, Failure(InvalidAction(msg))))
  }

  // Server invariant lifted from Domain.Inv
  ghost predicate SInv(s: S) {
    D.Inv(s.present)
  }

  // Initialize server with domain's initial model
  function InitServer(): S {
    S(0, D.Init())
  }

  lemma InitServerSatisfiesSInv()
    ensures SInv(InitServer())
  {
    D.InitSatisfiesInv();
  }

  // Main preservation lemma: Dispatch keeps server invariant.
  lemma DispatchPreservesSInv(s: S, clientVer: nat, a: D.Action)
    requires SInv(s)
    ensures  SInv(Dispatch(s, clientVer, a).0)
  {
    if clientVer != s.ver {
      // unchanged
    } else {
      match D.TryStep(s.present, a)
        case Ok(m') =>
          D.TryStepOkPreservesInv(s.present, a);
        case Invalid(msg) =>
          // unchanged
    }
  }
}
