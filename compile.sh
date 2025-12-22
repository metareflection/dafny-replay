#!/bin/bash
set -e

echo "Compiling ConcreteDomain to JavaScript..."
dafny translate js --no-verify -o generated/Replay --include-runtime ConcreteDomain.dfy

echo "Copying to demo project..."
cp generated/Replay.js demo/src/dafny/Replay.cjs

echo "Compiling KanbanDomain to JavaScript..."
dafny translate js --no-verify -o generated/Kanban --include-runtime KanbanDomain.dfy

echo "Copying to kanban project..."
cp generated/Kanban.js kanban/src/dafny/Kanban.cjs

echo "Compiling DelegationAuthDomain to JavaScript..."
dafny translate js --no-verify -o generated/DelegationAuth --include-runtime DelegationAuthDomain.dfy

echo "Copying to delegation-auth project..."
cp generated/DelegationAuth.js delegation-auth/src/dafny/DelegationAuth.cjs

echo "Compiling ConcreteAuthority to JavaScript..."
dafny translate js --no-verify -o generated/Authority --include-runtime ConcreteAuthority.dfy

echo "Copying to demo-authority project..."
cp generated/Authority.js demo-authority/server/Authority.cjs
cp generated/Authority.js demo-authority/src/dafny/Authority.cjs

echo "Compiling KanbanMultiCollaboration to JavaScript..."
dafny translate js --no-verify -o generated/KanbanMulti --include-runtime KanbanMultiCollaboration.dfy

echo "Copying to kanban-multi-collaboration project..."
cp generated/KanbanMulti.js kanban-multi-collaboration/server/KanbanMulti.cjs
cp generated/KanbanMulti.js kanban-multi-collaboration/src/dafny/KanbanMulti.cjs

echo "Done."
