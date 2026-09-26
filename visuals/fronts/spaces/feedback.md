# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## KEEP / ACCEPTED
- forward/backward only
- fixed frontal view
- continuous ground
- Map 1 = green monumental arch nave
- Map 2 = brutalist cylinder hall
- visible near structures persist until naturally behind/out of view
- monumental scale comes from architecture, distance, cropping and occlusion

## MAP 2 · LATEST CORRECTIONS
The user reviewed v10 and identified three concrete problems:

1. **Floor coverage did not match the user's visible field.**
   - Error: floor width was based on a fixed world-space half-width.
   - Rule: floor coverage must be derived from the actual camera frustum / viewport at each depth.
   - v11: floor width is now calculated from focal projection and viewport width for every depth band, with margin.

2. **Cylinder density was too high.**
   - Error: rows were too close and too many cylinders overlapped perceptually, flattening near/mid/far layers.
   - Rule: monumental spaces need breathing room; spacing and darkness must separate depth groups.
   - v11: row spacing increased substantially, layouts are staggered, and each row uses fewer cylinders.

3. **Cylinder texture was visibly stretched.**
   - Error: a single checker image was projected over extremely tall cylinder faces, so UV scaling produced ugly vertical stretching.
   - Rule: never stretch a finite texture to communicate infinite height.
   - v11: columns now use solid violet world-space shading instead of the checker texture.
   - Far cylinders darken by world Z, strengthening depth.

## MAP 1 · PRESERVE
- tall cavity / nave
- arches dominate
- diagonal/chamfered side supports
- upper darkness instead of fake roof
- no premature popping

## REJECTED / DO NOT REVIVE
- fixed-width floor that exposes viewport side gaps
- stretched checker texture on very tall cylinders
- dense cylinder rows that collapse depth
- screen-space distance bands
- visible cylinder tops
- left/right controls
- premature culling
- fake ceiling / flat background wall

## DESIGN GUARDRAILS
- Geometry that must cover the viewport should be sized from the camera/frustum, not an arbitrary world constant.
- World depth must remain readable through spacing, scale, contrast and Z-based darkening.
- Very tall/infinite-feeling objects should use materials that do not reveal texture stretching.
- Simpler solid materials are preferable to distorted imagery.
- Do not trade a coverage fix for texture distortion or a depth fix for visual clutter.
