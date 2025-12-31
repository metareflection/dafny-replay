# Dafny-Verified Collaborative Apps with Supabase

This document describes a pattern for building multi-user collaborative applications where:

- **Dafny** verifies domain invariants and reconciliation logic
- **Supabase** handles authentication, authorization (RLS), persistence, and realtime
- **Edge Functions** run Dafny dispatch server-side for proper reconciliation

This approach simplifies the current Express-based architecture while preserving the MultiCollaboration guarantees (rebasing, candidate fallback, minimal rejection).

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

```sql
-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Projects: members can read, but writes go through Edge Function
CREATE POLICY "members can read projects"
  ON projects FOR SELECT
  USING (
    id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

-- No direct INSERT/UPDATE/DELETE on projects from client
-- All mutations go through the Edge Function

-- Project members: members can see other members
CREATE POLICY "members can view membership"
  ON project_members FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

-- Only owner can manage membership
CREATE POLICY "owner can manage members"
  ON project_members FOR INSERT
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "owner can remove members"
  ON project_members FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE owner_id = auth.uid()
    )
    AND user_id != auth.uid()  -- Can't remove self if owner
  );
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

The Edge Function runs Dafny reconciliation server-side, preserving the MultiCollaboration guarantees.

### `supabase/functions/dispatch/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Import compiled Dafny domain (copied to function directory)
import { KanbanDomain, _dafny, BigNumber } from './KanbanDomain.js'

// ============================================================================
// Dafny Helpers (domain-specific marshalling)
// ============================================================================

const modelFromJson = (json: any) => {
  // Convert JSON to Dafny Model
  const cols = _dafny.Seq.of(...json.cols.map((c: string) =>
    _dafny.Seq.UnicodeFromString(c)))

  let lanes = _dafny.Map.Empty
  for (const [col, ids] of Object.entries(json.lanes || {})) {
    lanes = lanes.update(
      _dafny.Seq.UnicodeFromString(col),
      _dafny.Seq.of(...(ids as number[]).map(id => new BigNumber(id)))
    )
  }

  let wip = _dafny.Map.Empty
  for (const [col, limit] of Object.entries(json.wip || {})) {
    wip = wip.update(
      _dafny.Seq.UnicodeFromString(col),
      new BigNumber(limit as number)
    )
  }

  let cards = _dafny.Map.Empty
  for (const [id, card] of Object.entries(json.cards || {})) {
    cards = cards.update(
      new BigNumber(id),
      _dafny.Seq.UnicodeFromString((card as any).title)
    )
  }

  return KanbanDomain.Model.create_Model(
    cols, lanes, wip, cards, new BigNumber(json.nextId || 0)
  )
}

const modelToJson = (m: any) => {
  // Convert Dafny Model to JSON
  const cols: string[] = []
  for (let i = 0; i < m.dtor_cols.length; i++) {
    cols.push(m.dtor_cols[i].toVerbatimString(false))
  }

  const lanes: Record<string, number[]> = {}
  const wip: Record<string, number> = {}
  const cards: Record<string, { title: string }> = {}

  for (const key of m.dtor_lanes.Keys.Elements) {
    const col = key.toVerbatimString(false)
    const ids = m.dtor_lanes.get(key)
    lanes[col] = []
    for (let i = 0; i < ids.length; i++) {
      lanes[col].push(ids[i].toNumber())
    }
  }

  for (const key of m.dtor_wip.Keys.Elements) {
    wip[key.toVerbatimString(false)] = m.dtor_wip.get(key).toNumber()
  }

  for (const key of m.dtor_cards.Keys.Elements) {
    const card = m.dtor_cards.get(key)
    const title = card.dtor_title !== undefined
      ? card.dtor_title.toVerbatimString(false)
      : card.toVerbatimString(false)
    cards[key.toNumber()] = { title }
  }

  return { cols, lanes, wip, cards, nextId: m.dtor_nextId.toNumber() }
}

const actionFromJson = (json: any) => {
  // Convert JSON action to Dafny Action
  switch (json.type) {
    case 'AddColumn':
      return KanbanDomain.Action.create_AddColumn(
        _dafny.Seq.UnicodeFromString(json.col),
        new BigNumber(json.limit)
      )
    case 'AddCard':
      return KanbanDomain.Action.create_AddCard(
        _dafny.Seq.UnicodeFromString(json.col),
        _dafny.Seq.UnicodeFromString(json.title)
      )
    case 'MoveCard':
      const place = json.place?.type === 'Before'
        ? KanbanDomain.Place.create_Before(new BigNumber(json.place.anchor))
        : json.place?.type === 'After'
        ? KanbanDomain.Place.create_After(new BigNumber(json.place.anchor))
        : KanbanDomain.Place.create_AtEnd()
      return KanbanDomain.Action.create_MoveCard(
        new BigNumber(json.id),
        _dafny.Seq.UnicodeFromString(json.toCol),
        place
      )
    case 'EditTitle':
      return KanbanDomain.Action.create_EditTitle(
        new BigNumber(json.id),
        _dafny.Seq.UnicodeFromString(json.title)
      )
    case 'SetWip':
      return KanbanDomain.Action.create_SetWip(
        _dafny.Seq.UnicodeFromString(json.col),
        new BigNumber(json.limit)
      )
    default:
      return KanbanDomain.Action.create_NoOp()
  }
}

