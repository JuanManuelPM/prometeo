# 🌀 Pseudo-3D Spaces · Durable Decisions

Status: CURRENT

## v32 visible scene set

Visible selector is now:
1. ARCOS
2. CALZADA
3. TÚNEL
4. TORRES

The old random-cylinder scene is rejected and must not reappear in the selector unless explicitly requested.

## ARCOS
- User explicitly likes the current scene.
- Preserve renderMap1 from v31.
- Keep black floor, arches, supports and backing walls.

## CALZADA
- User explicitly likes the current scene.
- Preserve renderMap3 unchanged.

## TÚNEL
- Preserve world-space geometry and motion.
- Preserve v31 near/far depth falloff and throat darkness.
- Improve surface richness with a second finer real-stone texture layer.
- Detail overlay must attenuate with depth and must not flatten the tunnel.
- If more improvement is needed later, prefer a stronger source asset over brute-force opacity.

## TORRES
- RITUAL_ROAD_Y = -0.38.
- RITUAL_ROAD_HALF = 0.18.
- Full path width = 0.36.
- lateralLimit = 0.08.
- RITUAL_COLUMN_GAP = 1.90.
- tower radius = 3.20.
- no multi-stripe deck treatment.
- no bright edge rims.
- one center hairline only, lineHalf = 0.018.
- bridge/deck body remains to preserve lower-tower foreground occlusion.
- painter order remains signs -> towers -> bridge.
- dark industrial void and distant megastructures remain.
- pure-black deep bases remain.
- max two visible/opening signs remains.

## Selector/control rule
- selector buttons use explicit internal map ids via data-map.
- visible numbering and internal renderer ids are intentionally decoupled.
- keyboard 1–4 follows visible scene order.

## Preserve globally
- fixed frontal camera;
- W/S + wheel/touch forward/back;
- mobile horizontal selector behavior;
- no accidental transverse floor seams.
