# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## v21 · MAP 5 FALLING CARDBOARD SIGNS
Latest user correction:
- the v19/v20 proximity sign was not visible enough and the mechanism was conceptually wrong;
- it should look like **a cardboard sign attached to a stick**;
- the stick should **fall down as the player approaches from in front**;
- when the player gets very close, it should **raise again** so the player does not collide with it.

## CORRECT STATE MACHINE
For each Map 5 spire:
- far ahead: pole upright / hidden against the spire;
- medium distance ahead: pole falls inward toward the road and reveals the cardboard sign;
- very close: pole raises quickly again;
- behind the player: pole remains/reverts upright.

Current thresholds:
- starts display band when the spire is ahead and within 18 world-Z units;
- raises again once forward distance is 6.2 world-Z units or less;
- object must satisfy `dz > 0`, so signs behind the player do not deploy.

## PHYSICAL IMPLEMENTATION
- hinge sits on the road-facing side of each violet spire;
- rigid pole rotates from vertical to ~82° inward;
- pole length is 5.15 world units;
- cardboard placard is rigidly attached near the free end;
- cardboard uses warm brown/tan procedural material with a dark edge and crude violet painted mark;
- sign renders before the spire so the upright/retracting portion disappears behind the obelisk silhouette;
- deployment is smooth and time-based;
- near-player retraction is deliberately faster than deployment.

## PRESERVE
- Map 5 orange/red sky, striped purple road, paired violet spires and stepped temple;
- v20 finger-scrollable scene selector;
- universal movement and 3D camera-distance lighting.
