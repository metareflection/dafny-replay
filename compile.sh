#!/bin/bash
set -e

mkdir -p generated

# Clone dafny repo if not present (needed for DafnyRuntime)
if [ ! -d "dafny" ]; then
    echo "Cloning dafny repository..."
    git clone --depth 1 https://github.com/dafny-lang/dafny.git
fi

# Build dafny2js first
echo "Building dafny2js..."
(cd dafny2js && dotnet build --verbosity quiet)

echo "Compiling CounterDomain to JavaScript..."
dafny translate js --no-verify -o generated/Counter --include-runtime CounterDomain.dfy

echo "Copying to counter project..."
cp generated/Counter.js counter/src/dafny/Counter.cjs

echo "Generating counter app.js..."
(cd dafny2js && dotnet run --no-build -- --file ../CounterDomain.dfy --app-core AppCore --cjs-name Counter.cjs --output ../counter/src/dafny/app.js)

echo "Compiling KanbanDomain to JavaScript..."
dafny translate js --no-verify -o generated/Kanban --include-runtime KanbanDomain.dfy

echo "Copying to kanban project..."
cp generated/Kanban.js kanban/src/dafny/Kanban.cjs

echo "Generating kanban app.js..."
(cd dafny2js && dotnet run --no-build -- --file ../KanbanDomain.dfy --app-core KanbanAppCore --cjs-name Kanban.cjs --output ../kanban/src/dafny/app.js)

echo "Compiling DelegationAuthDomain to JavaScript..."
dafny translate js --no-verify -o generated/DelegationAuth --include-runtime DelegationAuthDomain.dfy

echo "Copying to delegation-auth project..."
cp generated/DelegationAuth.js delegation-auth/src/dafny/DelegationAuth.cjs

echo "Generating delegation-auth app.js..."
(cd dafny2js && dotnet run --no-build -- --file ../DelegationAuthDomain.dfy --app-core DelegationAuthAppCore --cjs-name DelegationAuth.cjs --output ../delegation-auth/src/dafny/app.js)

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

echo "Generating kanban-multi-collaboration app.js..."
(cd dafny2js && dotnet run --no-build -- --file ../KanbanMultiCollaboration.dfy --app-core KanbanAppCore --cjs-name KanbanMulti.cjs --output ../kanban-multi-collaboration/src/dafny/app.js)

echo "Copying to kanban-supabase project..."
cp generated/KanbanMulti.js kanban-supabase/src/dafny/KanbanMulti.cjs

echo "Generating kanban-supabase app.js..."
(cd dafny2js && dotnet run --no-build -- --file ../KanbanMultiCollaboration.dfy --app-core KanbanAppCore --cjs-name KanbanMulti.cjs --output ../kanban-supabase/src/dafny/app.js)

echo "Building Deno bundle for kanban-supabase Edge Function..."
(cd kanban-supabase/supabase/functions/dispatch && node build-bundle.js)

echo "Compiling ClearSplit to JavaScript..."
dafny translate js --no-verify -o generated/ClearSplit --include-runtime ClearSplit.dfy

echo "Copying to clear-split project..."
cp generated/ClearSplit.js clear-split/src/dafny/ClearSplit.cjs

echo "Generating clear-split app.js..."
(cd dafny2js && dotnet run --no-build -- --file ../ClearSplit.dfy --app-core ClearSplitAppCore --cjs-name ClearSplit.cjs --output ../clear-split/src/dafny/app.js)

echo "Compiling CanonDomain to JavaScript..."
dafny translate js --no-verify -o generated/CanonReplay --include-runtime CanonDomain.dfy

echo "Copying to canon project..."
cp generated/CanonReplay.js canon/src/dafny/CanonReplay.cjs

echo "Generating canon app.js..."
(cd dafny2js && dotnet run --no-build -- --file ../CanonDomain.dfy --app-core AppCore --cjs-name CanonReplay.cjs --output ../canon/src/dafny/app.js)

echo "Compiling ColorWheelDomain to JavaScript..."
dafny translate js --no-verify -o generated/ColorWheel --include-runtime ColorWheelDomain.dfy

echo "Copying to colorwheel project..."
cp generated/ColorWheel.js colorwheel/src/dafny/ColorWheel.cjs

echo "Generating colorwheel app.js..."
(cd dafny2js && dotnet run --no-build -- --file ../ColorWheelDomain.dfy --app-core AppCore --cjs-name ColorWheel.cjs --output ../colorwheel/src/dafny/app.js)

echo "Done."
