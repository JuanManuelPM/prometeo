# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## v33 · SMOOTH SCROLL + FARTHER MEGATOWERS + SPARSE NEON SCALE CUES

Latest user direction:
- all scenes: wheel/trackpad motion should feel smooth like the held arrow controls, not jumpy;
- towers scene: keep the finally-thin path, but move the violet towers farther to both sides;
- improve signs with restrained retrofuturist/cyberpunk cues;
- make towers read like enormous buildings using tiny lights and occasional rotating neon elements;
- avoid RGB clutter / theme-park overload.

## GLOBAL SCROLL
- old wheel path called `nudge()` and jumped `targetCamZ` per wheel event.
- v33 introduces `scrollVelocity`.
- wheel events add a bounded impulse only.
- `update(dt)` consumes that velocity over multiple frames.
- velocity decays exponentially with `Math.exp(-dt*.0105)`.
- residual scroll is cleared on map change and window blur.
- keyboard arrows/WASD remain continuous and unchanged.

## MAP 5 · SPACING
- RITUAL_ROAD_HALF stays 0.18.
- full path width stays 0.36.
- lateralLimit stays 0.08.
- tower radius stays 3.20.
- RITUAL_COLUMN_GAP: 1.90 → 3.00.
- tower center X = ±6.38.
- nearest tower surface = ±3.18.
- bridge edge = ±0.18.
- real lateral void = 3.00.

## MAP 5 · NEON / SIGNAGE
Design rule: tower mass dominates. Neon is a small scale cue.

### Deployable blade sign
- old giant tan/cardboard panel removed.
- new sign is a narrow vertical dark housing with a thin emissive border.
- small abstract glyph lines only, no readable text.
- palette rotates between restrained cyan, magenta, warm red and amber.
- existing max-two deployable sign scheduler remains.

### Micro facade lights
- only three tiny emissive slits per eligible nearby tower.
- light size is intentionally tiny relative to radius 3.20 / height ~100.
- brightness fades with distance.

### Orbital ring
- only occasional towers (`abs(ri) % 6 === 0`) receive one.
- only active in the near/mid field.
- ring is thin and mostly dark.
- one bright dash moves slowly around the circumference using frame time.
- rear arc renders before the tower, front arc after it, so it visually wraps the cylinder rather than floating in front.

## PRESERVED
- visible scenes remain ARCOS / CALZADA / TÚNEL / TORRES.
- Map 1 renderer unchanged from v32.
- calzada renderer unchanged from v32.
- tunnel renderer unchanged from v32.
- hairline bridge stays .36 full width.
- dark industrial void / distant megastructures stay.
- deep tower bases stay pure black.
- bridge-last lower-tower occlusion stays.
- max two deployable signs stays.

## SELF-CRITIQUE / REVIEW RISKS
- orbital rings use painter-style rear/front passes, not a depth buffer; visually inspect whether the wrap is convincing at close range.
- micro-lights are intentionally sparse; if they disappear too much, increase emissive alpha/size slightly before adding more lights.
- smooth wheel constants are deliberately conservative; tune impulse/decay rather than returning to direct nudge jumps.
