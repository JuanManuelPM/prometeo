# BACKLOG-111 — mano/pinza como acento

Status: IMPLEMENTED

Target: `pages/forge-blueprint/index.html`.

The Forge observer now renders a clamp/grip accent only on real job handoff transitions and never as a persistent decoration.

Behavior:
- the first polling snapshot only primes state, so reloads do not fabricate an interaction;
- only phases 4–5 qualify as important objects;
- transition to `LEASED` emits a transient TAKE accent on the worker;
- transition from `LEASED` to `DONE` emits a transient DEPOSIT accent on the point;
- the mark removes itself after the animation and does not alter job state or backend coordination.

Verification on committed bytes confirmed the grip CSS, the phase>=4 importance gate, transition detection, and worker/point data targets.

Implementation commit: `51897ceebdcaa400a58717a2ba1c2485457043f9`.
