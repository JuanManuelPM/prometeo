# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## v30 · RAZOR BRIDGE + BRUTALIST INFINITE TOWERS

Latest direction:
- bridge even narrower;
- towers a little farther from the bridge;
- towers substantially larger and more brutalist;
- background should stop flooding the scene with orange light;
- scene should feel like an enormous sci-fi megastructure corridor: thin bridge, huge towers sliding past at the sides, bases lost below, tops lost above, distant architecture suggesting infinity.

## v30 GEOMETRY
- RITUAL_ROAD_HALF: 1.45 → 0.95.
- full bridge width: 2.9 → 1.9 world units.
- Map 5 lateral limit: 1.15 → 0.68.
- RITUAL_COLUMN_GAP: 0.65 → 1.20.
- column radius: 2.15 → 3.20.
- column center: ±5.35.
- nearest column surface: ±2.15.
- bridge edge: ±0.95.
- real abyss gap: 1.20.
- column bottom: -48.
- normal top: 48.
- periodic tall top: 58.

## BACKGROUND / SCALE
- removed bright orange sky from Map 5;
- near-black blue/violet industrial void;
- only a weak, localized horizon glow remains;
- destination temple recolored to a subdued dark silhouette;
- added `renderDistantRitualCity()`: low-cost world-space megatower silhouettes behind the active columns;
- distant silhouettes move through actual perspective as camZ changes instead of being static wallpaper;
- final glow is now a tiny cool-violet veil, not a bright sun wash.

## BRIDGE
- longitudinal stripes reduced to 6 so an ultra-thin bridge does not visually inflate into a wide striped floor.
- camera remains almost on deck at roadY=-0.38.
- bridge body still reaches Y=-5.6.
- painter order remains signs → columns → bridge.

## PRESERVE
- no lateral floor;
- bridge-last occlusion;
- lower column section forced pure black;
- hidden-hinge signs;
- max two visible/opening signs;
- Map 1 / Map 4 fixes and mobile selector.

## SELF-CRITIQUE / REVIEW RISKS
- radius 3.20 is intentionally aggressive; verify near towers feel monumental rather than simply blocking too much of the scene.
- distant silhouette field is intentionally subtle and cheap; verify it reads as depth rather than random background slabs.
- darkening the temple/background may need a later micro-adjustment if the far destination becomes too hard to read.
