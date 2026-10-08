EXP-009
launch_id: exp009-1-3289a036-a7f9-40b3-971d-2e043c06c537
launcher_button: TRIO-1
worker_id: exp009-w001
worker_slot: 001
ticket: 000041
launch_clicked_at: 2026-10-08T02:24:50.661Z
worker_started_at: 2026-10-08T02:25:07.067Z
registered_at: 2026-10-08T02:25:24.763Z
claim_at: 2026-10-08T02:32:55.336Z
local_start: 2026-10-08T02:33:20.221Z
local_end: 2026-10-08T02:33:20.221Z
publish_start: 2026-10-08T02:33:20.221Z
counters: tickets_claimed=41; returns_created_before=40; tasks_completed_before=40; revision_conflicts=0; retries=0; state_failures=0
ANSWER: Un allocator atómico entrega cada ticket a un único worker mediante una transición indivisible. Así evita que dos workers reclamen y ejecuten simultáneamente el mismo trabajo.
MINI_RESUMEN: Asignación exclusiva.
