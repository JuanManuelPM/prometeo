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


## 20. WORLD architecture canon · V2

The Coliseo is no longer defined as “the whole Prometeo world”.

Canonical separation:

> INSIDE THE COLISEO = transient work of the current run.
>
> OUTSIDE THE COLISEO = persistent world built from durable accepted results.

This separation is structural, not decorative.

The current arena may reset, reorganize or completely change when the run changes.
The exterior must only receive things that survived acceptance/promotion.

This protects the renderer from scheduler/version/methodology changes.

## 21. Universal semantic contract

The renderer must never depend on workflow-specific names.

It consumes only universal entities:

- node
- edge
- agent
- artifact
- state
- event
- metric
- focus

The renderer must not know what Product-100, Continuity, Planner, Critic, Guide-2 or any future workflow-specific concept means.

Semantic adapters translate backend-specific concepts into the universal contract.

New workflow type = adapter change.
Not renderer rewrite.

## 22. World Manifest

Long-term input contract:

```json
{
  "nodes": [],
  "edges": [],
  "agents": [],
  "artifacts": [],
  "events": [],
  "focus": {},
  "metrics": {}
}
```

Renderer responsibility:
- layout;
- projection;
- animation;
- materials;
- interaction;
- visibility;
- depth.

Adapter responsibility:
- map canonical Prometeo state into the manifest;
- assign semantic classes;
- expose durable evidence/state transitions;
- never inject visual implementation details.

Workers may modify adapters.
Workers must not modify camera, physics, layout, navigation or core rendering merely because a new backend concept appeared.

## 23. The arena is a temporal work graph

The Coliseo represents the current run.

Minimum semantics:

- tower/site = current line of work;
- block = durable unit of state;
- worker = real execution shell;
- road = real dependency/transfer relation;
- work pad = active job position;
- trophy/artifact = durable output produced by a completed line;
- gate = real phase/dependency barrier;
- exterior object = persistent accepted artifact/result.

Worker activity and durable progress are separate dimensions.

> agents show activity.
>
> structures show accepted state.

Twenty moving workers with zero accepted state is visually allowed and semantically important.

## 24. Minimal state language before adding complexity

Do not model every backend enum immediately.

Initial universal block lifecycle:

1. INTENT
   - faint / transparent plan

2. ACTIVE
   - construction scaffold / active work

3. ACCEPTED
   - solid structural material

Additional states may be added only when they create a visibly useful distinction.

Candidate, verification, superseded, revise, watchdog and historical states belong in the future material vocabulary, not in the first transport/layout implementation.

## 25. Spatial model

Use the circle intentionally.

### Center
Current focus / objective.

### Inner causal ring
Things directly blocking or feeding the focus.

### Middle rings
Dependencies at increasing causal distance.

### Outer active ring
Parallel current work not directly on the shortest blocking chain.

### Exterior / darkness
Persistent accepted outputs, history and future world structures.

### Optional lower/archive layer
Superseded or historical material.

Distance from center should gradually become a semantic property:

> distance ≈ causal distance / present relevance

Never encode a permanent Product-100-specific geography.

## 26. Dynamic radial layout

Current tower coordinates are allowed to remain while the visual language is still stabilizing.

The next layout system must eventually compute placement from data.

Rules:

- siblings share a sector;
- closer-to-focus nodes prefer inner slots;
- dependencies influence orientation;
- completed current-run branches drift outward;
- historical nodes exit the active arena;
- sectors resize when branch count changes;
- related branches cluster before density becomes unreadable.

Use an invisible polar slot grid:

- inner / middle / outer radial slots;
- bounded angular slots;
- collision checks;
- road reservations;
- label-safe spacing.

Visual layout may interpolate between old and new positions.

Never teleport a whole graph unless changing run.

## 27. Roads are the next major world primitive

Roads are not decoration.

A road exists only when the manifest contains a real edge.

First implementation vocabulary:

- dim road = relation exists;
- lit section = transfer ready/recent;
- moving artifact = result/handoff in transit;
- broken/closed road = dependency not satisfied;
- branching road = one result feeds several nodes;
- converging roads = fan-in.

Do not add arrows, UML labels or ornamental paths.

