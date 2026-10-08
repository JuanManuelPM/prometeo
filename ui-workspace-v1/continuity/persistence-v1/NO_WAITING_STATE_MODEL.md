# NO-WAITING STATE MODEL
Antes de adquisición no existe worker.

Incorrecto: `worker-003.json status=WAITING`.
Correcto: dealer muestra slot disponible; UI dice `SLOT 003 · NO ADQUIRIDO`.

Ciclo:
```text
CLAIMED → LOCAL_WORK → RETURN_DURABLE → CLAIMED
```

RETURN_DURABLE es evento, no residencia.
Terminales clasificatorios: AUTHORIZED_STOP o PLATFORM_INTERRUPTION.
No usar como estados operativos: WAITING, READY, IDLE, PARKING, BLOCKED, DONE.
