# HOWTO: Build a Dafny-Verified React App

This guide walks through creating a React app with a Dafny-verified state machine, step by step. We'll build a simple increment/decrement app as an example.

## Prerequisites

- [Dafny](https://dafny.org/) installed and available in PATH
- Node.js and npm

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

## Step 6: Compile Dafny to JavaScript

```bash
mkdir -p generated
dafny translate js --no-verify -o generated/MyApp --include-runtime MyAppDomain.dfy
```

Copy the generated JavaScript to the React app:

```bash
mkdir -p my-app/src/dafny
cp generated/MyApp.js my-app/src/dafny/MyApp.cjs
```

## Step 7: Create the Integration Layer

Create `my-app/src/dafny/app.js`:

```js
// ESM wrapper for Dafny-generated AppCore
// Provides a clean API for React without modifying generated code

import BigNumber from 'bignumber.js';

// Configure BigNumber as Dafny expects
BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

// Import the generated code as raw text
import myAppCode from './MyApp.cjs?raw';

// Set up the environment and evaluate the Dafny code
const require = (mod) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(`Unknown module: ${mod}`);
};

// Create a function that evaluates the code with proper scope
const initDafny = new Function('require', `
  ${myAppCode}
  return { _dafny, MyAppDomain, MyAppKernel, AppCore };
`);

const { AppCore } = initDafny(require);

// Create a clean API wrapper
const App = {
  // Initialize a new history
  Init: () => AppCore.__default.Init(),

  // Action constructors
  Inc: () => AppCore.__default.Inc(),
  Dec: () => AppCore.__default.Dec(),

  // State transitions
  Dispatch: (h, a) => AppCore.__default.Dispatch(h, a),
  Undo: (h) => AppCore.__default.Undo(h),
  Redo: (h) => AppCore.__default.Redo(h),

  // Selectors
  Present: (h) => {
    const val = AppCore.__default.Present(h);
    // Convert BigNumber to JavaScript number for display
    return val.toNumber();
  },
  CanUndo: (h) => AppCore.__default.CanUndo(h),
  CanRedo: (h) => AppCore.__default.CanRedo(h),
};

export default App;
```

## Step 8: Create the React Component

Replace `my-app/src/App.jsx`:

```jsx
import { useState } from 'react'
import App from './dafny/app.js'
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

Edit `my-app/src/App.css` as you see fit.

## Step 10: Run the App

```bash
cd my-app
npm run dev
```

Open http://localhost:5173 in your browser. Press `Ctrl+C` to stop the server.

## Summary

The architecture:

```
MyAppDomain.dfy          # Verified state machine
    |
    v
dafny translate js       # Compile to JavaScript
    |
    v
MyApp.cjs               # Generated code (don't edit)
    |
    v
app.js                  # Integration wrapper
    |
    v
App.jsx                 # React component
```

Key points:
- **Dafny owns state transitions**: All state changes go through the verified `Dispatch` function
- **React owns rendering**: React state holds the Dafny `History` object
- **Invariants verified at compile time**: The `Inv` predicate is proven to hold for all reachable states
- **Undo/Redo built-in**: The `Kernel` module provides history management for free
