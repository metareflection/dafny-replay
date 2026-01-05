# dafny2js Design Document

## Overview

`dafny2js` generates JavaScript/TypeScript adapters from Dafny source files. It creates type-safe wrappers that convert between JSON (used by databases, networks, UIs) and Dafny runtime types (`BigNumber`, `_dafny.Seq`, `_dafny.Map`, etc.).

## Goals

1. **Single source of truth**: Generate both client (React/Vite) and server (Deno/Supabase) adapters from the same Dafny source
2. **Type safety**: Wrappers hide Dafny internals from app code
3. **DB compatibility**: Handle null-based `Option` storage (Supabase JSONB)

## Compilation Pipeline

```
Dafny Source (.dfy)
       │
       ▼
┌─────────────────┐
│ dafny translate │ ──► .cjs (compiled Dafny + runtime)
│ js              │
└─────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│ dafny2js                                    │
│                                             │
│  --client app.js      (JS or TS for Vite)   │
│  --deno dafny-bundle.ts (TS for Supabase)   │
│  --null-options       (DB compatibility)    │
└─────────────────────────────────────────────┘
```

## CLI Interface

```bash
dafny2js \
  --file TodoMultiProjectEffectStateMachine.dfy \
  --app-core TodoMultiProjectEffectAppCore \
  --cjs-name TodoMultiProjectEffect.cjs \
  --client ../collab-todo/src/dafny/app.js \
  --deno ../collab-todo/supabase/functions/dispatch/dafny-bundle.ts \
  --cjs-path ../collab-todo/src/dafny/TodoMultiProjectEffect.cjs \
  --null-options \
  --dispatch TodoMultiCollaboration.Dispatch
```

### Options

| Flag | Description |
|------|-------------|
| `--file`, `-f` | Path to the `.dfy` file (required) |
| `--app-core`, `-a` | Name of the `AppCore` module to wrap functions from |
| `--cjs-name`, `-c` | Name of the `.cjs` file to import |
| `--client` | Output path for client adapter (JS/TS based on extension) |
| `--deno` | Output path for Deno adapter (always TypeScript) |
| `--cjs-path` | Path to the `.cjs` file (required for `--deno`) |
| `--null-options` | Enable null-based `Option` handling for DB compatibility |
| `--dispatch` | Dispatch function to generate (format: `name:Module.Dispatch` or `Module.Dispatch`) |
| `--list`, `-l` | Debug: list extracted datatypes and functions |

### Multiple Edge Functions

For projects with multiple Edge Functions, run `dafny2js` multiple times:

```bash
# Single-project dispatch (uses --dispatch for collaboration protocol)
dafny2js --file TodoMultiCollaboration.dfy \
  --deno functions/dispatch/dafny-bundle.ts \
  --dispatch TodoMultiCollaboration.Dispatch

# Multi-project dispatch (uses bundle-extras.ts pattern)
dafny2js --file TodoMultiProjectEffectStateMachine.dfy \
  --deno functions/multi-dispatch/dafny-bundle.ts \
  --null-options
```

The multi-dispatch function uses a hand-maintained `bundle-extras.ts` that imports from the generated bundle and calls Dafny functions directly.

## Source Architecture

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

### `SharedEmitter`

Base class that generates code shared by both client and Deno:

1. **Helpers**
   - `seqToArray(seq)` - Dafny seq → JS array
   - `toNumber(bn)` - `BigNumber` → JS number
   - `dafnyStringToJs(seq)` - Dafny string → JS string

2. **Type Converters** (per datatype)
   - `fooFromJson(json)` - JSON → Dafny type
   - `fooToJson(value)` - Dafny type → JSON

3. **Datatype Constructors** (convenience wrappers)
   - `App.AddTask(listId, title)` → handles `BigNumber`/`Seq` conversion

4. **Model Accessors**
   - `App.GetTasks(m, listId)` → returns plain JS array

5. **AppCore Function Wrappers**
   - `App.EffectStep(es, event)` → wraps `AppCore` functions

### `ClientEmitter`

Extends `SharedEmitter` for React/Vite clients:

- Imports `.cjs` via Vite's `?raw` query
- Exports `App` object with all wrappers
- Exports `App._internal` for advanced access to Dafny modules
- When `--null-options` enabled, generates preprocessing for types with `Option` fields

### `DenoEmitter`

Extends `SharedEmitter` for Supabase Edge Functions:

- Imports `BigNumber` from `esm.sh`
- Embeds escaped `.cjs` code in template literal
- Generates `dispatch()` function that:
  - Converts JSON inputs to Dafny types
  - Calls verified `Dispatch` function
  - Converts results back to JSON

## Null-Option Handling

### The Problem

Supabase JSONB stores `null` for missing values. Dafny `Option`s use tagged format:

```javascript
// Dafny Option (tagged)
{ type: 'None' }
{ type: 'Some', value: { year: 2024, month: 1, day: 15 } }

// Database storage (null-based)
null
{ year: 2024, month: 1, day: 15 }
```

### Solution: `--null-options`

