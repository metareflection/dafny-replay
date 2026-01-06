// MultiProject.dfy: Abstract module for cross-project operations
//
// This module extends MultiCollaboration to support operations that span
// multiple projects. Concrete domains refine this to add domain-specific
// cross-project actions (e.g., MoveTaskTo, CopyTaskTo).
//
// Pattern:
//   MultiCollaboration (single-project collaboration)
//       ↓ imports
//   MultiProject (cross-project operations)  ← this module
//       ↓ refines
//   TodoMultiProjectDomain (concrete)

include "MultiCollaboration.dfy"

abstract module MultiProject {
  import MC : MultiCollaboration

  // Re-export types from MultiCollaboration
  type Model = MC.D.Model
  type Action = MC.D.Action
  type Err = MC.D.Err
  type ProjectId = string

  // MultiModel: collection of projects
  datatype MultiModel = MultiModel(projects: map<ProjectId, Model>)

  // Result type (reuse from Domain)
  datatype Result<T, E> = Ok(value: T) | Err(error: E)

  // ===========================================================================
  // MultiAction: Actions that can span multiple projects
  // ===========================================================================

  // Abstract: concrete modules define additional cross-project actions
  type MultiAction(==)

  // Every MultiAction must support wrapping a single-project action
  function SingleAction(pid: ProjectId, a: Action): MultiAction

  // Extract single-project action if this is a Single variant
  function GetSingleAction(ma: MultiAction): Option<(ProjectId, Action)>

  datatype Option<T> = None | Some(value: T)

  // ===========================================================================
  // Errors for multi-project operations
  // ===========================================================================

  datatype MultiErr =
    | MissingProject(projectId: ProjectId)
    | SingleProjectError(projectId: ProjectId, err: Err)
    | CrossProjectError(message: string)

  // ===========================================================================
  // TouchedProjects: Which projects does an action affect?
  // ===========================================================================

  function TouchedProjects(a: MultiAction): set<ProjectId>

  // Single actions touch exactly one project
  lemma SingleActionTouchesOne(pid: ProjectId, a: Action)
    ensures TouchedProjects(SingleAction(pid, a)) == {pid}

  // ===========================================================================
  // AllProjectsLoaded: Are all touched projects present?
  // ===========================================================================

  predicate AllProjectsLoaded(mm: MultiModel, a: MultiAction)
  {
    forall pid :: pid in TouchedProjects(a) ==> pid in mm.projects
  }

  // ===========================================================================
  // MultiStep: Apply a multi-action to a MultiModel
  // ===========================================================================

  function MultiStep(mm: MultiModel, a: MultiAction): Result<MultiModel, MultiErr>
    requires AllProjectsLoaded(mm, a)

  // Variant without precondition (checks internally, returns error if not loaded)
  function TryMultiStep(mm: MultiModel, a: MultiAction): Result<MultiModel, MultiErr>

  // TryMultiStep delegates to MultiStep when loaded
  lemma TryMultiStepEquivalence(mm: MultiModel, a: MultiAction)
    requires AllProjectsLoaded(mm, a)
    ensures TryMultiStep(mm, a) == MultiStep(mm, a)

  // ===========================================================================
  // ChangedProjects: Which projects were modified?
  // ===========================================================================

  function ChangedProjects(before: MultiModel, after: MultiModel): set<ProjectId>
  {
    set pid | pid in after.projects &&
              (pid !in before.projects || before.projects[pid] != after.projects[pid])
  }

  // ===========================================================================
  // MultiInv: All projects satisfy their individual invariants
  // ===========================================================================

  ghost predicate Inv(m: Model)

  ghost predicate MultiInv(mm: MultiModel)
  {
    forall pid :: pid in mm.projects ==> Inv(mm.projects[pid])
  }

  // ===========================================================================
  // Proof obligation: MultiStep preserves MultiInv
  // ===========================================================================

  lemma MultiStepPreservesInv(mm: MultiModel, a: MultiAction, mm2: MultiModel)
    requires MultiInv(mm)
    requires AllProjectsLoaded(mm, a)
    requires MultiStep(mm, a) == Ok(mm2)
    ensures MultiInv(mm2)

  // ===========================================================================
  // MultiRebase: Rebase a multi-action through concurrent changes
  // ===========================================================================

  function MultiRebase(
    projectLogs: map<ProjectId, seq<Action>>,
    baseVersions: map<ProjectId, nat>,
    a: MultiAction
  ): MultiAction

  // ===========================================================================
  // MultiCandidates: Generate fallback candidates for an action
  // ===========================================================================

  function MultiCandidates(mm: MultiModel, a: MultiAction): seq<MultiAction>

  // First candidate is always the original action
  lemma CandidatesStartWithOriginal(mm: MultiModel, a: MultiAction)
    requires AllProjectsLoaded(mm, a)
    requires |MultiCandidates(mm, a)| > 0
    ensures MultiCandidates(mm, a)[0] == a

  // ===========================================================================
  // MultiDispatch: Full reconciliation for cross-project operations
  // ===========================================================================

  // Rebase through suffix of each project's log
  function RebaseThroughLogs(
    projectLogs: map<ProjectId, seq<Action>>,
    baseVersions: map<ProjectId, nat>,
    a: MultiAction
  ): MultiAction
  {
    MultiRebase(projectLogs, baseVersions, a)
  }

  // Try candidates until one succeeds
  function TryCandidates(mm: MultiModel, candidates: seq<MultiAction>): Result<(MultiModel, MultiAction), MultiErr>
    requires forall i :: 0 <= i < |candidates| ==> AllProjectsLoaded(mm, candidates[i])
    decreases |candidates|
  {
    if |candidates| == 0 then
      Err(CrossProjectError("No candidate succeeded"))
    else
      var result := MultiStep(mm, candidates[0]);
      match result
      case Ok(mm2) => Ok((mm2, candidates[0]))
      case Err(_) => TryCandidates(mm, candidates[1..])
  }
}
