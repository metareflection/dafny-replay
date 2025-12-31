# Dafny-Verified Collaborative Apps with Supabase

This document describes a pattern for building multi-user collaborative applications where:

- **Dafny** verifies domain invariants and reconciliation logic
- **Supabase** handles authentication, authorization (RLS), persistence, and realtime
- **Edge Functions** run the actual compiled Dafny code server-side for proper reconciliation

This approach simplifies the current Express-based architecture while preserving the MultiCollaboration guarantees (rebasing, candidate fallback, minimal rejection).

**Reference Implementation**: See `kanban-supabase/` for a complete working example.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  Supabase                                                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Auth (JWT)  │  │  Database    │  │  Edge Function        │  │
│  │              │  │  + RLS       │  │  /dispatch            │  │
│  │  - Sign up   │  │              │  │                       │  │
│  │  - Sign in   │  │  - projects  │  │  - Loads state        │  │
│  │  - OAuth     │  │  - members   │  │  - Runs Dafny logic   │  │
│  └──────────────┘  │              │  │  - Rebases + tries    │  │
│                    │  RLS allows  │  │    candidates         │  │
│                    │  member read │  │  - Persists result    │  │
│                    └──────────────┘  └───────────────────────┘  │
│                           │                    │                 │
│                           │ Realtime           │                 │
│                           ▼                    │                 │
└──────────────────────────────────────────────────────────────────┘
                            │                    │
              Direct read   │                    │  Dispatch via
              + subscribe   │                    │  Edge Function
                            ▼                    ▼
┌──────────────────────────────────────────────────────────────────┐
│  React Client                                                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  useCollaborativeProject(projectId, domain)                │ │
│  │                                                            │ │
│  │  - model: current state (optimistic)                       │ │
│  │  - dispatch(action): send to Edge Function                 │ │
│  │  - sync(): refresh from database                           │ │
│  │  - pending: count of unconfirmed actions                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Dafny Domain (compiled to JS)                             │ │
│  │                                                            │ │
│  │  - TryStep(model, action) → Result<Model, Err>             │ │
│  │  - Rebase(remote, local) → Action                          │ │
│  │  - Candidates(model, action) → seq<Action>                 │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Why This Approach

| Concern | Express Server | Supabase + Edge Functions |
|---------|---------------|---------------------------|
| Authentication | Manual JWT verification | Built-in, integrated |
| Authorization | Dafny MultiUser wrapper | RLS policies (simpler) |
| Persistence | Custom code | Automatic |
| Realtime | Manual WebSocket | Built-in subscriptions |
| Deployment | Separate server | Serverless, managed |
| Reconciliation | Express handler | Edge Function |

**Key insight**: The Dafny MultiUser wrapper proves authorization, but that proof depends on JavaScript correctly injecting the actor. With Supabase RLS, authorization is enforced at the database level—even buggy client code can't bypass it.

Dafny focuses on what it's best at: **domain invariants and reconciliation logic**.

---

## Database Schema

### Tables

```sql
-- Projects table: stores the verified state
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id),

  -- Dafny state (domain-specific)
  state JSONB NOT NULL DEFAULT '{}',

  -- For reconciliation (MultiCollaboration pattern)
  version INT NOT NULL DEFAULT 0,
  applied_log JSONB NOT NULL DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Membership table: who can access which project
CREATE TABLE project_members (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',  -- 'owner' | 'member'
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

-- Index for fast membership lookups
CREATE INDEX idx_project_members_user ON project_members(user_id);
```

### Row-Level Security Policies

