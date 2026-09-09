# Prometeo Universal Shell V5

Runtime assets for the single global Prometeo control.

## Deployment invariant

The public runtime requires all five immutable payload chunks:

- `chunk-1.b64` — 5251 bytes
- `chunk-2.b64` — 5251 bytes
- `chunk-3.b64` — 5251 bytes
- `chunk-4.b64` — 5251 bytes
- `chunk-5.b64` — 5248 bytes

Combined Base64 length: `26252`.

Decompressed HTML SHA-256: `5d06d529d6d5d0c3fdfc3f51b2a20621ca455fbbd51bf8e85722f4dfd69abcc3`.

These files are runtime dependencies of `/index.html`; deployment must never omit them. The legacy per-page global shell at `shared/prometeo-shell/v2/prometeo-shell.js` is retired and must not mount UI.
