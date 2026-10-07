# RETURN-008

TICKET|008
WORKER_SLOT|002
WORKER_ID|ALLOCATOR-V2-W002-20261006T2355Z
LOCAL_STARTED_AT|2026-10-07T00:04:19.692Z
LOCAL_FINISHED_AT|2026-10-07T00:05:19.601Z
LOCAL_WORK_MS|59909
IO_COUNTERS|BLOCK_READ=1;RETURN_PUBLISH=1;RETURN_VERIFY=1

Las estadísticas más útiles son las que comparan operaciones online contra trabajo útil terminado. La primera es external_work_ops por bloque completado. Si un protocolo espera aproximadamente un GET_NEXT, una lectura de bloque, una publicación y una verificación, un valor que crece mucho por encima de ese patrón señala consultas repetidas o escrituras innecesarias.

Después conviene separar por tipo: cantidad de BLOCK_READ por ticket, RETURN_PUBLISH por RETURN y RETURN_VERIFY por publicación. Un ticket normal debería tener una sola lectura de bloque y una sola verificación. Dos o más lecturas del mismo archivo, sin conflicto o recuperación documentada, son una bandera roja bastante poco filosófica: alguien está releyendo “por las dudas”.

También sirven revision_conflicts, retries y errors. Un aumento de reintentos puede ser legítimo con concurrencia real, pero si aparece sin conflictos observables probablemente hay I/O redundante. Otra métrica útil es total de operaciones por target único: muchas lecturas al mismo recurso indican polling o rereads.

Por último, medir tiempo online frente a duración de trabajo local ayuda a detectar workers que pasan más tiempo tocando servicios externos que resolviendo el bloque. Durante la redacción local, el contador de operaciones externas debería quedarse quieto. La telemetría debe distinguir además sus propias escrituras, porque auditarlas como trabajo produciría recursión artificial.

MINI_RESUMEN|Para detectar I/O innecesario hay que mirar operaciones externas por bloque, rereads por target, publicaciones/verificaciones duplicadas, reintentos sin conflicto y tiempo online frente a trabajo local.
