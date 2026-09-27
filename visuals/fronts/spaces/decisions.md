# 🌀 Pseudo-3D Spaces · Durable Decisions

Status: CURRENT

## Mobile scene selector · v20
- All scene options must remain reachable on narrow touch screens.
- The selector is a horizontal strip, not a fixed row that clips later options.
- Both the strip and its buttons allow horizontal pan gestures.
- Do not use `touch-action:none` on map-selector buttons.
- Native horizontal scrolling is supported.
- Also keep explicit pointer-drag scrolling as a fallback because the rest of the page intentionally owns touch gestures.
- A drag must not accidentally trigger a scene-selection click.
- After selecting a scene, center its active button in the strip.
- Scene buttons remain non-selectable and cannot invoke mobile copy/paste callouts.

## Preserve
- all five scenes;
- Map 5 proximity-reactive signs;
- vertical scene swipe locomotion;
- WASD + wheel;
- fixed frontal camera and world-space lighting.
