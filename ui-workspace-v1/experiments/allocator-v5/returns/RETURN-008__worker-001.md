EXP-006
WORKER_ID|exp006-20261007T140329086Z-30f38b
WORKER_SLOT|001
TICKET|008
BLOCK|BLOCK-008

TRACE|get_next_start|2026-10-07T14:10:41.407Z
TRACE|get_next_end|2026-10-07T14:10:48.646Z
TRACE|assigned_at|2026-10-07T14:10:48.646Z
TRACE|block_read_start|2026-10-07T14:10:51.496Z
TRACE|block_read_end|2026-10-07T14:10:51.820Z
TRACE|local_work_start|2026-10-07T14:10:51.820Z
TRACE|local_work_end|2026-10-07T14:11:33.510Z
TRACE|return_publish_start|2026-10-07T14:11:33.510Z

COUNTER|external_work_calls|21
COUNTER|telemetry_writes|8
COUNTER|telemetry_failures|0
COUNTER|revision_conflicts|0
COUNTER|retries|0

ANSWER
Para detectar lecturas o escrituras online innecesarias conviene mirar estadísticas por bloque, no sólo totales acumulados. La primera es external_work_calls por bloque completado: si un trabajo simple necesita muchas llamadas externas, probablemente hay rereads, verificaciones repetidas o escrituras que no aportan al resultado.

También sirve separar las llamadas por tipo: GET_NEXT, BLOCK_READ, RETURN_PUBLISH, RETURN_VERIFY y telemetría. Un patrón sano debería mostrar una cantidad pequeña y bastante estable por ticket. Si BLOCK_READ aparece varias veces para el mismo bloque sin errores, o si hay múltiples escrituras de estado entre la lectura y el RETURN, eso señala actividad redundante.

Otra métrica útil es telemetry_writes frente a blocks_completed. Si la telemetría crece mucho más rápido que el trabajo material, el worker está gastando operaciones en reportarse en vez de producir. A eso se suman retries y revision_conflicts: los retries altos pueden indicar fallas reales o lógica demasiado insistente; los conflictos altos pueden mostrar demasiados accesos simultáneos al mismo recurso.

Finalmente, conviene registrar llamadas por ruta y timestamp. Así puede detectarse que un worker leyó dos veces el mismo archivo sin necesidad o escribió checkpoints casi idénticos con pocos milisegundos de diferencia.

MINI_RESUMEN|Las señales principales son llamadas externas por bloque, lecturas repetidas, exceso de telemetría y retries o conflictos anormalmente altos.
