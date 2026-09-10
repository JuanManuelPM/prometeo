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
- hiding the reference expands the white paper and triggers a canvas reflow without changing stored geometry;
- opening another topic switches the reference to that topic;
- reference visibility/mode may persist as a user preference;
- mobile may use a drawer/overlay rather than permanently shrinking the drawing surface.

The reference pane is read-only study material. It is not copied into the learner-authored drawing automatically.

## Visual isolation and theme inheritance

The Study System shell may use any accepted two-color theme. The whiteboard separates **chrome** from **paper**:

- top chrome and the reference pane inherit the current Study System `background / ink` pair;
- **drawing paper is always white (`#ffffff`)**;
- page theme changes never recolor existing drawing strokes or pasted images;
- tool popovers remain neutral white/black for predictable contrast;
- the compact mnemonic thumbnail also uses white paper and the stored drawing colors.

This preserves the visual identity of the active study page without turning the drawing surface violet/green/etc.

## Recovered PageKit / Class Player baseline

The tool physics come from the protected Class Player lineage rather than being reinvented per study page. The relevant floor is v26 plus later accepted fixes through the v37 laser-tracking candidate.

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
- transient laser with visible dot and non-persistent trail;
- pasted/imported image objects;
- laser-mediated image selection/move/resize;
- writing/highlighting over images without an object mode stealing the gesture;
- expandable vertical board;
- optional added board blocks/templates.

## Fixed toolbar geometry

The top tool row is a **stable spatial control surface**.

- Tool positions do not shift when color, width or line-mode options change.
- Pen/highlighter/line options open in a popover anchored to the toolbar.
- Do not render color circles and widths inline in the main row if that causes neighboring tools to move.
- Recommended stable order: `laser → highlighter → pen → line → eraser → image → separator → undo → clear`.
- `texto` and `cerrar` live outside the drawing-tool group.
- Tools use compact icon buttons rather than a row of changing text labels on desktop.

The learner should be able to build motor memory for tool locations.

## Ink palette

Default pen/line/curve palette:

- black `#111827`
- blue `#1d4ed8`
- red `#dc2626`
- green `#15803d`
- violet `#7c3aed`

Default pen widths: `3 / 5 / 8` CSS px.

Highlighter palette:

- yellow `#ffc107` around 36–40% alpha;
- green `#22c55e` around 30% alpha;
- blue `#3b82f6` around 28–30% alpha;
- pink `#f43f5e` around 30% alpha.

Default highlighter widths: `12 / 16 / 22` CSS px.

Color and width are stored with each stroke. A later Study System theme change does not mutate them.

## Tool interaction

### Pen

Pointer down begins a freehand stroke; moves append points; pointer up commits. Rendering smooths intermediate points rather than exposing a jagged raw polyline. Pointer capture is used while drawing.

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

The eraser removes complete vector strokes, never raster pixels. Hit-testing uses a **screen-space tolerance** so it remains usable after resize and on touch. Dragging may erase multiple strokes; one erase gesture should correspond to one undo step.

### Laser

The laser is both a transient pointer and the lightweight image-selection gateway.

- default visual is red;
- mouse hover tracks the dot even with no button pressed;
- mouse/pen/touch drag may create a short smooth fading trail;
- trail lifetime is temporary (reference implementation around 1.85 s);
- laser never enters persistent ink or undo history;
- **unselected image + click** → select image on pointer-up;
- **unselected image + drag** → laser only; do not move/select the object;
- **selected image + drag** → move image;
- **selected image + resize handle** → resize image while preserving aspect ratio;
- switching to pen/highlighter/line clears image selection so drawing can happen directly over the image;
- `Enter` may explicitly fix/deselect the selected image;
- Delete/Backspace may delete a selected object when focus is not inside a text input.

This avoids a permanent separate “object mode”.

### Undo / clear

Undo restores the previous persistent drawing/object snapshot. Clear removes persistent ink/objects but remains undoable in-session. No keyboard shortcut may trigger a destructive action accidentally.

## Pasted / imported images

Images are first-class board objects but remain **under the ink layer**.

Supported entry paths:

- `Ctrl/Cmd + V` image from clipboard;
- explicit image picker button for touch/mobile/iPad workflows.

Persist at minimum:

```json
{
  "id": "img_...",
  "type": "image",
  "src": "data:image/...",
  "x": 0.16,
  "y": 210,
  "w": 0.42,
  "aspect": 1.6
}
```

`x` and `w` are width-relative; `y` is board-space CSS px so vertical board expansion does not shift existing objects.

## Expandable board

A topic board is not limited to one viewport.

- Initial paper is at least one viewport high.
- `+ espacio` appends another vertical block and scrolls toward it.
- Existing ink/images retain their position when the board grows.
- Added blocks may be `blank`, `lined`, `grid`, `cartesian`, `numberline`, or `timeline`.
- The canvas uses a bounded DPR/pixel budget so a long board does not explode memory on high-density displays.
- Reference pane and toolbar remain available while the paper itself scrolls.

## Persistent data model

Study System WB7 persists one topic board independently:

```json
{
  "version": 7,
  "blocks": ["blank", "grid"],
  "strokes": [
    {
      "id": "s_...",
      "tool": "pen",
      "color": "#111827",
      "alpha": 1,
      "width": 3,
      "points": [
        {"x": 0.12, "y": 340, "p": 0.5},
        {"x": 0.13, "y": 352, "p": 0.7}
      ]
    }
  ],
  "objects": []
}
```

For expandable boards, `x` remains width-relative while `y` is board-space CSS px. Pressure is optional. Line strokes may additionally store `lineMode` and `tickSize`.

Old Study System whiteboard strokes should migrate when feasible rather than silently disappear.

## Rendering invariants

- Canvas scales by `devicePixelRatio` subject to a safe total-pixel budget.
- Width-relative coordinates reproject to the current paper width.
- Vertical board coordinates do not collapse when new space is appended.
- Resize/orientation/reference-pane changes never erase canonical geometry.
- Theme switching never recolors board vectors/images.
- Images render before persistent ink so the learner can annotate on top.
- Selection outline/laser are transient overlays and must not enter mnemonic thumbnails.
- Thumbnail is derived from canonical board state; it is not canonical storage.
- Thumbnail auto-crops around actual marks/images so the mnemonic remains legible at small size.

## Host / board isolation

The Study System host and the whiteboard engine are separate components.

- Host owns topic-card launcher placement and the mnemonic thumbnail.
- Whiteboard engine owns drawing physics, object interaction, toolbar, reference pane and expandable paper.
- The whiteboard may run in a same-origin full-screen frame/isolated surface so whiteboard changes do not mutate the study-page DOM/layout.
- The board reads the current topic reference and current two-color theme from the host, but stores drawing state independently.

This separation is preferred over repeatedly injecting large whiteboard internals into every exam page.

## Mount / timing robustness

The study page may be assembled after bootstrap/document replacement. The host therefore must not assume one DOM timing point.

A compliant implementation rescans for topic cards at initial execution, DOMContentLoaded/requestAnimationFrame, delayed retries and/or a MutationObserver. A failure to mount the whiteboard must never block the underlying study page.

## Mastery integration

Drawing is evidence of active processing but must not automatically mark mastery. Recall/mastery remains a learner decision or a practice-derived signal.

## Failure behavior

If canvas APIs or whiteboard assets fail, the ordinary study page and all explanatory content remain available. Whiteboard failure must never block study navigation.