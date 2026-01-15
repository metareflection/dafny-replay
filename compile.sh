#!/bin/bash
set -e

# Usage: ./compile.sh [project]
# If no project specified, compiles all. Otherwise compiles only the specified project.
# Projects: counter, kanban, delegation-auth, counter-authority, kanban-multi-collaboration,
#           kanban-supabase, clear-split, clear-split-supabase, canon, colorwheel, collab-todo

TARGET="$1"

should_build() {
    [ -z "$TARGET" ] || [ "$TARGET" = "$1" ]
}

mkdir -p generated

# Clone dafny repo if not present (needed for DafnyRuntime)
if [ ! -d "dafny" ]; then
    echo "Cloning dafny repository..."
    git clone --depth 1 https://github.com/dafny-lang/dafny.git
fi

# Build dafny2js first
echo "Building dafny2js..."
(cd dafny2js && dotnet build --verbosity quiet)

if should_build counter; then
    echo "Compiling CounterDomain to JavaScript..."
    dafny translate js --no-verify -o generated/Counter --include-runtime counter/CounterDomain.dfy

    echo "Copying to counter project..."
    cp generated/Counter.js counter/src/dafny/Counter.cjs

    echo "Generating counter app.ts..."
    (cd dafny2js && dotnet run --no-build -- \
        --file ../counter/CounterDomain.dfy \
        --app-core AppCore \
        --cjs-name Counter.cjs \
        --client ../counter/src/dafny/app.ts)
fi

if should_build kanban; then
    echo "Compiling KanbanDomain to JavaScript..."
    dafny translate js --no-verify -o generated/Kanban --include-runtime kanban/KanbanDomain.dfy

    echo "Copying to kanban project..."
    cp generated/Kanban.js kanban/src/dafny/Kanban.cjs

    echo "Generating kanban app.ts..."
    (cd dafny2js && dotnet run --no-build -- \
        --file ../kanban/KanbanDomain.dfy \
        --app-core KanbanAppCore \
        --cjs-name Kanban.cjs \
        --client ../kanban/src/dafny/app.ts)
fi

if should_build delegation-auth; then
    echo "Compiling DelegationAuthDomain to JavaScript..."
    dafny translate js --no-verify -o generated/DelegationAuth --include-runtime delegation-auth/DelegationAuthDomain.dfy

    echo "Copying to delegation-auth project..."
    cp generated/DelegationAuth.js delegation-auth/src/dafny/DelegationAuth.cjs

    echo "Generating delegation-auth app.ts..."
    (cd dafny2js && dotnet run --no-build -- \
        --file ../delegation-auth/DelegationAuthDomain.dfy \
        --app-core DelegationAuthAppCore \
        --cjs-name DelegationAuth.cjs \
        --client ../delegation-auth/src/dafny/app.ts)
fi

if should_build counter-authority; then
    echo "Compiling CounterAuthority to JavaScript..."
    dafny translate js --no-verify -o generated/CounterAuthority --include-runtime counter-authority/CounterAuthority.dfy

    echo "Copying to counter-authority project..."
    cp generated/CounterAuthority.js counter-authority/server/CounterAuthority.cjs
    cp generated/CounterAuthority.js counter-authority/src/dafny/CounterAuthority.cjs
fi

if should_build kanban-multi-collaboration; then
    echo "Compiling KanbanMultiCollaboration to JavaScript..."
    dafny translate js --no-verify -o generated/KanbanMulti --include-runtime kanban/KanbanMultiCollaboration.dfy

    echo "Copying to kanban-multi-collaboration project..."
    cp generated/KanbanMulti.js kanban-multi-collaboration/server/KanbanMulti.cjs
    cp generated/KanbanMulti.js kanban-multi-collaboration/src/dafny/KanbanMulti.cjs

    echo "Generating kanban-multi-collaboration app.ts..."
    (cd dafny2js && dotnet run --no-build -- \
        --file ../kanban/KanbanMultiCollaboration.dfy \
        --app-core KanbanAppCore \
        --cjs-name KanbanMulti.cjs \
        --client ../kanban-multi-collaboration/src/dafny/app.ts)
fi

if should_build kanban-supabase; then
    echo "Copying to kanban-supabase project..."
    cp generated/KanbanMulti.js kanban-supabase/src/dafny/KanbanMulti.cjs

    echo "Compiling KanbanEffectStateMachine to JavaScript..."
    dafny translate js --no-verify -o generated/KanbanEffect --include-runtime kanban/KanbanEffectStateMachine.dfy

    echo "Copying KanbanEffectStateMachine to kanban-supabase project..."
    cp generated/KanbanEffect.js kanban-supabase/src/dafny/KanbanEffect.cjs

    echo "Generating kanban-supabase app.ts and dafny-bundle.ts..."
    (cd dafny2js && dotnet run --no-build -- \
        --file ../kanban/KanbanEffectStateMachine.dfy \
        --app-core KanbanEffectAppCore \
        --cjs-name KanbanEffect.cjs \
        --client ../kanban-supabase/src/dafny/app.ts \
        --deno ../kanban-supabase/supabase/functions/dispatch/dafny-bundle.ts \
        --cjs-path ../kanban-supabase/src/dafny/KanbanEffect.cjs \
        --dispatch KanbanMultiCollaboration.Dispatch)
fi

