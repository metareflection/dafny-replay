# Cloudflare for Dafny-Verified Apps

This document describes the Cloudflare architecture for Dafny-verified collaborative apps using Workers + D1 + Durable Objects.

For the backend abstraction pattern, see **[BACKEND.md](./BACKEND.md)**.
For deployment commands, see **[DEPLOY_CLOUDFLARE.md](./DEPLOY_CLOUDFLARE.md)**.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare Pages (static hosting)                          │
│  - React app (dist/)                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare Workers + D1 + Durable Objects                  │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Worker      │  │ D1          │  │ Durable Object      │  │
│  │ (dispatch)  │  │ (SQLite)    │  │ (per-project)       │  │
│  │             │  │             │  │                     │  │
│  │ - Auth check│  │ - projects  │  │ - WebSocket hub     │  │
│  │ - Dafny JS  │  │ - members   │  │ - Broadcast updates │  │
│  │ - D1 read/  │  │ - state     │  │ - Connection mgmt   │  │
│  │   write     │  │ - version   │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Mapping (Supabase → Cloudflare)

### What Changes

| Component | Supabase | Cloudflare |
|-----------|----------|------------|
| Database | PostgreSQL + RLS | D1 (SQLite) |
| Server functions | Edge Functions (Deno) | Workers (JS) |
| Realtime | postgres_changes | Durable Objects (WebSocket) |
| Auth | Supabase Auth | Simple JWT (Hono) |
| Authorization | RLS policies | Application-level checks |
| Dafny bundle | `--deno` flag | `--cloudflare` flag |

### What Stays the Same

- Dafny-compiled dispatch logic
- Effect state machine
- React components (with backend abstraction)
- Domain model and proofs

---

## Key Implementation Details

### 1. dafny2js --cloudflare

The `dafny2js` tool now supports a `--cloudflare` flag that generates Workers-compatible bundles:

```bash
# In compile.sh
(cd dafny2js && dotnet run --no-build -- \
    --file ../collab-todo/TodoMultiCollaboration.dfy \
    --app-core TodoAppCore \
    --cjs-name TodoMulti.cjs \
    --cloudflare ../collab-todo/worker/src/dafny-bundle.ts \
    --cjs-path ../collab-todo/src/dafny/TodoMulti.cjs \
    --null-options \
    --dispatch TodoMultiCollaboration.Dispatch)
```

Key differences from `--deno`:
- Uses `import BigNumber from 'bignumber.js'` (npm) instead of esm.sh
- Includes Dafny code directly (no `new Function()` - blocked by Workers)
- Uses `// @ts-nocheck` (TODO: generate proper types)

### 2. Durable Objects for Free Plans

Free Cloudflare plans require `new_sqlite_classes` instead of `new_classes`:

```toml
[[migrations]]
tag = "v1"
new_sqlite_classes = ["RealtimeDurableObject"]
```

### 3. Security Model

**Important**: Cloudflare D1 has no Row-Level Security. Authorization happens at multiple layers:

| Layer | Responsibility | Verified by |
|-------|---------------|-------------|
| 1. Authentication | "Who are you?" | Worker (JWT) |
| 2. Access Control | "Can you access this group/project?" | Worker (DB membership check) |
| 3. State Validity | "Is this action valid for current state?" | **Dafny** ✓ |
| 4. Invariant Preservation | "Does state remain consistent?" | **Dafny** ✓ |

**What Dafny verifies:**
- Actions reference valid members in the model
- State transitions preserve invariants (e.g., balances sum to zero)
- Domain authorization rules (e.g., only owner can delete)

**What Dafny does NOT verify:**
- JWT authentication
- Database-level access control (group membership)

If someone bypasses layer 2 and tries an action for a non-existent member, Dafny (layer 3) will reject it. But layers 1-2 are still application responsibility.

### 4. Project Structure

