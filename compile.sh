#!/bin/bash
set -e

mkdir -p generated

echo "Compiling CounterDomain to JavaScript..."
dafny translate js --no-verify -o generated/Counter --include-runtime CounterDomain.dfy

echo "Copying to counter project..."
cp generated/Counter.js counter/src/dafny/Counter.cjs

echo "Compiling KanbanDomain to JavaScript..."
dafny translate js --no-verify -o generated/Kanban --include-runtime KanbanDomain.dfy

echo "Copying to kanban project..."
cp generated/Kanban.js kanban/src/dafny/Kanban.cjs

echo "Compiling DelegationAuthDomain to JavaScript..."
dafny translate js --no-verify -o generated/DelegationAuth --include-runtime DelegationAuthDomain.dfy

echo "Copying to delegation-auth project..."
cp generated/DelegationAuth.js delegation-auth/src/dafny/DelegationAuth.cjs

echo "Compiling CounterAuthority to JavaScript..."
dafny translate js --no-verify -o generated/CounterAuthority --include-runtime CounterAuthority.dfy

echo "Copying to counter-authority project..."
cp generated/CounterAuthority.js counter-authority/server/CounterAuthority.cjs
cp generated/CounterAuthority.js counter-authority/src/dafny/CounterAuthority.cjs

echo "Compiling KanbanMultiCollaboration to JavaScript..."
dafny translate js --no-verify -o generated/KanbanMulti --include-runtime KanbanMultiCollaboration.dfy

echo "Copying to kanban-multi-collaboration project..."
cp generated/KanbanMulti.js kanban-multi-collaboration/server/KanbanMulti.cjs
cp generated/KanbanMulti.js kanban-multi-collaboration/src/dafny/KanbanMulti.cjs

echo "Copying to kanban-supabase project..."
cp generated/KanbanMulti.js kanban-supabase/src/dafny/KanbanMulti.cjs

echo "Building Deno bundle for kanban-supabase Edge Function..."
(cd kanban-supabase/supabase/functions/dispatch && node build-bundle.js)

echo "Compiling ClearSplit to JavaScript..."
dafny translate js --no-verify -o generated/ClearSplit --include-runtime ClearSplit.dfy

echo "Copying to clear-split project..."
cp generated/ClearSplit.js clear-split/src/dafny/ClearSplit.cjs

echo "Compiling CanonDomain to JavaScript..."
dafny translate js --no-verify -o generated/CanonReplay --include-runtime CanonDomain.dfy

echo "Copying to canon project..."
cp generated/CanonReplay.js canon/src/dafny/CanonReplay.cjs

echo "Compiling ColorWheelDomain to JavaScript..."
dafny translate js --no-verify -o generated/ColorWheel --include-runtime ColorWheelDomain.dfy

echo "Copying to colorwheel project..."
cp generated/ColorWheel.js colorwheel/src/dafny/ColorWheel.cjs

echo "Done."
