#!/bin/bash
set -e

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

echo "Compiling ClearSplit to JavaScript..."
dafny translate js --no-verify -o generated/ClearSplit --include-runtime ClearSplit.dfy

echo "Copying to clear-split project..."
cp generated/ClearSplit.js clear-split/src/dafny/ClearSplit.cjs

echo "Done."
