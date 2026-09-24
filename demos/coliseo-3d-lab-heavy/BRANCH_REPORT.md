# Coliseo Heavy Visual Branch · Report

## Source

Derived from:
- `demos/coliseo-3d-lab/index.html`

Source content SHA:
- `6b60431b653fe95b0a4826ee5289f88754e77324`

Heavy route:
- `/demos/coliseo-3d-lab-heavy/`

Build:
- `LAB-H2`

## Purpose

Make the architectural work visually obvious enough to evaluate as game-world design.

The previous lab is retained as the cleaner architecture sandbox.

This heavy lab is the visual experimentation surface.

## New physical prototypes

- central focus monument;
- heavy slab road network;
- inset critical-route material;
- monumental dependency gates;
- raised workshops;
- scaffold posts;
- physical material stacks;
- physical blueprint slabs;
- intent/active/accepted/failed/history state gallery;
- larger visible artifact courier/reliquary;
- persistent exterior skyline;
- archive bridge;
- outer ruins;
- three road material studies.

## Controls

Query parameter:

`visual=all|focus|roads|workshops|states|gates|exterior`

The page also exposes a small top switcher for these modes.

Existing fixture controls still work:

`fixture=chain|fanin|parallel|dynamic|20|100`

## Safety

Not modified:
- canonical `/demos/coliseo-3d/`;
- canonical camera math;
- canonical worker construction behavior;
- canonical tower construction art;
- canonical sign physics.

All data remains synthetic.

## Design conclusion

The major lesson from this branch:

> architecture that is semantically important must occupy physical space.

Edges become roads.
Blockers become gates.
Work becomes workshops.
Focus becomes monument.
Persistence becomes skyline.
Failure/history become ruins.

That is the direction to evaluate visually before connecting live Prometeo state.


## LAB-H3 correction

### Mobile
- forced landscape presentation in portrait mobile viewport;
- virtual render dimensions swap width/height;
- app surface rotates 90°;
- pointer/touch coordinates are mapped back correctly;
- visualViewport resize tracking added.

### Occlusion
- identified the scene-order bug: separate heavy subsystems were drawn in fixed code order;
- introduced a shared HEAVY_PAINTER queue;
- heavy world cuboids, board cuboids and ghost structures now enter the same painter list as canonical dynamic objects;
- courier is queued before sort;
- exterior skyline components are depth-sorted before static-wall compositing.

Build:
- `LAB-H3`
