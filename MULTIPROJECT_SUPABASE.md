# Multi-Project Supabase Integration

This document describes how the verified multi-project architecture integrates with Supabase for persistence, realtime updates, and access control. It assumes familiarity with [MULTIPROJECT.md](./MULTIPROJECT.md).

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Client                                                             │
│                                                                     │
│  MultiProjectEffectManager                                          │
│    │                                                                │
│    ├─→ Dispatch actions via Edge Functions                          │
│    │     POST /dispatch (single-project)                            │
│    │     POST /multi-dispatch (cross-project)                       │
│    │                                                                │
│    └─← Receive updates via Supabase Realtime                        │
│          postgres_changes on 'projects' table                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Supabase                                                           │
│                                                                     │
│  Edge Functions                                                     │
│    • /dispatch: Single-project actions                              │
│    • /multi-dispatch: Cross-project actions (MoveTaskTo, CopyTaskTo)│
│    • Both use verified Dafny for validation                         │
│                                                                     │
│  PostgreSQL                                                         │
│    • projects(id, state JSONB, version, applied_log)                │
│    • Row Level Security (RLS) for access control                    │
│    • save_multi_update() for atomic cross-project writes            │
│                                                                     │
│  Realtime                                                           │
│    • postgres_changes: per-row notifications (respects RLS)         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Realtime Updates

### How Supabase Realtime Works

Supabase Realtime uses PostgreSQL's logical replication to notify clients of database changes. Key characteristics:

1. **Per-row notifications**: Each row change triggers a separate event
2. **Respects RLS**: Clients only receive events for rows they can access
3. **Not transactional**: A transaction updating two rows sends two separate events

### The Cross-Project Challenge

When a cross-project operation (e.g., `MoveTaskTo`) atomically updates two projects:

```
Server Transaction:
  UPDATE projects SET state=..., version=6 WHERE id='proj-1';
  UPDATE projects SET state=..., version=13 WHERE id='proj-2';
  COMMIT; -- Atomic

Realtime Events (separate):
  Event 1: { table: 'projects', id: 'proj-1', version: 6, state: ... }
  Event 2: { table: 'projects', id: 'proj-2', version: 13, state: ... }
```

Between receiving Event 1 and Event 2, the client has an **inconsistent local view**:
- Task is removed from project 1
- Task hasn't appeared in project 2 yet

### Design Decision: Accept Temporary Inconsistency

We accept the brief inconsistency window because:

1. **It resolves quickly**: Both events arrive within milliseconds
2. **Data is safe**: Server has the correct atomic state
3. **RLS is preserved**: Using postgres_changes respects row-level security
4. **Pending actions are preserved**: The verified state machine never loses pending actions

Alternative approaches (broadcast channels, batched notifications) would bypass RLS or add complexity without significant benefit.

## Verified RealtimeUpdate Event ✓ Implemented

### Event Definition

```dafny
datatype Event =
  | ...existing events...
  | RealtimeUpdate(
      projectId: ProjectId,
      version: nat,
      model: Model
    )
```

### Step Function Behavior

```dafny
case RealtimeUpdate(projectId, version, model) =>
  if es.mode.Dispatching? then
    // Skip - dispatch response will bring fresh state
    (es, NoOp)
  else
    var newClient := HandleRealtimeUpdate(es.client, projectId, version, model);
    (es.(client := newClient), NoOp)
```

### HandleRealtimeUpdate

```dafny
function HandleRealtimeUpdate(
  client: MultiClientState,
  projectId: ProjectId,
  version: nat,
  model: Model
): MultiClientState
{
  // Merge the updated project
  var newVersions := map[projectId := version];
  var newModels := map[projectId := model];
  var (mergedV, mergedM) := MergeUpdates(client, newVersions, newModels);

  // Reapply pending actions (preserves them, checks invariants)
  var reappliedModel := ReapplyPending(mergedM, client.pending);

  MultiClientState(mergedV, reappliedModel, client.pending)
}
```

### Key Guarantees

1. **Pending actions never lost**: `client.pending` is preserved through the update
2. **Invariants checked**: `ReapplyPending` calls `MultiStep` which validates invariants
3. **Atomic reapply**: Each pending action either fully applies or is skipped
4. **Skip while dispatching**: Avoids conflicts with in-flight dispatch responses

## Permission Model

### Row Level Security (RLS)

```sql
-- Users can only read/write projects they're members of
CREATE POLICY "project_access" ON projects
  USING (id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  ));
```

