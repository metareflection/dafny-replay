# Dafny-React Integration: BigNumber and ES Module Issues

This document explains the integration challenges encountered when connecting Dafny-generated JavaScript to a React/Vite application, and how they were resolved.

## Problem Summary

After compiling Dafny to JavaScript and attempting to use it in React, two main issues occurred:

1. **ES Module Loading Error**: `The requested module does not provide an export named 'default'`
2. **React Rendering Error**: `Objects are not valid as a React child (found: [object BigNumber])`

## Root Causes

### 1. Dafny JS Output is Not an ES Module

Dafny compiles to JavaScript using IIFEs (Immediately Invoked Function Expressions), not ES modules. The generated code looks like:

```javascript
let ColorWheelSpec = (function() {
  let $module = {};
  // ... module code ...
  return $module;
})();
```

This code expects:
- A global `require` function for loading `bignumber.js`
- Global scope for module variables like `_dafny`, `ColorWheelSpec`, etc.

Simply adding `export default` at the end doesn't work because the code relies on runtime evaluation with proper scope.

### 2. Dafny Uses BigNumber for All Integers

Dafny's `int` type compiles to `BigNumber` objects, not native JavaScript numbers. This affects:
- Model fields: `baseHue`, `contrastPair` indices
- Color values: `h`, `s`, `l` properties
- Sequence lengths and indices

React cannot render BigNumber objects directly in JSX:
```jsx
{/* This throws an error */}
<label>Base Hue: {model.baseHue}°</label>
```

## Solution Architecture

```
ColorWheelDomain.dfy     # Verified Dafny source
        |
        v
dafny translate js       # Compile with --include-runtime
        |
        v
ColorWheel.cjs           # Generated code (NEVER modify)
        |
        v
app.js                   # ESM wrapper with type conversion
        |
        v
ColorWheelContext.jsx    # React context with model conversion
        |
        v
React Components         # Use plain JS numbers
```

## Fix 1: Proper ES Module Wrapper (app.js)

The wrapper uses Vite's `?raw` import to load generated code as text, then evaluates it with proper scope:

```javascript
import BigNumber from 'bignumber.js';

// Configure BigNumber as Dafny expects
BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

// Import generated code as raw text
import colorWheelCode from './ColorWheel.cjs?raw';

// Create require shim for Dafny's bignumber.js dependency
const require = (mod) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(`Unknown module: ${mod}`);
};

// Evaluate with proper scope, returning needed modules
const initDafny = new Function('require', `
  ${colorWheelCode}
  return { _dafny, ColorWheelSpec, AppCore };
`);

const { _dafny, ColorWheelSpec, AppCore } = initDafny(require);
```

### Why `new Function`?

The generated Dafny code creates module variables at the top level. Using `new Function`:
- Creates a proper scope for these variables
- Allows us to inject the `require` shim
- Returns the modules we need for the wrapper

### Action Wrappers with Type Conversion

The wrapper converts JS numbers to BigNumber when calling Dafny functions:

```javascript
const bn = (n) => new BigNumber(n);
const seq = (arr) => _dafny.Seq.of(...arr);

const App = {
  GeneratePalette: (baseHue, mood, harmony, randomSeeds) =>
    AppCore.__default.GeneratePalette(
      bn(baseHue),           // JS number -> BigNumber
      mood,                   // Dafny type (pass through)
      harmony,                // Dafny type (pass through)
      seq(randomSeeds.map(bn)) // JS array -> Dafny seq<int>
    ),

  SetColorDirect: (index, color) =>
    AppCore.__default.SetColorDirect(
      bn(index),
      ColorWheelSpec.Color.create_Color(
        bn(color.h), bn(color.s), bn(color.l)
      )
    ),
  // ...
};
```

### Exposing Dafny Types as Singletons

Dafny datatypes have `create_*` factory methods. For convenience, pre-create singleton instances:

```javascript
Mood: {
  Vibrant: ColorWheelSpec.Mood.create_Vibrant(),
  SoftMuted: ColorWheelSpec.Mood.create_SoftMuted(),
  // ...
},
Harmony: {
  Complementary: ColorWheelSpec.Harmony.create_Complementary(),
  // ...
},
```

This allows React code to use `App.Mood.Vibrant` instead of `App.Mood.create_Vibrant()`.

## Fix 2: Model Conversion in React Context

The React context converts Dafny model to plain JS objects with native numbers:

```javascript
// Helper to convert BigNumber to JS number
const toNum = (bn) =>
  (bn && typeof bn.toNumber === 'function') ? bn.toNumber() : bn;

// Convert Dafny model to plain JS object
const convertModel = (dafnyModel) => {
  if (!dafnyModel) return null;

  // Convert colors array (Dafny seq -> JS array)
  const colors = [];
  const dafnyColors = dafnyModel.dtor_colors;
  if (dafnyColors) {
    for (let i = 0; i < dafnyColors.length; i++) {
      const c = dafnyColors[i];
      colors.push({
        h: toNum(c.dtor_h),  // BigNumber -> number
        s: toNum(c.dtor_s),
        l: toNum(c.dtor_l),
      });
    }
  }

  // Convert contrast pair tuple
  const cp = dafnyModel.dtor_contrastPair;
  const contrastPair = cp ? [toNum(cp[0]), toNum(cp[1])] : [0, 1];

  return {
    baseHue: toNum(dafnyModel.dtor_baseHue),
    mood: dafnyModel.dtor_mood,           // Keep Dafny type for comparisons
    harmony: dafnyModel.dtor_harmony,
    colors,
    adjustmentMode: dafnyModel.dtor_adjustmentMode,
    contrastPair,
  };
};

// In the provider:
const model = convertModel(App.Present(h));
```

### Why Keep Dafny Types for mood/harmony?

These are used for:
1. Comparison with `$tag` property to determine current selection
2. Passing back to Dafny actions unchanged

They don't need conversion because they're not rendered directly.

## Key Patterns

### Dafny Field Access

Dafny record fields are accessed via `dtor_` prefix:
```javascript
dafnyModel.dtor_baseHue      // not dafnyModel.baseHue
color.dtor_h                  // not color.h
```

### Dafny Sequence Iteration

Dafny sequences support index access and `.length`:
```javascript
for (let i = 0; i < seq.length; i++) {
  const item = seq[i];
}
```

### Dafny Tuple Access

Tuples are arrays:
```javascript
const [first, second] = dafnyModel.dtor_contrastPair;
```

### Random Seeds

Dafny functions requiring randomness take explicit seed arrays:
```javascript
const randomSeeds = () =>
  Array.from({ length: 10 }, () => Math.floor(Math.random() * 101));

dispatch(App.GeneratePalette(hue, mood, harmony, randomSeeds()));
```

## Files Changed

| File | Purpose |
|------|---------|
| `colorwheel/src/dafny/ColorWheel.cjs` | Generated Dafny code (never edit) |
| `colorwheel/src/dafny/app.js` | ESM wrapper with type conversion |
| `colorwheel/src/context/ColorWheelContext.jsx` | Model conversion, randomSeeds helper |
| `colorwheel/src/components/*.jsx` | Updated to use converted model |

## Lessons Learned

1. **Never modify generated Dafny code** - Create a wrapper instead
2. **Use `?raw` import for non-ES module code** - Allows proper scope evaluation
3. **Convert at boundaries** - JS->BigNumber when calling Dafny, BigNumber->JS when reading model
4. **Keep Dafny types for logic, convert for rendering** - Mood/Harmony stay as Dafny types for comparisons
