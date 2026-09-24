# Coliseo Heavy Lab · Fixtures

Public lab route:

`/demos/coliseo-3d-lab/`

All fixtures are **synthetic**. The lab badge says SYNTHETIC on purpose.

## chain

`?fixture=chain`

Relationships:

`0 → 1 → 2 → 3 → 4`

One edge is blocked. The route is marked as the current critical chain.

Best fixture for:
- causal roads;
- blocked gate;
- artifact transfer;
- causal-distance layout hints.

## fanin

`?fixture=fanin`

Relationships:

`0 + 1 + 2 + 3 → 4`

One incoming edge is blocked and one is ready/critical.

Best fixture for:
- convergence;
- reducer-style fan-in;
- road collision inspection.

## parallel

`?fixture=parallel`

Several branches feed the focus with minimal blocking.

Best fixture for:
- parallel route readability;
- multiple work-pad context.

## dynamic

`?fixture=dynamic`

Topology changes automatically over time.

Best fixture for:
- validating that the renderer consumes graph data rather than hardcoded path assumptions;
- later testing interpolated layout.

## layout overlay

Append:

`&layout=1`

The lab shows computed radial target slots.

Important:
- this is a sandbox visualization;
- it does NOT relocate canonical tower structures;
- it proves the layout target calculation before site movement is enabled.

## fast mode

Append:

`&fast=1`

Speeds up synthetic topology/artifact timing.

Use only for review.
