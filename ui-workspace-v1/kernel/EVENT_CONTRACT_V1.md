# EVENT / ACTIVITY CONTRACT V1

Los workers externos usan eventos append-only. No se exige un daemon real.

Estados básicos:
REGISTERED -> CLAIMED -> WORKING -> VERIFYING -> RETURNED

Opcionales:
BLOCKED
STALE
FAILED

Eventos recomendados:
- REGISTERED
- PROMPT_RECEIVED
- CLAIMED
- PLAN_DECLARED
- HEARTBEAT
- FILE_WRITTEN
- TEST_STARTED
- TEST_RESULT
- RETURNED

Cada evento incluye:
worker_id, task_id, timestamp, status, message, files/components cuando corresponda.

No confundir:
REGISTERED != WORKING
RETURNED != INTEGRATED
CANDIDATE != CURRENT
