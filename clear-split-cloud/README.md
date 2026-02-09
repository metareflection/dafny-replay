# ClearSplit Supabase

Dafny-verified collaborative expense splitting with Supabase backend.

## What's Verified

| Component | Verified in Dafny |
|-----------|-------------------|
| Balance conservation (sum = 0) | Yes |
| Expense shares sum to amount | Yes |
| All participants must be members | Yes |
| Settlement from/to must be members | Yes |
| Reconciliation (Rebase/Candidates) | Yes |
| Effect state machine (dispatch/retry) | Yes |
| JSON marshalling | No (JavaScript) |
| Network I/O | No (JavaScript) |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  ClearSplitEffectStateMachine.dfy                          │
│  - Effect state machine for dispatch/retry/offline         │
│  - Bounded retries (no infinite loops)                     │
│                                                            │
│  ClearSplitMultiCollaboration.dfy                          │
│  - Simple reconciliation (append-only, no conflicts)       │
│  - Rebase: identity (expenses/settlements don't conflict)  │
│  - Candidates: just the action itself                      │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase                                                  │
│  - Auth: Email/password                                    │
│  - Database: PostgreSQL with RLS                           │
│  - Edge Function: Verified Dafny Dispatch                  │
│  - Realtime: Instant sync across clients                   │
└─────────────────────────────────────────────────────────────┘
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

Copy `.env.example` to `.env` and add your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run database migrations

In Supabase SQL Editor, run `supabase/schema.sql`.

### 4. Deploy Edge Function

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy dispatch
```

### 5. Enable Realtime

In Supabase Dashboard, go to Database > Replication and enable realtime for the `groups` table.

### 6. Run the app

```bash
npm run dev
```

## How It Works

1. **User authenticates** via Supabase Auth
2. **User creates/joins expense group** (stored in `groups` table)
3. **User actions** (add expense, record payment) dispatch through verified Effect State Machine
4. **Edge Function** runs verified `ClearSplitMultiCollaboration.Dispatch`
5. **Realtime** pushes updates to all connected clients
6. **Offline mode** queues actions locally, syncs when online

## Files

```
src/
  App.jsx              - React UI (auth, group select, expense app)
  supabase.js          - Supabase client configuration
  hooks/
    EffectManager.js   - Verified effect orchestration
    useCollaborativeProject.js - React hook for state
  dafny/
    app.js             - Generated from Dafny
    app-extras.js      - JS wrappers for Effect State Machine
    ClearSplitEffect.cjs - Compiled Dafny code

supabase/
  schema.sql           - Database schema
  functions/
    dispatch/
      index.ts         - Edge Function handler
      build-bundle.js  - Bundles Dafny code for Deno
      dafny-bundle.ts  - Generated bundle
```

## Reconciliation

ClearSplit has trivially simple reconciliation because expenses and settlements are **append-only** operations that don't conflict:

- **Rebase**: Identity function (no transformation needed)
- **Candidates**: Just the original action (no fallbacks needed)
- **Explains**: Exact equality

This is much simpler than Kanban, which needs to handle:
- Card moves that reference deleted cards
- WIP limit violations from concurrent adds
- Column reordering conflicts

## Design Constraints

- Professional, compact UI
- Technology-focused aesthetic
- No border radius (not bubbly)
- No gradients
- Monochrome with semantic accents
