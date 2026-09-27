# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## v18 · THREE NEW SCENES
The user asked to reuse the current locomotion / pseudo-3D / camera-distance-lighting effects in three additional compositions.

### Map 3 · Straight paired-column road
Required:
- one strict straight road through the center;
- two parallel rows of columns;
- each left column sits exactly opposite a right column at the same world Z;
- strong axial perspective and no diagonal scatter.

Implementation:
- centered road with subtle edge lines;
- exact opposing column pairs at ±X;
- tall rectangular monumental columns;
- same Euclidean camera-center lighting as the existing scenes.

### Map 4 · Enclosing tunnel
Reference direction:
- long barrel/tube feeling;
- walls and vault wrap around the view;
- strong black depth at the center;
- textured, claustrophobic, retro-surreal atmosphere.

Implementation:
- vertical side walls plus semicircular vault;
- existing repo stone photo is re-graded warm/brown and tiled into `atlas.tunnelTile`;
- tunnel is drawn as repeated world-space depth bands;
- dark throat is anchored to the optical center;
- no flat ceiling.

### Map 5 · Ritual avenue / temple
Reference direction:
- straight central avenue;
- repeated pointed forms on both sides;
- strong striped floor perspective;
- orange/red sky;
- monumental stepped structure at the end.

Implementation:
- alternating purple world-space road stripes;
- exact paired pointed obelisks/spires;
- stepped temple fixed in world space as a destination;
- temple renders behind nearer spires;
- warm sky remains graphic while world geometry still follows camera-distance lighting.

## UNIVERSAL RULES PRESERVED
- fixed frontal camera;
- W/S + wheel + touch swipe forward/back;
- A/D strafe within scene-specific limits;
- true Euclidean 3D distance from camera center drives world light;
- nearby points brighter, far/high points darker;
- no browser copy/select callout over controls.
