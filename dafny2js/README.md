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

### Generate client adapter (app.js)

```bash
dotnet run -- \
    --file ../CounterDomain.dfy \
    --app-core AppCore \
    --cjs-name Counter.cjs \
    --client ../counter/src/dafny/app.js
```

### Generate client + Deno bundle

```bash
dotnet run -- \
    --file ../KanbanEffectStateMachine.dfy \
    --app-core KanbanEffectAppCore \
    --cjs-name KanbanEffect.cjs \
    --client ../kanban-supabase/src/dafny/app.js \
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
    --client ../collab-todo/src/dafny/app.js \
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
| `--client` | Output path for client adapter (`app.js` or `app.ts`) |
| `--deno` | Output path for Deno adapter (`dafny-bundle.ts`) |
| `--cjs-path` | Path to the `.cjs` file (required for `--deno`) |
| `--null-options` | Enable null-based `Option` handling for DB compatibility |
| `--dispatch` | Dispatch function for Deno (format: `name:Module.Dispatch` or `Module.Dispatch`) |
| `--list`, `-l` | List datatypes and functions (for debugging) |

## What It Generates

### Client (`app.js`)

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
- **`dispatch()` function** that calls verified Dafny Dispatch

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
