# Deploy an App to Supabase

Step-by-step guide to deploy a dafny-replay app with Supabase backend (using clear-split-cloud as example).

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (`npm install -g supabase`)
- A Supabase account at [supabase.com](https://supabase.com)
- Node.js and npm
- Dafny installed (for recompiling the bundle)

## Create Supabase Project

- Go to [supabase.com/dashboard](https://supabase.com/dashboard)
- Click "New project"

## Initialize Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase/schema.sql`
3. Paste and run it in the SQL Editor

This creates:
- `groups` table (stores Dafny-verified state)
- `group_members` table (membership)
- `group_invites` table (invitations)
- `profiles` table (user metadata)
- Row Level Security policies
- Helper functions (`create_expense_group`, `join_group`, etc.)

## Link Supabase Project

```bash
cd clear-split-cloud

# Login to Supabase
supabase login

# Link to your project
supabase link
```

## Deploy Edge Function

```bash
# Deploy the dispatch function
supabase functions deploy dispatch
```

## Configure Frontend

Copy `.env.example` to `.env` and configure for Supabase:

```bash
cd clear-split-cloud
cp .env.example .env
```

Edit `.env`:

```bash
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Find those values from your Supabase project dashboard:

- Go to **(Project) Settings > Data API**
   - Note down **Project URL** (e.g., `https://abcdefg.supabase.co`)
- Go to **(Project) Settings > API Keys > Legacy anon, service_role API keys**
   - Note down **anon public** key (starts with `eyJ...`)

## Test Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Deploy Frontend

### Option: Deploy to Netlify

```bash
npm run build
# Upload dist/ folder to Netlify
```

### Option: Deploy to Cloudflare Pages

```bash
npm run build
./deploy.sh
```