Road width may later encode meaningful transfer/event volume, but not generic throughput.

## 28. Transportable artifact rule

The current trophy ritual becomes useful infrastructure.

Current canonical sequence can evolve into:

tower completes
→ ritual
→ artifact appears
→ worker carries artifact
→ artifact travels on a real road
→ dependent work becomes available
→ accepted artifact can eventually leave the arena

Initially use ONE generic transportable artifact.

Do not create many trophy/item types yet.

Only after the transport system proves readable should semantic artifact families be introduced.

## 29. Work pads

Workers should not visually equal blocks.

Introduce a small work pad between worker and durable structure.

States:

- READY = empty pad / available blueprint;
- CLAIMED = worker occupies pad;
- ACTIVE = tools/material pulse;
- SUBMIT = result leaves pad;
- ACCEPTED = block integrates structurally.

This allows many workers around one branch without turning the tower into particle soup.

## 30. Liveness contract

A worker animates because of recent real events, not because membership/session says ACTIVE.

Visual worker rules:

- TAKE recent → moves to assignment;
- PROGRESS recent → visibly works;
- heartbeat healthy but no new progress → low-intensity working state;
- nearing stale tolerance → energy drains;
- stale → stops;
- watchdog/requeue → work becomes available again;
- finite burst complete → worker returns to pool or disappears.

The current energy bars can eventually derive from seconds-since-progress / tolerance rather than a purely simulated drain.

## 31. Critical path

Future high-value layer:

- one restrained luminous route marks the current shortest blocking path to focus;
- it must derive from graph/dependency data;
- it must not be a forecast or invented priority;
- it is a visualization of dependency structure and currently unresolved blockers.

Do not implement this until edges and causal layout are real.

## 32. Persistent exterior

The darkness outside the Coliseo is reserved for durable world state.

Initial rule:

- current-run accepted artifact may exit the arena;
- once outside, it does not disappear merely because the run changes;
- the exterior may later contain archives, kingdoms, durable towers, constellations or domain worlds.

The exterior is not a dumping ground for current jobs.

Only durable accepted/persisted things cross the boundary.

## 33. Renderer vs adapters

Stable renderer owns:

- projection;
- camera;
- block language;
- world materials;
- layout engine;
- road rendering;
- work-pad rendering;
- animation primitives;
- depth;
- visibility;
- interaction;
- performance budgets;
- semantic readability gates.

Adapters own:

- mapping backend records to manifest nodes/edges/agents/artifacts/events;
- workflow-specific names;
- status normalization;
- dependency extraction;
- current focus selection;
- durable acceptance classification.

Hard rule:

> a new scheduler/workflow concept should require an adapter change, not an HTML visual rewrite.

## 34. Synthetic test worlds before live backend connection

Before replacing manual tower placement, build a deterministic test harness.

Required fixtures:

1. one node / one job;
2. 20 parallel jobs;
3. chain A → B → C → D;
4. eight branches converging into one reducer;
5. 100 nodes with clustering;
6. graph radically changes while camera is running;
7. worker goes stale and job is requeued;
8. accepted artifact exits arena;
9. node becomes superseded/history;
10. run changes entirely.

Every fixture must preserve:

- no overlaps;
- no roads through towers;
- workers can route;
- labels do not explode;
- camera remains usable;
- current visual canon still holds.

## 35. Safe migration plan

Do NOT rewrite the current Coliseo in one pass.

Migration must be additive and reversible.

### Phase A · Data boundary
Create a local `WORLD_MANIFEST_DEMO` adapter from the current existing simulation state.
The rendered world should look the same.

Success criterion:
same current scene, but renderer reads normalized entities instead of tower-specific assumptions where practical.

### Phase B · Roads only
Add dependency edges and world-projected roads between existing towers.

Do not move towers yet.

Success criterion:
roads look correct from all camera angles and introduce no visual regressions.

### Phase C · Artifact transport
Reuse the existing trophy ritual.
After completion, move one generic artifact along a road to another tower.

Do not change block materials yet.

### Phase D · Work pads
Separate worker assignment animation from structural block integration.

