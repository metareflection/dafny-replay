# HOWTO: Build a Dafny-Verified Collaborative App with Supabase

This guide walks through creating a multi-user collaborative React app with Dafny-verified domain logic and Supabase for backend services. We'll use the sophisticated kernels: **MultiCollaboration** (for reconciliation) and **EffectStateMachine** (for verified offline support).

## Prerequisites

- [Dafny](https://dafny.org/) installed and available in PATH
- Node.js and npm
- The `dafny2js` tool (included in this repo)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase`)
- A Supabase project (create one at [supabase.com](https://supabase.com))

## Architecture Overview

Unlike the basic HOWTO.md (which uses `Kernel` for undo/redo), collaborative apps use:

```
┌───────────────────────────────────────────────────────────────┐
│  KanbanMultiCollaboration.dfy                                 │
│  - MultiCollaboration: Server-side reconciliation             │
│    • Rebasing through concurrent edits                        │
│    • Candidate fallback (minimal rejection)                   │
│    • ClientState with pending action queue                    │
│                                                               │
│  KanbanEffectStateMachine.dfy                                 │
│  - EffectStateMachine: Client-side effect orchestration       │
│    • Verified dispatch/retry state machine                    │
│    • Network online/offline transitions                       │
│    • Bounded retries (no infinite loops)                      │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  Supabase                                                     │
│  - Auth: Email/password, OAuth                                │
│  - Database: PostgreSQL with RLS                              │
│  - Edge Functions: Run verified Dafny dispatch server-side    │
│  - Realtime: Instant sync across clients                      │
└───────────────────────────────────────────────────────────────┘
```

**Key difference from HOWTO.md**: No undo/redo (use reconciliation instead), but gain multi-user collaboration, offline support, and verified effect handling.

## Step 1: The Framework Files

The collaborative pattern uses these framework files (already in the repository):

- `MultiCollaboration.dfy` - Server reconciliation and client state management
- `EffectStateMachine.dfy` - Verified effect orchestration for dispatch/retry/offline

## Step 2: Create the Dafny Domain

Create `MyDomain.dfy` that refines `Domain` from MultiCollaboration:

```dafny
include "MultiCollaboration.dfy"

module MyDomain refines Domain {
  // Your state type
  type Model = ...

  // Your actions
  datatype Action = ...

  // Your error types
  datatype Err = ...

  // Distinguished rejection error
  function RejectErr(): Err { ... }

  // Invariant that must always hold
  ghost predicate Inv(m: Model) { ... }

  // Initial state
  function Init(): Model { ... }

  // State transition (returns Result<Model, Err>)
  function TryStep(m: Model, a: Action): Result<Model, Err> { ... }

  // Intent-aware rebasing: transform local action given remote action
  function Rebase(remote: Action, local: Action): Action { ... }

  // Candidate actions to try if original fails
  function Candidates(m: Model, a: Action): seq<Action> { ... }

  // What makes a candidate valid for an original action
  ghost predicate Explains(orig: Action, cand: Action) { ... }

  // Required lemmas
  lemma InitSatisfiesInv() ensures Inv(Init()) { }
  lemma StepPreservesInv(m: Model, a: Action, m2: Model) { ... }
  lemma CandidatesComplete(m: Model, orig: Action, aGood: Action, m2: Model) { ... }
}

module MyMultiCollaboration refines MultiCollaboration {
  import D = MyDomain
}
```

### Rebase and Candidates Explained

**Rebase**: When your local action conflicts with a remote action, `Rebase` transforms your intent:
- `Rebase(remote, local)` returns a modified `local` that accounts for `remote`
- Example: If remote moved your anchor card, degrade placement to `AtEnd`

**Candidates**: When an action fails, `Candidates` provides fallback actions:
- Returns a list of alternatives that preserve the user's intent
- Server tries each until one succeeds (or rejects if all fail)
- Example: For `MoveCard`, try original placement, then `AtEnd`, then `Before(first)`

## Step 3: Create the Effect State Machine

Create `MyEffectStateMachine.dfy`:

```dafny
include "EffectStateMachine.dfy"
include "MyMultiCollaboration.dfy"

module MyEffectStateMachine refines EffectStateMachine {
  import MC = MyMultiCollaboration
}

module MyEffectAppCore refines MyAppCore {
  import E = MyEffectStateMachine

  type EffectState = E.EffectState
  type EffectEvent = E.Event
  type EffectCommand = E.Command

  // Initialize effect state
  function EffectInit(version: nat, model: K.Model): EffectState {
    E.Init(version, model)
  }

  // The verified Step function (core of effect state machine)
  function EffectStep(es: EffectState, event: EffectEvent): (EffectState, EffectCommand) {
    E.Step(es, event)
  }

  // State accessors
  function EffectIsOnline(es: EffectState): bool { E.IsOnline(es) }
  function EffectIsIdle(es: EffectState): bool { E.IsIdle(es) }
  function EffectHasPending(es: EffectState): bool { E.HasPending(es) }
  function EffectPendingCount(es: EffectState): nat { E.PendingCount(es) }

  // Event constructors
  function EffectUserAction(action: K.Action): EffectEvent { E.Event.UserAction(action) }
  function EffectDispatchAccepted(version: nat, model: K.Model): EffectEvent { ... }
  function EffectDispatchRejected(version: nat, model: K.Model): EffectEvent { ... }
  function EffectNetworkError(): EffectEvent { E.Event.NetworkError }
  function EffectManualGoOffline(): EffectEvent { E.Event.ManualGoOffline }
  function EffectManualGoOnline(): EffectEvent { E.Event.ManualGoOnline }
}
```

## Step 4: Verify the Dafny Code

```bash
dafny verify MyDomain.dfy
dafny verify MyEffectStateMachine.dfy
```

This verifies:
- Invariant preservation across all state transitions
- Reconciliation correctness (rebasing, candidates)
- Effect state machine properties (bounded retries, correct transitions)

## Step 5: Create the React App

```bash
npm create vite@latest my-collab-app -- --template react
cd my-collab-app
npm install
npm install bignumber.js @supabase/supabase-js
cd ..
```

## Step 6: Configure Vite

Edit `my-collab-app/vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['bignumber.js'],
  },
})
```

## Step 7: Set Up Supabase

### 7.1 Create Database Schema

In Supabase SQL Editor, run:

```sql
-- Projects table: stores verified state
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  state JSONB NOT NULL DEFAULT '{}',
  version INT NOT NULL DEFAULT 0,
  applied_log JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Membership table
