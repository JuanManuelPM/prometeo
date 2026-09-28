# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## v28 · NARROW SUSPENDED BRIDGE

Latest user direction:
- keep the v27 low-camera suspended-bridge composition;
- make the bridge/path much narrower;
- do not undo the bridge occluding lower column portions;
- preserve abyss gap, black column bases, very tall shafts, hidden signs and max two visible signs.

## v28 CHANGES
- RITUAL_ROAD_HALF: 6.15 → 3.4.
- bridge full width: 12.3 → 6.8 world units.
- column radius remains 2.15.
- RITUAL_COLUMN_GAP remains 0.65.
- because column placement is roadHalf + radius + gap, column centers move consistently to ±6.20.
- nearest column surface is now at ±4.05.
- road edge is ±3.40.
- real abyss gap remains exactly 0.65.
- Map 5 lateral movement limit reduced from 5.8 to 3.05 so the camera stays on the narrow deck.

## PRESERVED FROM v27
- camera eye almost on deck: roadY = -0.38.
- thick bridge body down to Y=-5.6.
- painter order: signs → columns → bridge.
- bridge renders last and masks lower projected column portions.
- no lateral floor.
- column bottom Y=-38, top Y=42/50.
- deepest lower column section pure black.
- max two visible/opening signs.
