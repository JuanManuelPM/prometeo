# BACKLOG-148 — confianza crece con muestras

Status: RECONCILED + clarification restored.

The durable backlog already marks BACKLOG-148 as HECHO. The current Forge Blueprint still implements a monotonic confidence heuristic tied directly to evidence count:

- n < 3 → muy baja
- n < 6 → baja
- n < 12 → media
- n >= 12 → alta

The UI exposes `n` beside the confidence label and uses completed current-run jobs, or completed historical runs when the ETA source is historical.

During reconciliation, a later ETA-band change was found to have removed the explicit disclaimer that this confidence label is not a statistical interval. The formula itself was intact. The tooltip was corrected without changing thresholds or ETA math.

Committed verification:
- `etaConfidence(est)` present;
- monotonic thresholds present;
- sample count visible;
- tooltip states: confidence is a monotonic heuristic by sample count and is not a statistical interval.

Correction commit: `14b4c995c30de7ff7cd01e322cd391703d1759fc`.
Verified blob: `127f4555d6c59bc0ad03200bed13320c9fd2c4e1`.

Original implementation evidence:
- `d30b5ae619c088373a0aed65ef2a8c6d58b6366c` — sample-based ETA confidence UI.
- `2b26d699d62d61abdef23e97e45f089fac80a77d` — backlog reconciled to HECHO.
