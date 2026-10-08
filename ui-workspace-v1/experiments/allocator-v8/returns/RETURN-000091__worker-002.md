# EXP-009 · RETURN-000091__worker-002
experiment_id: EXP-009
launch_id: exp009-3-c6489d30-3675-418e-a3a5-baf361f45073
launcher_button: TRIO-3
worker_id: exp009-w002
worker_slot: 002
ticket: 000091
launch_clicked_at: 2026-10-08T02:31:42.508Z
worker_started_at: 2026-10-08T02:32:01.236Z
registered_at: 2026-10-08T02:32:25.343Z
claim_at: 2026-10-08T02:37:25.633Z
local_start: 2026-10-08T02:37:42.329Z
local_end: 2026-10-08T02:37:42.329Z
publish_start: 2026-10-08T02:37:42.329Z
counters: tickets_claimed=21; returns_created_before=20; tasks_completed_before=20; revision_conflicts=7; retries=2; state_failures=0

## ANSWER
El RETURN durable se crea antes del siguiente claim para que cada resultado conserve una prueba independiente y recuperable. Así un error en la tarea posterior no elimina el registro del trabajo ya terminado.

## MINI_RESUMEN
El RETURN del ticket 000091 registra el trabajo previo antes de continuar el ciclo.
