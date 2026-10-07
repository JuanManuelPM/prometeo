# EXP-008-A

launch_id: exp008-a-2-8d3ac55c-77e4-47fc-9745-98fcbc89a13f
worker_id: exp008-a-w001-8d3ac55c
worker_slot: 001
ticket: 000027
launch_clicked_at: 2026-10-07T22:18:23.516Z
worker_started_at: 2026-10-07T22:18:41.923Z
registered_at: 2026-10-07T22:18:57.855Z
claim_at: 2026-10-07T22:24:38.100Z
local_start: 2026-10-07T22:24:38.100Z
local_end: 2026-10-07T22:24:38.100Z
publish_start: 2026-10-07T22:24:38.100Z
counters: {"dealer_reads":31,"dealer_cas":29,"return_publish":26,"return_verify":26,"state_writes":6,"state_failures":1,"revision_conflicts":1,"retries":0,"forbidden_ops":0,"tickets_claimed":27,"tasks_completed":26,"returns_created":26}

## ANSWER
Un RETURN durable guarda el resultado de forma verificable antes de que el worker reclame otro trabajo. Sin ese registro, una interrupción podría hacer desaparecer resultados que se dieron por terminados.

## MINI_RESUMEN
Ticket 000027 resuelto localmente en dos frases y publicado para verificación.
