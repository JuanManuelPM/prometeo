# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## v20 · MOBILE MAP SELECTOR FIX
Latest user-reported problem:
- the last scene options were not reachable on mobile;
- the selector looked horizontally scrollable but finger dragging on the buttons did not actually let the user reach the end.

## ROOT CAUSE
- `#maps` had overflow-x enabled, but its buttons explicitly used `touch-action:none`.
- That disabled the horizontal gesture exactly where users naturally start dragging.
- The fullscreen visual also uses aggressive touch handling, so relying only on browser-native gesture arbitration was fragile.

## IMPLEMENTATION
- map strip now has an explicit width suitable for narrow screens;
- `#maps` uses `touch-action:pan-x`;
- map buttons also allow `pan-x`;
- native momentum scrolling remains enabled;
- explicit Pointer Events drag fallback directly updates `scrollLeft`;
- dragging more than 4px is treated as a scroll gesture;
- the following click is suppressed so dragging does not accidentally switch scenes;
- selecting a map automatically scrolls its button into the center of the visible strip;
- five scene buttons remain non-selectable and do not summon copy/paste UI.

## PRESERVE
- all five scenes;
- Map 5 proximity signs;
- scene canvas vertical swipe locomotion;
- WASD / wheel movement;
- no text-selection/callout UI.
