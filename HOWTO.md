# HOWTO: Build a Dafny-Verified React App

This guide walks through creating a React app with a Dafny-verified state machine, step by step. We'll build a simple increment/decrement app as an example.

## Prerequisites

- [Dafny](https://dafny.org/) installed and available in PATH
- Node.js and npm
- The `dafny2js` tool (included in this repo)

## Step 1: The Replay Framework

The `Replay.dfy` file provides the abstract `Domain` and `Kernel` modules that your app will refine. This file should already exist in the repository.

## Step 2: Create the Dafny Domain

Create `MyAppDomain.dfy`:

```dafny
include "Replay.dfy"

module MyAppDomain refines Domain {
  type Model = int

  datatype Action = Inc | Dec

  predicate Inv(m: Model) {
    m >= 0
  }

  function Apply(m: Model, a: Action): Model {
    match a
    case Inc => m + 1
    case Dec => m - 1
  }

  function Normalize(m: Model): Model {
    if m < 0 then 0 else m
  }

  lemma StepPreservesInv(m: Model, a: Action)
    ensures Inv(Normalize(Apply(m, a)))
  {
  }
}

module MyAppKernel refines Kernel {
  import D = MyAppDomain
}

module AppCore {
  import K = MyAppKernel
  import D = MyAppDomain

  function Init(): K.History { K.History([], 0, []) }

  function Inc(): D.Action { D.Inc }
  function Dec(): D.Action { D.Dec }

  function Dispatch(h: K.History, a: D.Action): K.History { K.Do(h, a) }
  function Undo(h: K.History): K.History { K.Undo(h) }
  function Redo(h: K.History): K.History { K.Redo(h) }

  function Present(h: K.History): D.Model { h.present }
  function CanUndo(h: K.History): bool { |h.past| > 0 }
  function CanRedo(h: K.History): bool { |h.future| > 0 }
}
```

The file contains three modules:
- **MyAppDomain**: Refines `Domain` with your state (`Model`), actions (`Action`), invariant (`Inv`), transition function (`Apply`), and normalization (`Normalize`)
- **MyAppKernel**: Refines `Kernel` to provide undo/redo history
- **AppCore**: The public API exposing `Init`, `Dispatch`, `Undo`, `Redo`, `Present`, etc.

## Step 3: Verify the Dafny Code

```bash
dafny verify MyAppDomain.dfy
```

This verifies that your invariant is preserved by all state transitions.

## Step 4: Create the React App

From the repository root:

```bash
npm create vite@latest my-app -- --template react
cd my-app
npm install
npm install bignumber.js
cd ..
```

## Step 5: Configure Vite

Edit `my-app/vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['bignumber.js'],
  },
})
```

## Step 6: Compile Dafny to JavaScript and Generate app.js

The `dafny2js` tool automates the generation of the integration layer:

```bash
# Create output directories
mkdir -p generated my-app/src/dafny

# Compile Dafny to JavaScript
dafny translate js --no-verify -o generated/MyApp --include-runtime MyAppDomain.dfy

# Copy the generated JavaScript
cp generated/MyApp.js my-app/src/dafny/MyApp.cjs

# Generate the app.js integration layer
dotnet run --project dafny2js -- \
  --file MyAppDomain.dfy \
  --app-core AppCore \
  --cjs-name MyApp.cjs \
  --output my-app/src/dafny/app.js
```

The generated `app.js` provides:
- Proper ESM imports for the Dafny runtime
- Type converters (`toJson`/`fromJson`) for all datatypes
- Action constructors that accept JS values and convert to Dafny types
- Model accessors that return JS-friendly values
- All functions from `AppCore` wrapped for easy calling

## Step 7: Customize with app-extras.js (Optional)

If you need to customize the API beyond what `dafny2js` generates, create `my-app/src/dafny/app-extras.js`:

```js
// App-specific convenience wrappers
import GeneratedApp from './app.js';

const App = {
  ...GeneratedApp,

  // Override Init to return {ok, model} instead of raw Result
  Init: (initialValue) => {
    const result = GeneratedApp.Init(initialValue);
    if (result.is_Ok) {
      return { ok: true, model: result.dtor_value };
    } else {
      return { ok: false, error: GeneratedApp.errToJson(result.dtor_error) };
    }
  },

  // Add convenience method that derives parameters
  DoSomething: (a, b) => {
    const derived = computeSomething(a, b);
    return GeneratedApp.DoSomething(a, b, derived);
  },
};

export default App;
```

Then import from `app-extras.js` in your React code instead of `app.js`.

**When to use app-extras.js:**
- Wrap Result types to return `{ok, model}` objects
- Derive parameters automatically (e.g., derive `shareKeys` from `shares` object)
- Provide alternative accessor patterns (e.g., `App.Mood.Vibrant` instead of `App.Vibrant()`)
- Add JSON-accepting wrappers for server communication

**Important:** Always delegate to `GeneratedApp` functions for type conversion. Don't bypass the generated converters or you may pass raw JS strings where Dafny expects `seq<char>`.

## Step 8: Create the React Component

Replace `my-app/src/App.jsx`:

```jsx
import { useState } from 'react'
import App from './dafny/app.js'  // or './dafny/app-extras.js' if customized
import './App.css'

function MyApp() {
  // Store the Dafny History in React state
  const [h, setH] = useState(() => App.Init())

  const inc = () => setH(App.Dispatch(h, App.Inc()))
  const dec = () => setH(App.Dispatch(h, App.Dec()))
  const undo = () => setH(App.Undo(h))
  const redo = () => setH(App.Redo(h))

  return (
    <>
      <h1>My Dafny App</h1>
      <p className="subtitle">Verified, replayable reducer kernel</p>

      <div className="card">
        <div className="value">{App.Present(h)}</div>

        <div className="button-row">
          <button onClick={dec}>Dec</button>
          <button onClick={inc}>Inc</button>
        </div>

        <div className="button-row">
          <button onClick={undo} disabled={!App.CanUndo(h)}>
            Undo
          </button>
          <button onClick={redo} disabled={!App.CanRedo(h)}>
            Redo
          </button>
        </div>
      </div>

      <p className="info">
        React owns rendering, Dafny owns state transitions.
        <br />
        The invariant (value &gt;= 0) is verified at compile time.
      </p>
    </>
  )
}

export default MyApp
```

## Step 9: Add Styling (Optional)

Edit `my-app/src/App.css` as you see fit ([example](counter/src/App.css)).

## Step 10: Run the App

```bash
cd my-app
npm run dev
```

Open http://localhost:5173 in your browser.

## Summary

The architecture:

```
MyAppDomain.dfy          # Verified state machine
    |
    v
dafny translate js       # Compile to JavaScript
    |
    v
MyApp.cjs               # Generated Dafny code (don't edit)
    |
    v
dafny2js                # Generate integration layer
    |
    v
app.js                  # Generated API wrapper (don't edit)
    |
    v
app-extras.js           # Optional customizations
    |
    v
App.jsx                 # React component
```

Key points:
- **Dafny owns state transitions**: All state changes go through the verified `Dispatch` function
- **React owns rendering**: React state holds the Dafny `History` object
- **Invariants verified at compile time**: The `Inv` predicate is proven to hold for all reachable states
- **Undo/Redo built-in**: The `Kernel` module provides history management for free
- **app.js is auto-generated**: Use `dafny2js` to regenerate after Dafny changes
- **Customize via app-extras.js**: Layer customizations on top, don't modify generated code
