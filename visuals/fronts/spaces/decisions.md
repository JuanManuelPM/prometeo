# 🌀 Pseudo-3D Spaces · Durable Decisions

Status: CURRENT

## Map 5 · v27
- The requested visual is a suspended bridge with the camera almost touching its deck.
- RITUAL_ROAD_Y = -0.38 while camera eye remains Y=0.
- Bridge side body extends down to Y=-5.6.
- Bridge remains the only horizontal walking surface.
- Real abyss gap remains 0.65 world units outside each road edge.
- Columns still begin at Y=-38 and reach Y=42/50.
- Deepest column section remains forced pure black.
- Violet emerges upward.

### Painter-order rule
This renderer has no depth buffer. Therefore visual occlusion must be encoded explicitly:
1. sky / abyss;
2. temple;
3. signs;
4. columns;
5. bridge body + deck + stripes + rims.

The bridge MUST render after columns so its near surface hides the low projected parts of the shafts. Do not regress to drawing the road before columns.

### Signs
- Sign before column, so column hides hinge/storage.
- Bridge after both.
- Max two visible/opening signs.

## Preserve
- Map 1 floor fix.
- Map 4 world-anchored tunnel flow.
- v20 finger-scroll map selector.
- fixed frontal movement.
