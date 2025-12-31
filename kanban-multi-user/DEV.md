# Kanban Multi-User Development Guide

## Overview

Multi-user Kanban board with **Dafny-verified authorization**. The core invariants are proven in Dafny:

- Only members can read or edit the board
- Only the owner can invite/remove members
- The owner cannot be removed
- All Kanban invariants (WIP limits, card uniqueness, etc.) are preserved

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Client (React)                             │
│  - Login form (Supabase or dev mode)                                │
│  - Project selector (shows owned + member projects)                 │
│  - Kanban board UI                                                   │
│  - Member list (invite/remove for owner)                            │
│  - Sends actions WITHOUT actor (server injects it)                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTP + JWT (or X-User-Id in dev)
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Server (Express)                             │
│  - Auth middleware validates JWT / extracts userId                  │
│  - Per-user projects (auto-created on first sync)                   │
│  - Calls TrySync for verified read authorization                    │
│  - Injects userId as actor into actions                             │
│  - Persists state to Supabase Postgres                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Dafny (compiled to JS)                          │
│  - MultiUser.dfy: Abstract wrapper adding auth to any domain        │
│  - KanbanMultiUser.dfy: Instantiates MultiUser with Kanban          │
│  - Verified lemmas prove authorization guarantees                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Files

### Dafny (root directory)

| File | Purpose |
|------|---------|
| `MultiUser.dfy` | Abstract multi-user wrapper with TrySync for read auth |
| `KanbanMultiUser.dfy` | Combines MultiUser + KanbanDomain |
| `KanbanMultiCollaboration.dfy` | Original collaboration kernel (still used for client state) |

### Server (`server/`)

| File | Purpose |
|------|---------|
| `index.js` | Express server, routes, project cache |
| `supabase.js` | Auth middleware (Supabase JWT or dev mode X-User-Id) |
| `persistence.js` | Load/save projects to Supabase |
| `kanban-core.js` | Loads Dafny JS, type conversions, trySync wrapper |
| `KanbanMultiUser.cjs` | Compiled Dafny code (generated) |

### Client (`src/`)

| File | Purpose |
|------|---------|
| `App.jsx` | Main UI: auth, project selector, board, member list |
| `App.css` | Styles |
| `supabase.js` | Supabase client for auth |
| `dafny/app.js` | Dafny wrapper for client-side state |
| `dafny/KanbanMultiUser.cjs` | Compiled Dafny code (generated) |

## The TrySync Pattern

**Problem**: Authorization must be verified for both reads AND writes. It's easy to forget read authorization since it doesn't go through `Dispatch`.

**Solution**: `TrySync` in Dafny verifies read authorization the same way `Dispatch` verifies write authorization.

### How It Works

In `MultiUser.dfy`:

```dafny
datatype SyncReply = SyncOk(version: nat, model: Model) | SyncDenied

function TrySync(server: ServerState, actor: UserId): SyncReply
{
  if actor in server.present.members then
    SyncOk(Version(server), server.present)
  else
    SyncDenied
}

// Proven guarantee
lemma SyncRequiresMembership(server: ServerState, actor: UserId)
  ensures TrySync(server, actor).SyncOk? ==> actor in server.present.members
{
}
```

### Server Usage

In `kanban-core.js`, wrap the Dafny function:

```javascript
export const trySync = (serverState, userId) => {
  const userDafny = _dafny.Seq.UnicodeFromString(userId);
  const reply = KanbanMultiUser.__default.TrySync(serverState, userDafny);

  if (reply.is_SyncOk) {
    return {
      ok: true,
      version: toNumber(reply.dtor_version),
      model: modelToJs(reply.dtor_model)
    };
  } else {
    return { ok: false };
  }
};
```

In `index.js`, ALL read endpoints must use it:

```javascript
app.get('/sync', requireAuth, async (req, res) => {
  const { state } = await getProject(req.userId);

  // CRITICAL: Use Dafny-verified TrySync, not ad-hoc JS check
  const result = trySync(state, req.userId);
  if (!result.ok) {
    return res.status(403).json({ error: 'Not a member of this project' });
  }

  res.json({ version: result.version, model: result.model });
});
```

### Why This Matters

**Wrong** (ad-hoc JS check, not verified):
```javascript
if (!model.members.includes(req.userId)) {  // BUG-PRONE!
  return res.status(403).json({ error: 'Unauthorized' });
}
```

**Right** (Dafny-verified):
```javascript
const result = trySync(state, req.userId);  // Verified by lemma
if (!result.ok) {
  return res.status(403).json({ error: 'Not a member' });
}
```

The TrySync pattern ensures:
1. Read authorization is **proven** correct by Dafny
2. The check is **consistent** with write authorization (same `members` set)
3. You **can't forget** to check - the function returns `SyncDenied` if unauthorized

## Running in Development Mode

### Without Supabase (dev mode auth)

1. Comment out `SUPABASE_URL` in `.env`

2. Start the app:
   ```bash
   cd kanban-multi-user
   npm install
   npm run dev
   ```

3. Login with any email - a project will be auto-created for you

4. The client sends `X-User-Id` header instead of JWT

### With Supabase

