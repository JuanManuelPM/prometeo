EXP-009
launch_id: exp009-1-3289a036-a7f9-40b3-971d-2e043c06c537
launcher_button: TRIO-1
worker_id: exp009-w001
worker_slot: 001
ticket: 000043
launch_clicked_at: 2026-10-08T02:24:50.661Z
worker_started_at: 2026-10-08T02:25:07.067Z
registered_at: 2026-10-08T02:25:24.763Z
claim_at: 2026-10-08T02:33:24.670Z
local_start: 2026-10-08T02:33:24.670Z
local_end: 2026-10-08T02:33:24.670Z
publish_start: 2026-10-08T02:33:24.670Z
counters: tickets_claimed=42; returns_created_before=41; tasks_completed_before=41; revision_conflicts=0; retries=0; state_failures=0
ANSWER: Un RETURN durable conserva el resultado incluso si el worker falla antes de reclamar otra tarea. Reclamar primero pondría en riesgo la trazabilidad del trabajo anterior.
MINI_RESUMEN: Durabilidad.
