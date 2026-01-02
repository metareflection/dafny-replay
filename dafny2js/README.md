# dafny2js

Generate JavaScript adapter code (`app.js`) from Dafny sources. This tool extracts datatypes and functions from Dafny code and generates the complete marshalling layer needed to integrate with React/JavaScript applications.

## Prerequisites

- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- Git

## Setup

Clone the Dafny sources (required for the Dafny AST/parsing APIs):

```bash
cd ..  # from dafny2js directory, go to parent (dafny-replay)
git clone https://github.com/dafny-lang/dafny.git
```

Your directory structure should look like:
```
dafny-replay/
├── dafny/          # Cloned Dafny sources
├── dafny2js/       # This tool
├── counter/
├── kanban/
└── ...
```

## Build

```bash
cd dafny2js
dotnet build
```

The first build will take a while as it compiles the Dafny dependencies.

## Usage

### Generate app.js

```bash
# Simple app (Counter)
dotnet run -- --file ../CounterDomain.dfy \
              --app-core AppCore \
              --cjs-name Counter.cjs \
              --output ../counter/src/dafny/app.js

# Complex app (Kanban with MultiCollaboration)
dotnet run -- --file ../KanbanMultiCollaboration.dfy \
              --app-core KanbanAppCore \
              --cjs-name KanbanMulti.cjs \
              --output ../kanban-supabase/src/dafny/app.js
```

### List datatypes (for debugging)

```bash
dotnet run -- --file ../CounterDomain.dfy --list
```

Output:
```
=== Extracted Datatypes ===

datatype CounterDomain.Action
  | Inc
  | Dec

datatype CounterKernel.History
  | History(past: seq<int>, present: int, future: seq<int>)

=== AppCore Functions ===

  Init(): History
  Inc(): Action
  Dec(): Action
  Dispatch(h: History, a: Action): History
  ...
```

## CLI Options

| Option | Description |
|--------|-------------|
| `-f, --file <path>` | Path to the .dfy file (required) |
| `-a, --app-core <name>` | Name of the AppCore module (auto-detected if omitted) |
| `-o, --output <path>` | Output path for generated app.js (stdout if omitted) |
| `-c, --cjs-name <name>` | Name of the .cjs file to import (default: derived from .dfy filename) |
| `-l, --list` | List datatypes and functions (for debugging) |

The `--cjs-name` flag is useful when the compiled .cjs file has a different name than the .dfy source. For example, `KanbanMultiCollaboration.dfy` compiles to `KanbanMulti.cjs`.

## What It Generates

### 1. Boilerplate
- BigNumber import and configuration
- Dafny code loading via `new Function()`
- Module exports

### 2. Helper Functions
- `seqToArray()` - Convert Dafny seq to JS array
- `toNumber()` - Convert BigNumber to JS number
- `dafnyStringToJs()` - Convert Dafny string to JS string

### 3. Datatype Conversions
For each datatype (Action, Model, Place, etc.):
- `actionFromJson(json)` - JSON → Dafny
- `actionToJson(value)` - Dafny → JSON

### 4. API Wrapper
- **Place constructors**: `AtEnd()`, `Before(anchor)`, `After(anchor)`
- **Action constructors**: `AddCard(col, title)`, `MoveCard(id, toCol, place)`, etc.
- **Model accessors**: `GetCols(m)`, `GetLanes(m, col)`, `GetWip(m, col)`, etc.
- **ClientState management** (for MultiCollaboration):
  - `InitClient(version, modelJson)`
  - `LocalDispatch(client, action)`
  - `HandleRealtimeUpdate(client, serverVersion, serverModelJson)`
  - `GetPendingCount(client)`, `GetBaseVersion(client)`, etc.
- **AppCore function wrappers**: Direct access to all AppCore functions

## Type Mapping

| Dafny Type | JS → Dafny | Dafny → JS |
|------------|------------|------------|
| `nat` / `int` | `new BigNumber(x)` | `toNumber(x)` |
| `string` | `_dafny.Seq.UnicodeFromString(x)` | `dafnyStringToJs(x)` |
| `bool` | `x` | `x` |
| `seq<T>` | `_dafny.Seq.of(...arr.map(...))` | `seqToArray(x).map(...)` |
| `map<K,V>` | Loop with `.update()` | Iterate `.Keys.Elements` |
| Datatype | `typeFromJson(x)` | `typeToJson(x)` |

## Example Output

For `KanbanMultiCollaboration.dfy`, generates ~420 lines including:

```javascript
// Place constructors
AtEnd: () => KanbanDomain.Place.create_AtEnd(),
Before: (anchor) => KanbanDomain.Place.create_Before(new BigNumber(anchor)),
After: (anchor) => KanbanDomain.Place.create_After(new BigNumber(anchor)),

// Action constructors
AddCard: (col, title) => KanbanDomain.Action.create_AddCard(
  _dafny.Seq.UnicodeFromString(col),
  _dafny.Seq.UnicodeFromString(title)
),
MoveCard: (id, toCol, place) => KanbanDomain.Action.create_MoveCard(
  new BigNumber(id),
  _dafny.Seq.UnicodeFromString(toCol),
  place
),

// Model accessors
GetCols: (m) => seqToArray(m.dtor_cols).map(x => dafnyStringToJs(x)),
GetLanes: (m, key) => {
  const dafnyKey = _dafny.Seq.UnicodeFromString(key);
  if (m.dtor_lanes.contains(dafnyKey)) {
    const val = m.dtor_lanes.get(dafnyKey);
    return seqToArray(val).map(x => toNumber(x));
  }
  return null;
},

// ClientState management
InitClient: (version, modelJson) => {
  const model = modelFromJson(modelJson);
  return KanbanAppCore.__default.MakeClientState(
    new BigNumber(version),
    model,
    _dafny.Seq.of()
  );
},
LocalDispatch: (client, action) => KanbanAppCore.__default.ClientLocalDispatch(client, action),
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Dafny Source (.dfy)                            │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  TypeExtractor                                  │
│  - Parse via Dafny API                          │
│  - Extract datatypes, constructors, fields      │
│  - Extract AppCore functions                    │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  TypeMapper                                     │
│  - Generate JS conversion expressions           │
│  - Handle nested types recursively              │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  AppJsEmitter                                   │
│  - Generate boilerplate                         │
│  - Generate toJson/fromJson functions           │
│  - Generate API wrapper                         │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  app.js (generated)                             │
└─────────────────────────────────────────────────┘
```
