# EXP-008-E · RETURN 000001
launch_id: exp008-e-2-ca9541c8-eb12-4d94-85fd-8a8d3eaa6192
launcher_button: E-2
worker_id: exp008-e-w001
slot: 001
ticket: 000001
launch_clicked_at: 2026-10-07T22:23:33.127Z
worker_started_at: 2026-10-07T22:23:52.804Z
registered_at: 2026-10-07T22:24:06.880Z
claim_at: 2026-10-07T22:24:06.880Z
local_started_at: 2026-10-07T22:24:26.161Z
local_finished_at: 2026-10-07T22:24:26.161Z
publish_at: 2026-10-07T22:24:26.161Z
tickets_claimed: 1
tasks_completed_after_create: 1
returns_created_after_create: 1
ANSWER: La asignación atómica del ticket se consigue reservando su identificador con una actualización condicionada a la revisión vigente del DEALER. Si otra ejecución modifica esa revisión, corresponde leer de nuevo y reintentar, evitando adjudicar dos veces el mismo ticket.
MINI_RESUMEN: Reserva atómica de ticket mediante revisión condicionada y reintento frente a conflictos.
