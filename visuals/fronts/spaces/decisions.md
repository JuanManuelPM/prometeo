# 🌀 Pseudo-3D Spaces · Durable Decisions

Status: CURRENT

## v33

Visible selector remains:
1. ARCOS
2. CALZADA
3. TÚNEL
4. TORRES

## Global movement
- W/S and arrows remain continuous controls.
- wheel/trackpad must no longer call direct `nudge()` jumps.
- wheel adds bounded `scrollVelocity` impulse.
- update loop consumes velocity each frame.
- exponential decay creates smooth stop.
- clear scroll velocity on scene change and blur.
- tuning rule: adjust impulse/decay only; do not restore discrete wheel jumps.

## ARCOS
- preserve v32 exactly.

## CALZADA
- preserve v32 exactly.

## TÚNEL
- preserve v32 exactly.

## TORRES · geometry
- RITUAL_ROAD_Y = -0.38.
- RITUAL_ROAD_HALF = 0.18.
- full path width = 0.36.
- lateralLimit = 0.08.
- RITUAL_COLUMN_GAP = 3.00.
- tower radius = 3.20.
- tower center X = ±6.38.
- nearest tower surface = ±3.18.
- bridge edge = ±0.18.
- real lateral void = 3.00.
- bridge-last lower-tower occlusion remains.

## TORRES · neon architecture
The tower must dominate. Neon is deliberately sparse.

### Deployable sign
- no return to the old large tan/cardboard billboard.
- use a small vertical dark neon blade.
- thin emissive border.
- only abstract tiny glyph strokes.
- palette: restrained cyan / magenta / warm red / amber.
- hard maximum two deployed signs remains.

### Facade lights
- a few tiny slit lights only.
- no window grids.
- no full-building RGB wash.
- fade with depth.

### Orbital advertisement
- occasional tower only.
- one thin ring at a time.
- slow moving bright dash.
- rear half paints before tower, front half after tower, so ring wraps the cylinder.
- no fast spinning / flashing.

## Preserve Map 5
- dark industrial void;
- distant world-space megastructures;
- pure-black deep tower bases;
- hairline path;
- one thin center path guide;
- no stripe field;
- no bright road rims;
- signs -> tower -> bridge painter relationship.

## Review risk
This is still painter-style pseudo-3D. If orbital wrap fails visually, fix painter ordering/geometry before adding effects.
