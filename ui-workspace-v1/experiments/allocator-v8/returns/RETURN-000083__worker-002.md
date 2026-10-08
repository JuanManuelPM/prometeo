# EXP-009 · RETURN-000083__worker-002
experiment_id: EXP-009
launch_id: exp009-3-c6489d30-3675-418e-a3a5-baf361f45073
launcher_button: TRIO-3
worker_id: exp009-w002
worker_slot: 002
ticket: 000083
launch_clicked_at: 2026-10-08T02:31:42.508Z
worker_started_at: 2026-10-08T02:32:01.236Z
registered_at: 2026-10-08T02:32:25.343Z
claim_at: 2026-10-08T02:36:52.026Z
local_start: 2026-10-08T02:36:52.026Z
local_end: 2026-10-08T02:36:52.026Z
publish_start: 2026-10-08T02:36:52.026Z
counters: tickets_claimed=17; returns_created_before=16; tasks_completed_before=16; revision_conflicts=5; retries=2; state_failures=0

## ANSWER
Publicar primero un RETURN durable impide que el avance al ticket siguiente oculte trabajo aún sin evidencia. Cada ticket concluido queda verificable aunque el ciclo posterior sufra una interrupción.

## MINI_RESUMEN
Ticket 000083: explicación en dos frases del bloque R=3.
