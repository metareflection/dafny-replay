#!/bin/bash
set -e

SKIP="${SKIP_VERIFY:-}"

for f in */*.dfy; do
  skip=false; for p in $SKIP; do [[ "$f" == *"$p"* ]] && skip=true; done
  if $skip; then
    echo "=== $f === (skipped)"
  else
    echo "=== $f ==="
    dafny verify "$f" --verification-time-limit=300
  fi
done
