# Study System V2 — Mnemonic Whiteboard Capability

Capability id: `mnemonic_whiteboard`

## Intent

Turn active note-making into a persistent visual retrieval cue **without replacing the existing study architecture**.

The ordinary study surface remains primary:

`module summary → topic inventory → expandable topic explanation`

The whiteboard is an optional capability attached to an individual topic. A topic must remain completely usable when the board is never opened.

When the learner opens the board, it becomes a full-viewport working surface. The learner may keep the topic text visible beside the paper while drawing or hide it to reclaim the whole canvas. When the board closes, if it contains marks, its compact launcher becomes the mnemonic thumbnail inside the same topic header.

## Placement invariant

Do **not** create a whiteboard-first page or replace the normal study cards.

- Closed module/topic layout preserves the normal study overview.
- Every visible topic card may expose one compact whiteboard launcher.
- The launcher belongs **inside the topic header, to the right of the title/anchor**, whenever there is enough horizontal room.
- Do not spend a second full-width row merely to label the launcher `Pizarrón`.
- The launcher is the white paper preview itself; text labels may remain accessible through `aria-label` / tooltip rather than visual chrome.
- The board opens only on explicit request.
- Closing restores exactly the prior study state.
- A non-empty board turns the launcher into a compact white mnemonic thumbnail associated with that topic.

On narrow screens the preview may shrink, but should remain in the header unless that would make the topic title unusable.

## Reference-while-drawing invariant

Opening a blank canvas must not force the learner to remember the source material from memory before they can begin drawing.

A compliant board provides an optional **live topic reference pane** while drawing:

- desktop/tablet: reference and white paper may coexist side-by-side;
- reference defaults to the current topic, not the whole module;
- `resumen` shows the topic title, anchor and the high-value `CLAVE` / `EXPLICACIÓN` material;
- `todo` exposes the full explanatory panes for that topic;
- one compact `texto` control hides/shows the reference pane without closing the board;
- hiding the reference expands the white paper and triggers a canvas reflow without changing stored vector geometry;
- opening another topic switches the reference to that topic;
- reference visibility/mode may persist as a user preference;
- mobile may use a drawer/overlay rather than permanently shrinking the drawing surface.

The reference pane is read-only study material. It is not copied into the learner-authored drawing automatically.

## Visual isolation

The Study System shell may use a two-color theme. The whiteboard is an intentional bounded exception.

- **Board paper is always white (`#ffffff`).**
- Page theme changes never recolor existing drawings.
- Board chrome is neutral white/black/gray.
- Ink has its own palette.
- The compact thumbnail also uses white paper and the stored ink colors.

This avoids the failure mode where a violet/green/etc. study theme turns the drawing surface into tinted paper.

## Recovered PageKit / Class Player baseline

The tool physics are derived from the protected Class Player lineage rather than reinvented per study page. The relevant floor is v26 with later accepted fixes through the v37 laser-tracking candidate.

Baseline capabilities:

- fixed/always reachable toolbar;
- Pointer Events for mouse, touch, pen/Wacom;
- pen;
- real translucent highlighter;
- line family: simple, arrow, marks/ticks, dotted;
- three-point curve;
- intentional stroke eraser;
- undo;
- clear;
- transient laser with visible dot and non-persistent trail.

The Study System implementation may omit unrelated Class Player features such as slide objects, paste/resize and multi-board tabs, but must not degrade the retained tool physics.

## Ink palette

Default pen/line/curve palette:

- black `#111827`
- blue `#1d4ed8`
- red `#dc2626`
- green `#15803d`
- violet `#7c3aed`

Default pen widths: `3 / 5 / 8` CSS px.

Highlighter palette:

- yellow `#ffc107` around 40% alpha;
- green `#22c55e` around 30% alpha;
- blue `#3b82f6` around 28% alpha;
- pink `#f43f5e` around 30% alpha.

Default highlighter widths: `12 / 16 / 22` CSS px.

Color and width are stored with each stroke. A later theme change does not mutate them.

## Tool interaction

### Pen

Pointer down begins a freehand stroke; moves append normalized points; pointer up commits. Rendering should smooth intermediate points rather than expose a jagged raw polyline. Pointer capture is used while drawing.

### Highlighter

Same gesture model as pen, but broad and translucent. It is not a dashed theme-colored line.

### Straight-line family

Pointer down sets start, pointer move gives live preview, pointer up commits.

`lineMode` may be:

- `simple`
- `arrow`
- `ticks`
- `dotted`

The selected line tool remains active after commit.

### Three-point curve

Preserve the recovered v29→v37 interaction: the three clicks are **three pass-through points**, not `start / hidden-control / end`.

For points A, B, C, compute the quadratic Bézier control P so the curve passes through B at `t = .5`:

`P = 2B - .5A - .5C`

Interaction:

1. click/tap first pass-through point;
2. click/tap second pass-through point;
3. pointer movement previews the prospective curve;
4. click/tap third point to commit.

Pending guide points are temporary and never persist as ink.

### Stroke eraser

The eraser removes complete vector strokes/objects, never raster pixels. Hit-testing uses a **screen-space tolerance** so it remains usable after resize and on touch. Dragging may erase multiple strokes; one erase gesture should correspond to one undo step.

### Laser

The laser is a separate transient state.

- default visual is red;
- mouse hover tracks the dot even with no button pressed;
- mouse/pen/touch drag may create a short smooth fading trail;
- trail lifetime is temporary (reference implementation around 1.85 s);
- laser never enters persistent ink or undo history;
- pointer/object interactions must never accidentally create a persistent laser stroke;
- leaving/releasing hides the dot when appropriate for the pointer type.

### Undo / clear

Undo restores the previous persistent drawing snapshot. Clear removes persistent ink but is itself undoable in-session. No keyboard shortcut may trigger a destructive action accidentally.

## Data model

Persist vector geometry in normalized coordinates rather than screenshots:

```json
{
  "version": 2,
  "strokes": [
    {
      "id": "s_...",
      "tool": "pen",
      "color": "#111827",
      "alpha": 1,
      "width": 3,
      "points": [
        {"x": 0.12, "y": 0.34, "p": 0.5},
        {"x": 0.13, "y": 0.35, "p": 0.7}
      ]
    }
  ]
}
```

`x` and `y` are 0..1. Pressure is optional. Line strokes may additionally store `lineMode` and `tickSize`.

Old Study System whiteboard strokes lacking color migrate to black; old highlighter strokes migrate to translucent yellow unless they already carry a color.

## Rendering invariants

- Canvas scales by `devicePixelRatio` for sharp rendering.
- Vector coordinates project to the current CSS size.
- Resize/orientation/reference-pane changes never erase or distort canonical geometry.
- Theme switching never recolors board vectors.
- Thumbnail is derived from vector state; it is not canonical storage.
- Thumbnail auto-crops around the learner’s actual marks so the mnemonic remains legible at small size.

## Mount / timing robustness

The study page may be assembled after bootstrap/document replacement. The capability therefore must not assume one DOM timing point.

A compliant implementation rescans for topic cards at initial execution, DOMContentLoaded/requestAnimationFrame, short delayed retries, and/or a MutationObserver. A failure to mount the whiteboard must never block the underlying study page.

## Mastery integration

Drawing is evidence of active processing but must not automatically mark mastery. Recall/mastery remains a learner decision or a practice-derived signal.

## Failure behavior

If canvas APIs fail, the ordinary study page and all explanatory content remain available. Whiteboard failure must never block study navigation.