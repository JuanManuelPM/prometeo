# Edge Stack — Engineering Memory

Date: 2026-08-28
Owner: `navigation.edge-stack`

This file records the design failures that materially changed the architecture. It exists so a future AI does not repeat visually plausible but structurally wrong implementations.

## 1. Detached labels broke layer ownership

### Failure
Numbers/words were positioned or revealed independently from their page. During reverse motion a label could appear over the wrong color.

### Lesson
A page is one layer: shape + label + clip. The label follows its page boundary. Visibility comes from physical z-order occlusion, not an independent label animation.

### Invariant
If a word is visible, the pixels behind it must belong to the same page.

## 2. Moving rear bodies horizontally created gaps

### Failure
Treating future tabs as horizontally translated full cards exposed gaps at the lower-left/lower-right while the current page lifted.

### Lesson
All rear bodies are complete and remain stacked at the body origin. Only the exposed lower boundary changes.

## 3. The last two blocks became equal

### Failure
A halving sequence that simply consumed the remainder ended with two equal smallest slices.

### Lesson
The visible right family is explicitly defined. The accepted current rule is remaining space `4u : 2u : 1u`, with an additional hidden preload. The final visible block is always smaller than the one before it.

## 4. Artificial reveal animation was wrong

### Failure
A special clip/reveal parameter was introduced to hide the last word and gradually show it later. The user immediately noticed the letters being manually covered/uncovered.

### Lesson
Never animate label visibility separately. Place the word inside its page and let the page above cover it.

## 5. One global large text margin wasted space

### Failure
A large right inset used to hide the smallest tab's word was applied to every secondary tab and sometimes to the primary word. Long words lost useful width.

### Lesson
Primary and readable intermediate tabs use small insets. Only the smallest `1u` tab reserves the geometric blank zone needed to guarantee color-only visibility.

## 6. Depth-dependent padding caused commit teleports

### Failure
Text inset depended on `depth`. During the gesture a page was at one depth; after commit the same page was rerendered at another depth and its word jumped horizontally.

### Lesson
A visible property may not be recomputed only after commit. Transition states must interpolate all properties that genuinely change. At `p=1`, geometry must already equal the next canonical state.

## 7. Adaptive primary width initially snapped after scroll

### Failure
The next word's wider main layout was calculated only after `current++`, so the stack moved, committed, then popped sideways.

### Lesson
Compute both `layoutFor(current)` and `layoutFor(target)` before/during the gesture and interpolate between them. Commit is bookkeeping only.

## 8. Too many adaptive variables made the geometry unstable

### Failure
Different percentages, margins and tab positions were independently adjusted for each word/aspect ratio.

### Lesson
Only one scalar adapts to the primary word: `mainWidth`. The remainder always uses the same `4:2:1` grammar.

## 9. The first mirrored implementation failed badly

### Failure
To support primary-on-right, the right-side shape was rewritten by hand with separate formulas for the body, inverse shoulder, lower corner and clip. It looked like a different component: curves reversed incorrectly, the background/body relationship changed, and the layer stack no longer matched the accepted left version.

### Root cause
The code mixed logical navigation coordinates with physical drawing coordinates. `side:right` became a second implementation instead of a projection.

### Repair
There is now exactly one canonical left/logical `canonicalLayerPath()`. The right mode applies an SVG transform equivalent to:

```text
translate(W, 0) scale(-1, 1)
```

The same exact path is used for the shape and its clip. Text glyphs are not mirrored; only the text bounding box is projected to the opposite side.

### Invariant
If a directional variant requires a second path function, stop: the abstraction is wrong.

## 10. Curves: normal vs inverse

### Failure
The first folder shoulder used `boundary - r`, rounding material inward like a normal rectangle. It looked backwards.

### Correct geometry
The inverse shoulder extends beyond the tab boundary (`boundary + r` in canonical left coordinates) and curves back to the vertical wall. It visually resolves against the page underneath.

### Lower corners
Every exposed tab also owns a rounded lower outer corner. The external widget owns the four outermost shell corners.

## 11. Responsive rule

Portrait mode may use a larger base primary fraction and a shorter rail, but it may not create a different component or a separate navigation algorithm.

## 12. Modification checklist

Before changing the component, verify:

- Does this preserve one canonical path?
- Are all pages still complete layers?
- Is the smallest tab color-only through occlusion?
- Does the remainder still split 4:2:1?
- Is only `mainWidth` adapting to primary word length?
- Does forward/backward use current and target canonical states?
- Is `p=1` visually identical to post-commit render?
- Can `side` be switched without new geometry code?
- Are curves capped so the smallest tab survives?
- Did we avoid adding dashboard chrome, breadcrumbs, counters or explanatory UI?

If any answer is no, the change should not be promoted.
