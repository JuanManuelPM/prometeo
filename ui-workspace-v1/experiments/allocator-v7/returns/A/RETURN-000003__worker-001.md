# EXP-008-A

launch_id: exp008-a-2-8d3ac55c-77e4-47fc-9745-98fcbc89a13f
worker_id: exp008-a-w001-8d3ac55c
worker_slot: 001
ticket: 000003
launch_clicked_at: 2026-10-07T22:18:23.516Z
worker_started_at: 2026-10-07T22:18:41.923Z
registered_at: 2026-10-07T22:18:57.855Z
claim_at: 2026-10-07T22:19:55.326Z
local_start: 2026-10-07T22:19:55.326Z
local_end: 2026-10-07T22:19:55.326Z
publish_start: 2026-10-07T22:19:55.326Z
counters: {"dealer_reads":4,"dealer_cas":4,"return_publish":2,"return_verify":2,"state_writes":1,"state_failures":0,"revision_conflicts":0,"retries":0,"forbidden_ops":0,"tickets_claimed":3,"tasks_completed":2,"returns_created":2}

## ANSWER
Un RETURN durable guarda el resultado de forma verificable antes de que el worker reclame otro trabajo. Sin ese registro, una interrupción podría hacer desaparecer resultados que se dieron por terminados.

## MINI_RESUMEN
Ticket 000003 resuelto localmente en dos frases y publicado para verificación.
