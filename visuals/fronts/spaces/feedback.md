# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## v29 · ULTRA-NARROW SUSPENDED BRIDGE

Latest user direction:
- v28 still looked too wide;
- reduce the bridge almost by half again;
- preserve the low-camera suspended-bridge composition and all column/occlusion rules.

## v29 CHANGES
- RITUAL_ROAD_HALF: 3.4 → 1.45.
- full bridge width: 6.8 → 2.9 world units.
- Map 5 lateral movement limit: 3.05 → 1.15.
- column radius remains 2.15.
- RITUAL_COLUMN_GAP remains 0.65.
- column centers move consistently with the road edge to ±4.25.
- nearest column surface is now at ±2.10.
- road edge is ±1.45.
- real abyss gap remains exactly 0.65.

## PRESERVED
- roadY = -0.38, camera almost on deck;
- bridge body down to Y=-5.6;
- painter order: signs → columns → bridge;
- bridge renders last and masks lower projected column portions;
- no lateral floor;
- column bottom Y=-38, top Y=42/50;
- deepest lower column section pure black;
- max two visible/opening signs.
