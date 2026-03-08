module Workflow {
  datatype State = Draft | Submitted | InReview | Approved | Rejected | Published

  datatype Transition = Submit | BeginReview | Approve | Reject | Publish | Revise

  datatype Doc = Doc(state: State, reviewers: seq<string>)

  datatype TransitionResult = OK | Blocked(reason: string)

  // Valid transition function
  predicate ValidTransition(from: State, t: Transition) {
    match (from, t)
    case (Draft, Submit) => true
    case (Submitted, BeginReview) => true
    case (InReview, Approve) => true
    case (InReview, Reject) => true
    case (Approved, Publish) => true
    case (Rejected, Revise) => true
    case _ => false
  }

  // Target state for a valid transition
  function TargetState(t: Transition): State {
    match t
    case Submit => Submitted
    case BeginReview => InReview
    case Approve => Approved
    case Reject => Rejected
    case Publish => Published
    case Revise => Draft
  }

  // Invariant: InReview requires at least one reviewer
  predicate DocInv(doc: Doc) {
    doc.state == InReview ==> |doc.reviewers| > 0
  }

  // Guard: additional preconditions beyond valid transition
  predicate TransitionGuard(doc: Doc, t: Transition) {
    match t
    case BeginReview => |doc.reviewers| > 0
    case _ => true
  }

  // Published is terminal
  predicate IsTerminal(s: State) {
    s == Published
  }

  // Can we perform this transition?
  predicate CanTransition(doc: Doc, t: Transition) {
    !IsTerminal(doc.state) &&
    ValidTransition(doc.state, t) &&
    TransitionGuard(doc, t)
  }

  // Try a transition: returns OK or Blocked with a reason
  function TryTransition(doc: Doc, t: Transition): TransitionResult {
    if IsTerminal(doc.state) then Blocked("Document is published")
    else if !ValidTransition(doc.state, t) then Blocked("Not a valid transition from " + StateName(doc.state))
    else if !TransitionGuard(doc, t) then
      match t
      case BeginReview => Blocked("Needs at least one reviewer")
      case _ => Blocked("Guard not met")
    else OK
  }

  function StateName(s: State): string {
    match s
    case Draft => "Draft"
    case Submitted => "Submitted"
    case InReview => "InReview"
    case Approved => "Approved"
    case Rejected => "Rejected"
    case Published => "Published"
  }

  // Step: apply a transition if valid, otherwise return doc unchanged
  function Step(doc: Doc, t: Transition): Doc {
    if CanTransition(doc, t) then
      var newState := TargetState(t);
      match t
      case Revise => Doc(newState, [])  // clear reviewers on revision
      case _ => Doc(newState, doc.reviewers)
    else
      doc
  }

  // Add a reviewer (only in Draft or Submitted)
  function AddReviewer(doc: Doc, reviewer: string): Doc {
    if doc.state == Draft || doc.state == Submitted then
      Doc(doc.state, doc.reviewers + [reviewer])
    else
      doc
  }

  // Init
  function Init(): Doc {
    Doc(Draft, [])
  }

  // --- Spec lemmas (proofs stubbed) ---

  // Invariant holds on init
  lemma InitSatisfiesInv()
    ensures DocInv(Init())
  {
  }

  // Step preserves invariant
  lemma StepPreservesInv(doc: Doc, t: Transition)
    requires DocInv(doc)
    ensures DocInv(Step(doc, t))
  {
  }

  // AddReviewer preserves invariant
  lemma AddReviewerPreservesInv(doc: Doc, reviewer: string)
    requires DocInv(doc)
    ensures DocInv(AddReviewer(doc, reviewer))
  {
  }

  // Published is terminal: no transition changes state
  lemma PublishedIsTerminal(doc: Doc, t: Transition)
    requires doc.state == Published
    ensures Step(doc, t) == doc
  {
  }

  // Invalid transitions are no-ops
  lemma InvalidTransitionIsNoOp(doc: Doc, t: Transition)
    requires !CanTransition(doc, t)
    ensures Step(doc, t) == doc
  {
  }

  // Cannot skip states: e.g., Draft cannot go directly to Published
  lemma NoSkipDraftToPublished(doc: Doc)
    requires doc.state == Draft
    ensures !CanTransition(doc, Publish)
  {
  }

  lemma NoSkipDraftToApproved(doc: Doc)
    requires doc.state == Draft
    ensures !CanTransition(doc, Approve)
  {
  }

  // TryTransition is consistent with CanTransition
  lemma TryTransitionConsistent(doc: Doc, t: Transition)
    ensures TryTransition(doc, t).OK? <==> CanTransition(doc, t)
  {
  }

  // Rejection always leads back to Draft
  lemma RejectThenReviseIsDraft(doc: Doc)
    requires doc.state == InReview
    requires CanTransition(doc, Reject)
    ensures Step(Step(doc, Reject), Revise).state == Draft
  {
  }
}
