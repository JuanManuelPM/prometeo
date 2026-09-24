# Component Lab · Map Roadmap

All future maps must reuse the same Component World contract:

- one camera;
- one projection;
- one zoom model;
- one depth renderer;
- one emissive depth pass;
- one post-process pipeline;
- circular / radial reveal where possible;
- no map-specific camera hacks.

The point is not to create isolated pages. Maps are world-layout definitions inside the same shell.

## 1. Coliseo canónico

Status: active.

Why it works:
- circular arena naturally supports rotation;
- front cut reveals the interior;
- radial slots let structures appear/disappear without UI clutter;
- zoom can move from total-world view to one sector.

Use this as the reference map grammar.

## 2. Fortaleza / castillo concéntrico

Geometry:
- outer defensive ring;
- inner courtyard;
- 4–6 towers on the perimeter;
- central keep;
- one open/broken wall sector.

Rotation behavior:
- rotating reveals one wall/tower cluster at a time;
- the broken sector works like the Coliseo cut;
- the keep stays as a persistent center landmark.

Best for:
- blockers;
- gates;
- dependency chains;
- defended/locked work.

## 3. Archivo / ziggurat circular

Geometry:
- stepped terraces forming concentric rings;
- archive towers or stacks on each terrace;
- radial stairs / ramps;
- central vertical archive core.

Rotation behavior:
- front terraces can be cut away by camera-facing rules;
- rear terraces become the visible skyline;
- zoom reveals different depth layers.

Best for:
- history;
- durable artifacts;
- completed work;
- old runs / archived branches.

## 4. Pozo / torre hueca

Geometry:
- cylindrical vertical shaft;
- rooms/platforms around the inside wall;
- bridges crossing the center;
- open top and sliced front wall.

Rotation behavior:
- camera rotates around a vertical interior;
- front wall disappears;
- levels above/below become readable by zoom.

Best for:
- deep dependency stacks;
- progress over time;
- nested subprojects;
- vertical “depth” as semantic history.

## 5. Ciudadela radial

Geometry:
- central plaza;
- wedge-shaped districts around it;
- each district has a distinct structure family;
- radial streets connect sectors.

Rotation behavior:
- each district becomes foreground in turn;
- opposite districts recede behind the center;
- roads expose actual relationships between sectors.

Best for:
- many parallel projects;
- guide / worker territories;
- large Prometeo world overview.

## 6. Fundición / fábrica circular

Geometry:
- central furnace;
- ring conveyor / rail;
- workshops around perimeter;
- cranes, material stacks, output gates.

Rotation behavior:
- material visually travels around the ring;
- near stations become readable;
- far stations reduce to silhouette.

Best for:
- job pipeline;
- artifact transformation;
- TAKE → WORK → VERIFY → PUBLISH.

## 7. Observatorio / planetario

Geometry:
- circular observatory floor;
- radial instruments;
- large central orrery / projection device;
- raised perimeter galleries.

Rotation behavior:
- instruments line up differently by angle;
- foreground equipment occludes naturally;
- center remains the stable focus.

Best for:
- metrics;
- experiments;
- comparisons;
- alternative hypotheses / branches.

## 8. Laberinto anular

Geometry:
- several concentric corridors;
- radial gates connecting rings;
- central goal chamber;
- selected walls removed in the camera-facing sector.

Rotation behavior:
- different corridors become readable as the world turns;
- gates physically encode dependencies;
- zoom exposes local routes.

Best for:
- task routing;
- blockers;
- dependency traversal;
- recovery / rescue paths.

## MapDefinition contract

Future implementation should reduce each map to data and builders:

```js
{
  id,
  label,
  shellBuilder,
  cutPolicy,
  slotLayout,
  landmarks,
  navigation,
  defaultZoom
}
```

A map may change geometry/layout.

A map may NOT replace:
- camera;
- projection;
- world renderer;
- depth rules;
- emissive renderer;
- post FX;
- mobile shell.


## Implemented in Component Lab V8

The following map definitions are now live inside the single Component Lab page:

- Coliseo
- Fortaleza
- Archivo
- Pozo
- Ciudadela
- Fundición
- Observatorio
- Laberinto

They all share:
- the same yaw / zoom camera state;
- the same projection;
- the same `componentModuleBox -> addWorldBox -> renderWorldSolidsGL` solid path for newly-authored physical geometry;
- the same depth-tested emissive pass;
- the same global post-FX drawer;
- the same swipe picker;
- the same portrait-to-landscape shell.

The canonical Coliseo remains the approved legacy shell/backdrop. The seven new maps are authored through the Component World v2 renderer.

Map selection is in-page and updates URL state with `?mode=maps&map=<id>`.

### Current reveal rules

- Fortaleza: camera-facing outer and inner wall sectors are omitted to expose the keep.
- Archivo: front terrace sectors are omitted progressively by tier.
- Pozo: front shaft wall is removed, exposing galleries and bridges.
- Ciudadela: districts rotate around a stable central plaza.
- Fundición: central furnace + conveyor ring + perimeter workshops.
- Observatorio: open gallery + animated orbital rings + perimeter instruments.
- Laberinto: concentric walls use both gates and camera-facing cuts to expose inner paths.
