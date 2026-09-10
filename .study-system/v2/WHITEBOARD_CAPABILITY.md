# Study System V2 — Mnemonic Whiteboard Capability

Capability id: `mnemonic_whiteboard`

## Intent

Turn active note-making into a persistent visual retrieval cue. When a topic is open, the learner gets a large board for drawings/handwritten structure plus an optional typed note. When the topic closes, the same vector drawing becomes a small thumbnail beside the topic. The thumbnail is a mnemonic handle, not decoration.

## Open state

- Large board usable with desktop mouse, iPad/pen and phone touch.
- Pointer Events; `touch-action:none` on the drawing surface.
- Drawing persists per topic.
- Optional typed note persists beside the board.
- Resize/orientation/theme changes do not erase or distort geometry.

## Closed state

- If the board contains marks, render a small thumbnail beside the topic.
- Thumbnail always uses the current two theme colors.
- Clicking/tapping the thumbnail opens the topic/board.
- Marking recall complete may auto-collapse after state is saved.

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
  ],
  "note": "..."
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

If canvas APIs fail, reading content must remain available and the typed note remains a fallback. Tool labels must remain understandable without relying only on icon shape.