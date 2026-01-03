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
    ├── Single-project domain model
    │     • Task, List, Tag datatypes
    │     • Actions (AddTask, MoveTask, etc.)
    │     • TryStep function
    │
    └── View Layer (also in TodoDomain)
          • MultiModel, TaggedTaskId, ViewState
          • GetAllPriorityTasks, GetAllLogbookTasks
          • Smart list queries

TodoMultiCollaboration (in TodoMultiCollaboration.dfy)
    │
    └── Single-project collaboration
          • Rebase (conflict resolution)
          • Candidates (fallback actions)

MultiProject (abstract, in MultiProject.dfy)
    │
    └── Cross-project operations interface
          • MultiModel, MultiAction
          • TouchedProjects, AllProjectsLoaded

TodoMultiProjectDomain (in TodoMultiProjectDomain.dfy)
    │
    └── Concrete cross-project operations
          • MoveTaskTo, CopyTaskTo
          • MultiStep, TryMultiStep

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

## The Two MultiModel Definitions

There are two `MultiModel` datatype definitions in the Dafny source:

| Location | Module | Purpose |
|----------|--------|---------|
| `TodoMultiCollaboration.dfy:1163` | `TodoDomain` | View Layer queries |
| `MultiProject.dfy:26` | `MultiProject` | Domain operations |

Both are defined identically:
```dafny
datatype MultiModel = MultiModel(projects: map<ProjectId, Model>)
```

### Why This Works

1. **Compiler optimization**: Dafny optimizes single-constructor, single-field datatypes. At runtime, `MultiModel` IS the map, not a wrapper containing a map.

2. **Structural identity**: Both definitions compile to `_dafny.Map<ProjectId, Model>`. The compiled JavaScript treats them interchangeably.

3. **Verified separately, unified at runtime**:
   - The effect state machine produces data using `TodoMultiProjectDomain.MultiModel`
   - View layer functions query it using `TodoDomain.MultiModel` functions
   - Works because both are raw maps at runtime

This is intentional compiler behavior, not an accident. The wrapper types exist for Dafny's type system during verification but are erased at runtime.

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
// Smart lists (hooks/useAllProjects.js)
App.MultiModel.getAllPriorityTasks(multiModel)  // → TaggedTaskId[]
App.MultiModel.getAllLogbookTasks(multiModel)   // → TaggedTaskId[]

// Task lookups
App.GetTask(model, taskId)           // → Task or null
App.FindListForTask(model, taskId)   // → ListId or null
App.GetListName(model, listId)       // → string

// List queries
App.GetLists(model)                  // → ListId[]
App.GetTasksInList(model, listId)    // → TaskId[]
```

These functions are compiled from `TodoDomain` in `TodoMultiCollaboration.dfy`.

## Key Files

| File | Purpose |
|------|---------|
| `src/dafny/TodoMultiProjectEffect.cjs` | Compiled Dafny runtime |
| `src/dafny/app.js` | Generated API wrapper (dafny2js) |
| `src/dafny/app-extras.js` | Convenience wrappers |
| `src/hooks/MultiProjectEffectManager.js` | Effect orchestration + I/O |
| `src/hooks/useAllProjects.js` | React hook for multi-project state |

## Trust Boundaries

| Layer | Verified? | Notes |
|-------|-----------|-------|
| `EffectStep`, `MultiStep` | Yes | Core state transitions |
| View Layer queries | Yes | `GetAllPriorityTasks`, etc. |
| `MultiProjectEffectManager` | No | I/O glue code |
| `useAllProjects` | No | React bindings |
| Edge Functions | Partially | Uses verified Dafny for validation |

## Summary

1. **All state transitions** go through verified `App.EffectStep()`
2. **View queries** use verified functions from `TodoDomain`
3. **Reactive updates** flow via `useSyncExternalStore`
4. **Two MultiModel definitions** work because they compile to identical runtime representations
5. **The architecture is sound** - verified core, unverified I/O shell