### Phase E · Dynamic layout sandbox
Implement radial/polar layout only in synthetic fixtures.
Do not turn it on in the live canonical scene yet.

### Phase F · Live dynamic layout
Enable calculated sectors/rings only after fixture tests pass.

### Phase G · Persistent exterior
Allow accepted artifacts to cross into the outer darkness.

## 36. Immediate next implementation

The safest ambitious next feature is:

> dependency roads between the current existing towers, using the current geometry and current tower positions.

Why:

- additive;
- visually useful from every camera angle;
- does not replace the working tower art;
- creates the first reusable edge primitive;
- prepares artifact transport;
- prepares causal layout;
- can be turned off without affecting construction;
- proves the manifest/edge model before a larger architectural migration.

Do not move towers in the same patch.
Do not change the ritual in the same patch.
Do not change worker behavior in the same patch.
Do not connect live Prometeo state in the same patch.

First prove one world primitive at a time.


## 37. Semantic geometry bug · exact root cause and permanent rule

Observed failure:
- physical wall-board frames render correctly;
- inner clock digits / progress cells / version marks collapse into orange lines or wedges;
- tower sign text remains readable.

Exact root cause:

The helper `beginSemanticContent(...)` installs a local-to-screen canvas transform.
After that transform, semantic shapes are drawn with `fillRagged(...)` / `path(...)`.

But `path(...)` currently rounds every point with `q(...)` BEFORE the canvas transform:

```js
moveTo(q(localX), q(localY))
```

Semantic coordinates are intentionally small world/local values such as:

```
0.035
0.18
0.46
```

Rounding those local coordinates first turns most of them into `0` or `1`.

The later canvas transform cannot recover geometry that was already quantized away.

That is why:
- frames survive: their points are projected to screen coordinates before `fillRagged`;
- tower words survive: native `fillText` is drawn after a screen-space translate/rotate and is not quantized by `q()`;
- LED/digit/cell polygons fail: small local points pass through `path()` and collapse before projection.

This is a coordinate-space bug, not an artistic problem.

### Permanent rule: never mix local semantic coordinates with screen-quantizing helpers

Every drawing helper must declare one coordinate contract:

1. `SCREEN`
   - inputs are already screen pixels;
   - `q()` may be used where helpful;
   - examples: projected block faces, final screen effects.

2. `WORLD`
   - inputs are world coordinates;
   - helper must project them before rasterization.

3. `LOCAL_PANEL`
   - inputs are local panel units;
   - helper must NOT round/quantize before the panel transform.

No helper may silently accept more than one contract.

### Forbidden

Inside any non-identity local/world canvas transform, do NOT call:

- `path(...)`
- `fillRagged(...)`
- `roughStroke(...)`
- `blob(...)`

if those helpers quantize coordinates before the transform.

### Required semantic primitives

Create transform-safe variants:

- `pathLocal()`
- `fillRaggedLocal()`
- `roughStrokeLocal()`
- `segPolyLocal()`

These must use raw floating-point local coordinates.

No `q()`.
No pixel minimums before projection.
No screen rounding until after the transform has produced final screen coordinates.

Alternative acceptable implementation:

- explicitly project each local semantic vertex through `boardProject(...)`;
- then use the existing screen-space helpers on the projected points.

The project-explicit approach is preferred for structural semantic geometry because it makes the coordinate space obvious.

### Text rule

Text has two valid implementations:

A. native text:
- compute a projected anchor;
- compute readable projected scale/rotation;
- call `fillText` in screen space.

B. physical glyphs:
- build each glyph from simple world/local geometric strokes/blocks;
- project those primitives exactly like the frame.

Never fake physical lettering by stretching a screen font through a collapsing wall transform.

### Physical-number rule

Clock digits may be made from actual small block/LED segments:

- each segment has local width, height and depth;
- each segment is a physical mini-cuboid attached to the panel;
- solid core first;
- glow second;
- if panel becomes too edge-on, semantic segments hide before degenerating.

This is preferred over glowing flat polygons when the desired aesthetic is “same physics/art as the frame”.

### Progress-cell rule

Progress cells are mini physical blocks inset into the board.

