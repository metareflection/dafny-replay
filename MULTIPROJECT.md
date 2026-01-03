# Multi-Project Architecture

This document describes the architecture for multi-project state management in Dafny-verified collaborative applications. The collab-todo app uses this architecture to support both single-project operations and cross-project operations like moving tasks between projects.

## Problem

A collaborative app often needs to manage multiple projects simultaneously. Users may:
- View and edit multiple projects they have access to
- Move or copy items between projects
- Work offline and sync changes later

The challenge is extending a single-project verified domain to handle multiple projects while:
- Preserving all verification guarantees
- Supporting atomic cross-project operations
- Maintaining the same offline-first architecture

## Key Insight

**The action itself declares which projects it touches.**

A `MultiAction` explicitly names the projects it affects. This means:
- The server only loads projects mentioned in the action
- Cross-project operations are atomic (all-or-nothing)
- The client tracks versions per-project, not globally
- Offline queuing works identically to single-project

## Dafny Module Hierarchy

The implementation follows an abstract/concrete refinement pattern:

```
MultiProject.dfy (abstract)
    ↓ refines
TodoMultiProjectDomain.dfy (concrete)

MultiProjectEffectStateMachine.dfy (abstract)
    ↓ refines
TodoMultiProjectEffectStateMachine.dfy (concrete)
```

This mirrors the single-project pattern where abstract modules define the interface and concrete modules provide domain-specific implementations.

## Data Structures

### MultiModel

A map from project IDs to individual project models:

```dafny
datatype MultiModel = MultiModel(
  projects: map<ProjectId, Model>
)
```

### MultiAction

Actions that can span multiple projects:

```dafny
datatype MultiAction =
  | Single(project: ProjectId, action: Action)
  | MoveTaskTo(srcProject: ProjectId, dstProject: ProjectId,
               taskId: TaskId, dstList: ListId, anchor: Place)
  | CopyTaskTo(srcProject: ProjectId, dstProject: ProjectId,
               taskId: TaskId, dstList: ListId)
```

The `Single` variant wraps ordinary single-project actions, allowing the same state machine to handle both cases uniformly.

### MultiClientState

Client state tracks versions per-project:

```dafny
datatype MultiClientState = MultiClientState(
  baseVersions: map<ProjectId, nat>,
  present: MultiModel,
  pending: seq<MultiAction>
)
```

Compare to single-project `ClientState` which has a single `baseVersion: nat`.

## Verified Functions

### TouchedProjects

Extracts which projects an action affects:

```dafny
function TouchedProjects(a: MultiAction): set<ProjectId>
{
  match a
  case Single(pid, _) => {pid}
  case MoveTaskTo(src, dst, _, _, _) => {src, dst}
  case CopyTaskTo(src, dst, _, _) => {src, dst}
}
```

### AllProjectsLoaded

Precondition ensuring all required projects are present:

```dafny
predicate AllProjectsLoaded(mm: MultiModel, a: MultiAction)
{
  forall pid :: pid in TouchedProjects(a) ==> pid in mm.projects
}
```

### MultiStep

Applies an action to the multi-model:

```dafny
function MultiStep(mm: MultiModel, a: MultiAction): Result<MultiModel, MultiErr>
  requires AllProjectsLoaded(mm, a)
```

### TryMultiStep

Runtime-safe version that checks preconditions:

```dafny
function TryMultiStep(mm: MultiModel, a: MultiAction): Result<MultiModel, MultiErr>
// Returns MissingProject error if AllProjectsLoaded fails
```

### ChangedProjects

Determines which projects were modified:

```dafny
function ChangedProjects(before: MultiModel, after: MultiModel): set<ProjectId>
```

## Effect State Machine

The effect state machine orchestrates client-server communication with verified state transitions.

### Events

```dafny
datatype Event =
  | UserAction(action: MultiAction)
  | DispatchAccepted(versions: map<ProjectId, nat>, models: map<ProjectId, Model>)
  | DispatchConflict(versions: map<ProjectId, nat>, models: map<ProjectId, Model>)
  | DispatchRejected(versions: map<ProjectId, nat>, models: map<ProjectId, Model>)
  | NetworkError
  | NetworkRestored
  | Tick
```

