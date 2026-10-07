EXP-008-B
launch_id: exp008-b-2-0afe0c1f-8e5c-472c-aef5-9b10fe144711
worker_id: exp008-b-w001-0afe0c1f
worker_slot: 001
ticket: 000003
launch_clicked_at: 2026-10-07T22:20:40.413Z
worker_started_at: 2026-10-07T22:20:57.654Z
registered_at: 2026-10-07T22:21:07.855Z
claim_at: 2026-10-07T22:22:01.963Z
local_start: 2026-10-07T22:22:01.963Z
local_end: 2026-10-07T22:22:01.963Z
publish_start: 2026-10-07T22:22:01.963Z
counters: {"dealer_reads":5,"dealer_cas":5,"return_publish":3,"return_verify":2,"state_writes":1,"state_failures":0,"revision_conflicts":0,"retries":2,"forbidden_ops":0}

ANSWER
Un RETURN durable registra el resultado antes de que el worker avance y permite recuperarlo aunque la sesión falle. Sin ese registro, una tarea podría darse por terminada sin evidencia o perderse al reclamar la siguiente.

MINI_RESUMEN
Ticket 000003: respuesta local de dos frases; RETURN verificable.
