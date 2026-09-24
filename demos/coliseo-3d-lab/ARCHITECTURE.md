# Coliseo Heavy Lab · Architecture

Baseline canonical Coliseo: `8ef25c0a34cc9cd68fa9b35152dec9289d5cb3d8`

This lab is additive. The canonical route `/demos/coliseo-3d/` is not modified by the lab.

## Goal

Turn the current Coliseo into the beginning of a renderer for a universal work graph without coupling the renderer to Product-100, Guides, Worker Bus versions, or any workflow-specific name.

## Data boundary

The lab exposes:

```js
window.WORLD_MANIFEST_DEMO
```

Schema:

```json
{
  "schema": "prometeo.world_manifest/demo-v1",
  "synthetic": true,
  "fixture": "chain",
  "nodes": [],
  "edges": [],
  "agents": [],
  "artifacts": [],
  "focus": {},
  "metrics": {}
}
```

Universal entity vocabulary:

- node
- edge
- agent
- artifact
- event
- metric
- focus

The renderer should not learn workflow-specific concepts. Those belong in adapters.

## Implemented primitives

### WorldRoad
Projected ground-space connection between existing tower sites.

Properties:
- world-space geometry;
- no screen-space arrows;
- status vocabulary: relation / ready / blocked;
- optional critical flag;
- curved route derived from endpoints;
- physical interruption for blocked relation.

### WorldGate prototype
A blocked edge can render a physical gate.

### Artifact transport
A generic durable artifact moves along a real fixture edge.

This is intentionally one artifact family only.

### WorkPad prototype
Each tower gets a low world-space pad outside the construction footprint.

The pad can visually distinguish active vs quiet assignment state.

### Worker pool marker
A neutral common-zone marker exists in the arena center.

Current canonical workers are not rerouted to it yet. It establishes the spatial primitive without rewriting worker movement.

### Causal layout targets
The lab computes radial target coordinates from graph distance to focus.

This does NOT move canonical towers by default.

Use `?layout=1` to display the target slots as a sandbox overlay.

### Persistent exterior prototype
Two world-space structures live outside the Coliseo:
- a persistent tower fed conceptually by durable accepted work;
- a historical/archive ruin.

They are easiest to inspect while zoomed out.

## Safety boundaries

The lab does not:
- rewrite camera;
- rewrite current tower geometry;
- replace current ritual;
- claim synthetic fixture data is live;
- rotate physical signs toward camera;
- touch canonical `/demos/coliseo-3d/`.

## Next safe modules

1. replace synthetic edge/artifact events with a proper fixture event stream;
2. route a real lab courier through work pads;
3. allow artifact arrival to unlock a dependent blueprint;
4. add a fixture-only dynamic site-layout mode;
5. add click inspection for node/edge/artifact/gate;
6. profile 20/50/100-node synthetic manifests;
7. build a semantic adapter to canonical Prometeo snapshot data.
