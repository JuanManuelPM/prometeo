# 🖐️ Retro Player / Eye Frame · Durable Feedback

Status: CURRENT

## KEEP / ACCEPTED
- persistent Player scene/state
- 320x180 internal Player resolution
- touch
- cheap audio/vibration
- image-first foreground
- exactly one lower-right player hand
- carried pet has no human hands
- eye contents and eye frame remain separate when reintegration eventually happens

## LATEST USER REVIEW
The public eye lab still failed. The visible result was a gray square plus an English-style load failure message. This is a hard functional failure, not a subjective visual preference.

## ROOT CAUSE FOUND
The current published V16 HTML tried to avoid an external asset request by embedding the JPEG as a base64 data URI.

That embedded data URI was actually malformed/truncated in the committed HTML. The string literally terminated with `truncated`, so the browser could not decode it as an image.

This explains the observed gray square + load error exactly.

The external aligned JPEG already present in the repo remains the intended source:
`visuals/eye-frame-lab/eye-blink-aligned-grid-v15.jpg`
blob:
`c4fb7c8d739bb056f19dafb5586b3882e60e8fbd`

The local source used to create that asset had already passed PIL verification at 640×256 before publication.

## V17 FIX
- Removed the embedded base64 completely.
- The page now loads the external same-origin JPEG by relative path.
- Cache busting uses the known asset hash prefix.
- The page first fetches the asset and verifies HTTP success.
- It verifies that the fetched blob is non-empty.
- It then asks the browser to decode that blob as an image.
- It verifies natural dimensions are exactly 640×256.
- Only after all checks pass is frame 0 drawn.
- Any failure is reported in Spanish with the actual failure stage.
- Runtime does not crop, center, scale-correct, or otherwise repair the sprite.
- The pre-aligned 5×2 sprite remains authoritative.

## NORMALIZATION PIPELINE STILL CURRENT
SPLIT → MASK → MEASURE → ANCHOR → NORMALIZE → RESIDUAL QA → VISUAL QA → EXPORT → ANIMATE

The alignment work itself is not discarded by this loading bug. The failure happened after export, during transport/embedding into the public page.

## DO NOT REPEAT
- Do not paste large binary assets into HTML data URIs through a text/tool response path.
- Do not assume a successful commit means the browser can decode an embedded asset.
- Do not treat an error overlay as proof that the sprite itself is wrong.
- Do not change the alignment pipeline to fix a transport bug.
