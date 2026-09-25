# PROMETEO VISUAL PROTOCOL V1

Status: CURRENT for new visual experiments under `/visuals/`.

## Purpose

This protocol exists to prevent Prometeo visual work from collapsing into generic procedural geometry, placeholder characters, wireframes, boxes, circles, and "retro" UI built from arbitrary lines.

The rendering code should move, repeat, project, deform, layer and combine visually strong assets. It should not attempt to replace art direction with primitive geometry.

## Core rule: IMAGE-FIRST

For final visible results:

- Trail = strong image/silhouette + repetition/motion.
- Spaces = strong textures/blocks/panels/images + cheap projection.
- Player = strong sprites/frames/images + cheap interaction.

Canvas, DOM, CSS and projection code are stage machinery. They are not the primary illustrator.

## Hard prohibitions

The following are rejected as final visual language:

- characters assembled from circles, rectangles, sticks or simple geometric parts;
- faces made from dots/circles and boxes;
- hands or creatures drawn as rough polygons when an image/sprite should carry the visual identity;
- tunnels represented only by ellipses, arcs, rings or wireframes;
- rooms represented primarily by black surfaces with white perspective lines;
- architecture made only from debug geometry;
- procedural textures presented as the final art direction;
- generic "techno retro" HUD made only from empty boxes and monospace labels;
- placeholder primitives promoted as a finished visual demo;
- visual complexity created mainly by gradients, glows, particles or noise when the underlying asset is weak.

Primitive geometry remains allowed for:
- hitboxes;
- projection math;
- masks;
- occlusion;
- collision;
- debug views;
- invisible layout;
- temporary internal tests.

It must not define the final visible identity.

## Asset hierarchy

Prefer, in this order:

1. Existing Prometeo visual language that already works.
2. User-provided images and references.
3. Original generated/painted assets.
4. Public-domain / CC0 / appropriately licensed photographic or illustrated assets.
5. Procedural drawing only when it is intentionally abstract and visually strong, not because it was easier to code.

Do not use famous protected game/movie characters or obviously copied commercial assets as final deliverables.

## Reuse before reinvention

Before inventing a new visual system, inspect and reuse strong parts of the existing Coliseo language when useful:

- block renderer;
- materials;
- dark walls;
- windows;
- world-space surfaces;
- projected signs;
- shadows;
- lighting;
- occlusion;
- textured panels;
- existing pseudo-3D helpers;
- established camera/projection logic.

Do not recreate a weaker version of an existing Prometeo solution with flat lines and primitives.

## Characters and entities

A visible character/entity should normally be one of:

- sprite;
- image;
- cutout;
- collage;
- painted asset;
- photographed asset;
- animated frame sequence;
- silhouette with deliberate visual identity.

Not acceptable:
- circle head + rectangle body;
- square ears;
- stick limbs;
- primitive placeholder presented as the design.

## Spaces

A space should feel materially constructed.

Use:
- textured walls;
- real image surfaces;
- blocks/panels;
- doors;
- windows;
- props;
- mouldings;
- apertures;
- signs;
- embedded imagery;
- floor material;
- repeated architectural assets;
- darkness and occlusion.

The geometry can remain cheap. The visible surfaces cannot remain visually empty.

A PASSAGE, TUNNEL or CHAMBER should feel like a place, not a projection exercise.

## HUD

HUD should either:

- be extremely minimal, or
- belong to a specific visual world.

Avoid:
- generic dashboard cards;
- empty boxes;
- meaningless fake telemetry;
- arbitrary monospace labels used as decoration.

Prefer:
- integrated panels;
- signs;
- plaques;
- LED-like displays;
- illustrated UI;
- diegetic information;
- very sparse overlays.

## Motion

Motion should preserve the visual strength of the asset.

Avoid:
- generic alpha trails that blur the asset into mush;
- decorative movement that weakens silhouette;
- excessive jitter added only to imply "glitch".

Prefer:
- hard repeated stamps;
- readable silhouettes;
- deliberate spacing;
- discontinuous redraw artifacts;
- strong accumulations at turns/rebounds;
- image motion that creates a composition.

## Mobile-first constraints

All demos must:
- work in landscape-oriented mobile use;
- remain usable with touch;
- avoid tiny controls;
- avoid heavy engines unless clearly justified;
- prefer cheap image transforms, canvas compositing and prerendered assets;
- avoid visual noise that becomes illegible on small screens.

## Rejection test

A demo is automatically rejected as a visual candidate if one or more of these are true:

- it looks like a math/projection demo;
- the main character could be described as circles/boxes/sticks;
- the room/tunnel is mostly lines/rings/arcs;
- the art direction is visibly placeholder procedural geometry;
- the result relies on generic "retro terminal" decoration to create personality;
- replacing the code-drawn visuals with strong images would obviously improve it dramatically.

## Acceptance test

Before calling a visual demo ready for review:

- Can the visual identity be recognized from a screenshot with no labels?
- Is the main asset interesting before animation?
- Does it reuse strong Prometeo language where appropriate?
- Does the code amplify the asset rather than substitute for it?
- Does it still look intentional on a phone?
- Does it avoid generic primitive characters and spaces?
- Would the user plausibly want to keep looking at it even if the controls were disabled?

If not, it is not ready.

## Current corrective direction

For the existing first-generation demos:

### Trail Lab
Keep:
- movement loop;
- bounce logic;
- position history;
- cheap compositing.

Discard/rebuild:
- procedural creature art;
- weak alpha-blur look.

Replace with:
- strong PNG/silhouette/image asset;
- hard repeated stamps;
- composition through path/rebound.

### Spaces Lab
Keep:
- camera logic;
- projection;
- movement;
- scene switching;
- cheap pseudo-3D renderer.

Discard/rebuild:
- procedural generic textures;
- ring/ellipse tunnel look;
- debug-like architecture.

Replace with:
- existing Coliseo blocks/materials where useful;
- real wall/floor/panel imagery;
- cutout architecture;
- image-heavy scenes.

### Player Lab
Keep:
- low internal resolution;
- touch interaction;
- vibration/audio hooks;
- cheap state machine.

Discard/rebuild:
- polygon hand;
- code-drawn entities;
- generic terminal HUD.

Replace with:
- sprite/image foreground hand;
- sprite/image objects;
- persistent scene state;
- illustrated or diegetic UI.

## Governance

All future prompts that produce visible work under `/visuals/` should explicitly require reading this protocol first.

If a worker wants to violate a hard prohibition, it must explain why the alternative is visually stronger before implementation.
