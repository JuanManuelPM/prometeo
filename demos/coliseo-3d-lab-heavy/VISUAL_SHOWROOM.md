# Coliseo Heavy Visual Lab · Physical Art Rules

This lab is intentionally more visually aggressive than the canonical Coliseo.

It exists to answer one question:

> What should the universal WORLD primitives physically look like before they are connected to live Prometeo state?

## Critique of the previous lab

The first heavy lab changed architecture more than silhouette.

It introduced:
- manifest;
- edges;
- artifact transport;
- work pads;
- layout targets;
- exterior persistence concepts.

But visually those primitives were too small and too close to debug markers.

The result still read as:
- the same arena;
- the same five tower sites;
- the same workers;
- a few extra marks on the floor.

That failed the visual goal.

## New physical rule

A new semantic primitive is approved only if it visibly changes one of:

- silhouette;
- navigable space;
- occlusion;
- material;
- lighting;
- movement route;
- world boundary.

If it changes only a tiny mark, icon, label or subtle line, it is not yet a world primitive.

## Implemented experiments

### Focus monument
The focus is a central physical objective:
- stepped dais;
- four pylons;
- central objective tower;
- causal spokes.

Aggregate durable progress changes its height.

### Heavy roads
Roads are now:
- repeated low stone blocks;
- wide enough to read as infrastructure;
- visible in perspective;
- capable of carrying an inset critical-path material.

They are not HUD lines.

### Monument gate
Blocked dependencies create:
- twin pylons;
- block-built lintel;
- dark portcullis bars;
- small ember studs.

A blocker now occupies space.

### Workshops
Each line of work can have:
- raised platform;
- scaffold posts;
- material stacks;
- physical blueprint slab.

This visually separates activity from accepted tower structure.

### State gallery
Five physical state prototypes:
- INTENT = wireframe/ghost construction;
- ACTIVE = scaffold + partial body;
- ACCEPTED = solid stacked material;
- FAILED = charred debris;
- HISTORY = dark ruin/moss material.

### Persistent exterior
The outside world now includes:
- multiple large persistent towers;
- a distant archive bridge;
- sparse ruins near the outer cut.

The exterior is drawn before the Coliseo wall so the wall correctly occludes it.

### Road material gallery
The roads view includes three deliberately different material prototypes:
- stone;
- ember/obsidian;
- muted green structural route.

This is for visual comparison, not semantic truth.

## Geometry discipline

All new physical pieces use world-space geometry:
- drawWorldCuboid;
- drawBoardCuboid;
- groundPatch;
- projected wireframe edges.

No physical prototype is positioned in screen pixels.

No physical prototype rotates toward camera for readability.

No primitive is defined only by glow.

## Semantic discipline

The lab remains synthetic.

It does not claim:
- current Prometeo dependencies;
- current critical path;
- current gate state;
- current artifact transfer.

The purpose is to choose a visual vocabulary before live binding.

## Experiment modes

- visual=all
- visual=focus
- visual=roads
- visual=workshops
- visual=states
- visual=gates
- visual=exterior

The top lab switcher exposes these modes.

The canonical Coliseo remains unchanged.
