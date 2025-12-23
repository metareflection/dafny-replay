#!/bin/bash
set -e

for f in *.dfy; do echo "=== $f ==="; dafny verify "$f"; done