Use `SECURITY DEFINER` functions to avoid infinite recursion when policies reference each other:

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Helper functions (SECURITY DEFINER bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION is_project_owner(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id AND owner_id = auth.uid()
  )
$$;

-- Projects: members can read (writes go through Edge Function)
CREATE POLICY "members can read projects"
  ON projects FOR SELECT
  USING (is_project_member(id));

-- Project members: members can see other members
CREATE POLICY "members can view membership"
  ON project_members FOR SELECT
  USING (is_project_member(project_id));

-- Only owner can manage membership
CREATE POLICY "owner can add members"
  ON project_members FOR INSERT
  WITH CHECK (is_project_owner(project_id));

CREATE POLICY "owner can remove members"
  ON project_members FOR DELETE
  USING (is_project_owner(project_id) AND user_id != auth.uid());
```

### Helper Functions

```sql
-- Create a new project (owner auto-added as member)
CREATE OR REPLACE FUNCTION create_project(project_name TEXT)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO projects (name, owner_id, state)
  VALUES (project_name, auth.uid(), '{"cols":[],"lanes":{},"wip":{},"cards":{},"nextId":0}')
  RETURNING id INTO new_id;

  INSERT INTO project_members (project_id, user_id, role)
  VALUES (new_id, auth.uid(), 'owner');

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Edge Function: Dispatch

The Edge Function runs the **actual compiled Dafny code** server-side, preserving the MultiCollaboration guarantees.

### Bundling the Dafny Code

The compiled Dafny code is bundled for Deno using a build script. When you run `./compile.sh`, it:

1. Compiles `KanbanMultiCollaboration.dfy` to JavaScript
2. Generates `dafny-bundle.ts` which wraps the compiled code for Deno

The bundle provides the actual Dafny functions:
- `KanbanDomain.__default.TryStep` - Domain transition logic
- `KanbanDomain.__default.Rebase` - Intent-aware rebasing
- `KanbanDomain.__default.Candidates` - Candidate fallback

### `supabase/functions/dispatch/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Import bundled Dafny domain (auto-generated by build-bundle.js)
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

    // Create Supabase client with user's JWT (for RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { projectId, baseVersion, action } = await req.json()

    // Check membership
    const { data: membership } = await supabaseClient
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

    // Use service role for writes
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
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Run Dafny dispatch (uses actual compiled Dafny code!)
    const result = dispatch(
      project.state,
      project.applied_log || [],
      baseVersion,
      action
    )

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

The `dispatch` function from `dafny-bundle.ts` uses the **actual compiled Dafny code**:
- `KanbanDomain.__default.TryStep` for domain transitions
- `KanbanDomain.__default.Rebase` for rebasing
- `KanbanDomain.__default.Candidates` for candidate generation

---

## React Client

### `useCollaborativeProject.ts`

```typescript
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from './supabase'

interface Domain<Model, Action> {
  Init: () => Model
  TryStep: (m: Model, a: Action) => { is_Ok: boolean; dtor_value?: Model }
  modelFromJson: (json: any) => Model
  modelToJson: (m: Model) => any
  actionToJson: (a: Action) => any
}

interface UseCollaborativeProjectResult<Model, Action> {
  model: Model | null
  version: number
  dispatch: (action: Action) => Promise<void>
  sync: () => Promise<void>
  pending: number
  error: string | null
  status: 'syncing' | 'synced' | 'pending' | 'error'
}

export function useCollaborativeProject<Model, Action>(
  projectId: string | null,
  domain: Domain<Model, Action>
): UseCollaborativeProjectResult<Model, Action> {
  const [model, setModel] = useState<Model | null>(null)
  const [version, setVersion] = useState(0)
  const [pending, setPending] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'syncing' | 'synced' | 'pending' | 'error'>('syncing')

  const baseVersionRef = useRef(0)

  // Sync: load state from Supabase
  const sync = useCallback(async () => {
    if (!projectId) return

    setStatus('syncing')
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('state, version')
        .eq('id', projectId)
        .single()

      if (error) throw error

      setModel(domain.modelFromJson(data.state))
      setVersion(data.version)
      baseVersionRef.current = data.version
      setStatus('synced')
      setError(null)
    } catch (e: any) {
      setError(e.message)
      setStatus('error')
    }
  }, [projectId, domain])

  // Dispatch: optimistic update + Edge Function
  const dispatch = useCallback(async (action: Action) => {
    if (!projectId || !model) return

    // Optimistic local update
    const result = domain.TryStep(model, action)
    if (result.is_Ok && result.dtor_value) {
      setModel(result.dtor_value)
    }

    setPending(p => p + 1)
    setStatus('pending')

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Call Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dispatch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            projectId,
            baseVersion: baseVersionRef.current,
            action: domain.actionToJson(action)
          })
        }
      )

      const data = await response.json()

      if (data.status === 'accepted') {
        setModel(domain.modelFromJson(data.state))
        setVersion(data.version)
        baseVersionRef.current = data.version
        setStatus('synced')
      } else if (data.status === 'conflict') {
        // Concurrent modification - resync
        await sync()
      } else if (data.status === 'rejected') {
        // Domain rejected - resync to get consistent state
        await sync()
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (e: any) {
      setError(e.message)
      setStatus('error')
      // Resync to recover
      await sync()
    } finally {
      setPending(p => Math.max(0, p - 1))
    }
  }, [projectId, model, domain, sync])

  // Initial sync
  useEffect(() => {
    sync()
  }, [sync])

  // Realtime subscription
  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel(`project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`
        },
        (payload) => {
          // Only update if this is a newer version
          if (payload.new.version > baseVersionRef.current) {
            setModel(domain.modelFromJson(payload.new.state))
            setVersion(payload.new.version)
            baseVersionRef.current = payload.new.version
            if (pending === 0) {
              setStatus('synced')
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, domain, pending])

  return { model, version, dispatch, sync, pending, error, status }
}
```

### Usage Example: Kanban

```tsx
// KanbanBoard.tsx
import { useCollaborativeProject } from './useCollaborativeProject'
import KanbanDomain from './dafny/KanbanDomain'

// Wrap Dafny domain with JSON converters
const kanbanDomain = {
  Init: () => KanbanDomain.__default.Init(),
  TryStep: (m, a) => KanbanDomain.__default.TryStep(m, a),
  modelFromJson: (json) => { /* ... */ },
  modelToJson: (m) => { /* ... */ },
  actionToJson: (a) => { /* ... */ }
}

function KanbanBoard({ projectId }: { projectId: string }) {
  const { model, version, dispatch, status, pending } =
    useCollaborativeProject(projectId, kanbanDomain)

  if (!model) return <div>Loading...</div>

  const cols = KanbanDomain.__default.GetCols(model)

  return (
    <div className="kanban">
      <div className="status-bar">
        <span>v{version}</span>
        <span>{status}</span>
        {pending > 0 && <span>{pending} pending</span>}
      </div>

      <div className="board">
        {cols.map(col => (
          <Column
            key={col}
            name={col}
            cards={KanbanDomain.__default.GetLane(model, col)}
            onAddCard={(title) =>
              dispatch(KanbanDomain.Action.create_AddCard(col, title))
            }
            onMoveCard={(id, toCol, place) =>
              dispatch(KanbanDomain.Action.create_MoveCard(id, toCol, place))
            }
          />
        ))}
      </div>
    </div>
  )
}
```

---

## Adapting for Other Domains

To use this pattern with a different Dafny domain:

### 1. Define Your Domain in Dafny

```dafny
include "MultiCollaboration.dfy"

module MyDomain refines Domain {
  type Model = ...
  datatype Action = ...

  ghost predicate Inv(m: Model) { ... }
  function TryStep(m: Model, a: Action): Result<Model, Err> { ... }
  function Rebase(remote: Action, local: Action): Action { ... }
  function Candidates(m: Model, a: Action): seq<Action> { ... }

  lemma StepPreservesInv(m: Model, a: Action, m2: Model) { ... }
  lemma CandidatesComplete(...) { ... }
}
```

### 2. Compile to JavaScript

```bash
dafny translate js --no-verify -o generated/MyDomain --include-runtime MyDomain.dfy
```

### 3. Create Domain Adapter

```typescript
// domains/myDomain.ts
import { MyDomain, _dafny, BigNumber } from './dafny/MyDomain.js'

export const myDomain = {
  Init: () => MyDomain.__default.Init(),
  TryStep: (m, a) => MyDomain.__default.TryStep(m, a),

  modelFromJson: (json) => {
    // Domain-specific JSON → Dafny conversion
  },

  modelToJson: (m) => {
    // Domain-specific Dafny → JSON conversion
  },

  actionToJson: (a) => {
    // Domain-specific action serialization
  }
}
```

### 4. Create Edge Function Bundle

Create a `build-bundle.js` script (see `kanban-supabase/supabase/functions/dispatch/build-bundle.js` for reference) that:
1. Reads the compiled Dafny code
2. Generates a Deno-compatible `dafny-bundle.ts`
3. Includes JSON marshalling for your domain types

Add to `compile.sh`:
```bash
(cd my-project/supabase/functions/dispatch && node build-bundle.js)
```

### 5. Use the Hook

```tsx
import { useCollaborativeProject } from './useCollaborativeProject'
import { myDomain } from './domains/myDomain'

function MyApp({ projectId }) {
  const { model, dispatch } = useCollaborativeProject(projectId, myDomain)
  // ...
}
```

---

## Comparison with Current Architecture

| Aspect | Current (Express) | Supabase Pattern |
|--------|-------------------|------------------|
| **Server** | Custom Express | Supabase Edge Function |
| **Auth** | Manual JWT check | Automatic |
| **Authorization** | Dafny MultiUser | Supabase RLS |
| **Persistence** | Custom JSON files | Postgres |
| **Realtime** | Not implemented | Built-in subscriptions |
| **Deployment** | Separate process | Serverless |
| **Dafny scope** | Domain + Auth | Domain only |

---

## Security Considerations

### What's Verified by Dafny

- Domain invariants (e.g., WIP limits, card partition)
- Reconciliation correctness (rebasing, candidates)
- Minimal rejection property

### What's Enforced by Supabase

- Authentication (JWT validation)
- Authorization (RLS policies)
- Data persistence integrity

### Trust Boundaries

1. **Supabase Auth**: Trusted to correctly identify users
2. **RLS Policies**: Trusted to enforce access control
3. **Edge Function**: Runs Dafny logic; must correctly marshal JSON
4. **Client**: Untrusted; all mutations go through Edge Function

### JSON Marshalling Risk

The JSON ↔ Dafny conversion code is unverified. Mitigations:

1. **Property-based tests**: Test round-trip `modelFromJson(modelToJson(m)) == m`
2. **Schema validation**: Validate JSON before converting
3. **Runtime invariant check**: Call a Dafny `CheckInv` function after loading

---

## Summary

This pattern provides:

1. **Verified domain logic**: Dafny proves invariants and reconciliation
2. **Robust authorization**: Supabase RLS, not dependent on JS correctness
3. **Built-in collaboration**: Realtime subscriptions, offline support
4. **Simple deployment**: No separate server to manage
5. **Reusable infrastructure**: Same tables, RLS, and hook for any domain

The key insight: let each system do what it's best at. Dafny verifies domain properties. Supabase handles auth, persistence, and realtime. The Edge Function is the thin bridge that runs verified logic server-side.