When enabled, `dafny2js` generates preprocessing functions for datatypes that have `Option` fields:

```javascript
const preprocessTaskJson = (json) => {
  if (!json) return json;
  return {
    ...json,
    dueDate: fixOption(json.dueDate),
    deletedBy: fixOption(json.deletedBy),
  };
};

// taskFromJson now uses preprocessing
const taskFromJson = (json) => _taskFromJsonOriginal(preprocessTaskJson(json));
```

The `App` object exports the preprocessed versions, so consumers get automatic null→`Option` conversion.

### Configuration

The `--null-options` flag assumes the standard Dafny pattern:

```dafny
datatype Option<T> = None | Some(value: T)
```

## Generated Output

### Client (`app.js`)

```javascript
// Generated by dafny2js
import BigNumber from 'bignumber.js';
import dafnyCode from './X.cjs?raw';

BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });
const initDafny = new Function('require', `...`);
const { _dafny, Domain, AppCore } = initDafny(require);

// Helpers
const seqToArray = (seq) => { ... };
const toNumber = (bn) => { ... };
const dafnyStringToJs = (seq) => { ... };

// Type Converters
const modelFromJson = (json) => { ... };
const modelToJson = (value) => { ... };
// ...

// App Wrapper
const App = {
  // Datatype constructors
  AddTask: (listId, title) => Domain.Action.create_AddTask(...),

  // Model accessors
  GetTasks: (m, listId) => { ... },

  // AppCore functions
  EffectStep: (es, event) => AppCore.__default.EffectStep(es, event),

  // Converters
  modelFromJson,
  modelToJson,
  actionFromJson,
  actionToJson,
};

App._internal = { _dafny, Domain, AppCore, BigNumber };
export default App;
```

### Deno (`dafny-bundle.ts`)

```typescript
// Generated by dafny2js
// DO NOT EDIT - regenerate with: ./compile.sh

import BigNumber from 'https://esm.sh/bignumber.js@9.1.2';

BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

// Dafny runtime mock
const require = (mod: string) => { ... };
const exports = {};
const module = { exports };

// Embedded Dafny code
const initDafny = new Function('require', 'exports', 'module', `
  ${escapedDafnyCode}
  return { _dafny, Domain, Collaboration, AppCore };
`);

const { _dafny, Domain, Collaboration, AppCore } = initDafny(require, exports, module);

// Helpers & Type Converters (same as client)
// ...

// Dispatch function
export interface DispatchResult {
  status: 'accepted' | 'rejected';
  state?: any;
  appliedAction?: any;
  newVersion?: number;
  noChange?: boolean;
  appliedLog?: any[];
  auditLog?: any[];
  reason?: string;
}

export function dispatch(
  stateJson: any,
  appliedLog: any[],
  baseVersion: number,
  actionJson: any,
  auditLog?: any[]
): DispatchResult {
  const serverState = serverStateFromJson({ ... });
  const action = actionFromJson(actionJson);

  // Call VERIFIED Dispatch
  const result = Collaboration.__default.Dispatch(serverState, ...);

  // Convert result back to JSON
  return { ... };
}
```

## app-extras.js / bundle-extras.ts

The generated files provide type conversion and convenience wrappers. For app-specific additions:

**Client (`app-extras.js`):**
- Domain function wrappers not in `AppCore`
- UI conveniences
- Grouped accessors

**Deno (`bundle-extras.ts`):**
- Custom wrappers that call Dafny functions directly
- Used when the standard `--dispatch` pattern doesn't fit (e.g., multi-project operations)
- Imports converters and helpers from generated `dafny-bundle.ts`

The bundle exports `dafnyStringToJs`, `seqToArray`, `toNumber` for use by `bundle-extras.ts`.

## Testing

1. **Build**: `cd dafny2js && dotnet build`
2. **Generate**: `./compile.sh <project>` (e.g., `./compile.sh collab-todo`)
3. **Verify**: Check generated `app.js` and `dafny-bundle.ts`
4. **Run**: Test the React app and Edge Functions

## Projects

| Project | `AppCore` | `--null-options` | `--dispatch` |
|---------|-----------|------------------|--------------|
| `counter` | `AppCore` | No | N/A |
| `kanban` | `KanbanAppCore` | No | N/A |
| `kanban-supabase` | `KanbanEffectAppCore` | No | `KanbanMultiCollaboration.Dispatch` |
| `collab-todo` | `TodoMultiProjectEffectAppCore` | Yes | `TodoMultiCollaboration.Dispatch` (single), `bundle-extras.ts` (multi) |
| `clear-split-supabase` | `ClearSplitEffectAppCore` | No | `ClearSplitMultiCollaboration.Dispatch` |

## Future Work

1. **Fix TypeScript strict mode errors**: The generated `dafny-bundle.ts` has implicit `any` types. Check with `deno check bundle-extras.ts` (which imports the bundle). Add explicit type annotations to generated code.
2. **TypeScript client output**: Support `.ts` extension for `--client` with full type definitions
3. **Shared runtime package**: Extract helpers to npm/deno package instead of inlining
