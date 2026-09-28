# 🌀 Pseudo-3D Spaces · Durable Decisions

Status: CURRENT

## Map 5 · v26
- The bridge is the only horizontal walking surface.
- roadHalf = 6.15.
- column radius = 2.15.
- columnGap = 0.65.
- column center X = ±(roadHalf + radius + columnGap) = ±8.95.
- nearest column surface = ±6.80.
- bridge edge = ±6.15.
- therefore the real empty gap is 0.65 world units.
- Never return to radius*.72 placement or any formula that places the column surface inside roadHalf.
- Render no horizontal floor/shoulder geometry inside the gap.
- The gap is abyss only.

## Preserve
- column bottom Y=-38;
- top Y=42/50;
- deep base forced pure black;
- violet brightens upward;
- hidden-hinge signs;
- hard max two signs;
- straight longitudinal road stripes;
- Map 1 floor and Map 4 tunnel fixes;
- v20 horizontal map selector.
