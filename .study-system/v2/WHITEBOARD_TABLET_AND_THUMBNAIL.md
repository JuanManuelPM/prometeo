# Study System V2 — Tablet Input + Mnemonic Thumbnail Contract

## Tablet / stylus mode

The whiteboard must behave like a drawing surface rather than selectable webpage content.

### Browser-gesture suppression

On the paper/stage only:

- `touch-action: none`;
- `user-select: none` / `-webkit-user-select: none`;
- `-webkit-touch-callout: none`;
- prevent `contextmenu`, `selectstart`, `dragstart`, browser touch gestures and long-press callouts;
- drawing pointer handlers call `preventDefault()`.

Do **not** apply those rules to an active text editor: text entry/editing must still work normally.

### Palm rejection

Provide a visible `tableta` mode plus automatic stylus detection.

When the browser exposes a stylus as `PointerEvent.pointerType === "pen"`:

- pen input is accepted immediately;
- tablet mode may auto-activate for the current session;
- touch pointers on the paper are ignored while tablet mode is active;
- toolbar/buttons remain touchable with a finger because the rejection is scoped to the paper.

This prevents a resting palm from generating strokes or browser selection while an Apple Pencil, Surface Pen, Wacom pen, S Pen, etc. is being used.

### Hardware limitation

A web app cannot perfectly distinguish palm from stylus on hardware/browser combinations that report **both as the same generic touch input**. In that case long-press/callout suppression still applies, but true palm rejection is limited by the pointer information exposed by the operating system/browser. Do not claim universal hardware-level palm rejection when that signal is unavailable.

## Performance rule

Do not regenerate mnemonic previews on every stylus stroke. Tablet drawing must stay responsive. Generate/rebuild the preview on meaningful save/close/visibility transitions, not continuously during handwriting.

## Mnemonic thumbnail

A mnemonic preview is **not a screenshot of the small visible canvas** and is not canonical state.

Rebuild it from stored source objects:

`images → shapes / large text → vector ink`

Requirements:

- use the original vector geometry for pen/line/curve strokes;
- use actual text content/font size/weight/color;
- draw imported images from their original stored source;
- include geometric shapes;
- auto-crop around meaningful content with padding;
- render to a substantially higher intermediate resolution than the displayed card (reference implementation: 640×360 WebP);
- browser display uses ordinary high-quality resampling (`image-rendering:auto`);
- the topic card uses `object-fit: contain`, not `cover`, so text/images are not cropped merely to fill the card.

### Stale-thumbnail prevention

Version preview storage independently from board state. Once the current preview pipeline has successfully evaluated a topic, mark that preview generation as ready. From then on, do not fall back to an older low-resolution preview if the new state is intentionally empty.

Closing the board is a handshake:

1. board starts high-fidelity thumbnail generation;
2. host may visually close immediately;
3. host keeps the iframe alive briefly;
4. new thumbnail is posted to the host;
5. host refreshes the topic card;
6. only then is the iframe discarded (with a bounded timeout fallback).

This prevents the old race where the iframe disappeared before text/images had been incorporated into the mnemonic card.