abstract module {:compile false} Domain {
    type Model(==)
    type Err
    type Action(==)

    datatype Result<T, E> =
    | Ok(value: T)
    | Err(error: E)

    // Distinguished no-op action used by OT reconciliation.
    function NoOp(): Action

    // Total OT transform: rewrite `local` assuming `remote` happened first.
    function Transform(remote: Action, local: Action): Action

    // Semantic step, may reject.
    function TryStep(m: Model, a: Action): Result<Model, Err>

    // Global invariant.
    predicate Inv(m: Model)

    // Domain obligation.
    lemma StepPreservesInv(m: Model, a: Action, m2: Model)
        requires Inv(m)
        requires TryStep(m, a) == Ok(m2)
        ensures  Inv(m2)
}

// Generic authoritative collaboration kernel:
// - appliedLog: replayable truth (accepted actions only)
// - auditLog: records orig request + candidate + accept/reject
// - OT via total Transform (may yield NoOp)
// - No methods; Dispatch is a pure function

abstract module {:compile false} MultiCollaboration {
  import D : Domain

  // Minimal rejection taxonomy now; refine later.
  datatype RejectReason =
    | DomainInvalid

  // Reply to a single dispatch.
  datatype Reply =
    | Accepted(newVersion: nat, newPresent: D.Model, applied: D.Action, noChange: bool)
    | Rejected(reason: RejectReason, candidate: D.Action)

  // Audit outcome for a request.
  datatype RequestOutcome =
    | AuditAccepted(applied: D.Action, suspiciousNoOp: bool, noChange: bool)
    | AuditRejected(reason: RejectReason, candidate: D.Action)

  datatype RequestRecord = Req(
    baseVersion: nat,
    orig: D.Action,
    candidate: D.Action,
    outcome: RequestOutcome
  )

  datatype ServerState = ServerState(
    present: D.Model,
    appliedLog: seq<D.Action>,
    auditLog: seq<RequestRecord>
  )

  function Version(s: ServerState): nat { |s.appliedLog| }

  function IsSuspiciousNoOp(orig: D.Action, cand: D.Action): bool
  {
    cand == D.NoOp() && orig != D.NoOp()
  }

  // Transform an action through a suffix of already-applied actions.
  function TransformThroughSuffix(suffix: seq<D.Action>, a: D.Action): D.Action
    decreases |suffix|
  {
    if |suffix| == 0 then a
    else
      TransformThroughSuffix(suffix[..|suffix|-1], D.Transform(suffix[|suffix|-1], a))
  }

  // Pure transition.
  function Dispatch(s: ServerState, baseVersion: nat, orig: D.Action): (ServerState, Reply)
    requires baseVersion <= Version(s)
    requires D.Inv(s.present)
    ensures  D.Inv(Dispatch(s, baseVersion, orig).0.present)
    ensures  Version(Dispatch(s, baseVersion, orig).0) == Version(s) ||
             Version(Dispatch(s, baseVersion, orig).0) == Version(s) + 1
  {
    var suffix := s.appliedLog[baseVersion..];
    var cand := TransformThroughSuffix(suffix, orig);

    match D.TryStep(s.present, cand)
      case Ok(m2) =>
        D.StepPreservesInv(s.present, cand, m2);
        var noChange := (m2 == s.present);
        var newApplied := s.appliedLog + [cand];
        var suspicious := IsSuspiciousNoOp(orig, cand);
        var rec := Req(baseVersion, orig, cand, AuditAccepted(cand, suspicious, noChange));
        var newAudit := s.auditLog + [rec];
        (ServerState(m2, newApplied, newAudit),
         Accepted(|newApplied|, m2, cand, noChange))

      case Err(_) =>
        var rec := Req(baseVersion, orig, cand, AuditRejected(DomainInvalid, cand));
        var newAudit := s.auditLog + [rec];
        (ServerState(s.present, s.appliedLog, newAudit),
         Rejected(DomainInvalid, cand))
  }

  // Replay a sequence of actions from an initial model.
  // Returns the final model if all actions succeed, or an error if any fails.
  function Replay(m: D.Model, log: seq<D.Action>): D.Result<D.Model, D.Err>
    decreases |log|
  {
    if |log| == 0 then D.Ok(m)
    else
      match D.TryStep(m, log[0])
        case Ok(m2) => Replay(m2, log[1..])
        case Err(e) => D.Err(e)
  }

  // A server state is reachable from init if replaying its applied log
  // from init yields its present state.
  predicate ReachableFrom(init: D.Model, s: ServerState)
  {
    Replay(init, s.appliedLog) == D.Ok(s.present)
  }

  // ---- Kernel theorems ----

  // The core kernel safety statement: Dispatch preserves the domain invariant.
  lemma DispatchPreservesInv(s: ServerState, baseVersion: nat, orig: D.Action)
    requires baseVersion <= Version(s)
    requires D.Inv(s.present)
    ensures  D.Inv(Dispatch(s, baseVersion, orig).0.present)
  {
    // Follows directly from Dispatch's postcondition.
  }

  // Event-sourcing: if replay succeeds, the result satisfies the invariant.
  lemma ReplayPreservesInv(init: D.Model, log: seq<D.Action>, result: D.Model)
    requires D.Inv(init)
    requires Replay(init, log) == D.Ok(result)
    ensures  D.Inv(result)
    decreases |log|
  {
    if |log| == 0 {
      // Base case: result == init, and D.Inv(init) holds.
    } else {
      // Inductive case: first action succeeds, then recurse.
      match D.TryStep(init, log[0])
        case Ok(m2) =>
          D.StepPreservesInv(init, log[0], m2);
          ReplayPreservesInv(m2, log[1..], result);
        case Err(_) =>
          // Contradiction: Replay would have returned Err.
    }
  }

  // If a server state is reachable from a valid init, its present state is valid.
  lemma PresentAgreesWithAppliedLog(init: D.Model, s: ServerState)
    requires D.Inv(init)
    requires ReachableFrom(init, s)
    ensures  D.Inv(s.present)
  {
    ReplayPreservesInv(init, s.appliedLog, s.present);
  }
}
