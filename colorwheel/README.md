# ColorWheel - Verified Color Palette Generator

A React app powered by Dafny-verified color palette generation logic.

## Features

- **Mood-based palettes**: Vibrant, Soft/Muted, Pastel, Deep/Jewel, Earth, Neon
- **Color harmony**: Complementary, Triadic, Analogous, Split-Complement, Square
- **Verified constraints**: All mood and harmony rules are mathematically proven to hold
- **Undo/Redo**: Full history management with time-travel

## How to run

```bash
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

## Architecture

```
ColorWheelSpec.dfy        # Specification (types, invariants, Apply, Normalize)
    |
ColorWheelDomain.dfy      # Refines Replay.dfy Domain
    |
dafny translate js        # Compile to JavaScript
    |
ColorWheel.cjs            # Generated code (don't edit)
    |
app.js                    # Integration wrapper
    |
App.jsx                   # React UI
```

### Dafny files

- [ColorWheelSpec.dfy](../ColorWheelSpec.dfy)
- [ColorWheelDomain.dfy](../ColorWheelDomain.dfy)
- [ColorWheelProof.dfy](../ColorWheelProof.dfy)

## Development

To recompile the Dafny code after changes:

```bash
cd ..
./compile.sh
```

This will recompile all domains including ColorWheel.
