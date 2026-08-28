# UNIVERSAL SHELL V5 — ACCUMULATED CORRECTIONS

Status: ACCUMULATING / DO NOT BUILD YET

## Correction 01 — iPad-direct interaction is the real baseline

### Problem observed
V4 was visually touch-aware but desktop mouse interaction did not fully reproduce the direct-manipulation model of an iPad. A horizontal world should not require moving to an edge control or scrollbar to traverse it.

### Required correction
- Design the shell as if it is operated on iPad first.
- Horizontal content: finger swipes directly on the content surface.
- Desktop mouse: press-drag the same content surface to pan horizontally, with a small drag threshold and no accidental click after a drag.
- Dedicated full-surface horizontal rail: ordinary mouse-wheel movement may map to horizontal progression when no vertical document scroll competes.
- Trackpad native horizontal gestures remain native and are never doubled.
- Portrait may rotate the same model to vertical; the interaction grammar remains touch → move → focus → enter.
- No essential hover, scrollbar, tiny edge target, right-click or modifier-key interaction.

### Permanent or V5-only?
PERMANENT. Canonical owner: `interaction.touch-first`.

### Efficiency constraint
Implement once in the shared interaction primitive. Future apps only declare semantic axis/interaction intent; they do not recreate device-specific logic.

### Must preserve
- native touch momentum/physics
- Pointer Events as common pointer path
- contact-circle mouse/pen feedback
- Blank App Surface law
- no heavy custom physics
- reduced-motion safety
