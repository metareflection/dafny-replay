#!/bin/bash
set -e

echo "Compiling Dafny to JavaScript..."
dafny translate js --no-verify -o generated/Replay --include-runtime ConcreteDomain.dfy

echo "Copying to demo project..."
cp generated/Replay.js demo/src/dafny/Replay.cjs

echo "Done."
