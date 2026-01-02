# Kanban Supabase

Dafny-verified collaborative Kanban board using Supabase for authentication, authorization, persistence, and realtime updates.
See [SUPABASE.md](../SUPABASE.md) for more on the Supabase integration pattern.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Supabase                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐   │
│  │    Auth     │  │ RLS Policies│  │ Edge Function  │   │
│  │             │  │ (read-only) │  │ /dispatch      │   │
│  └─────────────┘  └─────────────┘  └────────────────┘   │
│                                           │             │
│                                    Reconciliation       │
│                                    (rebase + candidates)│
└─────────────────────────────────────────────────────────┘
                          │
                          │ Realtime subscriptions
                          ▼
┌────────────────────────────────────────────────────────┐
│  React Client                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ useCollaborativeProjectOffline(projectId)       │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                             │
│                          ▼                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Dafny Domain (compiled to JS)                   │   │
│  │   - TryStep, Rebase, Candidates                 │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

## Features

- **Dafny-verified domain logic** - WIP limits, card partition invariants
- **MultiCollaboration pattern** - Rebasing, candidate fallback, minimal rejection
- **Supabase Auth** - Email/password, OAuth (Google)
- **Row Level Security** - Members can read, owner manages membership
- **Realtime sync** - See changes from other clients instantly
- **Optimistic updates** - UI updates immediately, reconciles in background

## Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings > API

### 2. Run Database Schema

In the Supabase SQL Editor, run the contents of `supabase/schema.sql`.

This creates:
- `projects` table with state and applied_log
- `project_members` table for membership
- RLS policies for authorization
- `create_project` function

### 3. Deploy Edge Function

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the dispatch function
supabase functions deploy dispatch
```

### 4. Configure Client

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your Supabase credentials
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Compile Dafny

From the project root:

```bash
./compile.sh
```

This:
1. Compiles `KanbanMultiCollaboration.dfy` to JavaScript
2. Copies to `kanban-supabase/src/dafny/KanbanMulti.cjs`
3. Generates `supabase/functions/dispatch/dafny-bundle.ts` (Edge Function)

The Edge Function uses verified Dafny code for:
- `KanbanDomain.TryStep` - Domain logic
- `KanbanDomain.Rebase` - Intent-aware rebasing
- `KanbanDomain.Candidates` - Candidate fallback

### 6. Run the App

```bash
npm install
npm run dev
```

## How It Works

### Authentication
- Supabase handles auth
- Supports email/password and OAuth providers
- Session persisted in localStorage

### Authorization (RLS)
- `projects` table: SELECT allowed for members only
- `project_members` table: SELECT for members, INSERT/DELETE for owner only
- Writes go through Edge Function (uses service role)

### Dispatch Flow

1. Client sends action to Edge Function with `baseVersion`
2. Edge Function:
   - Verifies membership
   - Loads current state
   - Rebases action through suffix of applied log
   - Tries candidate actions until one succeeds
   - Persists new state with optimistic lock
3. Client receives new state or rejection
4. Other clients receive update via Realtime subscription

### Reconciliation

The Edge Function implements the MultiCollaboration pattern:

```
Dispatch(state, baseVersion, action):
  suffix = applied_log[baseVersion:]
  rebased = rebaseThroughSuffix(suffix, action)
  candidates = getCandidates(state, rebased)
  for candidate in candidates:
    result = tryStep(state, candidate)
    if result.ok:
      return accept(result.value, candidate)
  return reject()
```

## Project Structure

```
kanban-supabase/
├── src/
│   ├── App.jsx                    # Main React app
│   ├── App.css                    # Styles
│   ├── supabase.js                # Supabase client
│   ├── hooks/
│   │   ├── ClientStateStore.js    # Verified state transitions
│   │   ├── EffectManager.js       # Network I/O, subscriptions
│   │   ├── useCollaborativeProject.js      # Projects/members hooks
│   │   └── useCollaborativeProjectOffline.js  # Thin React wrapper
│   └── dafny/
│       ├── app.js                 # Generated domain adapter
│       ├── app-extras.js          # JS convenience wrappers
│       └── KanbanMulti.cjs        # Compiled Dafny
├── supabase/
│   ├── schema.sql                 # Database schema
│   └── functions/
│       └── dispatch/
│           ├── index.ts           # Edge Function
│           ├── build-bundle.js    # Deno bundle generator
│           └── dafny-bundle.ts    # Auto-generated Dafny bundle
├── package.json
├── vite.config.js
└── .env.example
```

## Stack

| Aspect | |
|--------|-----------------|
| Server | Supabase Edge Function |
| Auth | Supabase Auth |
| Authorization | Supabase RLS |
| Persistence | Postgres |
| Realtime | Built-in |
| Deployment | Serverless |

## Development

### Local Development

The app connects directly to your Supabase project. No local server needed.

```bash
npm run dev
```

### Testing Edge Function Locally

```bash
supabase functions serve dispatch
```

### Viewing Logs

```bash
supabase functions logs dispatch
```

## Client Architecture

The React client uses a three-layer architecture that separates concerns:

```
┌─────────────────────────────────────────────────────────────┐
│  useCollaborativeProjectOffline (React hook)                │
│  - Thin wrapper using useSyncExternalStore                  │
│  - No stale closures, no complex state management           │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌──────────────────────┐     ┌──────────────────────────────┐
│  ClientStateStore    │     │  EffectManager               │
│                      │◄────│                              │
│  All state changes   │     │  - Flush pending to server   │
│  via Dafny-verified  │     │  - Realtime subscriptions    │
│  functions           │     │  - Offline detection         │
└──────────────────────┘     └──────────────────────────────┘
```

**Verified functions** (in Dafny):
- `ClientLocalDispatch`: optimistic update, add to pending queue
- `ClientAcceptReply`: accept server reply, preserve remaining pending
- `HandleRealtimeUpdate`: re-apply pending on updates from other clients

**Unverified** (in JS):
- Network I/O, retry logic, offline detection (EffectManager)
- React binding (useSyncExternalStore)

## Security Notes

1. **RLS is enforced at the database level** - Even if client code is buggy, unauthorized access is prevented
2. **Edge Function uses service role for writes** - Allows atomic updates with optimistic locking
3. **Actor injection not needed** - Supabase auth.uid() provides authenticated user identity
4. **No Dafny authorization wrapper** - RLS handles membership; Dafny focuses on domain invariants
