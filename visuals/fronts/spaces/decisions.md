# 🌀 Pseudo-3D Spaces · Durable Decisions

Status: CURRENT

## Map 5 · Hinged cardboard signs · v21
- The old telescoping panel concept is superseded.
- A sign is a **simple cardboard placard attached to a rigid stick**.
- The stick is hinged to the road-facing side of each violet spire.
- Far away, the pole stays upright/hidden against the spire.
- The sign only deploys when the spire is **ahead of the player**.
- At medium forward distance it falls inward toward the road and exposes the placard.
- At close distance it raises again quickly so the player does not collide with it.
- Current display band: ahead, below 18 Z units and above 6.2 Z units.
- Behind the player, it must not deploy.
- Rotation is physical, around the hinge. Do not substitute vertical translation.
- Cardboard should look cheap/simple and physical, not like a polished HUD panel.
- Render sign before spire so retracted geometry is naturally hidden by the obelisk silhouette.
- Near retraction is faster than the initial fall.

## Preserve
- Map 5 orange sky, purple striped avenue, paired violet spires and stepped temple.
- v20 horizontally finger-scrollable scene selector.
- Fixed camera, movement controls and true 3D camera-distance lighting.
