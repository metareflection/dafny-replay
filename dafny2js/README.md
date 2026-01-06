# dafny2js

Generate JavaScript/TypeScript adapters from Dafny sources. This tool extracts datatypes and functions from Dafny code and generates the complete marshalling layer needed for:
- **Client apps** (React/Vite) via `--client`
- **Supabase Edge Functions** (Deno) via `--deno`

## Prerequisites

- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- Git

## Setup

Clone the Dafny sources (required for the Dafny AST/parsing APIs):

```bash
cd ..  # from dafny2js directory, go to parent (dafny-replay)
git clone --depth 1 https://github.com/dafny-lang/dafny.git
```

## Build

```bash
cd dafny2js
dotnet build
```

The first build will take a while as it compiles the Dafny dependencies.

## Usage

### Generate client adapter (app.ts)

```bash
dotnet run -- \
    --file ../CounterDomain.dfy \
    --app-core AppCore \
    --cjs-name Counter.cjs \
    --client ../counter/src/dafny/app.ts
```

### Generate client + Deno bundle

```bash
dotnet run -- \
    --file ../KanbanEffectStateMachine.dfy \
    --app-core KanbanEffectAppCore \
    --cjs-name KanbanEffect.cjs \
    --client ../kanban-supabase/src/dafny/app.ts \
    --deno ../kanban-supabase/supabase/functions/dispatch/dafny-bundle.ts \
    --cjs-path ../kanban-supabase/src/dafny/KanbanEffect.cjs \
    --dispatch KanbanMultiCollaboration.Dispatch
```

### Generate with null-option preprocessing

For projects that store `Option` fields as `null` in Supabase:

```bash
dotnet run -- \
    --file ../TodoMultiProjectEffectStateMachine.dfy \
    --app-core TodoMultiProjectEffectAppCore \
    --cjs-name TodoMultiProjectEffect.cjs \
    --client ../collab-todo/src/dafny/app.ts \
    --null-options
```

### List datatypes (for debugging)

```bash
dotnet run -- --file ../CounterDomain.dfy --list
```

## CLI Options

| Option | Description |
|--------|-------------|
| `--file`, `-f` | Path to the `.dfy` file (required) |
| `--app-core`, `-a` | Name of the AppCore module (auto-detected if omitted) |
| `--cjs-name`, `-c` | Name of the `.cjs` file to import |
| `--client` | Output path for client adapter (`.js` or `.ts` based on extension) |
| `--deno` | Output path for Deno adapter (`dafny-bundle.ts`) |
| `--cjs-path` | Path to the `.cjs` file (required for `--deno`) |
| `--null-options` | Enable null-based `Option` handling for DB compatibility |
| `--dispatch` | Dispatch function for Deno (format: `name:Module.Dispatch` or `Module.Dispatch`) |
| `--list`, `-l` | List datatypes and functions (for debugging) |

## TypeScript Support

Use `.ts` extension for `--client` to generate TypeScript with full type annotations:

```bash
--client ../counter/src/dafny/app.ts
```

Generated TypeScript includes:
- **JSON types**: `interface Model { ... }`, `type Action = ...`
- **Dafny runtime types**: `DafnyModel`, `DafnyAction`, `DafnySeq<T>`, etc.
- **Typed functions**: All wrappers have proper parameter and return types

### Type Checking

Run from repo root:

```bash
./typecheck.sh           # Check all projects
./typecheck.sh counter   # Check specific project
```

Requires `deno.json` at repo root (provides import map for `bignumber.js`).

## What It Generates

### Client (`app.ts`)

- **Helpers**: `seqToArray()`, `toNumber()`, `dafnyStringToJs()`
- **Type converters**: `modelFromJson()`, `actionToJson()`, etc.
- **Datatype constructors**: `App.AddTask(listId, title)`, `App.AtEnd()`, etc.
- **Model accessors**: `App.GetTasks(m, listId)`, etc.
- **AppCore function wrappers**: `App.EffectStep(es, event)`, etc.
- **Internal access**: `App._internal` for advanced use

### Deno (`dafny-bundle.ts`)

Everything from client, plus:
- **esm.sh imports** for Deno compatibility
- **Embedded `.cjs`** code (escaped for template literal)
- **`dispatch()` function** (when `--dispatch` specified) that calls verified Dafny Dispatch
- **Helper exports** (`dafnyStringToJs`, `seqToArray`, `toNumber`) for use by `bundle-extras.ts`

### bundle-extras.ts (hand-maintained)

For edge functions that need custom wrappers (e.g., multi-project operations), create a `bundle-extras.ts` that imports from the generated bundle and exports app-specific wrappers. See `collab-todo/supabase/functions/multi-dispatch/bundle-extras.ts` for an example.

## Type Mapping

| Dafny Type | JS → Dafny | Dafny → JS |
|------------|------------|------------|
| `nat` / `int` | `new BigNumber(x)` | `toNumber(x)` |
| `string` | `_dafny.Seq.UnicodeFromString(x)` | `dafnyStringToJs(x)` |
| `bool` | `x` | `x` |
| `seq<T>` | `_dafny.Seq.of(...arr.map(...))` | `seqToArray(x).map(...)` |
| `map<K,V>` | Loop with `.update()` | Iterate `.Keys.Elements` |
| Datatype | `typeFromJson(x)` | `typeToJson(x)` |

## Architecture

```
dafny2js/
├── Program.cs           # CLI entry point
├── TypeExtractor.cs     # Parse Dafny AST, extract datatypes & functions
├── TypeMapper.cs        # Generate conversion expressions per type
├── Emitters/
│   ├── SharedEmitter.cs # Common: helpers, type converters, constructors
│   ├── ClientEmitter.cs # Client-specific: JS or TS for Vite/React
│   └── DenoEmitter.cs   # Deno-specific: esm.sh imports, dispatch()
└── dafny2js.csproj
```

See [DESIGN.md](DESIGN.md) for detailed documentation.
