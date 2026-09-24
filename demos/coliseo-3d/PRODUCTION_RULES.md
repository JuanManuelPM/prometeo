# COLISEO 3D · PRODUCTION RULES V1

Status: CANON FOR FUTURE VISUAL WORK  
Scope: `demos/coliseo-3d/`  
Purpose: stop visual regressions by defining how objects are built, placed, projected, drawn, tested and rejected before adding more art.

## 0. Current visual canon

The tower signs are the reference implementation.

Preserve their core behavior:

- the object is fixed in world-space;
- it does not rotate to face the camera;
- it disappears when its real world-facing test says it should disappear;
- frame, posts and panel are constructed from the same cuboid/block language as the tower blocks;
- the physical object uses the same `wp(...)` / world projection as everything else;
- readable information is a separate rendering concern from physical geometry;
- no HUD-looking rectangle may replace a physical prop.

Rejected experiment:

- V3.4 camera-facing/upright billboard signs are permanently rejected.
- Never make physical signs rotate toward the viewer.
- Never keep signs visible only because the camera can see their anchor.
- Never “fix text” by changing the orientation of the entire object.

## 1. Every new object has two layers

Every semantic prop must be designed as two explicit layers.

### A. PHYSICAL LAYER

The thing that exists in the arena:

- frame;
- posts;
- panel;
- block faces;
- torch base;
- trophy;
- wall mount.

Rules:

1. All measurements are world units.
2. Position is world coordinates.
3. Geometry is projected through the same world projection used by blocks.
4. Depth/occlusion belongs to the world.
5. Orientation is fixed in the world unless the object itself is physically animated.
6. The physical layer never turns toward the camera for legibility.

### B. INFORMATION LAYER

The thing the human must read:

- words;
- digits;
- LEDs;
- progress cells;
- version/date.

This layer is allowed to use readability correction after projection, but it must remain anchored to the physical layer.

It may NOT change the physical orientation or visibility of the prop.

## 2. Why the current wall-board lights collapse into lines

The screenshot shows a valid frame with invalid internal content.

Cause:

The physical panel is strongly foreshortened at some yaw values. The code currently maps the LED shapes through a full affine transform derived from the wall plane.

Let:

`P0 = project(local 0,0)`  
`PX = project(local 1,0)`  
`PY = project(local 0,1)`

Then:

`screenX = PX - P0`  
`screenY = PY - P0`

Near a side view, `|screenX|` becomes very small.

A digit segment that has real local width is therefore projected into almost zero screen width. It becomes a diagonal or horizontal line.

That is not an art problem. It is a projection/readability problem.

Therefore:

> Physical geometry may foreshorten to zero. Semantic content may not.

## 3. Surface readability contract

For any panel carrying words, digits or cells, calculate:

`ux = PX - P0`  
`uy = PY - P0`  
`sx = length(ux)`  
`sy = length(uy)`

Also calculate:

`aspectHealth = sx / max(sy, epsilon)`

Before drawing semantic content:

### SAFE

If:

`sx >= 0.42 * scale`

and

`aspectHealth >= 0.24`

draw full content.

### COMPRESSED

If:

`0.22 * scale <= sx < 0.42 * scale`

or

`0.12 <= aspectHealth < 0.24`

draw only the most essential mark:

- clock: digits only;
- progress: cells only;
- version: version only.

No long labels.

### EDGE-ON

If:

`sx < 0.22 * scale`

or

`aspectHealth < 0.12`

do not draw semantic content at all.

Keep the physical frame visible if it is physically visible.

This prevents text or LEDs from degenerating into lines.

## 4. Stabilized content transform

Do not run semantic content through the raw full plane transform when that transform can collapse its width.

Use a stabilized content basis.

Physical panel:
- use the real world basis.

Semantic layer:
- anchor at the projected center of the real panel;
- derive scale from the real projected basis;
- preserve left-to-right reading;
- constrain rotation.

Recommended content transform:

`contentScaleX = clamp(sx, minimumReadableWorldProjection, maximumProjectedWidth)`

`contentScaleY = sy`

`contentRotation = clamp(atan2(ux.y, ux.x), -8deg, +8deg)`

Important:

- this stabilization applies ONLY to glyphs/lights;
- frame and panel remain fully world-projected;
- if the real panel gets too edge-on, hide the content instead of forcing it readable.

This is the acceptable compromise between diegetic object and legibility.

