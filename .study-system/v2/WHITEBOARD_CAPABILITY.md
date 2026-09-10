# Study System V2 — Mnemonic Whiteboard Capability

Capability id: `mnemonic_whiteboard`

## Intent

Turn active note-making into a persistent visual retrieval cue **without replacing the existing study architecture**.

The ordinary study surface remains primary:

`module summary → topic inventory → expandable topic explanation`

The whiteboard is an optional capability attached beneath an individual topic. A topic must remain completely usable when the board is never opened.

When the learner opens the board, it expands into a large working surface for drawings/handwritten structure. When the board closes, that large surface collapses and, if it contains marks, becomes a small mnemonic thumbnail inside the same topic card. The thumbnail is a personal retrieval cue, not a replacement for the topic title, anchor, summary or explanation.

## Placement invariant

Do **not** create a whiteboard-first page or a separate card architecture for topics merely because this capability is enabled.

- Closed module/topic layout must preserve the normal study overview.
- Opening a topic reveals its normal explanation first.
- The board launcher appears after/below that topic content.
- The board expands only on explicit request.
- Closing the board restores the normal topic view.
- A non-empty board leaves behind a compact thumbnail/mini-flashcard associated with that topic.
- If no drawing exists, a closed topic should not gain unnecessary extra visual weight.

## Open state

- Large board usable with desktop mouse, iPad/pen and phone touch.
- Pointer Events; `touch-action:none` on the drawing surface.
- Drawing persists per topic.
- Resize/orientation/theme changes do not erase or distort geometry.
- The topic explanation remains conceptually authoritative; drawing is learner-authored memory support.

## Closed state

- If the board contains marks, render a small thumbnail inside/beneath the topic card.
- Thumbnail always uses the current two theme colors.
- Clicking/tapping the thumbnail reopens the topic/board.
- The thumbnail should feel like a small visual flashcard, not like a second full content panel.

## Baseline tool contract

- `pen` — freehand stroke.
- `highlighter` — broad mark while preserving the two-color system.
- `line` — straight line.
- `curve3` — three-point curve: start, control, end.
- `eraser_stroke` — removes an entire stroke, never raster pixels.
- `laser` — temporary, non-persistent pointer.
- `undo` — restores previous drawing state.
- `clear` — clears board and remains undoable in-session.

Keyboard shortcuts must never trigger destructive actions accidentally.

## Data model

Persist vector geometry in normalized coordinates rather than screenshots:

```json
{
  "version": 1,
  "strokes": [
    {
      "id": "s_...",
      "tool": "pen",
      "width": 3,
      "points": [
        {"x": 0.12, "y": 0.34, "p": 0.5},
        {"x": 0.13, "y": 0.35, "p": 0.7}
      ]
    }
  ]
}
```

`x` and `y` are 0..1. Pressure is optional. Stored state contains geometry/tool semantics, not hard-coded colors.

## Rendering invariants

- Canvas scales by `devicePixelRatio` for sharp rendering.
- Vectors are projected to the current CSS size.
- Theme switching re-renders the same vectors using current `background` and `ink`.
- Thumbnail is derived from the vector state; do not make the thumbnail the canonical storage.

## Tool interaction

**Pen/highlighter:** pointer down begins, moves append normalized points, pointer up commits and persists.

**Line:** pointer down sets start, drag previews, pointer up commits end.

**curve3:** three taps/clicks: start → control → end. Pending points remain visible. Third point commits a quadratic Bézier.

**Stroke eraser:** hit-test the pointer against vector geometry and delete the nearest stroke within a screen-space tolerance.

**Laser:** temporary overlay only; never enters drawing history or persistence.

## Mastery integration

Drawing is evidence of active processing but must not automatically mark mastery. Recall/mastery remains a learner decision or a practice-derived signal.

## Failure behavior

If canvas APIs fail, the ordinary study page and all explanatory content must remain available. Whiteboard failure must never block study navigation.