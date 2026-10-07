# EXP-008-A

launch_id: exp008-a-2-8d3ac55c-77e4-47fc-9745-98fcbc89a13f
worker_id: exp008-a-w001-8d3ac55c
worker_slot: 001
ticket: 000008
launch_clicked_at: 2026-10-07T22:18:23.516Z
worker_started_at: 2026-10-07T22:18:41.923Z
registered_at: 2026-10-07T22:18:57.855Z
claim_at: 2026-10-07T22:20:40.057Z
local_start: 2026-10-07T22:20:40.057Z
local_end: 2026-10-07T22:20:40.057Z
publish_start: 2026-10-07T22:20:40.057Z
counters: {"dealer_reads":9,"dealer_cas":9,"return_publish":7,"return_verify":7,"state_writes":2,"state_failures":0,"revision_conflicts":0,"retries":0,"forbidden_ops":0,"tickets_claimed":8,"tasks_completed":7,"returns_created":7}

## ANSWER
La telemetría no debe bloquear el trabajo material porque registrar métricas es secundario frente a completar una tarea. Si falla el registro, el worker debe continuar y conservar la posibilidad de informar el error después.

## MINI_RESUMEN
Ticket 000008 resuelto localmente en dos frases y publicado para verificación.
