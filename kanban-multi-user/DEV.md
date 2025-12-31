# Kanban Multi-User Development Guide

## Overview

Multi-user Kanban board with **Dafny-verified authorization**. The core invariants are proven in Dafny:

- Only members can edit the board
- Only the owner can invite/remove members
- The owner cannot be removed
- All Kanban invariants (WIP limits, card uniqueness, etc.) are preserved

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Client (React)                             │
│  - Login form (Supabase or dev mode)                                │
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
│  - Injects userId as actor into actions                             │
│  - Calls Dafny-compiled JavaScript                                  │
│  - In-memory state (no persistence yet)                             │
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
| `MultiUser.dfy` | Abstract multi-user wrapper (reusable for any domain) |
| `KanbanMultiUser.dfy` | Combines MultiUser + KanbanDomain |
| `KanbanMultiCollaboration.dfy` | Original collaboration kernel (still used for client state) |

### Server (`server/`)

| File | Purpose |
|------|---------|
| `index.js` | Express server, routes, auth middleware usage |
| `supabase.js` | Auth middleware (Supabase JWT or dev mode X-User-Id) |
| `kanban-core.js` | Loads Dafny JS, type conversions, action building |
| `KanbanMultiUser.cjs` | Compiled Dafny code (generated) |

### Client (`src/`)

| File | Purpose |
|------|---------|
| `App.jsx` | Main UI: auth forms, board, member list |
| `App.css` | Styles |
| `supabase.js` | Supabase client for auth |
| `dafny/app.js` | Dafny wrapper for client-side state |
| `dafny/KanbanMultiUser.cjs` | Compiled Dafny code (generated) |

## Running in Development Mode

### Without Supabase (dev mode auth)

1. Start the app:
   ```bash
   cd kanban-multi-user
   npm install
   npm run dev
   ```

2. Login with the email matching `DEFAULT_OWNER` in `.env` (default: `owner@example.com`)

3. The client sends `X-User-Id` header instead of JWT

### With Supabase

1. Create a Supabase project at https://supabase.com

2. Copy `.env.example` to `.env` and fill in:
   ```
   # Server
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here   # NOT service_role key!

   # Client (Vite requires VITE_ prefix)
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. Run `npm run dev`

**Important**: Use the `anon` key, NOT the `service_role` key. The anon key is safe for browsers.

## Compiling Dafny

After modifying `.dfy` files:

```bash
cd /path/to/dafny-replay
./compile.sh
```

This compiles all Dafny files and copies them to the appropriate projects.

To verify (prove) the Dafny code:

```bash
dafny verify MultiUser.dfy
dafny verify KanbanMultiUser.dfy
```

## Security Model

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
                                              Check: userId in members?
                                              If yes: apply action
                                              If no: reject
```

**Key point**: The client NEVER specifies who they are. The server extracts identity from the auth token and injects it into the action. Dafny then verifies authorization.

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

## Current Limitations / TODO

### No Persistence
- State is in-memory, lost on server restart
- TODO: Store state in Supabase Postgres

### Single Project
- Only one hardcoded project exists
- TODO: Add `/create-project` endpoint, project selection UI

### No Real-time Updates
- Other users don't see changes until they sync
- TODO: Use Supabase Realtime for push updates

### DEFAULT_OWNER Hack
- Server initializes with a hardcoded owner
- Goes away once project creation is implemented

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/sync` | Required | Get current state and version |
| POST | `/dispatch` | Required | Send action `{ baseVersion, action }` |
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

## Testing Authorization

```bash
# Start server
node server/index.js

# Owner can add column
curl -X POST http://localhost:3001/dispatch \
  -H "Content-Type: application/json" \
  -H "X-User-Id: owner@example.com" \
  -d '{"baseVersion": 0, "action": {"type": "AddColumn", "col": "Todo", "limit": 5}}'
# → accepted

# Non-member rejected
curl -X POST http://localhost:3001/dispatch \
  -H "Content-Type: application/json" \
  -H "X-User-Id: hacker@evil.com" \
  -d '{"baseVersion": 1, "action": {"type": "AddColumn", "col": "Hacked", "limit": 99}}'
# → rejected (Unauthorized)

# Owner invites member
curl -X POST http://localhost:3001/dispatch \
  -H "Content-Type: application/json" \
  -H "X-User-Id: owner@example.com" \
  -d '{"baseVersion": 1, "action": {"type": "InviteMember", "user": "alice@example.com"}}'
# → accepted

# New member can now edit
curl -X POST http://localhost:3001/dispatch \
  -H "Content-Type: application/json" \
  -H "X-User-Id: alice@example.com" \
  -d '{"baseVersion": 2, "action": {"type": "AddColumn", "col": "Done", "limit": 10}}'
# → accepted

# Non-owner cannot invite
curl -X POST http://localhost:3001/dispatch \
  -H "Content-Type: application/json" \
  -H "X-User-Id: alice@example.com" \
  -d '{"baseVersion": 3, "action": {"type": "InviteMember", "user": "bob@example.com"}}'
# → rejected (Unauthorized)
```
