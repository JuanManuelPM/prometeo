# BACKLOG-236 — descomponer pendientes complejos

Status: ALREADY_DONE / reconciled evidence

BACKLOG-236 requires a worker to be able to turn one backlog item into executable sub-work.

The active Productive Frontier already exposes this capability in its root-job contract: a root may publish up to three children when they are distinct, necessary, verifiable, and advance the parent objective. The durable job model also includes `generation` and `spawned_by_worker_code`.

Backend verification found real worker-spawned work in `PRODUCTIVE-FRONTIER-01`, not just a prompt convention:

- `FR-B163-CAPACITY-INSTRUMENTATION` — spawned by worker K109, status DONE, with `input_context.parent_job_key = FR-BACKLOG-163`.
- `FOLLOWUP-B223-RUNTIME-CONTRACT-ENFORCEMENT` — spawned by worker K116, status DONE.

This demonstrates that workers can decompose a durable backlog need into independent executable jobs which enter the normal scheduler and complete.

No synthetic child was created for BACKLOG-236 itself because that would violate the frontier rule against spawning work merely to prove or occupy capacity.
