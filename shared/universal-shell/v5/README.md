# Prometeo Universal Shell V5

Runtime assets for the single global Prometeo control.

## Current capabilities

V5 keeps the approved tactile selector as the single global control and adds persistent page favorites:

- every loaded catalog page exposes `Anclar página` / `Desanclar página` from the root control;
- `Favoritos` is a quick-access branch of that same control;
- `Organizar páginas` opens a fullscreen, flat organizer for pinning/unpinning any catalog page and reordering pinned pages by drag;
- favorite order persists locally under `prometeo.v5.favorites.v1`.

## Deployment invariant

The public runtime requires all five payload chunks:

- `chunk-1.b64` — 5988 bytes
- `chunk-2.b64` — 5988 bytes
- `chunk-3.b64` — 5988 bytes
- `chunk-4.b64` — 5988 bytes
- `chunk-5.b64` — 5976 bytes

Combined Base64 length: `29928`.

Decompressed HTML SHA-256: `c57629ca70d34f9599e0d8a75eb8956536481c1df4a4afd3e68a90ec64e1dc62`.

These files are runtime dependencies of `/index.html`; deployment must never omit them. The legacy per-page global shell at `shared/prometeo-shell/v2/prometeo-shell.js` is retired and must not mount UI.