### Commands

```dafny
datatype Command =
  | NoOp
  | SendDispatch(touched: set<ProjectId>, versions: map<ProjectId, nat>, action: MultiAction)
```

### Step Function

```dafny
function Step(s: EffectState, e: Event): (EffectState, Command)
```

The step function is pure and verified. All I/O happens in the unverified JavaScript layer that interprets commands.

### Guarantees

The verified state machine ensures:
- Bounded retries (no infinite dispatch loops)
- Pending actions preserved through conflicts
- Correct optimistic updates
- Proper state merging on sync

## Client Integration

### MultiProjectEffectManager

JavaScript class that wraps the verified state machine:

```javascript
const manager = new MultiProjectEffectManager(['proj-1', 'proj-2']);
await manager.start();

// Single-project action
manager.dispatchSingle('proj-1', App.AddTask(listId, 'New task'));

// Cross-project move
manager.moveTaskToProject('proj-1', 'proj-2', taskId, destListId);

// React integration
const multiModel = useSyncExternalStore(manager.subscribe, manager.getSnapshot);
```

The manager:
- Calls verified `Step` for all state transitions
- Executes `SendDispatch` commands via HTTP
- Subscribes to Supabase Realtime for external updates
- Handles online/offline transitions

### Sync Flow

```
┌─────────────────────────────────────────────────────────────────-┐
│                    MultiProjectEffectManager                     │
├─────────────────────────────────────────────────────────────────-┤
│                                                                  │
│  1. INITIAL LOAD (start())                                       │
│     Supabase.from('projects') → {id, state, version}             │
│              ↓                                                   │
│     App.EffectInit(versions, models) → Dafny EffectState         │
│                                                                  │
│  2. USER ACTION (dispatchSingle)                                 │
│     App.EffectStep(state, UserAction(action))                    │
│              ↓ optimistic update                                 │
│     Returns Command.SendDispatch                                 │
│              ↓                                                   │
│     supabase.functions.invoke('dispatch', {action, baseVersion}) │
│              ↓                                                   │
│     Edge Function (VERIFIED Dafny on server)                     │
│              ↓                                                   │
│     Response: accepted/conflict/rejected                         │
│              ↓                                                   │
│     App.EffectStep(state, DispatchAccepted/Conflict/Rejected)    │
│                                                                  │
│  3. REALTIME (from other clients)                                │
│     supabase.channel('project:X').on('postgres_changes')         │
│              ↓                                                   │
│     App.EffectInit(newVersions, newModels) → merge               │
│                                                                  │
└────────────────────────────────────────────────────────────────-─┘
```

Key points:
- **All transitions** go through verified `App.EffectStep()`
- **Optimistic updates**: action applied locally immediately
- **Server validation**: Edge Function uses same Dafny to verify
- **Conflict handling**: Dafny rebases pending actions on fresh state
- **Realtime**: Other clients' changes merged via re-init

### app-extras.js API

```javascript
// Initialize state
App.EffectInit(versions, models)

// Step function
App.EffectStep(state, event)  // Returns [newState, command]

// Events
App.EffectEvent.UserAction(multiAction)
App.EffectEvent.DispatchAccepted(versions, models)
App.EffectEvent.DispatchConflict(versions, models)
App.EffectEvent.DispatchRejected(versions, models)

// MultiAction constructors
App.MultiAction.Single(projectId, action)
App.MultiAction.MoveTaskTo(src, dst, taskId, dstList, anchor)
App.MultiAction.CopyTaskTo(src, dst, taskId, dstList)

// Model access
App.MultiModel.getProject(multiModel, projectId)
App.MultiModel.getProjectIds(multiModel)
```

## Server Integration

### Edge Function: /multi-dispatch

```
POST /multi-dispatch
{
  "action": { "type": "MoveTaskTo", "srcProject": "...", "dstProject": "...", ... },
  "baseVersions": { "proj-1": 5, "proj-2": 12 }
}
```

Response:
```json
{
  "status": "accepted",
  "changed": ["proj-1", "proj-2"],
  "versions": { "proj-1": 6, "proj-2": 13 },
  "states": { "proj-1": {...}, "proj-2": {...} }
}
```

