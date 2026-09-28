# 🌀 Pseudo-3D Spaces · Durable Decisions

Status: CURRENT

## Map 5 · v29

### Ultra-narrow bridge
- RITUAL_ROAD_Y = -0.38.
- RITUAL_ROAD_HALF = 1.45.
- Full deck width = 2.9 world units.
- Map 5 lateralLimit = 1.15 so the camera stays on the deck.
- Do not widen back toward v28 half-width 3.4 unless explicitly requested.

### Bridge / column spatial rule
- column radius = 2.15.
- RITUAL_COLUMN_GAP = 0.65.
- column center X = ±(roadHalf + radius + gap) = ±4.25.
- nearest column surface = ±2.10.
- road edge = ±1.45.
- real abyss gap = 0.65.
- no horizontal geometry exists outside the bridge.

### Occlusion rule
Painter order remains mandatory:
1. abyss / temple;
2. signs;
3. columns;
4. bridge body + deck + stripes + rims.

Bridge must render after columns so its foreground mass hides lower projected shaft portions.

### Preserve
- bridge body down to Y=-5.6;
- column bottom Y=-38;
- column top Y=42/50;
- deep base forced pure black;
- violet increases upward;
- hidden-hinge signs;
- hard maximum two visible/opening signs;
- Map 1 continuous floor;
- Map 4 world-anchored tunnel flow;
- v20 horizontal map selector.
