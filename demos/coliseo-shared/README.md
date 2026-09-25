# Coliseo Parallel Visual Labs V1

This directory is the shared boundary for parallel visual work on Prometeo.

## Canonical rule

The labs share semantics and fixtures, not design. contract-v1.js is the meaning boundary. fixture-v1.js is synthetic test data. Individual labs may redesign their own surface completely.

Do not modify shared files from a specialist lab. If a specialist discovers that the shared contract is insufficient, write a proposal inside that lab. The Integration lab is the only place allowed to adopt shared-contract changes.

## Semantic invariants

- ACTIVE means a job is active. It does not prove that a worker is alive.
- Worker identity, job identity, and node identity are separate.
- A successful job produces a bounded completion/output event. A completed node is not an infinite emitter.
- Dependencies describe causal availability. They do not imply that the same worker continues downstream.
- A downstream job may be claimed by another worker.
- Demo data is visibly synthetic.
- Liveness visuals must derive from recent durable signal/progress.

## Lab ownership

- /demos/coliseo-live/: semantics, event derivation, causal dynamics.
- /demos/coliseo-workers/: worker body, sprites, poses.
- /demos/coliseo-animation/: movement and transition language.
- /demos/coliseo-maps/: world, camera, geometry, placement.
- /demos/coliseo-materials/: rendering primitives, materials, transparency, FX.
- /demos/coliseo-hud/: labels, semantic zoom, selection, detail.
- /demos/coliseo-integration/: composition, live wiring, verification, promotion.

## Specialist-lab rule

A specialist lab may edit only its own directory. It must not silently edit another lab or the live production surface. It should export its work through module.js and document any proposed contract change locally.

## Integration rule

Integration consumes specialist modules only after they are visually demonstrated in their own stable route. Integration may reject or adapt a module. A specialist lab never promotes itself into the canonical live surface.

## Shared fixture

The fixture deliberately contains three projects, different job kinds, READY/ACTIVE/BLOCKED/SUCCESS states, LIVE/AGING/SUSPECT workers, dependencies, recovery metadata, and multiple progress stages. A design must survive the common fixture before it can be considered reusable.
