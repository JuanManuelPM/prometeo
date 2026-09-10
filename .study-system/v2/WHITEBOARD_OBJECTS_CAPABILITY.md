# Study System V2 — Whiteboard Visual Objects

Capability extension: `mnemonic_whiteboard.objects`

## Purpose

The whiteboard must support **large readable labels and clean geometric structure** in addition to freehand ink. These are study/memory objects, not a slide-editor replacement.

## Large text

Text is intended for titles, key concepts, formulas/labels and distant reading on desktop/classroom-sized displays.

Baseline interaction:

- fixed `T` tool in the stable toolbar;
- options live in a popover so other tool positions never move;
- default size is intentionally large (`64px` reference);
- reference sizes: `28 / 44 / 64 / 88 / 116px`;
- normal and bold weights;
- same independent ink palette as drawing;
- click/tap paper to place editor;
- `Enter` commits; `Shift+Enter` inserts another line; `Esc` cancels;
- committed text becomes a board object;
- laser selects it; selected text can be moved and resized;
- double-click/tap editing may reopen its text editor;
- returning to pen/highlighter/line makes text non-interactive so ink can pass over it.

Text must remain readable in the mnemonic thumbnail when it is part of the visible study composition.

## Shapes

Baseline shape set:

- rectangle;
- square;
- circle;
- ellipse;
- diamond.

Shape options:

- independent ink color;
- border width;
- `empty` or subtle/soft fill;
- click-drag to size with live preview;
- circle/square preserve aspect;
- click without meaningful drag creates a sensible default-sized object;
- after commit, ordinary drawing resumes through the same tool model;
- laser selects/moves/resizes shapes;
- pen/highlighter/line ignore shape hit areas so the learner can annotate over them.

Do not add a permanent generic selection tool solely for these objects. The lightweight laser-selection model remains the universal gateway for images, text and shapes.

## Layer model

Conceptual order:

`paper/templates → imported images → visual objects (text/shapes) → freehand ink → transient laser/selection UI`

The critical invariant is behavioral: when a drawing tool is active, visual objects must not steal pointer events. The learner can draw across an image, shape or large label without manually locking/unlocking objects.

## Persistence

Visual objects are stored separately from transient editing UI and remain topic-scoped. Recommended data:

```json
{
  "type": "text",
  "id": "txt_...",
  "text": "COGNICIÓN",
  "x": 0.42,
  "y": 180,
  "fontSize": 88,
  "weight": 800,
  "color": "#111827"
}
```

```json
{
  "type": "shape",
  "id": "shp_...",
  "shape": "circle",
  "x": 0.25,
  "y": 260,
  "w": 0.22,
  "h": 210,
  "color": "#1d4ed8",
  "width": 4,
  "fill": "none"
}
```

`x/w` are board-width-relative; `y/h` are board-space CSS pixels so vertical expansion does not move previous objects.

## Undo / clear / delete

- object creation, move, resize, edit and deletion must be undoable within the whiteboard session;
- Delete/Backspace removes a selected object only when focus is not inside text editing;
- `Enter` fixes/deselects selected objects when not editing text;
- global `clear` clears visual objects together with ordinary board content and must not leave a stale mnemonic thumbnail.

## Thumbnail rule

If the board contains text/shapes but no freehand stroke, it still counts as a real mnemonic artifact and therefore produces a thumbnail. If all visual objects are removed, the host falls back to the base drawing thumbnail or to the minimal empty-state whiteboard button.