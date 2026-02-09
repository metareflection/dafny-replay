# Testing Without Supabase

This project uses **Dafny-verified logic** for all state transitions. The tests run the verified kernel directly, without needing Supabase, HTTP, or any network infrastructure.

## Quick Start

```bash
npm test
```

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Production (with Supabase)                                │
│                                                            │
│  React UI                                                  │
│      │                                                     │
│      ▼                                                     │
│  useCollaborativeProjectOffline.js                         │
│      │                                                     │
│      ▼                                                     │
│  EffectManager.js  ───── HTTP ─────►  Supabase Edge Fn     │
│      │                                      │              │
│      ▼                                      ▼              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         KanbanEffect.cjs (Dafny → JavaScript)      │    │
│  │                                                    │    │
│  │  Client-side:           Server-side:               │    │
│  │  • EffectStep()         • Dispatch()               │    │
│  │  • EffectInit()         • Init()                   │    │
│  │  • ClientLocalDispatch  • ServerVersion()          │    │
│  │                                                    │    │
│  │  All verified in Dafny, compiled to JavaScript     │    │
│  └────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────┘
```

## How Tests Work

The tests **bypass the I/O layer** and call Dafny functions directly:

```
┌─────────────────────────────────────────────────────────────┐
│  Tests (no Supabase)                                        │
│                                                             │
│  integration.test.js                                        │
│      │                                                      │
│      ├──► TestServer (in-memory)                            │
│      │        │                                             │
│      │        ▼                                             │
│      │    ServerDispatch() ◄─── Direct call, no HTTP        │
│      │                                                      │
│      └──► EffectStep() ◄─────── Direct call                 │
│               │                                             │
│               ▼                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │         KanbanEffect.cjs (same verified code)      │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Key Insight

The Dafny code is **pure** - it has no I/O, no network calls, just state transitions. This means:

1. The same `KanbanEffect.cjs` runs in browser, server, and tests
2. Tests can simulate client-server interactions synchronously
3. We test the actual verified logic, not mocks

## File Structure

```
kanban-supabase/
├── src/
│   ├── dafny/
│   │   ├── KanbanEffect.cjs    # Dafny-compiled JavaScript
│   │   ├── app.js              # Vite-compatible wrapper (uses ?raw import)
│   │   └── app-extras.js       # Convenience helpers
│   └── hooks/
│       ├── EffectManager.js    # I/O layer (Supabase calls)
│       └── useCollaborativeProjectOffline.js
│
└── test/
    ├── kanban-core.js          # Node-compatible loader (uses readFileSync)
    └── integration.test.js     # Tests using Node's test runner
```

### Why Two Loaders?

| File | Environment | How it loads KanbanEffect.cjs |
|------|-------------|-------------------------------|
| `src/dafny/app.js` | Vite/Browser | `import code from './KanbanEffect.cjs?raw'` |
| `test/kanban-core.js` | Node.js | `readFileSync('./KanbanEffect.cjs')` |

Vite's `?raw` import doesn't work in Node.js, so we need a separate loader for tests.

## The TestServer Class

```javascript
class TestServer {
  constructor() {
    // Initialize server state using Dafny's Init()
    this.state = ServerInit();
  }

  sync() {
    // Get current version and model (what a real sync would return)
    return {
      version: ServerVersion(this.state),
      model: modelToJs(ServerModel(this.state))
    };
  }

  dispatch(baseVersion, action) {
    // Call the SAME Dafny Dispatch function the real server uses
    const { newServer, reply } = ServerDispatch(this.state, baseVersion, action);
    this.state = newServer;

    if (IsAccepted(reply)) {
      return { status: 'accepted', version: ..., model: ... };
    } else {
      return { status: 'rejected', reason: 'DomainInvalid' };
    }
  }
}
```

This is exactly what the Supabase Edge Function does, minus the HTTP layer.

## Test Example: Rejection Mid-Flush

This test verifies that if one action is rejected, remaining actions still execute:

```javascript
it('should continue executing remaining actions after one is rejected', () => {
  const server = new TestServer();
  let es = EffectInit(version, model);

  // Setup: Done column with WIP limit of 2, already full
  // ...

  // Go offline and queue 4 actions
  [es] = EffectStep(es, EffectEvent.ManualGoOffline());
  [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddCard', col: 'Todo', title: 'Task1' }));
  [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddCard', col: 'Done', title: 'WillFail' })); // WIP exceeded!
  [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddCard', col: 'Todo', title: 'Task2' }));
  [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddCard', col: 'Todo', title: 'Task3' }));

  // Come online and flush
  [es, cmd] = EffectStep(es, EffectEvent.ManualGoOnline());

  // Process all commands...
  // Result: Task1 accepted, WillFail rejected, Task2 accepted, Task3 accepted
});
```

## What's Being Tested

| Test Suite | What It Verifies |
|------------|------------------|
| Initialization | `EffectInit` creates correct initial state |
| UserAction events | Actions queue properly, dispatch starts when online |
| Dispatch responses | Accept/Conflict/Reject handled correctly |
| Network events | Offline/online transitions preserve pending actions |
| Pending preservation | Actions never lost through errors or conflicts |
| Rejection Mid-Flush | Remaining actions execute after one is rejected |

## Verified Properties (from Dafny)

The tests exercise JavaScript code, but the underlying logic is **proven** in Dafny:

- `PendingNeverLost`: Actions are never silently dropped
- `ConflictPreservesPendingExactly`: Conflicts don't lose actions
- `RetriesAreBounded`: No infinite retry loops
- `ModeConsistent`: Dispatching mode implies pending actions exist

See `EffectStateMachine.dfy` for the full proofs.

## Adding New Tests

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  EffectInit,
  EffectStep,
  EffectEvent,
  EffectState,
  EffectCommand,
  ServerInit,
  ServerDispatch,
  // ... other helpers
} from './kanban-core.js';

describe('My New Test', () => {
  it('should do something', () => {
    const server = new TestServer();
    const { version, model } = server.sync();
    let es = EffectInit(version, model);

    // Simulate events...
    [es, cmd] = EffectStep(es, EffectEvent.UserAction({...}));

    // Assert state...
    assert.strictEqual(EffectState.hasPending(es), true);
  });
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run with verbose output
node --test --test-reporter=spec test/integration.test.js

# Run a specific test
node --test --test-name-pattern="Rejection" test/integration.test.js
```
