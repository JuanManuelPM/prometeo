# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## v22 · FLOOR CONTINUITY + TUNNEL FLOW + MAP 5 STAGING

### Learned floor rule
A floor may be internally segmented for rendering, but the user must never see those subdivisions as accidental horizontal lines.

The visible language that works:
- continuous surfaces;
- straight longitudinal perspective cues;
- world-anchored geometry;
- no transverse renderer seams that stay visually detached from moving architecture.

## MAP 1 · GREEN ARCH NAVE
Problem:
- the textured floor was rebuilt in repeated Z bands;
- those subdivisions read as horizontal lines that did not move coherently with the arches.

v22:
- replaces the banded floor renderer with one continuous corridor plane;
- keeps only a restrained single-pass material overlay;
- walls / arches / structural continuity stay intact.

Review:
- make sure the single-pass material does not read as an over-stretched carpet.

## MAP 4 · TUNNEL
Problem:
- tunnel surfaces were rebuilt from camera-relative bands;
- the dark throat was screen-space;
- advancing/backing therefore had too little optical flow and felt almost static.

v22:
- tunnel now ends at a fixed world-space end wall at Z=170;
- tunnel segment joints are anchored to absolute world Z at 5.6-unit spacing;
- repeated structural ribs are real world geometry and move past the camera;
- ribs move toward the player when advancing and recede when backing up;
- old static screen-space black throat is removed;
- floor is one continuous plane with longitudinal guide lines;
- wall/vault seams now correspond to intentional tunnel structure rather than accidental floor artifacts.

Review:
- ribs should read as architecture / optical flow, not as the same unwanted horizontal-floor bug.

## MAP 5 · RITUAL AVENUE
Accumulated user direction:
- signs must be much bigger, like screens for the user;
- because they are bigger, they must not appear side-by-side;
- side spires should alternate left/right, one-and-one;
- preserve the straight longitudinal road lines because they protect the feeling of forward motion;
- lateral floor must lose the ugly horizontal seams.

v22:
- ritual spacing is now 7.4 world units;
- each row contains only one spire, alternating left/right;
- no opposing spire pair at the same Z;
- hinged pole length increased to 7.15;
- cardboard panel is now roughly screen-scale: outer half-size 2.82 x 1.72 in its local axes;
- deployment begins farther away (<24 Z units ahead);
- sign raises again at <=8 Z units so the larger panel clears the player earlier;
- lateral ground is one continuous frustum plane;
- central road keeps 14 strict longitudinal stripes, each rendered as one full-depth quad;
- horizontal road/floor subdivision lines are removed.

## PRESERVE
- v20 mobile horizontal scene selector;
- v21 hinged physical sign concept: far up, medium-distance down, very-close up;
- orange sky, stepped temple, fixed frontal camera and movement controls.
