#!/bin/bash
set -e

# Usage: ./typecheck.sh [project]
# If no project specified, checks all. Otherwise checks only the specified project.
# Projects: counter, kanban, delegation-auth, kanban-multi-collaboration,
#           kanban-cloud, clear-split, clear-split-cloud, canon, colorwheel, collab-todo

TARGET="$1"

should_check() {
    [ -z "$TARGET" ] || [ "$TARGET" = "$1" ]
}

ERRORS=0

# Ensure node_modules exists for a project, run npm install if missing
ensure_deps() {
    local dir="$1"
    if [ -d "$dir" ] && [ -f "$dir/package.json" ] && [ ! -d "$dir/node_modules" ]; then
        echo "Installing dependencies for $dir..."
        (cd "$dir" && npm install --silent)
    fi
}

# Shared cloudflare package (workers depend on this)
ensure_deps "cloudflare"

check_file() {
    local file="$1"
    if [ -f "$file" ]; then
        local dir="${file%%/*}"
        ensure_deps "$dir"
        echo "Checking $file..."
        if ! deno check "$file" 2>&1; then
            ERRORS=$((ERRORS + 1))
        fi
    fi
}

# Check TypeScript files using tsc (for non-Deno projects like Cloudflare Workers)
check_tsc() {
    local dir="$1"
    if [ -d "$dir" ]; then
        ensure_deps "$dir"
        echo "Checking $dir with tsc..."
        if ! (cd "$dir" && npx tsc --noEmit 2>&1); then
            ERRORS=$((ERRORS + 1))
        fi
    fi
}

# Client files (app.ts and app-extras.ts)
if should_check counter; then
    check_file "counter/src/dafny/app.ts"
fi

if should_check kanban; then
    check_file "kanban/src/dafny/app.ts"
fi

if should_check delegation-auth; then
    check_file "delegation-auth/src/dafny/app.ts"
    check_file "delegation-auth/src/dafny/app-extras.ts"
fi

if should_check kanban-multi-collaboration; then
    check_file "kanban-multi-collaboration/src/dafny/app.ts"
    check_file "kanban-multi-collaboration/src/dafny/app-extras.ts"
fi

if should_check kanban-cloud; then
    check_file "kanban-cloud/src/dafny/app.ts"
    check_file "kanban-cloud/src/dafny/app-extras.ts"
    check_file "kanban-cloud/supabase/functions/dispatch/dafny-bundle.ts"
    check_tsc "kanban-cloud/worker"
fi

if should_check clear-split; then
    check_file "clear-split/src/dafny/app.ts"
    check_file "clear-split/src/dafny/app-extras.ts"
fi

if should_check clear-split-cloud; then
    check_file "clear-split-cloud/src/dafny/app.ts"
    check_file "clear-split-cloud/src/dafny/app-extras.ts"
    check_file "clear-split-cloud/supabase/functions/dispatch/dafny-bundle.ts"
    check_tsc "clear-split-cloud/worker"
fi

if should_check canon; then
    check_file "canon/src/dafny/app.ts"
    check_file "canon/src/dafny/app-extras.ts"
fi

if should_check colorwheel; then
    check_file "colorwheel/src/dafny/app.ts"
    check_file "colorwheel/src/dafny/app-extras.ts"
fi

if should_check collab-todo; then
    check_file "collab-todo/src/dafny/app.ts"
    check_file "collab-todo/src/dafny/app-extras.ts"
    check_file "collab-todo/supabase/functions/dispatch/dafny-bundle.ts"
    check_file "collab-todo/supabase/functions/multi-dispatch/dafny-bundle.ts"
    check_tsc "collab-todo/worker"
fi


if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "TypeCheck failed with $ERRORS error(s)"
    exit 1
else
    echo ""
    echo "All type checks passed!"
fi
