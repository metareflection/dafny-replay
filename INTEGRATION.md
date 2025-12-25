# Dafny-JavaScript Integration Patterns

This document describes patterns for integrating Dafny-generated JavaScript with client (React/Vite) and server (Node.js/Express) code.

## Loading Dafny Code

### Client (Vite)

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

### Server (Node.js)

```js
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import BigNumber from 'bignumber.js';

BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const myAppCode = readFileSync(join(__dirname, 'MyApp.cjs'), 'utf-8');

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

## Type Conversions

### Numbers

```js
// JS → Dafny
new BigNumber(42)

// Dafny → JS
bn.toNumber()

// Zero constant
_dafny.ZERO
```

### Strings

```js
// JS → Dafny
_dafny.Seq.UnicodeFromString("hello")

// Dafny → JS
seq.toVerbatimString(false)
```

### Sequences (Arrays)

```js
// JS → Dafny
_dafny.Seq.of(item1, item2, item3)
_dafny.Seq.of(...jsArray)

// Dafny → JS
const seqToArray = (seq) => {
  const arr = [];
  for (let i = 0; i < seq.length; i++) {
    arr.push(seq[i]);
  }
  return arr;
};
```

### Maps (Objects)

```js
// JS → Dafny
let m = _dafny.Map.Empty;
m = m.update(key, value);

// Dafny → JS (iterate pairs)
const fromMap = (dafnyMap) => {
  const obj = {};
  for (let i = 0; i < dafnyMap.length; i++) {
    const [key, val] = dafnyMap[i];
    obj[key] = val;
  }
  return obj;
};

// Dafny → JS (iterate keys)
for (const key of dafnyMap.Keys.Elements) {
  const val = dafnyMap.get(key);
}

// Map operations
map.contains(key)  // check membership
map.get(key)       // get value
```

## Datatype Access

### Constructors

Dafny datatypes use `Module.Type.create_Variant(args...)`:

```js
// datatype Action = Inc | Dec | Add(n: int)
Module.Action.create_Inc()
Module.Action.create_Dec()
Module.Action.create_Add(new BigNumber(5))

// datatype Place = AtEnd | Before(anchor: int) | After(anchor: int)
Module.Place.create_AtEnd()
Module.Place.create_Before(new BigNumber(id))
```

### Variant Checks

Use the `is_` prefix:

```js
if (action.is_Inc) { ... }
if (action.is_Dec) { ... }
if (place.is_AtEnd) { ... }
if (place.is_Before) { ... }
```

### Field Access

Use the `dtor_` prefix:

```js
// datatype Card = Card(title: string, done: bool)
card.dtor_title
card.dtor_done

// datatype Action = Add(n: int)
action.dtor_n
```

Note: `from` is a reserved word in JS, so a field named `from` becomes `dtor_from`.

### Result Types

For `Result<T, E>` or similar:

```js
if (result.is_Ok) {
  const value = result.value;  // or result.dtor_value
} else {
  const error = result.error;  // or result.dtor_error
}
```

## Calling Dafny Functions

Functions live under `Module.__default`:

```js
AppCore.__default.Init()
AppCore.__default.Dispatch(state, action)
AppCore.__default.Present(history)
```

## Tuple Returns

Dafny functions returning tuples come back as arrays:

```js
const [newState, response] = AppCore.__default.Dispatch(state, version, action);
```

## Server State Management

For server apps, maintain mutable state:

```js
let serverState = AppCore.__default.InitServer(initialModel);

app.post('/dispatch', (req, res) => {
  const [newState, response] = AppCore.__default.Dispatch(serverState, ...);
  serverState = newState;  // update state
  // ... handle response
});
```

## Response Handling

Server responses often use discriminator functions:

```js
if (AppCore.__default.IsAccepted(reply)) {
  // success path
} else if (AppCore.__default.IsRejected(reply)) {
  // failure path
}

// Or with multiple response types
if (AppCore.__default.IsSuccess(response)) { ... }
if (AppCore.__default.IsStale(response)) { ... }
if (AppCore.__default.IsInvalid(response)) { ... }
```

## JSON Serialization

For API communication, convert Dafny types to/from JSON:

```js
// Dafny → JSON
const actionToJson = (action) => {
  if (action.is_Inc) return { type: 'Inc' };
  if (action.is_Dec) return { type: 'Dec' };
  if (action.is_Add) return { type: 'Add', n: action.dtor_n.toNumber() };
};

// JSON → Dafny
const actionFromJson = (json) => {
  switch (json.type) {
    case 'Inc': return Module.Action.create_Inc();
    case 'Dec': return Module.Action.create_Dec();
    case 'Add': return Module.Action.create_Add(new BigNumber(json.n));
  }
};
```
