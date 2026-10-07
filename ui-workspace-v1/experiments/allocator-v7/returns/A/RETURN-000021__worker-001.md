# EXP-008-A

launch_id: exp008-a-2-8d3ac55c-77e4-47fc-9745-98fcbc89a13f
worker_id: exp008-a-w001-8d3ac55c
worker_slot: 001
ticket: 000021
launch_clicked_at: 2026-10-07T22:18:23.516Z
worker_started_at: 2026-10-07T22:18:41.923Z
registered_at: 2026-10-07T22:18:57.855Z
claim_at: 2026-10-07T22:23:20.852Z
local_start: 2026-10-07T22:23:20.852Z
local_end: 2026-10-07T22:23:20.852Z
publish_start: 2026-10-07T22:23:20.852Z
counters: {"dealer_reads":24,"dealer_cas":23,"return_publish":20,"return_verify":20,"state_writes":5,"state_failures":1,"revision_conflicts":1,"retries":0,"forbidden_ops":0,"tickets_claimed":21,"tasks_completed":20,"returns_created":20}

## ANSWER
Un allocator atómico asigna cada ticket mediante una actualización indivisible que solo puede ganar un worker. Así impide que dos workers reclamen simultáneamente el mismo trabajo.

## MINI_RESUMEN
Ticket 000021 resuelto localmente en dos frases y publicado para verificación.