### Cross-Project Operation Permissions

For `MoveTaskTo(srcProject, dstProject, taskId, listId)`:

1. **Require write access to BOTH projects**: User must be a member with write permission on both source and destination
2. **Edge function validates**: Before calling Dafny, check membership on all touched projects
3. **Fail atomically**: If permission check fails, entire operation rejected

### "Task Moved to Inaccessible Project" Behavior

If User A moves a task to a project User B can't access:
- User B receives realtime update for source project only
- Task appears deleted from User B's perspective
- This is **correct behavior**: the task moved somewhere they can't see

## Atomicity Guarantees

### Client-Side (Dafny)

```dafny
function MultiStep(mm: MultiModel, action: MultiAction): Result<MultiModel, MultiErr>
```

Pure function - returns either:
- `Ok(newMultiModel)`: Both projects updated
- `Err(reason)`: Neither project changed

No partial state possible.

### Server-Side (PostgreSQL)

```sql
CREATE OR REPLACE FUNCTION save_multi_update(updates JSONB)
RETURNS JSONB AS $$
BEGIN
  -- All updates in single transaction
  FOR update IN SELECT * FROM jsonb_array_elements(updates) LOOP
    UPDATE projects
    SET state = update->>'state', version = (update->>'version')::int
    WHERE id = update->>'id'
      AND version = (update->>'expected_version')::int;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Version conflict on %', update->>'id';
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

- All project updates in single transaction
- Version check prevents concurrent modification
- Any conflict rolls back entire transaction

### Concurrent Write Handling

```
User A: reads version 5, adds todo (9→10), sends baseVersion=5
User B: reads version 5, adds todo (9→10), sends baseVersion=5

Server processes A: version=5 ✓, Dafny ✓, saves as version 6
Server processes B: version=5 ✗ (now 6), CONFLICT returned

User B: receives conflict, rebases on fresh state (10 todos)
        Dafny check: 10+1=11 > max 10, action REJECTED
```

Invariants are checked at every step:
1. Client optimistic update (Dafny)
2. Server before save (Dafny)
3. Server version check (prevents concurrent bypass)
4. Reapply after realtime/conflict (Dafny)

## JavaScript Integration

### Subscribing to Realtime

```javascript
#subscribeToProject(projectId) {
  const channel = supabase
    .channel(`project:${projectId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'projects',
      filter: `id=eq.${projectId}`
    }, (payload) => {
      // Use verified event instead of EffectInit
      this.#transition(App.EffectEvent.RealtimeUpdate(
        projectId,
        payload.new.version,
        payload.new.state
      ))
    })
    .subscribe()
}
```

### Before (Hacky)

```javascript
// BAD: Wipes state, loses pending actions
this.#state = App.EffectInit(allVersions, allModels)
```

### After (Verified) ✓ Implemented

```javascript
// GOOD: Preserves pending, checks invariants
this.#transition(App.EffectEvent.RealtimeUpdate(projectId, version, model))
```

Note: The `RealtimeUpdate` wrapper in `app-extras.js` uses `preprocessModelJson` to convert null values to `{ type: 'None' }` before passing to `modelFromJson`.

## Edge Cases

### Realtime During Dispatch

If realtime arrives while we're dispatching:
- **Skip it**: `if es.mode.Dispatching? then (es, NoOp)`
- **Reason**: Dispatch response will bring fresh state for all touched projects
- **No data loss**: Pending actions preserved, server state is authoritative

### Cross-Project Realtime Gap

Between receiving project1 and project2 updates:
- Local model temporarily inconsistent
- Pending cross-project action may fail to reapply (returns `Err`)
- When project2 arrives, reapply succeeds
- **Window**: Typically < 100ms

### Offline + Realtime

If client goes offline:
- Realtime connection drops
- Pending actions stay in queue
- On reconnect: fresh state fetched, pending reapplied
- Verified `NetworkRestored` event handles this

## Summary

| Component | Guarantee |
|-----------|-----------|
| `MultiStep` | Atomic multi-project update (all or nothing) |
| `save_multi_update` | Atomic database transaction with version check |
| `RealtimeUpdate` event | Preserves pending actions, checks invariants |
| `RealtimeUpdatePreservesPendingExactly` | Verified lemma proving pending preservation |
| RLS | Users only see/modify accessible projects |
| Version conflicts | Serializes concurrent writes, triggers rebase |
