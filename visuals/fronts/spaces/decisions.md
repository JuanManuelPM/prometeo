# 🌀 Pseudo-3D Spaces · Durable Decisions

Status: CURRENT

## v31 cross-map decisions

### Map 1 · Arcos
- Keep all nave architecture.
- Keep floor geometry only for structural continuity.
- Do not render the green floor material.
- Current visual floor = pure black.
- This is explicitly temporary until further visual review.

### Map 3 · Calzada
- Preserve exactly as-is.
- v31 verified renderMap3 is byte-for-byte identical to v30.

### Map 4 · Túnel
- Preserve existing world-space tunnel geometry and motion.
- Preserve one continuous floor plane and longitudinal guides.
- Preserve fixed world-Z ribs and real world-space end wall.
- Add stronger nonlinear depth attenuation to wall/roof textures and ribs.
- Add a soft throat-centered darkness veil:
  - far / center = darker;
  - near field = clearer.
- Do not rebuild the tunnel into a screen-space static effect.

### Map 5 · Megatowers
- RITUAL_ROAD_Y = -0.38.
- RITUAL_ROAD_HALF = 0.65.
- Full deck width = 1.30.
- lateralLimit = 0.42.
- RITUAL_COLUMN_GAP = 1.90.
- tower radius = 3.20.
- tower center X = ±5.75.
- nearest tower surface = ±2.55.
- road edge = ±0.65.
- real abyss gap = 1.90.
- tower bottom/top remain -48 and 48/58.
- Preserve dark industrial background and distant world-space megastructures.

### Map 5 occlusion
Mandatory painter order:
1. void / distant megastructures / temple;
2. signs;
3. main towers;
4. bridge.

Bridge remains last so it hides low tower portions.

## Preserve globally
- fixed frontal camera;
- W/S + wheel/touch forward/back;
- v20 mobile horizontal selector;
- no accidental transverse floor seams.
