# Modelos III · Sistémica — publication authority

## Current authoritative build

The study page must be reconstructed only from these verified V13 bundle pieces, in this exact order:

1. `bundle-v13-1.txt`
2. `bundle-v13-2.txt`
3. `bundle-v13-3a1.txt`
4. `bundle-v13-3a2.txt`
5. `bundle-v13-3b1.txt`
6. `bundle-v13-3b2.txt`
7. `bundle-v13-4.txt`
8. `bundle-v13-5.txt`
9. `bundle-v13-6.txt`

After base64 concatenation + gzip decompression the expected HTML SHA-256 is:

`bcadd89288f3d7c756b7fe242630f99d085c12f9115ce3b8336c5561587f33ce`

`index.html` is the GitHub Pages loader for those exact pieces.

## Do not use as authority

Older `payload-*`, `v11-*`, `bundle-v13-3.txt`, `bundle-v13-3-correct.txt`, and `audio-walkie-v1.js` are historical/interrupted publication artifacts. They are deliberately not referenced by the current loader and must not be mixed into a future rebuild.

## Audio authority

The coherent build already contains the Walkie-proven audio architecture:

page → `casa-room-audio` → `casa-qwen-design-tts` → Qwen3-TTS → shared server cache → local IndexedDB/AudioContext player.

Do not restore direct browser → Gradio/Hugging Face generation and do not restore `speechSynthesis`.

## Public serving

GitHub Pages source lives at `pages/modelos-iii/`.

A second public serving layer is deployed as Supabase Edge Function `modelos-iii-public`; it fetches these verified bundle parts, decompresses them server-side, validates that the result contains Modelos III + the Walkie audio backend, and returns the complete HTML.

Reusable audio demonstration and its implementation notes live in `pages/audio-demo/`.
