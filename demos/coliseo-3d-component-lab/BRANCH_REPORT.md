# Component Lab · Branch Report

Source heavy renderer:
- `demos/coliseo-3d-lab-heavy/`

New isolated review route:
- `demos/coliseo-3d-component-lab/`

Current build:
- `COMPONENT-LAB-1.2`

## Main changes

- split review into three screens only;
- structure screen removes workers and construction simulation;
- structures autorotate for angle inspection;
- all structure prototypes use a shared modular box builder;
- maximum module target is about 0.72 world units;
- removed back-face dead-band in this renderer path;
- added stable block-like painter order for component structures;
- added isolated seven-state worker gallery;
- added isolated signs/fire gallery;
- moved yaw-dependent test grid out of static backdrop;
- static backdrop now remains cached during autorotation;
- added camera-angle and visible-face instrumentation;
- preserved forced-landscape mobile behavior.

## Why

The previous heavy lab mixed too many independent failure sources.

A projection bug could be mistaken for:
- worker animation;
- fire overlay;
- road geometry;
- construction state;
- scene painter order.

The component lab is therefore a visual unit-test surface.

## Canonical status

This is branch/lab work.

The canonical Coliseo route is not modified.