## 5. Text rules

Text must never:

- mirror;
- become diagonal beyond the content rotation limit;
- become one-pixel lines;
- overflow the panel;
- continue rendering when the panel is effectively edge-on.

Text must:

- have a fixed safe area inside the physical panel;
- use tabular numerals for clocks/version data;
- fit by shrinking within a bounded range;
- disappear before becoming unreadable;
- stay subordinate to the world.

Long labels are secondary.

Examples:

Clock:
- primary: `12:48`
- secondary: `HORA`

Progress:
- primary: cell rail
- optional tiny label: `PROGRESO`

Version:
- primary: `V3.6`
- secondary: short update time

## 6. LED and progress rules

LEDs are not text.

They are small physical marks attached to the panel.

Rules:

1. Never draw LEDs narrower than their projected safe width.
2. If projected width collapses, hide the LED content.
3. Use filled facets, not strokes, as the base shape.
4. Glow is secondary. The opaque core must be visible without glow.
5. Glow radius is derived from projected object size.
6. Glow must not extend far enough to merge neighboring segments.
7. An inactive LED still has a dark physical body.

Progress rule:

- progress is primarily a sequence of cells;
- do not automatically add a giant percentage;
- do not duplicate the same information in number + bar unless explicitly requested;
- default global progress visualization is a simple cell rail;
- cells advance monotonically left to right;
- one current cell may pulse subtly;
- completed cells stay stable;
- no casino/HUD meter styling.

## 7. Block-language rule

Every prop must answer:

> “How would this look if it were built from the same construction system as the cubes?”

Use:

- cuboid rails;
- chunky posts;
- visible front/side/top faces;
- world-fixed lighting;
- dark ink outlines;
- uneven printed edges;
- restrained scuffs;
- one dominant material color plus darker/lighter faces.

Avoid:

- clean vector rectangles;
- thin UI borders;
- floating transparent cards;
- generic dashboard panels;
- pure white surfaces unless white is materially justified;
- decorative flags;
- gradients used as the object itself.

## 8. Placement rules

Before adding a prop, define:

- `world anchor`;
- `world angle`;
- `height`;
- `physical dimensions`;
- `front normal`;
- `visibility rule`;
- `depth relation`;
- `safe content area`.

No object is placed by arbitrary screen pixels.

Wall props:

- live on a wall radius;
- use wall tangent for physical width;
- use inward/outward wall normal consistently;
- must not overlap another information prop at the canonical starting yaw;
- clock, progress and version must occupy distinct wall sectors.

Arena props:

- use arena radius;
- remain physically attached to their site;
- do not drift with the camera.

## 9. Visibility rules

Visibility is physical.

For a fixed sign:

- first test arena cut/occlusion;
- then test front-facing normal;
- then test projected bounds;
- then test semantic readability.

Order matters.

Never:

1. make content visible;
2. then rotate the object so the content can be seen.

Correct order:

1. object exists;
2. camera sees the physical front;
3. panel has enough projected area;
4. content is rendered.

## 10. Depth and painter rules

Every opaque physical object enters the same painter/depth system where practical.

Minimum depth key:

- projected world depth;
- projected Y as tie breaker;
- world height as final tie breaker.

Semantic content is rendered immediately with its owning physical panel so it cannot float independently in front of unrelated geometry.

Do not render a world object as a late HUD pass unless it is explicitly an effect layer such as glow/smoke.

## 11. Effects rules

Allowed effects:

- fire glow;
- LED halo;
- smoke;
- analog registration;
- sparse print noise.

Effects must be attached to world anchors.

Effects must not define the shape.

The solid object must still read when effects are disabled.

If turning off glow makes the LED disappear, the LED is designed incorrectly.

## 12. Scale rules

Avoid arbitrary minimum pixel sizes for physical geometry.

Physical:
- size derives from world units × projection scale.

Semantic:
- may use a readability gate;
- may hide when too small;
- should not inflate beyond the physical object to remain legible.

Rule:

> hide before cheating scale.

## 13. Color rules

Current palette logic:

- physical world: black / brown / ochre / red / muted green;
- tower signs: material color inherited from their tower;
- clock: warm red/orange;
- progress: ochre/red;
- version: muted green.

No object gets a new accent color merely to distinguish it.

Distinction should come first from:

- location;
- silhouette;
- rhythm;
- content.

## 14. Information hierarchy

World first.

Then:

