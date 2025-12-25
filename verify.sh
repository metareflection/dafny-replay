#!/bin/bash
set -e

# ClearSplit.dfy is skipped on CI due to Z3 platform differences (see dafny-lang/dafny#1807)
# It verifies locally but times out on Linux CI. Verify it locally before committing.
SKIP="${SKIP_VERIFY:-}"

for f in *.dfy; do
  if [[ " $SKIP " == *" $f "* ]]; then
    echo "=== $f === (skipped)"
  else
    echo "=== $f ==="
    dafny verify "$f" --verification-time-limit=300
  fi
done
