# Deploying clear-split-cloud with Cloudflare

This guide walks through deploying clear-split-cloud using Cloudflare Workers, D1, and Durable Objects.

For convenience, we use `$APP` for shell commands:
```bash
export APP=clearsplit
```
but there are textual references to `clearsplit` otherwise.

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
- Node.js 18+

## Step 1: Compile Dafny Bundle

First, generate the Cloudflare-compatible Dafny bundle:

```bash
./compile.sh clear-split-cloud
```

This creates `clear-split-cloud/worker/src/dafny-bundle.ts`.

## Step 2: Set Up Worker

```bash
cd clear-split-cloud/worker

# Install dependencies
npm install

# Login to Cloudflare (if not already)
npx wrangler login
```

## Step 3: Create D1 Database

```bash
# Create the database
npx wrangler d1 create $APP

# Note the database_id from the output, e.g.:
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Update `wrangler.toml` with your database_id:

```toml
[[d1_databases]]
binding = "DB"
database_name = "clearsplit"
database_id = "YOUR_DATABASE_ID_HERE"  # <-- Replace this
```

## Step 4: Initialize Database Schema

```bash
# For local development
npx wrangler d1 execute $APP --local --file=schema.sql

# For production (after first deploy)
npx wrangler d1 execute $APP --remote --file=schema.sql
```

## Step 5: Set JWT Secret

```bash
# Set the secret (use a strong random string)
npx wrangler secret put JWT_SECRET
# Enter your secret when prompted
```

## Step 6: Run Locally

```bash
# Start the worker locally
npm run dev
# Worker runs at http://localhost:8787
```

In a separate terminal, start the frontend:

```bash
cd clear-split-cloud

# Create .env for Cloudflare mode
cat > .env << 'EOF'
VITE_BACKEND=cloudflare
VITE_API_URL=http://localhost:8787
EOF

# Start frontend
npm run dev
```

## Step 7: Test Locally

1. Open http://localhost:5173 (or whatever port Vite uses)
2. Sign up with email/password
3. Create a group
4. Add expenses and settlements
5. Verify balances update correctly

## Step 8: Deploy to Production

```bash
cd clear-split-cloud/worker

# Deploy worker
npm run deploy
# Output shows: https://clearsplit-api.USERNAME.workers.dev

# Run migrations on production D1
npx wrangler d1 execute $APP --remote --file=schema.sql
```

## Step 9: Custom Domain (Optional)

If you want a custom domain instead of `.workers.dev`:

**Prerequisite:** Domain must be in Cloudflare (DNS managed by Cloudflare).

Add to `wrangler.toml` (at top level, before `[[d1_databases]]`):

```toml
# Keep .workers.dev URL active alongside custom domain
workers_dev = true

routes = [
  { pattern = "api.clearsplit.yourdomain.com", custom_domain = true }
]
```

Then redeploy:

```bash
npx wrangler deploy
```

Your API is now at `https://api.clearsplit.yourdomain.com`.

## Step 10: Configure Frontend for Production

Update your frontend `.env.production` with your API URL (custom domain or workers.dev):

```bash
VITE_BACKEND=cloudflare
VITE_API_URL=https://api.clearsplit.yourdomain.com  # or https://clearsplit-api.USERNAME.workers.dev
```

Build and deploy frontend to Cloudflare Pages:

```bash
cd clear-split-cloud

# Create .env.production with your API URL
echo "VITE_BACKEND=cloudflare" > .env.production
echo "VITE_API_URL=https://api.clearsplit.yourdomain.com" >> .env.production

# Build (uses .env.production automatically)
npm run build

# Create Pages project (first time only)
npx wrangler pages project create $APP --production-branch=main

# Deploy to Pages
npx wrangler pages deploy dist --project-name=$APP --branch=main --commit-dirty
```

Your frontend is now at `https://clearsplit.pages.dev` (or set up a custom domain in the Cloudflare dashboard).

**Subsequent frontend deploys:**
```bash
npm run build
npx wrangler pages deploy dist --project-name=$APP --branch=main --commit-dirty
```

## Switching Between Backends

The same codebase supports both Supabase and Cloudflare:

**Supabase mode:**
```bash
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Cloudflare mode:**
```bash
VITE_BACKEND=cloudflare
VITE_API_URL=http://localhost:8787
```

## Troubleshooting

### "Dafny bundle not yet compiled"
Run `./compile.sh clear-split-cloud` from the repo root.

### "Database not found" or "no such table"
For local dev:
```bash
npx wrangler d1 execute $APP --local --file=schema.sql
```

For production:
```bash
npx wrangler d1 execute $APP --remote --file=schema.sql
```

### Reset local D1 database

```bash
rm -rf .wrangler/state/v3/d1
npx wrangler d1 execute $APP --local --file=schema.sql
```

### Reset production D1 database

**Warning:** This deletes all data. All users will need to re-register.

```bash
npx wrangler d1 execute $APP --remote --file=drop.sql
npx wrangler d1 execute $APP --remote --file=schema.sql
```

### CORS errors
The worker includes CORS headers for all origins. If you need to restrict, update the `cors()` config in `worker/src/index.ts`.

### WebSocket connection fails
Ensure the token is passed in the query string. Check browser console for connection errors.

### Frontend changes not showing
1. Rebuild: `npm run build`
2. Redeploy: `npx wrangler pages deploy dist --project-name=$APP --branch=main --commit-dirty`
3. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### View worker logs
```bash
npx wrangler tail
```

### Check remote D1 tables
```bash
npx wrangler d1 execute $APP --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```

## Pages Custom Domain

No wrangler CLI exists for Pages custom domains. Use Cloudflare Dashboard:

1. Go to Workers & Pages → your project
2. Click "Custom domains" tab
3. Click "Set up a custom domain"
4. Enter your domain (e.g., `clearsplit.yourdomain.com`)

## Running Local and Production Simultaneously

```bash
# Terminal 1 - Local worker
cd clear-split-cloud/worker && npx wrangler dev

# Terminal 2 - Frontend → local backend
cd clear-split-cloud
npm run dev  # uses .env.development, port 5173

# Terminal 3 - Frontend → production backend
cd clear-split-cloud
npm run dev -- --mode production --port 5174  # uses .env.production
```

Open http://localhost:5173 (local) and http://localhost:5174 (production).
