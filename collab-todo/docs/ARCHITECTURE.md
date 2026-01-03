# Collab-Todo Architecture

This document explains how the collab-todo app's state management works, from Supabase to React components, with verified Dafny at the core.

For cross-project operations and Supabase integration details, see:
- [MULTIPROJECT.md](../../MULTIPROJECT.md) - Multi-project domain architecture
- [MULTIPROJECT_SUPABASE.md](../../MULTIPROJECT_SUPABASE.md) - Supabase integration and realtime

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Supabase                                                       │
│    • PostgreSQL (projects table)                                │
│    • Realtime (postgres_changes)                                │
│    • Edge Functions (/dispatch, /multi-dispatch)                │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│  MultiProjectEffectManager (hooks/MultiProjectEffectManager.js) │
│    • Wraps verified Dafny EffectStateMachine                    │
│    • Handles I/O (network, realtime subscriptions)              │
│    • Exposes subscribe/getSnapshot for React                    │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│  useAllProjects Hook (hooks/useAllProjects.js)                  │
│    • useSyncExternalStore → reactive binding                    │
│    • Derives priorityTasks, logbookTasks via verified functions │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  React Components                                               │
│    • Re-render when multiModel changes                          │
└─────────────────────────────────────────────────────────────────┘
```

## Dafny Module Structure

The verified Dafny code is organized in layers:

```
TodoDomain (in TodoMultiCollaboration.dfy)
    │
    └── Single-project domain model
          • Task, List, Tag datatypes
          • Actions (AddTask, MoveTask, etc.)
          • TryStep function
          • Single-project queries (GetPriorityTaskIds, etc.)

TodoMultiCollaboration (in TodoMultiCollaboration.dfy)
    │
    └── Single-project collaboration
          • Rebase (conflict resolution)
          • Candidates (fallback actions)

MultiProject (abstract, in MultiProject.dfy)
    │
    └── Cross-project operations interface
          • MultiModel (single definition, used everywhere)
          • MultiAction, TouchedProjects, AllProjectsLoaded

TodoMultiProjectDomain (in TodoMultiProjectDomain.dfy)
    │
    ├── Concrete cross-project operations
    │     • MoveTaskTo, CopyTaskTo
    │     • MultiStep, TryMultiStep
    │
    └── View Layer (multi-project queries)
          • TaggedTaskId
          • GetAllPriorityTasks, GetAllLogbookTasks
          • Smart list aggregation across projects

MultiProjectEffectStateMachine (abstract)
    │
    └── Effect orchestration interface
          • EffectState, Events, Commands
          • Step function

TodoMultiProjectEffectStateMachine + AppCore
    │
    └── Concrete effect machine + JS entry points
          • EffectInit, EffectStep
          • Event constructors
```

## Single MultiModel Definition

There is one `MultiModel` definition in `MultiProject.dfy:26`:

```dafny
datatype MultiModel = MultiModel(projects: map<ProjectId, Model>)
```

This type is:
- Inherited by `TodoMultiProjectDomain` via refinement
- Used by the effect state machine for state management
- Used by View Layer functions for multi-project queries

All code uses the same `MultiModel` type — no type confusion or "crossing fire" between different definitions.

### Compiler Optimization

Dafny optimizes single-constructor, single-field datatypes. At runtime, `MultiModel` IS the map, not a wrapper containing a map. This makes access efficient.

## Reactive Data Flow

### 1. Initial Load

```javascript
// useAllProjects.js
manager.start()
  → Supabase.from('projects').select(...)
  → App.EffectInit(versions, models)  // Creates verified EffectState
  → #notify() → useSyncExternalStore triggers
