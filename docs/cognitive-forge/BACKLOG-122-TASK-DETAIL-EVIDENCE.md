# BACKLOG-122 — detalle de tarea

Status: IMPLEMENTED

Target: `pages/forge-blueprint/index.html`.

The global Blueprint observer now has a real second inspection level for individual phase jobs.

Behavior:
- every existing phase job is inspectable even before an output exists;
- the task detail surface shows status, assigned worker, phase, word budget, rescue count, lease expiry, elapsed duration, and output size;
- output text remains visible when published; unpublished jobs explicitly show that no output exists yet;
- point/phase deep links persist as `?blueprint=...&point=N&phase=P` and restore the selected task on reload;
- the existing point seed remains the non-task view and hides operational task metadata.

Committed-byte verification confirmed task detail markup/rendering, openability of active jobs, all eight operational fields, deep-link persistence/restoration, and the no-output state.

Implementation commit: `a4c3162bd63367324d8bc30341224d377d4444fc`.
