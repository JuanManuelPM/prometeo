# Coliseo Heavy Branch · Report

## Baseline

Canonical source:
- `demos/coliseo-3d/index.html`
- baseline SHA: `8ef25c0a34cc9cd68fa9b35152dec9289d5cb3d8`

Lab source:
- `demos/coliseo-3d-lab/index.html`

First public lab commit:
- `b66bcba3314f3571bd66876333f985ad7f5b37b5`

## Completed in this branch

### A. Isolation
- created independent lab route;
- canonical Coliseo was not modified;
- lab clearly labels itself SYNTHETIC.

### B. Universal manifest
- added `prometeo.world_manifest/demo-v1`;
- nodes, edges, agents, artifacts, focus and metrics are normalized;
- manifest is exposed as `window.WORLD_MANIFEST_DEMO`.

### C. Fixtures
Implemented:
- chain;
- fanin;
- parallel;
- dynamic.

### D. WorldRoad
- physical ground-space roads;
- ready/relation/blocked states;
- critical-road emphasis;
- blocked edge can physically break.

### E. WorldGate prototype
- blocked relationship renders a physical gate.

### F. Artifact transport
- generic artifact/courier traverses a real fixture road;
- no workflow-specific artifact type.

### G. Work pads
- low physical pads outside tower construction footprints;
- active/quiet state.

### H. Worker pool primitive
- central common-zone marker;
- canonical workers are intentionally not rerouted yet.

### I. Radial layout sandbox
- causal-distance layout targets computed from focus;
- optional `?layout=1` visualization;
- canonical towers remain stationary.

### J. Persistent exterior prototype
- durable exterior tower;
- historical/archive ruin;
- both are world-space and visible by zooming out.

## Still synthetic

- graph relationships;
- critical edge;
- artifact timing;
- gate state;
- exterior persistence count.

Nothing in the lab should be read as current Prometeo runtime truth.

## Not yet integrated

- live Prometeo adapter;
- true TAKE/PROGRESS/SUBMIT-driven worker motion;
- work-pad ownership;
- artifact arrival unlocking dependent blueprint;
- full dynamic movement of tower sites;
- 100-node LOD/performance fixture;
- click inspection;
- historical migration animation.

## Regression constraints verified in source

- no camera-facing physical billboard system added;
- no canonical route edits;
- existing V3.10 rendering retained as lab baseline;
- JS parses successfully;
- new systems are additive.

## Integration strategy for main chat

Integrate selectively, in this order:

1. manifest boundary;
2. WorldRoad;
3. generic artifact transport;
4. WorkPad;
5. event-driven worker adapter;
6. fixture-tested radial layout;
7. persistent exterior.

Do not merge dynamic layout and roads in the same first canonical patch.

## Branch principle

Inside the Coliseo: transient current work.

Outside the Coliseo: durable accepted world state.


### K. Stress fixtures
- added 20-node and 100-node synthetic manifest fixtures;
- ghost nodes use radial target slots;
- canonical towers remain untouched.

### L. Minimal interaction
- tap/click a canonical tower in the lab;
- world-space selection highlight appears;
- lab badge reports selected node label and durable progress;
- no permanent dashboard/card layer was introduced.

### M. Synthetic event stream
- manifest now exposes synthetic TAKE / PROGRESS / SUBMIT-like events derived from the lab simulation;
- these remain explicitly synthetic and are intended to exercise the adapter/event contract.

### N. Delivered artifact preview
- after transport completes, a generic delivered material seed appears near the dependent node;
- this demonstrates handoff semantics without mutating canonical tower construction logic.