### Server Flow

1. Extract touched projects via `getTouchedProjects(action)`
2. Verify user membership on ALL touched projects
3. Load only touched projects from database
4. Call verified `TryMultiStep`
5. Compute which projects changed
6. Save atomically via `save_multi_update`
7. Return new versions and states

### Database: save_multi_update

Atomic update with optimistic locking:

```sql
CREATE OR REPLACE FUNCTION save_multi_update(updates JSONB)
RETURNS JSONB
-- Updates each project if version matches expected
-- Rolls back ALL changes on any version conflict
-- Returns { success: true, updated: [...] }
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  Client                                                             │
│                                                                     │
│  MultiProjectEffectManager                                          │
│    • EffectState via verified Step                                  │
│    • baseVersions: { proj-1: 5, proj-2: 12 }                        │
│    • present: MultiModel                                            │
│    • pending: [MultiAction, ...]                                    │
│                                                                     │
│  dispatch(action):                                                  │
│    1. Transition via verified Step → optimistic update              │
│    2. Execute command: SendDispatch to server                       │
│    3. On response: Transition again → merge or retry                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ POST /dispatch or /multi-dispatch
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Edge Function                                                      │
│                                                                     │
│  1. getTouchedProjects(action) → [proj-1, proj-2]                   │
│  2. Verify membership on all                                        │
│  3. Load only touched projects                                      │
│  4. TryMultiStep (VERIFIED)                                         │
│  5. save_multi_update (atomic)                                      │
│  6. Return changed projects + new versions                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PostgreSQL                                                         │
│                                                                     │
│  projects(id, state JSONB, version, applied_log)                    │
│                                                                     │
│  save_multi_update: atomic multi-row update with version checks     │
└─────────────────────────────────────────────────────────────────────┘
```

## Trust Boundaries

| Component | Trust Level | Notes |
|-----------|-------------|-------|
| `MultiStep`, `TryMultiStep` | Verified | Core domain logic |
| `TouchedProjects` | Verified | Project extraction |
| `ChangedProjects` | Verified | Change detection |
| Effect state machine | Verified | Dispatch/retry logic |
| JSON conversion | Generated | dafny2js output, tested |
| Edge function orchestration | Unverified | I/O glue code |
| `save_multi_update` | SQL | Tested, not formally verified |

## Verification Summary

| Module | Proofs |
|--------|--------|
| `MultiProject.dfy` | 6 |
| `TodoMultiProjectDomain.dfy` | 15 |
| `MultiProjectEffectStateMachine.dfy` | 18 |
| `TodoMultiProjectEffectStateMachine.dfy` | 4 |
| **Total** | **43** |

## File Organization

### Dafny (repository root)

| File | Description |
|------|-------------|
| `MultiProject.dfy` | Abstract multi-project interface |
| `TodoMultiProjectDomain.dfy` | Concrete Todo implementation |
| `MultiProjectEffectStateMachine.dfy` | Abstract effect machine |
| `TodoMultiProjectEffectStateMachine.dfy` | Concrete effect machine + AppCore |

### Client (collab-todo/src)

| File | Description |
|------|-------------|
| `dafny/app.js` | Generated entry point |
| `dafny/app-extras.js` | Convenience wrappers |
| `dafny/TodoMultiProjectEffect.cjs` | Compiled Dafny runtime |
| `hooks/MultiProjectEffectManager.js` | React-compatible state manager |

### Server (collab-todo/supabase)

| File | Description |
|------|-------------|
| `functions/dispatch/` | Single-project edge function |
| `functions/multi-dispatch/` | Multi-project edge function |
| `schema.sql` | Database schema and functions |

## Single-Project Compatibility

The multi-project architecture is fully backwards compatible with single-project operations:

1. Single-project actions are wrapped as `MultiAction.Single(projectId, action)`
2. The client automatically routes to `/dispatch` for efficiency when only one project is touched
3. Existing single-project hooks continue to work via the same underlying state machine

This unification simplifies the codebase while enabling new cross-project capabilities.
