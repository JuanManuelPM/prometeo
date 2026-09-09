# Prometeo Universal Shell V5

Runtime assets for the single global Prometeo control.

## Current capabilities

V5 keeps the approved tactile selector as the single global control, persistent page favorites, and Corner Anchor v1.

- a closed puck can be dragged freely and snaps to the nearest of four corners on release;
- only the semantic corner is persisted under `prometeo.universal-control.corner.v1`; screen pixels are never persisted;
- left/right and top/bottom placements mirror spatial pointer and keyboard input while `Enter` always commits and `Escape` always goes back;
- the rail, arrow tails, current disc, title arc and directional intent mirror toward the screen interior without mirroring readable text or semantic icons;
- safe-area insets, resize, rotation and VisualViewport changes recompute the chosen anchor;
- drag uses pointer capture, an 8px threshold, one snap event and one snap animation;
- moving the closed control does not stop recording or background transcription;
- favorites and `Organizar páginas` remain part of the same universal control.

## Deployment invariant

The public runtime requires all five payload chunks:

- `chunk-1.b64` — 6552 bytes
- `chunk-2.b64` — 6552 bytes
- `chunk-3.b64` — 6552 bytes
- `chunk-4.b64` — 6552 bytes
- `chunk-5.b64` — 6568 bytes

Combined Base64 length: `32776`.

Decompressed HTML SHA-256: `67965c4da9161737f06fcf6503d6b73db43eef574796977327c97f165e514d8a`.

The legacy per-page global shell remains retired.
