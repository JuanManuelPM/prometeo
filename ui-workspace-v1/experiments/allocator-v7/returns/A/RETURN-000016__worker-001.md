# EXP-008-A

launch_id: exp008-a-2-8d3ac55c-77e4-47fc-9745-98fcbc89a13f
worker_id: exp008-a-w001-8d3ac55c
worker_slot: 001
ticket: 000016
launch_clicked_at: 2026-10-07T22:18:23.516Z
worker_started_at: 2026-10-07T22:18:41.923Z
registered_at: 2026-10-07T22:18:57.855Z
claim_at: 2026-10-07T22:22:20.521Z
local_start: 2026-10-07T22:22:20.521Z
local_end: 2026-10-07T22:22:20.521Z
publish_start: 2026-10-07T22:22:20.521Z
counters: {"dealer_reads":18,"dealer_cas":17,"return_publish":15,"return_verify":15,"state_writes":4,"state_failures":0,"revision_conflicts":0,"retries":0,"forbidden_ops":0,"tickets_claimed":16,"tasks_completed":15,"returns_created":15}

## ANSWER
La telemetría no debe bloquear el trabajo material porque registrar métricas es secundario frente a completar una tarea. Si falla el registro, el worker debe continuar y conservar la posibilidad de informar el error después.

## MINI_RESUMEN
Ticket 000016 resuelto localmente en dos frases y publicado para verificación.
