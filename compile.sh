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

echo "Done."