```

### 2. User Action

```javascript
// User clicks "Add Task"
manager.dispatchSingle(projectId, App.AddTask(listId, title))
  → #transition(App.EffectEvent.UserAction(multiAction))
  → App.EffectStep(state, event)  // VERIFIED: optimistic update
  → #notify() → React re-renders immediately
  → #executeCommand(SendDispatch)
  → POST /dispatch to Supabase Edge Function
  → Response: Accepted/Conflict/Rejected
  → #transition(App.EffectEvent.DispatchAccepted(...))
  → App.EffectStep(state, event)  // VERIFIED: merge server state
  → #notify() → React re-renders with confirmed state
```

### 3. Realtime Update (from another client)

```javascript
// Supabase postgres_changes event arrives
#subscribeToProject callback fires
  → #transition(App.EffectEvent.RealtimeUpdate(projectId, version, model))
  → App.EffectStep(state, event)  // VERIFIED: merge + reapply pending
  → #notify() → React re-renders
```

### 4. React Subscription

```javascript
// useAllProjects.js
const multiModel = useSyncExternalStore(
  manager.subscribe,    // Called when component mounts
  manager.getSnapshot,  // Returns current multiModel
  manager.getSnapshot   // Server snapshot (same for SSR)
)

// When #notify() fires, useSyncExternalStore:
// 1. Calls getSnapshot()
// 2. Compares with previous value
// 3. Re-renders if changed
```

## Verified Functions Used in UI

The UI uses verified Dafny functions for queries:

```javascript
// Multi-project smart lists (from TodoMultiProjectDomain)
App.MultiModel.getAllPriorityTasks(multiModel)  // → TaggedTaskId[]
App.MultiModel.getAllLogbookTasks(multiModel)   // → TaggedTaskId[]

// Single-project queries (from TodoDomain)
App.GetTask(model, taskId)           // → Task or null
App.FindListForTask(model, taskId)   // → ListId or null
App.GetListName(model, listId)       // → string
App.GetLists(model)                  // → ListId[]
App.GetTasksInList(model, listId)    // → TaskId[]
```

## Key Files

| File | Purpose |
|------|---------|
| `src/dafny/TodoMultiProjectEffect.cjs` | Compiled Dafny runtime |
| `src/dafny/app.js` | Generated API wrapper (dafny2js) |
| `src/dafny/app-extras.js` | Convenience wrappers |
| `src/hooks/MultiProjectEffectManager.js` | Effect orchestration + I/O |
| `src/hooks/useAllProjects.js` | React hook for multi-project state |

## Edge Function Dispatch

The client routes actions to two different edge functions:

```javascript
if (isSingleProject) {
  // → 'dispatch' endpoint (full OT: Rebase + Candidates)
} else {
  // → 'multi-dispatch' endpoint (simpler: TryMultiStep)
}
```

**Both endpoints preserve invariants** — neither will accept an invariant-violating state. The difference is conflict handling: `dispatch` tries harder to salvage conflicting actions via Rebase and Candidates, while `multi-dispatch` simply rejects (the client already rebased).

See [MULTIPROJECT.md](../../MULTIPROJECT.md#invariant-preservation) for details on the verified invariant guarantees.

## Trust Boundaries

| Layer | Verified? | Notes |
|-------|-----------|-------|
| `EffectStep`, `MultiStep` | Yes | Core state transitions |
| View Layer queries | Yes | `GetAllPriorityTasks`, etc. (in `TodoMultiProjectDomain`) |
| `MultiProjectEffectManager` | No | I/O glue code |
| `useAllProjects` | No | React bindings |
| Edge Functions | Partially | Uses verified Dafny for validation |

## Summary

1. **All state transitions** go through verified `App.EffectStep()`
2. **Invariants always preserved** — both `dispatch` and `multi-dispatch` use verified Dafny
3. **Multi-project queries** use verified functions from `TodoMultiProjectDomain`
4. **Single-project queries** use verified functions from `TodoDomain`
5. **Single MultiModel type** — defined once in `MultiProject.dfy`, used everywhere
6. **Reactive updates** flow via `useSyncExternalStore`
7. **Clean architecture** — verified core, unverified I/O shell