CREATE TABLE project_members (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_project_members_user ON project_members(user_id);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE
AS $$ SELECT EXISTS (
  SELECT 1 FROM project_members
  WHERE project_id = p_project_id AND user_id = auth.uid()
) $$;

-- RLS policies
CREATE POLICY "members can read projects"
  ON projects FOR SELECT USING (is_project_member(id));

CREATE POLICY "members can view membership"
  ON project_members FOR SELECT USING (is_project_member(project_id));

-- Project creation function
CREATE OR REPLACE FUNCTION create_project(project_name TEXT, initial_state JSONB)
RETURNS UUID AS $$
DECLARE new_id UUID;
BEGIN
  INSERT INTO projects (name, owner_id, state)
  VALUES (project_name, auth.uid(), initial_state)
  RETURNING id INTO new_id;

  INSERT INTO project_members (project_id, user_id, role)
  VALUES (new_id, auth.uid(), 'owner');

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 7.2 Enable Realtime

In Supabase Dashboard, go to Database > Replication and enable realtime for the `projects` table.

## Step 8: Compile Dafny and Generate app.js

```bash
# Create directories
mkdir -p generated my-collab-app/src/dafny

# Compile Dafny to JavaScript
dafny translate js --no-verify -o generated/MyEffect --include-runtime MyEffectStateMachine.dfy

# Copy generated code
cp generated/MyEffect.js my-collab-app/src/dafny/MyEffect.cjs

# Generate the app.js integration layer
dotnet run --project dafny2js -- \
  --file MyEffectStateMachine.dfy \
  --app-core MyEffectAppCore \
  --cjs-name MyEffect.cjs \
  --output my-collab-app/src/dafny/app.js
```

## Step 9: Create the Edge Function Bundle

Create `my-collab-app/supabase/functions/dispatch/build-bundle.js`:

```js
// Generates dafny-bundle.ts from compiled Dafny code for Deno
const fs = require('fs');
const path = require('path');

const cjsPath = path.join(__dirname, '../../../src/dafny/MyEffect.cjs');
const outPath = path.join(__dirname, 'dafny-bundle.ts');

// Read and transform for Deno
let code = fs.readFileSync(cjsPath, 'utf8');

// Add Deno-compatible wrapper and export dispatch function
const bundle = `
// Auto-generated Dafny bundle for Deno Edge Function
${code}

// Export dispatch function that uses verified Dafny code
export function dispatch(state, appliedLog, baseVersion, action) {
  // Marshal JSON to Dafny types
  // Run verified Dispatch
  // Marshal result back to JSON
  // ... (domain-specific implementation)
}
`;

fs.writeFileSync(outPath, bundle);
console.log('Generated dafny-bundle.ts');
```

Create `my-collab-app/supabase/functions/dispatch/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { dispatch } from './dafny-bundle.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { projectId, baseVersion, action } = await req.json()

    // Verify membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Not a member' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Load state with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('state, version, applied_log')
      .eq('id', projectId)
      .single()

    if (!project) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Run VERIFIED Dafny dispatch
    const result = dispatch(project.state, project.applied_log || [], baseVersion, action)

    if (result.status === 'rejected') {
      return new Response(JSON.stringify(result), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Persist with optimistic lock
    const newVersion = project.version + 1
    const { error: updateError } = await supabaseAdmin
      .from('projects')
      .update({
        state: result.state,
        version: newVersion,
        applied_log: [...(project.applied_log || []), result.appliedAction]
      })
      .eq('id', projectId)
      .eq('version', project.version)

    if (updateError) {
      return new Response(JSON.stringify({ status: 'conflict' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      status: 'accepted',
      version: newVersion,
      state: result.state
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    console.error('Dispatch error:', e)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

## Step 10: Create the EffectManager

Create `my-collab-app/src/hooks/EffectManager.js`:

```js
import App from '../dafny/app.js'

export class EffectManager {
  constructor(projectId, supabase, onStateChange) {
    this.projectId = projectId
    this.supabase = supabase
    this.onStateChange = onStateChange
    this.effectState = null
    this.subscription = null
  }

  async init() {
    // Load initial state from server
    const { data } = await this.supabase
      .from('projects')
      .select('state, version')
      .eq('id', this.projectId)
      .single()

    // Initialize effect state with verified function
    this.effectState = App.EffectInit(data.version, App.modelFromJson(data.state))

    // Subscribe to realtime updates
    this.subscription = this.supabase
      .channel(`project:${this.projectId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'projects',
        filter: `id=eq.${this.projectId}`
      }, (payload) => this.handleRealtimeUpdate(payload.new))
      .subscribe()

    this.notify()
  }

  // Dispatch user action through verified state machine
  dispatch(action) {
    const event = App.EffectUserAction(action)
    const [newState, command] = App.EffectStep(this.effectState, event)
    this.effectState = newState
    this.executeCommand(command)
    this.notify()
  }

  // Execute command produced by verified Step function
  async executeCommand(command) {
    if (App.EffectIsNoOp(command)) return

    if (App.EffectIsSendDispatch(command)) {
      try {
        const response = await this.supabase.functions.invoke('dispatch', {
          body: {
            projectId: this.projectId,
            baseVersion: App.EffectGetBaseVersion(command),
            action: App.actionToJson(App.EffectGetAction(command))
          }
        })

        const result = response.data
        let event
        if (result.status === 'accepted') {
          event = App.EffectDispatchAccepted(result.version, App.modelFromJson(result.state))
        } else if (result.status === 'rejected') {
          event = App.EffectDispatchRejected(result.version, App.modelFromJson(result.state))
        } else {
          event = App.EffectDispatchConflict(result.version, App.modelFromJson(result.state))
        }

        const [newState, nextCommand] = App.EffectStep(this.effectState, event)
        this.effectState = newState
        this.executeCommand(nextCommand)
      } catch (e) {
        // Network error - verified state machine handles retry
        const [newState, nextCommand] = App.EffectStep(this.effectState, App.EffectNetworkError())
        this.effectState = newState
        this.executeCommand(nextCommand)
      }
      this.notify()
    }
  }

  handleRealtimeUpdate(newRow) {
    // Feed update through verified state machine
    const event = App.EffectDispatchAccepted(newRow.version, App.modelFromJson(newRow.state))
    const [newState, command] = App.EffectStep(this.effectState, event)
    this.effectState = newState
    this.executeCommand(command)
    this.notify()
  }

  toggleOffline() {
    const event = App.EffectIsOnline(this.effectState)
      ? App.EffectManualGoOffline()
      : App.EffectManualGoOnline()
    const [newState, command] = App.EffectStep(this.effectState, event)
    this.effectState = newState
    this.executeCommand(command)
    this.notify()
  }

  notify() {
    this.onStateChange(this.getSnapshot())
  }

  getSnapshot() {
    if (!this.effectState) return null
    return {
      model: App.ClientModel(App.EffectGetClient(this.effectState)),
      version: App.EffectGetServerVersion(this.effectState),
      isOnline: App.EffectIsOnline(this.effectState),
      isIdle: App.EffectIsIdle(this.effectState),
      pendingCount: App.EffectPendingCount(this.effectState)
    }
  }

  destroy() {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }
}
```

## Step 11: Create the React Hook

Create `my-collab-app/src/hooks/useCollaborativeProject.js`:

```js
import { useEffect, useState, useSyncExternalStore, useCallback } from 'react'
import { EffectManager } from './EffectManager.js'
import { supabase } from '../supabase.js'

export function useCollaborativeProject(projectId) {
  const [manager, setManager] = useState(null)

  useEffect(() => {
    if (!projectId) return

    const mgr = new EffectManager(projectId, supabase, () => {
      // Trigger re-render
      setManager(m => m)
    })

    mgr.init().then(() => setManager(mgr))

    return () => mgr.destroy()
  }, [projectId])

  const snapshot = manager?.getSnapshot()

  const dispatch = useCallback((action) => {
    manager?.dispatch(action)
  }, [manager])

  const toggleOffline = useCallback(() => {
    manager?.toggleOffline()
  }, [manager])

  return {
    model: snapshot?.model ?? null,
    version: snapshot?.version ?? 0,
    isOnline: snapshot?.isOnline ?? true,
    isIdle: snapshot?.isIdle ?? true,
    pendingCount: snapshot?.pendingCount ?? 0,
    dispatch,
    toggleOffline,
    status: !snapshot ? 'loading'
      : !snapshot.isOnline ? 'offline'
      : snapshot.pendingCount > 0 ? 'pending'
      : 'synced'
  }
}
```

## Step 12: Create the Supabase Client

Create `my-collab-app/src/supabase.js`:

```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

Create `my-collab-app/.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Step 13: Create the React Component

Replace `my-collab-app/src/App.jsx`:

```jsx
import { useCollaborativeProject } from './hooks/useCollaborativeProject.js'
import App from './dafny/app.js'
import './App.css'

function MyCollabApp({ projectId }) {
  const {
    model,
    version,
    status,
    isOnline,
    pendingCount,
    dispatch,
    toggleOffline
  } = useCollaborativeProject(projectId)

  if (!model) return <div>Loading...</div>

  return (
    <>
      <h1>My Collaborative App</h1>
      <p className="subtitle">Dafny-verified with Supabase</p>

      <div className="status-bar">
        <span className={`status ${status}`}>{status}</span>
        {pendingCount > 0 && <span>{pendingCount} pending</span>}
        <button onClick={toggleOffline}>
          {isOnline ? 'Go Offline' : 'Go Online'}
        </button>
      </div>

      <div className="card">
        {/* Render your model using App.* accessors */}
        {/* Dispatch actions using dispatch(App.YourAction(...)) */}
      </div>

      <p className="info">
        v{version} - Multiple users can edit simultaneously.
        <br />
        Domain invariants are verified at compile time.
      </p>
    </>
  )
}

export default MyCollabApp
```

## Step 14: Deploy and Run

### Deploy Edge Function

```bash
cd my-collab-app
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy dispatch
```

### Run the App

```bash
npm run dev
```

## Summary: Kernel Comparison

| Aspect | HOWTO.md (Kernel) | HOWTO_SUPABASE.md (MultiCollaboration) |
|--------|-------------------|----------------------------------------|
| **State wrapper** | `History` (past/present/future) | `ClientState` (baseVersion/model/pending) |
| **Undo/Redo** | Built-in | Not available |
| **Multi-user** | No | Yes |
| **Reconciliation** | No | Rebase + Candidates |
| **Offline support** | No | Verified pending queue |
| **Server-side** | None | Edge Function with verified dispatch |
| **Verified** | Domain invariants | Domain + reconciliation + effect machine |

## What's Verified

| Component | Verified in Dafny |
|-----------|-------------------|
| Domain invariants (e.g., WIP limits) | Yes |
| `TryStep` preserves invariants | Yes |
| `Rebase` intent transformation | Yes |
| `Candidates` completeness (minimal rejection) | Yes |
| `EffectStep` state machine (dispatch/retry/offline) | Yes |
| `ClientLocalDispatch` (optimistic update) | Yes |
| `ClientAcceptReply` (preserve pending) | Yes |
| `HandleRealtimeUpdate` (re-apply pending) | Yes |
| JSON marshalling | No (JS) |
| Network I/O | No (JS) |
| React rendering | No (JS) |

## Reference Implementation

See `kanban-supabase/` for a complete working example with:
- Full Kanban domain (columns, cards, WIP limits, moves)
- Verified effect state machine
- Supabase Edge Function with bundled Dafny code
- React UI with offline toggle
- Realtime collaboration

## Next Steps

1. **Add authentication UI**: Use Supabase Auth components
2. **Implement project list**: Query user's projects via membership
3. **Add member management**: Owner can invite/remove members
4. **Customize domain**: Replace Kanban with your own domain logic
5. **Add audit log UI**: Display `auditLog` for history/debugging