They must:
- be constructed with the same projection grammar as block faces;
- remain dark when inactive;
- gain an illuminated face when active;
- never be represented only by glow;
- never be drawn with local coordinates that pass through a screen-quantizing helper.

### Regression test required before any of the 10 WORLD roadmap steps

Before roads / manifest / transport / work pads / dynamic layout work begins, wall semantic rendering must pass:

- center view;
- left edge;
- right edge;
- near edge-on;
- zoom min;
- zoom max.

For each wall board:

- frame remains world-fixed;
- frame does not face camera;
- text/digits are readable when SAFE;
- content disappears before collapse;
- no orange line/wedge artifacts;
- no mirrored glyphs;
- no semantic geometry escapes panel bounds;
- no glow without opaque core.

This is a hard gate.

> Do not start the architectural WORLD roadmap on top of a known coordinate-space rendering bug.


## 38. Semantic wall-board fix · V3.9

Implemented:

- clock digits are now seven-segment physical mini-cuboids attached to the world-space panel;
- colon is physical panel geometry;
- progress is exactly 20 physical cells, with no redundant giant percentage;
- version board uses the already-proven projected native-text path used by tower labels;
- version status marks are physical cuboids;
- wall-board polygonal content no longer uses the quantizing `path()/fillRagged()` route inside local transforms;
- the old transformed polygon route is explicitly deprecated for panel semantics;
- wall semantic visibility uses a stricter gate than ordinary text so content disappears before edge collapse;
- physical frames remain world-fixed and do not rotate toward camera.

Hard regression rule:

> If a future panel uses small local fractional geometry, it must either be projected vertex-by-vertex or built with `drawBoardCuboid`. It may not pass those local coordinates through screen-space helpers that quantize with `q()`.

The visual roadmap (roads / manifest / transport / work pads / dynamic layout) remains gated behind this coordinate-space discipline.


## 39. Panel text projection · rigid rotation bug

Observed failure:
- tower sign geometry looked correct at oblique angles;
- words looked correct front-on;
- toward the screen edge the entire word rotated as one rigid sprite and approached vertical;
- this exaggerated from moderate oblique view to stronger oblique view.

Root cause:

The previous text helper did:

```js
translate(anchor)
rotate(projectedPanelTangentAngle)
fillText(...)
```

That uses only ONE projected axis.

The physical sign uses TWO projected axes:
- horizontal panel tangent;
- vertical world-height axis.

Therefore the panel shears/compresses, while the word was rigidly rotating.

A rigid screen rotation is NOT the projection of text painted on the panel.

### Permanent rule

Text attached to a physical panel must use a 2-axis surface basis.

- X axis = projected panel tangent.
- Y axis = projected world-down / panel vertical.
- glyph vertical strokes remain vertical in world projection;
- glyph horizontal strokes shear/compress with the panel;
- the physical panel itself never rotates toward camera;
- choose the equivalent left-to-right direction of the horizontal axis to avoid mirrored reading;
- hide/fade the semantic layer before the projected tangent becomes near-vertical.

### Forbidden

Do not implement panel text as:

```
translate + rotate + uniformly scaled fillText
```

when the object itself is an affine-projected world surface.

That turns the word into a billboard/sprite even if its anchor is correct.

### Required readability gate

Define:

`horizontalHealth = abs(projectedHorizontal.x) / length(projectedHorizontal)`

Current tower/wall text policy:

- SAFE: `horizontalHealth >= 0.62`
- COMPRESSED: `0.40 <= horizontalHealth < 0.62`
- EDGE: `horizontalHealth < 0.40`

SAFE:
- full opacity.

COMPRESSED:
- keep physical shear/compression;
- fade progressively.

EDGE:
- hide text.

The sign frame remains visible according to its physical visibility rules.

### V3.10 implementation

`drawReadableBoardText(...)` now uses:

- `panelTextSurfaceMetrics(...)`;
- full 2-axis affine surface mapping;
- left-to-right axis normalization without changing physical panel orientation;
- world-vertical glyph axis;
- progressive semantic fade near edge;
- no rigid word rotation.

This applies to:
- tower names;
- tower percentages;
- wall labels;
- version/update text.

The block/segment semantic rules from V3.9 remain unchanged.
