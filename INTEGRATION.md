# Dafny-JavaScript Integration Patterns

This document describes patterns for integrating Dafny-generated JavaScript with client (React/Vite) and server (Node.js/Express) code.

## Essential Patterns

These patterns are always needed when integrating Dafny-generated JavaScript.

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
  const value = result.value;
} else {
  const error = result.error;
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

If you need to send Dafny types over the wire:

```js
// Dafny → JSON
const actionToJson = (action) => {
  if (action.is_Inc) return { type: 'Inc' };
  if (action.is_Add) return { type: 'Add', n: action.dtor_n.toNumber() };
};

// JSON → Dafny
const actionFromJson = (json) => {
  switch (json.type) {
    case 'Inc': return Module.Action.create_Inc();
    case 'Add': return Module.Action.create_Add(new BigNumber(json.n));
  }
};
```

