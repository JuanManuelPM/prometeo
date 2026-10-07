EXP-006
WORKER_ID|exp006-20261007140533766-guv93u
WORKER_SLOT|002
TICKET|010
BLOCK|BLOCK-010

TRACE|get_next_start|2026-10-07T14:13:17.799Z
TRACE|get_next_end|2026-10-07T14:13:20.103Z
TRACE|assigned_at|2026-10-07T14:13:20.103Z
TRACE|block_read_start|2026-10-07T14:13:27.714Z
TRACE|block_read_end|2026-10-07T14:13:28.050Z
TRACE|local_work_start|2026-10-07T14:13:28.050Z
TRACE|local_work_end|2026-10-07T14:14:40.131Z
TRACE|return_publish_start|2026-10-07T14:14:40.131Z

COUNTER|external_work_calls|37
COUNTER|telemetry_writes|11
COUNTER|telemetry_failures|0
COUNTER|revision_conflicts|0
COUNTER|retries|4

ANSWER
El ciclo mínimo empieza con el registro del worker. Ahí obtiene una identidad operativa y un slot fijo, que determinan dónde debe publicar su estado y en qué branch trabajar. Una vez registrado, no elige una tarea: pide el próximo ticket al allocator y recibe un número concreto.

Ese ticket determina exactamente qué bloque debe leer. El worker hace una única lectura del bloque asignado, toma su pregunta y pasa a trabajar localmente. Durante esa etapa redacta la respuesta completa sin consultar otros bloques ni depender de servicios externos. Cuando el contenido está terminado, publica un único RETURN en el path correspondiente a ese ticket y su slot.

Después verifica ese mismo RETURN para comprobar que contiene el worker, ticket, bloque y respuesta correctos. Sólo entonces considera completada la unidad de trabajo, limpia el ticket activo de su estado y vuelve inmediatamente a pedir trabajo al allocator.

El ciclo se repite siempre de la misma manera: GET_NEXT, lectura exacta, trabajo local, publicación y verificación. Cuando el allocator ya no tiene tickets válidos y devuelve una posición posterior al último bloque, el worker registra EMPTY y termina.

MINI_RESUMEN|El ciclo mínimo es registrarse, recibir un ticket mecánico, resolver sólo ese bloque, publicar y verificar su RETURN, y pedir inmediatamente el siguiente hasta EMPTY.
