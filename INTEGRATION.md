# Dafny-JavaScript Integration Patterns

This document describes patterns for integrating Dafny-generated JavaScript with client (React/Vite) and server (Deno/Supabase Edge Functions) code.

## The dafny2js Tool

See [dafny2js/README.md](dafny2js/README.md) for full documentation on the code generation tool, including:
- CLI options (`--client`, `--deno`, `--null-options`, etc.)
- TypeScript support
- Type mapping between Dafny and JavaScript
- Generated bundle structure

---

## The app-extras.js Pattern

When you need to customize the API beyond what `dafny2js` generates, create `app-extras.js`:

```js
import GeneratedApp from './app.js';

const { _dafny, ClearSplitAppCore } = GeneratedApp._internal;

const App = {
  ...GeneratedApp,  // Inherit everything from generated

  // Override or add methods here
};

export default App;
```

### Common Customization Patterns

**1. Wrap Result types to return `{ok, model}` objects:**

```js
Init: (members) => {
  const memberSeq = _dafny.Seq.of(...members.map(m =>
    _dafny.Seq.UnicodeFromString(m)
  ));
  const result = ClearSplitAppCore.__default.Init(memberSeq);
  if (result.is_Ok) {
    return { ok: true, model: result.dtor_value };
  } else {
    return { ok: false, error: GeneratedApp.errToJson(result.dtor_error) };
  }
},
```

**2. Derive parameters automatically:**

```js
// Generated requires: MakeExpense(paidBy, amount, shares, shareKeys)
// App wants simpler: MakeExpense(paidBy, amount, shares)
MakeExpense: (paidBy, amountCents, shares) => {
  const shareKeys = Object.keys(shares);
  return GeneratedApp.MakeExpense(paidBy, amountCents, shares, shareKeys);
},
```

**3. Provide object-style enum access:**

```js
// Instead of: App.Vibrant()
// Allow: App.Mood.Vibrant
Mood: {
  Vibrant: ColorWheelSpec.Mood.create_Vibrant(),
  Pastel: ColorWheelSpec.Mood.create_Pastel(),
  // ...
},
```

**4. Return all map entries instead of single lookup:**

```js
// Generated: GetDelegations(m, key) returns single delegation
// App needs: GetDelegations(m) returns all delegations
GetDelegations: (m) => {
  const delegations = m.dtor_delegations;
  const result = [];
  for (const key of delegations.Keys.Elements) {
    const deleg = delegations.get(key);
    result.push({
      id: key.toNumber(),
      from: dafnyStringToJs(deleg.dtor_from),
      to: dafnyStringToJs(deleg.dtor_to),
    });
  }
  return result;
},
```

**5. Accept JSON for server communication:**

```js
InitClient: (version, modelJson) => {
  const model = GeneratedApp.modelFromJson(modelJson);
  return GeneratedApp.MakeClientState(version, model, []);
},
```

### Why Use GeneratedApp Functions

The generated `app.js` handles type conversion between JavaScript and Dafny. When writing `app-extras.js`, call `GeneratedApp` functions rather than `AppCore.__default` directly:

```js
// In app-extras.js - this works correctly:
MakeExpense: (paidBy, amount, shares) => {
  return GeneratedApp.MakeExpense(paidBy, amount, shares, Object.keys(shares));
},
```

`GeneratedApp.MakeExpense` internally converts `paidBy` from a JS string to a Dafny string (`seq<char>`) using `_dafny.Seq.UnicodeFromString()`. If you call `AppCore.__default.MakeExpense()` directly with a raw JS string, it will fail because Dafny expects its own string type.

---

## Essential Patterns (Reference)

These patterns are used internally by `dafny2js` and may be useful if you need to write custom code.

### Loading Dafny Code

**Client (Vite):**

```js
import BigNumber from 'bignumber.js';
BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

import myAppCode from './MyApp.cjs?raw';

const require = (mod) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(`Unknown module: ${mod}`);
};

const initDafny = new Function('require', `
  ${myAppCode}
  return { _dafny, MyAppDomain, AppCore };
`);

const { _dafny, AppCore } = initDafny(require);
```

**Server (Node.js):**

```js
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import BigNumber from 'bignumber.js';

BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const myAppCode = readFileSync(join(__dirname, 'MyApp.cjs'), 'utf-8');

// ... same require stub and initDafny pattern
```

### Calling Functions

Functions live under `Module.__default`:

```js
AppCore.__default.Init()
AppCore.__default.Dispatch(state, action)
```

### Numbers (BigNumber)

Dafny integers become BigNumber:

```js
// JS → Dafny
new BigNumber(42)

// Dafny → JS
bn.toNumber()

// Zero constant
_dafny.ZERO
```

### Strings

Dafny strings are sequences of characters:

```js
// JS → Dafny
_dafny.Seq.UnicodeFromString("hello")

// Dafny → JS
seq.toVerbatimString(false)
// or
Array.from(seq).join('')
```

### Sequences

```js
// JS array → Dafny seq
_dafny.Seq.of(...jsArray)

// Dafny seq → JS array
const arr = [];
for (let i = 0; i < seq.length; i++) {
  arr.push(seq[i]);
}
```

### Sets

```js
// JS array → Dafny set
_dafny.Set.fromElements(...jsArray)

// Dafny set → JS array
Array.from(set.Elements)
```

### Maps

```js
// Empty map
_dafny.Map.Empty

// Add entry
map = map.update(key, value)

// Check/get
map.contains(key)
map.get(key)

// Iterate keys
for (const key of map.Keys.Elements) { ... }

// Iterate pairs
for (let i = 0; i < map.length; i++) {
  const [key, val] = map[i];
}
```

### Datatype Access

```js
// Constructors: Module.Type.create_Variant(args...)
Module.Action.create_Inc()

// Variant checks: is_ prefix
if (action.is_Inc) { ... }

// Field access: dtor_ prefix
card.dtor_title
```

Note: Reserved words like `from` become `dtor_from`.

### Tuple Returns

```js
const [a, b] = Module.__default.SomeFunction(...)
```

---

## Incidental Patterns

These patterns depend on how your `.dfy` files define types and APIs.

### Result Types

If your Dafny code defines `Result<T, E>`:

```js
if (result.is_Ok) {
  const value = result.dtor_value;
} else {
  const error = result.dtor_error;
}
```

### Response Discriminators

Instead of using `is_` checks directly in JS, you can define helper functions in Dafny:

```dafny
datatype Reply = Accepted(...) | Rejected(...)

function IsAccepted(reply: Reply): bool { reply.Accepted? }
```

Then call from JS:

```js
if (AppCore.__default.IsAccepted(reply)) { ... }
```

This keeps the variant logic in Dafny and simplifies the JS wrapper.

### Server State

If your app uses a server state pattern:

```js
let serverState = AppCore.__default.InitServer(initialModel);

// On each request
const [newState, response] = AppCore.__default.Dispatch(serverState, ...);
serverState = newState;
```

### JSON Serialization

The generated `app.js` includes `toJson`/`fromJson` for all datatypes:

```js
// Serialize action for network
const json = App.actionToJson(action);

// Deserialize on server
const action = App.actionFromJson(json);

// Full model serialization
const modelJson = App.modelToJson(model);
const model = App.modelFromJson(modelJson);
```
