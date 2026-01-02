#!/bin/bash
set -e

# Load environment variables from .env
export $(grep -v '^#' .env | xargs)

# Build and deploy
npm run build
npx wrangler pages deploy dist --project-name=clear-split-supabase
