# Coliseo visual labs

## Routes

- `/demos/coliseo-3d-world-hub/`
- `/demos/coliseo-3d-map-lab/?map=coliseo`
- `/demos/coliseo-3d-map-lab/?map=castillo`
- `/demos/coliseo-3d-map-lab/?map=fortaleza`
- `/demos/coliseo-3d-map-lab/?map=archivo`
- `/demos/coliseo-3d-component-lab/?mode=structures`
- `/demos/coliseo-3d-component-lab/?mode=workers`
- `/demos/coliseo-3d-component-lab/?mode=effects`
- `/demos/coliseo-3d-effect-lab/?preset=ritual`
- `/demos/coliseo-3d-effect-lab/?preset=analog`
- `/demos/coliseo-3d-effect-lab/?preset=fire`
- `/demos/coliseo-3d-effect-lab/?preset=stone`

## Separation rule

The labs intentionally do not render every system together.

### Component Lab
Visual unit tests:
- structures;
- worker states;
- signs + fire.

### Map Lab
One large map is loaded at a time.

Current maps:
- Coliseo;
- Castillo;
- Fortaleza;
- Archivo.

Large geometry uses the same solid depth principle as Component Lab: screen projection is stable and visibility is resolved by a depth buffer, not by semantic draw order.

### Effect Lab
A fixed test scene isolates post-processing and emissive effects.

Effect stack:
1. base scene;
2. color/contrast/saturation grade;
3. half-resolution selective bloom;
4. half-resolution warm halation;
5. emissive core;
6. subtle chromatic registration;
7. depth-style haze;
8. vignette;
9. sparse temporal grain.

Presets:
- Ritual oscuro;
- Horror analógico;
- Fuego denso;
- Piedra fría.

Every effect can be toggled independently.

Bloom and halation use a half-resolution buffer to reduce the expensive blur surface to roughly one quarter of the full-resolution pixel count.

### World Hub
The hub renders only lightweight rotating signs/silhouettes.

It does **not** load all maps behind the Coliseo.

Clicking a sign navigates to Map Lab and loads exactly one selected map.

## Mobile

All labs retain forced-landscape presentation for portrait phones:
- virtual landscape dimensions;
- rotated app surface;
- mapped touch coordinates where interaction is needed.

## Integration order

Do not merge every experiment into the canonical Coliseo at once.

Recommended integration:
1. approve structure renderer;
2. choose large-map grammar;
3. choose effect preset / effect strengths;
4. then connect the chosen pieces to the canonical world renderer.