```
cloudflare/                 # Shared worker infrastructure (@dafny-replay/cloudflare)
├── src/
│   ├── index.ts           # Re-exports
│   ├── auth.ts            # createAuthRoutes(), createAuthMiddleware()
│   ├── realtime.ts        # RealtimeDurableObject, broadcastUpdate()
│   ├── helpers.ts         # corsMiddleware, checkMembership, etc.
│   └── types.ts           # BaseEnv, AuthVariables, User, DispatchResult

your-app-cloud/
├── src/
│   ├── backend/           # Backend abstraction (see BACKEND.md)
│   │   ├── types.ts
│   │   ├── supabase.ts
│   │   ├── cloudflare.ts
│   │   └── index.ts
│   ├── dafny/             # Client-side Dafny (generated)
│   └── hooks/             # React hooks using backend
├── worker/
│   ├── src/
│   │   ├── index.ts       # Main Hono app (imports from @dafny-replay/cloudflare)
│   │   ├── projects.ts    # Project/entity CRUD
│   │   ├── dispatch.ts    # Dispatch endpoints
│   │   └── dafny-bundle.ts # Generated
│   ├── schema.sql
│   ├── wrangler.toml
│   └── .dev.vars          # Local secrets (not in git)
└── .env.example
```

**Examples**: `collab-todo/`, `kanban-cloud/`, `clear-split-cloud/`

### 5. Worker Files

**Shared (in `cloudflare/`):**

| File | Purpose |
|------|---------|
| `auth.ts` | JWT signup/signin/me, auth middleware |
| `realtime.ts` | Durable Object for WebSocket broadcast |
| `helpers.ts` | CORS, membership checks, error helpers |

**Per-app (in `your-app/worker/src/`):**

| File | Purpose | Customization Needed |
|------|---------|---------------------|
| `index.ts` | Hono routes, imports from `@dafny-replay/cloudflare` | Add app-specific routes |
| `projects.ts` | CRUD, member management | Change `initialState` for domain |
| `dispatch.ts` | Calls Dafny dispatch, broadcasts updates | Multi-dispatch if needed |
| `dafny-bundle.ts` | Generated - **do not edit** | — |
| `schema.sql` | D1 tables: users, projects, members | Change `state` default JSON |
| `wrangler.toml` | Worker config, D1 binding, DO migration | Set `database_id` |

**Key customization: Initial State**

The initial state comes from Dafny's `Init()` function, exported as `init()` from `dafny-bundle.ts`:

```ts
import { init } from './dafny-bundle'

// For simple cases (Kanban):
const initialState = init()

// For user-specific cases (Todo, ClearSplit), patch the base:
const initialState = {
  ...init(),
  owner: userId,     // patch user-specific fields
  members: [userId]
}
```

The same JSON structure should be the `DEFAULT` in `schema.sql`.

---

## Quick Start

See **[DEPLOY_CLOUDFLARE.md](./DEPLOY_CLOUDFLARE.md)** for full deployment commands.

---

## Migration Checklist

- [x] Backend abstraction layer (`src/backend/`)
- [x] Cloudflare Worker with Hono
- [x] D1 database schema
- [x] Durable Object for realtime
- [x] `--cloudflare` flag in dafny2js
- [x] Updated compile.sh
- [x] Client hooks updated
- [x] Custom domain support
- [ ] Dafny-verified membership checks (TODO)
- [ ] Proper TypeScript types in generated bundles (TODO)

---

## Known Issues / TODOs

### 1. Membership checks are not Dafny-verified

The "can user X access project Y?" check is done in worker code (querying `project_members` table), not in Dafny. Moving this logic to Dafny would make the membership check verified:

1. Add `actingUser` parameter to `Dispatch` and `TryStep`
2. Check `actingUser in model.members` before allowing any action

The Dafny spec already has `members: set<UserId>` in the Model and `NotAMember` error type - just needs to be enforced globally.

Note: The worker code would still need to pass the correct `actingUser` from the JWT - the trust boundary remains there.

### 2. CloudflareEmitter uses `@ts-nocheck`

The generated `dafny-bundle.ts` files use `// @ts-nocheck` because Dafny compiles to JavaScript, not TypeScript. Outputting TypeScript-compatible code from Dafny would be a bigger change.

---

## References

- **Backend abstraction**: [BACKEND.md](./BACKEND.md)
- **Deployment guide**: [DEPLOY_CLOUDFLARE.md](./DEPLOY_CLOUDFLARE.md)
- **Cloudflare Workers**: https://developers.cloudflare.com/workers/
- **D1**: https://developers.cloudflare.com/d1/
- **Durable Objects**: https://developers.cloudflare.com/durable-objects/
