#!/bin/bash
set -e

SKIP="${SKIP_VERIFY:-}"

for f in *.dfy; do
  if [[ " $SKIP " == *" $f "* ]]; then
    echo "=== $f === (skipped)"
  else
    echo "=== $f ==="
    dafny verify "$f" --verification-time-limit=300
  fi
done
