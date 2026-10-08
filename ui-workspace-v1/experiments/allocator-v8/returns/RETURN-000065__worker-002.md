# EXP-009 · RETURN-000065__worker-002
experiment_id: EXP-009
launch_id: exp009-3-c6489d30-3675-418e-a3a5-baf361f45073
launcher_button: TRIO-3
worker_id: exp009-w002
worker_slot: 002
ticket: 000065
launch_clicked_at: 2026-10-08T02:31:42.508Z
worker_started_at: 2026-10-08T02:32:01.236Z
registered_at: 2026-10-08T02:32:25.343Z
claim_at: 2026-10-08T02:35:09.654Z
local_start: 2026-10-08T02:35:28.087Z
local_end: 2026-10-08T02:35:28.087Z
publish_start: 2026-10-08T02:35:28.087Z
counters: tickets_claimed=11; returns_created_before=10; tasks_completed_before=10; revision_conflicts=3; retries=2; state_failures=0

## ANSWER
Un allocator atómico impide que dos workers ganen un mismo ticket porque compara cada actualización con la revisión vigente. Cuando uno gana, los demás deben releer el dealer y competir por el ticket siguiente.

## MINI_RESUMEN
Ticket 000065: la revisión condicional serializa la entrega de tickets.
