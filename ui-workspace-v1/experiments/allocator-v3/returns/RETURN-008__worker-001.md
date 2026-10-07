EXP-004
ticket|008
block|BLOCK-008
worker_id|exp004-20261007T111451976Z-1lna36
worker_slot|001
assigned_worker_at|2026-10-07T11:44:30.299Z
local_work_started_worker_at|2026-10-07T11:45:21.894Z
local_work_ended_worker_at|2026-10-07T11:46:18.358Z

RESPUESTA|
Para detectar lecturas o escrituras online innecesarias, la estadística principal es external_work_calls por bloque completado. Si un bloque sencillo necesita una lectura, una publicación y una verificación, pero un worker acumula muchas más llamadas, algo está repitiéndose sin aportar trabajo material. Conviene separar además reads, writes, retries y conflicts para saber dónde aparece el exceso.

Otra señal útil es contar lecturas repetidas del mismo recurso. Si el worker consulta varias veces el mismo bloque, su propio state o el allocator sin que haya ocurrido un conflicto que justifique releerlo, hay I/O redundante. Del lado de las escrituras, sirve comparar telemetry_writes con logical_work_ops: la telemetría debe acompañar operaciones reales, no convertirse en una lluvia de commits que sólo registra que se registró algo. La humanidad inventó el logging y luego tuvo que inventar métricas para saber si estaba logueando demasiado. Previsible.

También ayudan la tasa de retries por operación, revision_conflicts, errores por llamada y el tiempo entre INTENT y RESULT. Un aumento de llamadas sin aumento proporcional de completed sugiere polling, rereads preventivos o escrituras fragmentadas. La métrica más clara es el costo de I/O por unidad útil terminada.

MINI_RESUMEN|Comparar llamadas externas, lecturas repetidas, escrituras de telemetría, retries y completed permite detectar I/O online que no produce trabajo útil.
