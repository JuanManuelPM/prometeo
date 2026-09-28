# 🖐️ Player / Eye Content · Durable Feedback

Status: CURRENT

## Accepted
V21 blink/frame animation is accepted and must remain unchanged.

## New authoring preparation
The next subsystem is the internal eye content behind the frame.

A reusable authoring layer is now prepared at:
https://juanmanuelpm.github.io/prometeo/visuals/eye-content-authoring/

The accepted V21 open frame is used as the structural reference in every cell.

### Geometry
- logical frame: 128×128
- frame pivot: [64,86]
- measured open aperture bbox: [38,54,90,86]
- conservative authoring safe bbox: [42,58,86,82]
- eye-content center: [64,70]

### Two-template strategy
- 10×10 = exploration / visual vocabulary only
- 2×5 = one concrete ten-frame animation sequence

The generated art should change only the content inside the opening whenever possible. The outer frame should stay fixed and should not be regenerated as a free variable.

## Rule
Do not use the 10×10 exploration grid as runtime animation data.

After selection:
raw candidate → sequence-specific 2×5 → split → measure → semantic content anchor → normalize → residual QA → visual QA → pack → runtime.

## Next
Generate the first internal-eye 10×10 exploration matrix using the clean template. Then select a family before making any motion sequence.