1. tower/construction action;
2. workers/fire/ritual;
3. one primary information prop;
4. secondary information props.

A wall full of equally loud boards is a failure.

The clock, progress and version boards should not all have equal visual weight.

Suggested hierarchy:

- clock: medium;
- progress rail: medium but horizontally sparse;
- version/update: quiet.

## 15. Production sequence for any new object

Never jump directly from idea to drawing code.

### Step 1 · Define purpose

One sentence:

“This object exists to show ____.”

If two unrelated purposes appear, split the object.

### Step 2 · Define physical object

Write:

- anchor;
- dimensions;
- orientation;
- material;
- depth;
- visibility.

### Step 3 · Define information

Write:

- primary information;
- optional secondary information;
- what disappears first under compression.

### Step 4 · Define projection behavior

Check:

- front view;
- 30°;
- 60°;
- near edge-on;
- back side;
- zoom min;
- zoom max.

### Step 5 · Define failure gates

Write the exact conditions that mean “do not draw content.”

### Step 6 · Implement physical layer

No semantic content yet.

### Step 7 · Implement semantic layer

Add text/LED/cells only after frame placement is correct.

### Step 8 · Test all camera angles

Do not approve from one screenshot.

### Step 9 · Regression check

Confirm explicitly:

- no camera-facing physical billboard;
- no permanent visibility;
- no mirrored text;
- no diagonal/collapsed glyphs;
- no overlap with other boards;
- no HUD-like floating panel;
- no broken depth ordering.

### Step 10 · Publish

Only after syntax + visual invariants pass.

## 16. Required camera test matrix

At minimum test:

- yaw 0;
- yaw ±0.35;
- yaw ±0.70;
- yaw ±1.05;
- yaw ±1.40;
- zoom 0.55;
- zoom 1.0;
- zoom 1.8.

For each information board record:

- physically visible? yes/no;
- semantic content visible? yes/no;
- mirrored? must be no;
- slope > 8°? must be no for semantic layer;
- glyph collapse? must be no;
- overlaps another info board? must be no.

## 17. Hard rejection gates

Reject the build if any of these occur:

- physical sign turns to face camera;
- sign remains visible from its back;
- word/digit becomes a line;
- text mirrors;
- semantic content rotates steeply at screen edge;
- LED glow replaces solid LED core;
- progress duplicates information without reason;
- new prop ignores block language;
- wall board looks like a generic UI card;
- object placement is defined in screen pixels;
- a new fix reintroduces a previously rejected behavior.

## 18. Current bug to solve next

Observed screenshot:

- physical wall-board frame is present;
- inner LED/digit content collapses into thin lines;
- therefore the frame/projection should NOT be replaced;
- the next fix must operate only on the semantic content transform/readability gates.

Do not alter tower signs while fixing this.

Do not alter world-fixed wall-board orientation while fixing this.

Do not use camera-facing billboards.

Next implementation target:

`SAFE_CONTENT_TRANSFORM_V1`

with:

- projected basis measurement;
- semantic visibility gates;
- stabilized content rotation;
- solid LED cores;
- no giant redundant metric;
- angle test matrix before publish.


## 19. Implementation status · V3.8

Applied to the live Coliseo:

- SAFE / COMPRESSED / EDGE semantic gating for wall information;
- stabilized semantic transform that never rotates the physical sign toward camera;
- wall clock content uses the semantic gate;
- global progress is now a simple 20-cell rail without redundant giant percentage;
- version/update panel is quieter and also semantic-gated;
- windows are block-built physical openings;
- window eyes share the exact same physical basis and disappear before edge collapse;
- eye content is clipped inside the physical recess;
- pilasters are block-built structural columns;
- legacy crown flags removed;
- torches use cuboid stakes and block bases;
- static-only gate weave removed, so background no longer slips under dynamic props;
- trophies participate in the painter/depth list;
- obsolete helper routing through the removed `ashes` phase fixed;
- tower/site markers use projected world geometry;
- blueprint dash/hatching measurements scale with the scene;
- worker-to-task HUD tether removed;
- arena stains are projected ground patches;
- arena relics are small world-space debris cuboids;
- trophy rebuilt as faceted world-space construction;
- ashes rebuilt as projected burn scar plus charred debris;
- worker energy bars use LOD and disappear before turning into noise.

Still valid hard rule:

> Future visual changes must extend these systems instead of adding a new one-off screen-space drawing path.
