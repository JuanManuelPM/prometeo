# Prometeo Universal Shell V5

Runtime assets for the single global Prometeo control.

## Current capabilities

V5 keeps the approved tactile selector as the single global control, persistent page favorites, Corner Anchor v1 and the page-scoped Change Loop.

- a closed puck can be dragged freely and snaps to the nearest of four corners on release;
- only the semantic corner is persisted under `prometeo.universal-control.corner.v1`; screen pixels are never persisted;
- left/right and top/bottom placements mirror spatial pointer and keyboard input while `Enter` always commits and `Escape` always goes back;
- the rail, arrow tails, current disc, title arc and directional intent mirror toward the screen interior without mirroring readable text or semantic icons;
- safe-area insets, resize, rotation and VisualViewport changes recompute the chosen anchor;
- drag uses pointer capture, an 8px threshold, one snap event and one snap animation;
- moving the closed control does not stop recording or background transcription;
- favorites and `Organizar páginas` remain part of the same universal control;
- `Notas / Cambios` is page-scoped and returns execution results into the same Universal Host;
- canonical result links use `/?page=<page_id>&changes=<work_item_id>` so raw child pages never become the primary human navigation surface;
- child pages remain visually/functionally independent and never mount a second global Prometeo control.

## Deployment invariant

`shared/universal-shell/v5/SERVED_MANIFEST.json` is the only byte-level authority for the current served V5 payload. It records the five chunk sizes, combined Base64 length, gzip SHA-256, decompressed HTML SHA-256 and capability flags. Do not copy historical byte counts or hashes into a second authority.

The publisher validates every chunk and the decompressed source against that manifest before updating `gh-pages`, then verifies the live GitHub Pages bytes.

The legacy per-page global shell remains retired.