1. Create a Supabase project at https://supabase.com

2. Create the projects table:
   ```sql
   create table projects (
     id uuid primary key default gen_random_uuid(),
     name text not null,
     owner_email text not null,
     state jsonb not null,
     created_at timestamptz default now(),
     updated_at timestamptz default now()
   );

   create index projects_owner_idx on projects(owner_email);
   ```

3. Fill in `.env`:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here

   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. Run `npm run dev`

**Important**: Use the `anon` key, NOT the `service_role` key.

## Compiling Dafny

After modifying `.dfy` files:

```bash
cd /path/to/dafny-replay
./compile.sh
```

To verify (prove) the Dafny code:

```bash
dafny verify MultiUser.dfy
dafny verify KanbanMultiUser.dfy
```

## Security Model

### Write Path (Dispatch)

```
Client                    Server                      Dafny
──────                    ──────                      ─────
{ action: AddCard(...) }
        │
        ▼
                    Validate JWT/header
                    Extract userId
                    Build: InnerAction(userId, AddCard(...))
                              │
                              ▼
                                              Dispatch checks:
                                              userId in members?
                                              If yes: apply action
                                              If no: reject
```

### Read Path (Sync)

```
Client                    Server                      Dafny
──────                    ──────                      ─────
GET /sync?projectId=xxx
        │
        ▼
                    Validate JWT/header
                    Extract userId
                    Load project state
                              │
                              ▼
                                              TrySync checks:
                                              userId in members?
                                              If yes: return state
                                              If no: SyncDenied
```

**Key point**: Both reads and writes go through Dafny-verified authorization.

## Verified Guarantees (Lemmas)

These are proven in `MultiUser.dfy`:

| Lemma | What it proves |
|-------|----------------|
| `NonMemberCannotEdit` | `actor !in members` ⟹ board actions rejected |
| `NonOwnerCannotInvite` | `actor != owner` ⟹ invite rejected |
| `NonOwnerCannotRemove` | `actor != owner` ⟹ remove rejected |
| `OwnerCannotBeRemoved` | Removing owner always fails |
| `OwnerAlwaysMember` | `Inv(m)` ⟹ `owner in members` |
| `StepPreservesInv` | Valid transitions preserve all invariants |
| `SyncRequiresMembership` | `TrySync` succeeds ⟹ actor is member |

## Current Limitations / TODO

### No Real-time Updates
- Other users don't see changes until they sync
- TODO: Use Supabase Realtime for push updates

### Log Pruning
- The `appliedLog` grows unbounded
- TODO: Keep last N actions, prune older ones

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/projects` | Required | List projects user can access |
| GET | `/sync` | Required | Get state (`?projectId=xxx` optional) |
| POST | `/dispatch` | Required | Send action `{ baseVersion, action, projectId? }` |
| GET | `/state` | Required | Debug: raw server state |

### Action Types

**Board actions** (wrapped with actor by server):
- `{ type: "AddColumn", col: "Todo", limit: 5 }`
- `{ type: "AddCard", col: "Todo", title: "My task" }`
- `{ type: "MoveCard", id: 1, toCol: "Done", place: { type: "AtEnd" } }`
- `{ type: "EditTitle", id: 1, title: "New title" }`
- `{ type: "SetWip", col: "Todo", limit: 3 }`

**Membership actions**:
- `{ type: "InviteMember", user: "alice@example.com" }`
- `{ type: "RemoveMember", user: "alice@example.com" }`

## Persistence

State is stored in Supabase Postgres as JSONB. The full `ServerState` is persisted to support offline rebasing:

```json
{
  "present": {
    "inner": { "cols": [...], "lanes": {...}, ... },
    "owner": "owner@example.com",
    "members": ["owner@example.com", "alice@example.com"]
  },
  "appliedLog": [
    { "type": "InnerAction", "actor": "...", "action": {...} },
    ...
  ],
  "version": 10
}
```

The `appliedLog` enables rebasing when a stale client comes back online.

## Testing Authorization

```bash
# Start server
node server/index.js

# First user syncs (creates their project)
curl http://localhost:3001/sync \
  -H "X-User-Id: alice@example.com"
# → creates project, returns state

# Alice adds a column
curl -X POST http://localhost:3001/dispatch \
  -H "Content-Type: application/json" \
  -H "X-User-Id: alice@example.com" \
  -d '{"baseVersion": 0, "action": {"type": "AddColumn", "col": "Todo", "limit": 5}}'
# → accepted

# Bob tries to read Alice's project
curl "http://localhost:3001/sync?projectId=<alice-project-id>" \
  -H "X-User-Id: bob@example.com"
# → 403 Not a member (TrySync denied)

# Alice invites Bob
curl -X POST http://localhost:3001/dispatch \
  -H "Content-Type: application/json" \
  -H "X-User-Id: alice@example.com" \
  -d '{"baseVersion": 1, "action": {"type": "InviteMember", "user": "bob@example.com"}}'
# → accepted

# Now Bob can access
curl "http://localhost:3001/sync?projectId=<alice-project-id>" \
  -H "X-User-Id: bob@example.com"
# → returns state (TrySync succeeded)
```