if should_build clear-split; then
    echo "Compiling ClearSplit to JavaScript..."
    dafny translate js --no-verify -o generated/ClearSplit --include-runtime clear-split/ClearSplit.dfy

    echo "Copying to clear-split project..."
    cp generated/ClearSplit.js clear-split/src/dafny/ClearSplit.cjs

    echo "Generating clear-split app.ts..."
    (cd dafny2js && dotnet run --no-build -- \
        --file ../clear-split/ClearSplit.dfy \
        --app-core ClearSplitAppCore \
        --cjs-name ClearSplit.cjs \
        --client ../clear-split/src/dafny/app.ts)
fi

if should_build clear-split-supabase; then
    echo "Compiling ClearSplitMultiCollaboration to JavaScript..."
    dafny translate js --no-verify -o generated/ClearSplitMulti --include-runtime clear-split/ClearSplitMultiCollaboration.dfy

    echo "Compiling ClearSplitEffectStateMachine to JavaScript..."
    dafny translate js --no-verify -o generated/ClearSplitEffect --include-runtime clear-split/ClearSplitEffectStateMachine.dfy

    echo "Copying to clear-split-supabase project..."
    cp generated/ClearSplitEffect.js clear-split-supabase/src/dafny/ClearSplitEffect.cjs

    echo "Generating clear-split-supabase app.ts and dafny-bundle.ts..."
    (cd dafny2js && dotnet run --no-build -- \
        --file ../clear-split/ClearSplitEffectStateMachine.dfy \
        --app-core ClearSplitEffectAppCore \
        --cjs-name ClearSplitEffect.cjs \
        --client ../clear-split-supabase/src/dafny/app.ts \
        --deno ../clear-split-supabase/supabase/functions/dispatch/dafny-bundle.ts \
        --cjs-path ../clear-split-supabase/src/dafny/ClearSplitEffect.cjs \
        --dispatch ClearSplitMultiCollaboration.Dispatch)
fi

if should_build canon; then
    echo "Compiling CanonDomain to JavaScript..."
    dafny translate js --no-verify -o generated/CanonReplay --include-runtime canon/CanonDomain.dfy

    echo "Copying to canon project..."
    cp generated/CanonReplay.js canon/src/dafny/CanonReplay.cjs

    echo "Generating canon app.ts..."
    (cd dafny2js && dotnet run --no-build -- \
        --file ../canon/CanonDomain.dfy \
        --app-core AppCore \
        --cjs-name CanonReplay.cjs \
        --client ../canon/src/dafny/app.ts)
fi

if should_build colorwheel; then
    echo "Compiling ColorWheelDomain to JavaScript..."
    dafny translate js --no-verify -o generated/ColorWheel --include-runtime colorwheel/ColorWheelDomain.dfy

    echo "Copying to colorwheel project..."
    cp generated/ColorWheel.js colorwheel/src/dafny/ColorWheel.cjs

    echo "Generating colorwheel app.ts..."
    (cd dafny2js && dotnet run --no-build -- \
        --file ../colorwheel/ColorWheelDomain.dfy \
        --app-core AppCore \
        --cjs-name ColorWheel.cjs \
        --client ../colorwheel/src/dafny/app.ts)
fi

if should_build collab-todo; then
    echo "Compiling TodoMultiCollaboration to JavaScript..."
    dafny translate js --no-verify --optimize-erasable-datatype-wrapper:false -o generated/TodoMulti --include-runtime collab-todo/TodoMultiCollaboration.dfy

    echo "Copying to collab-todo project..."
    cp generated/TodoMulti.js collab-todo/src/dafny/TodoMulti.cjs

    echo "Compiling TodoMultiProjectEffectStateMachine to JavaScript..."
    dafny translate js --no-verify --optimize-erasable-datatype-wrapper:false -o generated/TodoMultiProjectEffect --include-runtime collab-todo/TodoMultiProjectEffectStateMachine.dfy

    echo "Copying TodoMultiProjectEffectStateMachine to collab-todo project..."
    cp generated/TodoMultiProjectEffect.js collab-todo/src/dafny/TodoMultiProjectEffect.cjs

    echo "Generating collab-todo app.ts (multi-project)..."
    (cd dafny2js && dotnet run --no-build -- \
        --file ../collab-todo/TodoMultiProjectEffectStateMachine.dfy \
        --app-core TodoMultiProjectEffectAppCore \
        --cjs-name TodoMultiProjectEffect.cjs \
        --client ../collab-todo/src/dafny/app.ts \
        --null-options)

    echo "Generating collab-todo dispatch dafny-bundle.ts..."
    (cd dafny2js && dotnet run --no-build -- \
        --file ../collab-todo/TodoMultiCollaboration.dfy \
        --app-core TodoAppCore \
        --cjs-name TodoMulti.cjs \
        --deno ../collab-todo/supabase/functions/dispatch/dafny-bundle.ts \
        --cjs-path ../collab-todo/src/dafny/TodoMulti.cjs \
        --null-options \
        --dispatch TodoMultiCollaboration.Dispatch)

    echo "Generating collab-todo multi-dispatch dafny-bundle.ts..."
    (cd dafny2js && dotnet run --no-build -- \
        --file ../collab-todo/TodoMultiProjectEffectStateMachine.dfy \
        --app-core TodoMultiProjectEffectAppCore \
        --cjs-name TodoMultiProjectEffect.cjs \
        --deno ../collab-todo/supabase/functions/multi-dispatch/dafny-bundle.ts \
        --cjs-path ../collab-todo/src/dafny/TodoMultiProjectEffect.cjs \
        --null-options)
fi

echo "Done."
