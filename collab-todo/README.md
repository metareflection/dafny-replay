# Collab Todo - Verified Collaborative Task Manager

A React demo app powered by Dafny-verified collaborative task management state logic with real-time sync.

[Live App](https://stuff.reflective.ink)

[Blog Post Explainer](https://midspiral.com/blog/verifying-state-reconciliation-in-collaborative-web-apps/)

## Features

- **Multi-project support**: Personal and collaborative projects with member management
- **Real-time collaboration**: Live sync via Supabase Realtime with conflict resolution
- **Smart lists**: Priority (starred), Logbook (completed), All Tasks views
- **Task properties**: Due dates, assignees, tags, notes, completion status
- **Cross-project operations**: Move/copy tasks and lists between projects
- **Verified constraints**: All state transitions are mathematically proven correct against a spec

## Architecture

```
TodoMultiCollaboration.dfy          # Single-project domain
    |
TodoMultiProjectDomain.dfy          # Cross-project operations
    |
MultiProjectEffectStateMachine.dfy  # Client-side orchestration
    |
dafny translate js                  # Compile to JavaScript
    |
src/dafny/*.cjs                     # Compiled code (don't edit)
    |
src/dafny/app-extras.ts             # Integration wrappers
    |
MultiProjectEffectManager.js        # State machine orchestration
    |
Supabase                            # PostgreSQL, Auth, Realtime, Edge Functions
    |
App.jsx                             # React UI

```

### Verified Kernels (Dafny)

- [TodoMultiCollaboration.dfy](../TodoMultiCollaboration.dfy)
- [TodoMultiProjectDomain.dfy](../TodoMultiProjectDomain.dfy)
- [MultiProjectEffectStateMachine.dfy](../MultiProjectEffectStateMachine.dfy)


