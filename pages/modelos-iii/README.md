# Modelos III · Sistémica — publication authority

## Current authoritative build

The current paragraph-audio build is defined by `AUDIO_PARAGRAPH_V2.json`:

- build: `modelosIII-study-paragraph-v2`
- expected HTML SHA-256: `421c04c1cc870034fd4c455bf24ce8fd48273df47d0d5cb08a65d6a1d13a0be9`
- paragraph audio API: `modelos-room-audio-v2`
- client split target: 480 characters
- voice version: `modelosIII-study-paragraph-v2`

The verified bundle pieces remain, in this exact order:

1. `bundle-v13-1.txt`
2. `bundle-v13-2.txt`
3. `bundle-v13-3a1.txt`
4. `bundle-v13-3a2.txt`
5. `bundle-v13-3b1.txt`
6. `bundle-v13-3b2.txt`
7. `bundle-v13-4.txt`
8. `bundle-v13-5.txt`
9. `bundle-v13-6.txt`

`index.html` is the GitHub Pages loader for those pieces. Future rebuilds must validate against `AUDIO_PARAGRAPH_V2.json` rather than the superseded V13 hash documented here previously.

## Do not use as authority

Older `payload-*`, `v11-*`, `bundle-v13-3.txt`, `bundle-v13-3-correct.txt`, and `audio-walkie-v1.js` are historical/interrupted publication artifacts. They are deliberately not referenced by the current loader and must not be mixed into a future rebuild.

The former expected HTML SHA-256 `bcadd89288f3d7c756b7fe242630f99d085c12f9115ce3b8336c5561587f33ce` and the old `casa-room-audio` paragraph route are historical evidence, not current authority.

## Audio authority

For Modelos III paragraph playback, the current route is:

page → `modelos-room-audio-v2` → `modelos-qwen-tts-v2` → Qwen3-TTS → shared server cache → local player.

Do not restore direct browser → Gradio/Hugging Face generation and do not restore `speechSynthesis`.

The separate generic long-text tool uses `audio-lab-page-audio-v1` with an 1800-character server ceiling. That endpoint is not the paragraph-audio authority for Modelos III.

## Public serving

GitHub Pages source lives at `pages/modelos-iii/`.

A second public serving layer is deployed as Supabase Edge Function `modelos-iii-public`; it fetches the bundle parts, reconstructs the page server-side, and returns the complete HTML.

Reusable audio demonstration and its implementation notes live in `pages/audio-demo/`.
