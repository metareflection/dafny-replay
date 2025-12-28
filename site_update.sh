#!/bin/bash
set -e

cd colorwheel
npm run build
cd ..
cp colorwheel/dist/index.html docs/colorwheel/

cd canon
npm run build
cd ..
cp canon/dist/index.html docs/canon/
