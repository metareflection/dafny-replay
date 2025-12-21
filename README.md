# dafny-replay

A verified replayable state-transition kernel compiled from Dafny to JavaScript and used as a React reducer.

## Architecture

```
Replay.dfy              Abstract Domain & Kernel (verified, not compiled)
    ↓ include
ConcreteDomain.dfy      Concrete implementation (refines abstract modules)
    ↓ compile
generated/Replay.js     Generated JavaScript (don't edit)
    ↓ wrap
demo/src/dafny/app.js   ESM wrapper (clean API for React)
    ↓ import
demo/src/App.jsx        React UI
```

React owns rendering. Dafny owns state transitions.

## Quick Start

```bash
cd demo
npm install
npm run dev
```

## Recompiling After Dafny Changes

If you modify `Replay.dfy` or `ConcreteDomain.dfy`:

```bash
./compile.sh
```

Or manually:

```bash
dafny translate js --no-verify -o generated/Replay --include-runtime ConcreteDomain.dfy
cp generated/Replay.js demo/src/dafny/Replay.cjs
```

## Notes

- Abstract modules need `{:compile false}` to be excluded from JS compilation
- The generated JS uses CommonJS; the wrapper (`app.js`) bridges to ESM
- `AppCore` is the only module React should import
- To create a new domain, make a new file that includes `Replay.dfy` and refines `Domain` and `Kernel`

## Domains

- Concrete (demo)
- Kanban