const actionToJson = (action: any): any => {
  // Convert Dafny Action to JSON (for applied_log)
  if (action.is_AddColumn) {
    return {
      type: 'AddColumn',
      col: action.dtor_col.toVerbatimString(false),
      limit: action.dtor_limit.toNumber()
    }
  }
  if (action.is_AddCard) {
    return {
      type: 'AddCard',
      col: action.dtor_col.toVerbatimString(false),
      title: action.dtor_title.toVerbatimString(false)
    }
  }
  if (action.is_MoveCard) {
    const place = action.dtor_place
    return {
      type: 'MoveCard',
      id: action.dtor_id.toNumber(),
      toCol: action.dtor_toCol.toVerbatimString(false),
      place: place.is_AtEnd ? { type: 'AtEnd' }
        : place.is_Before ? { type: 'Before', anchor: place.dtor_anchor.toNumber() }
        : { type: 'After', anchor: place.dtor_anchor.toNumber() }
    }
  }
  if (action.is_EditTitle) {
    return {
      type: 'EditTitle',
      id: action.dtor_id.toNumber(),
      title: action.dtor_title.toVerbatimString(false)
    }
  }
  if (action.is_SetWip) {
    return {
      type: 'SetWip',
      col: action.dtor_col.toVerbatimString(false),
      limit: action.dtor_limit.toNumber()
    }
  }
  return { type: 'NoOp' }
}

// ============================================================================
// MultiCollaboration Logic (from Dafny, but orchestrated here)
// ============================================================================

const rebaseThroughSuffix = (suffix: any[], action: any): any => {
  // Rebase action through each action in suffix
  let rebased = action
  for (let i = suffix.length - 1; i >= 0; i--) {
    const remote = actionFromJson(suffix[i])
    rebased = KanbanDomain.__default.Rebase(remote, rebased)
  }
  return rebased
}

const getCandidates = (model: any, action: any): any[] => {
  // Get candidate actions from Dafny
  const candidates = KanbanDomain.__default.Candidates(model, action)
  const result = []
  for (let i = 0; i < candidates.length; i++) {
    result.push(candidates[i])
  }
  return result
}

const tryStep = (model: any, action: any): { ok: true, value: any } | { ok: false } => {
  const result = KanbanDomain.__default.TryStep(model, action)
  if (result.is_Ok) {
    return { ok: true, value: result.dtor_value }
  }
  return { ok: false }
}

// ============================================================================
// Edge Function Handler
// ============================================================================

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      }
    })
  }

  try {
    // Get auth context
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Create Supabase client with user's JWT
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Parse request
    const { projectId, baseVersion, action } = await req.json()

    // Check membership (RLS will also enforce this, but fail fast)
    const { data: membership } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Not a member' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Load current project state (use service role for write later)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: project, error: loadError } = await supabaseAdmin
      .from('projects')
      .select('state, version, applied_log')
      .eq('id', projectId)
      .single()

    if (loadError || !project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Validate baseVersion
    if (baseVersion > project.version) {
      return new Response(JSON.stringify({ error: 'Invalid base version' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // ========================================================================
    // MultiCollaboration Dispatch (from MULTICOLLAB.md)
    // ========================================================================

    // 1. Convert to Dafny types
    const model = modelFromJson(project.state)
    const dafnyAction = actionFromJson(action)

    // 2. Rebase through suffix (actions since client's version)
    const suffix = project.applied_log.slice(baseVersion)
    const rebased = rebaseThroughSuffix(suffix, dafnyAction)

    // 3. Get candidates and try each
    const candidates = getCandidates(model, rebased)

    let newModel = null
    let appliedAction = null

    for (const candidate of candidates) {
      const result = tryStep(model, candidate)
      if (result.ok) {
        newModel = result.value
        appliedAction = candidate
        break
      }
    }

    // 4. If no candidate succeeded, reject
    if (!newModel) {
      return new Response(JSON.stringify({
        status: 'rejected',
        reason: 'No valid interpretation'
      }), {
        status: 200,  // Not an HTTP error, just a domain rejection
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 5. Persist new state
    const newState = modelToJson(newModel)
    const newVersion = project.version + 1
    const newAppliedLog = [...project.applied_log, actionToJson(appliedAction)]

    const { error: updateError } = await supabaseAdmin
      .from('projects')
      .update({
        state: newState,
        version: newVersion,
        applied_log: newAppliedLog,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .eq('version', project.version)  // Optimistic lock

    if (updateError) {
      // Concurrent modification - client should retry
      return new Response(JSON.stringify({
        status: 'conflict',
        message: 'Concurrent modification, please retry'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 6. Return success
    return new Response(JSON.stringify({
      status: 'accepted',
      version: newVersion,
      state: newState
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (e) {
    console.error('Dispatch error:', e)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

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

### 4. Copy Domain to Edge Function

```bash
cp generated/MyDomain.js supabase/functions/dispatch/MyDomain.js
```

Update Edge Function to import your domain instead of KanbanDomain.

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
