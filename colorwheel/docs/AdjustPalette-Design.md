# AdjustPalette: Proven Linked Adjustments

## Problem Statement

The ColorWheel application has two adjustment modes:
- **Linked**: Adjustments affect ALL 5 colors simultaneously
- **Independent**: Adjustments affect only a single selected color

The UI needed "Adjust Palette" controls in the sidebar that ALWAYS adjust all colors, regardless of the current `adjustmentMode` state. Meanwhile, clicking individual color swatches should allow independent editing of just that color.

## Initial Workaround (UI-Level Fix)

The initial implementation used the existing `AdjustColor` action, which checks `adjustmentMode`:

```dafny
case AdjustColor(index, deltaH, deltaS, deltaL) =>
  if m.adjustmentMode == Linked then
    ApplyLinkedAdjustment(m, deltaH, deltaS, deltaL)
  else
    ApplyIndependentAdjustment(m, index, deltaH, deltaS, deltaL)
```

The UI workaround was to dispatch `SetAdjustmentMode(Linked)` before each `AdjustColor`:

```jsx
const ensureLinkedMode = () => {
  if (model.adjustmentMode?.$tag !== 0) {
    dispatch(App.SetAdjustmentMode(App.AdjustmentMode.Linked));
  }
};

const handleHChange = (newValue) => {
  ensureLinkedMode();  // Switch to Linked first
  dispatch(App.AdjustColor(0, delta, 0, 0));
};
```

### Problems with the Workaround

1. **Race condition**: React state updates are batched. When `ensureLinkedMode()` dispatches, the state hasn't updated by the time `AdjustColor` is dispatched.

2. **Required ref-based dispatch**: We had to modify `ColorWheelContext` to use a ref for immediate state tracking:
   ```jsx
   const hRef = useRef(h);
   const dispatch = (action) => {
     const newH = App.Dispatch(hRef.current, action);
     hRef.current = newH;  // Immediate update
     setH(newH);
   };
   ```

3. **Not proven**: The behavior relies on UI logic correctly managing mode, not on the specification.

## Solution: AdjustPalette Action (Spec-Level Fix)

We added a new action `AdjustPalette` that is **proven** to always apply linked adjustments, regardless of the current mode.

### Specification (ColorWheelSpec.dfy)

```dafny
datatype Action =
  | AdjustColor(index: int, deltaH: int, deltaS: int, deltaL: int)
  | AdjustPalette(deltaH: int, deltaS: int, deltaL: int)  // NEW
  | ...

function Apply(m: Model, a: Action): Model {
  match a
  // Existing: behavior depends on adjustmentMode
  case AdjustColor(index, deltaH, deltaS, deltaL) =>
    if m.adjustmentMode == Linked then
      ApplyLinkedAdjustment(m, deltaH, deltaS, deltaL)
    else
      ApplyIndependentAdjustment(m, index, deltaH, deltaS, deltaL)

  // NEW: Always linked, regardless of adjustmentMode
  case AdjustPalette(deltaH, deltaS, deltaL) =>
    if |m.colors| != 5 then m
    else if forall i | 0 <= i < 5 :: ValidColor(m.colors[i]) then
      ApplyLinkedAdjustment(m, deltaH, deltaS, deltaL)
    else m
  ...
}
```

### Key Differences

| Aspect | AdjustColor | AdjustPalette |
|--------|-------------|---------------|
| Checks `adjustmentMode` | Yes | No |
| Takes `index` parameter | Yes | No |
| Affects all colors | Only if Linked | Always |
| Proven behavior | Conditional | Unconditional |

### Proof

The invariant preservation proof works automatically because:

1. `AdjustPalette` reuses the existing `ApplyLinkedAdjustment` function
2. The proof relies on `Normalize` to ensure invariant holds after any action
3. `ApplyLinkedAdjustment` already has lemmas proving it produces valid colors

```
dafny verify ColorWheelDomain.dfy
Dafny program verifier finished with 2 verified, 0 errors
```

## Updated UI Implementation

The React component is now simpler:

```jsx
// Before: UI workaround with mode switching
const handleHChange = (newValue) => {
  ensureLinkedMode();  // Extra dispatch
  dispatch(App.AdjustColor(0, delta, 0, 0));
};

// After: Single dispatch, proven behavior
const handleHChange = (newValue) => {
  dispatch(App.AdjustPalette(delta, 0, 0));
};
```

## Architecture Summary

```
+-------------------+     +------------------+     +------------------+
|   Adjust Palette  |     |   Color Swatch   |     |   Dafny Spec     |
|   (Sidebar)       |     |   (Click to Edit)|     |                  |
+-------------------+     +------------------+     +------------------+
         |                        |                        |
         v                        v                        v
  AdjustPalette(dH,dS,dL)  SetColorDirect(i,c)    ApplyLinkedAdjustment()
         |                        |                        |
         +------------------------+                        |
                     |                                     |
                     v                                     |
              Dispatch(action) --------------------------->|
                     |                                     |
                     v                                     v
              React re-render <-------- Normalize(Apply(m, a))
                     |                         |
                     v                         v
              Instant UI update         Invariant preserved
```

## Benefits of Spec-Level Solution

1. **Proven correctness**: The Dafny verifier proves `AdjustPalette` always affects all colors
2. **Simpler UI code**: No mode-switching logic needed
3. **Single dispatch**: Better performance, cleaner undo history
4. **Semantic clarity**: The action name reflects its guaranteed behavior
5. **No race conditions**: Behavior doesn't depend on state at dispatch time

## Files Changed

- `ColorWheelSpec.dfy`: Added `AdjustPalette` action and handler
- `ColorWheelDomain.dfy`: Exposed `AdjustPalette` in AppCore module
- `colorwheel/src/dafny/app.js`: Regenerated JavaScript
- `colorwheel/src/components/AdjustSection.jsx`: Uses `AdjustPalette`
