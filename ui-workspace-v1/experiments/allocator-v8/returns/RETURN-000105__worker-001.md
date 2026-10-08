EXP-009
launch_id: exp009-1-3289a036-a7f9-40b3-971d-2e043c06c537
launcher_button: TRIO-1
worker_id: exp009-w001
worker_slot: 001
ticket: 000105
launch_clicked_at: 2026-10-08T02:24:50.661Z
worker_started_at: 2026-10-08T02:25:07.067Z
registered_at: 2026-10-08T02:25:24.763Z
claim_at: 2026-10-08T02:38:51.587Z
local_start: 2026-10-08T02:38:51.587Z
local_end: 2026-10-08T02:38:51.587Z
publish_start: 2026-10-08T02:38:51.587Z
counters: tickets_claimed=79; returns_created_before=78; tasks_completed_before=78; revision_conflicts=6; retries=0; state_failures=0
ANSWER: Un allocator atómico entrega cada ticket a un único worker mediante una transición indivisible. Así evita que dos workers reclamen y ejecuten simultáneamente el mismo trabajo.
MINI_RESUMEN: Asignación exclusiva.
