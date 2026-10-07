EXP-004
ticket|007
block|BLOCK-007
worker_id|exp004-20261007T111451976Z-1lna36
worker_slot|001
assigned_worker_at|2026-10-07T11:36:24.872Z
local_work_started_worker_at|2026-10-07T11:37:14.824Z
local_work_ended_worker_at|2026-10-07T11:38:21.419Z

RESPUESTA|
Conviene redactar la respuesta localmente antes de publicarla porque el RETURN debería representar un resultado terminado, no un borrador en movimiento. Si el worker escribe directamente sobre el destino remoto mientras piensa, una interrupción, un fallo de conexión o una lectura concurrente puede dejar contenido incompleto y difícil de distinguir de un resultado válido.

Trabajar primero en local separa dos cosas que conviene medir por separado: producir la respuesta y publicarla. El worker puede leer su bloque, resolverlo por completo sin hacer llamadas externas y, recién cuando el texto está cerrado, realizar una única creación del RETURN. Eso reduce I/O, evita modificaciones parciales y vuelve mucho más simple la auditoría: un archivo que existe debería contener la respuesta completa.

También mejora la recuperación frente a errores. Si falla la publicación, el problema está claramente en la operación de escritura y se puede reintentar esa misma acción sin volver a investigar ni reconstruir el trabajo. En cambio, si la red participa durante toda la redacción, se mezclan fallos de razonamiento, edición y transporte.

La idea es bastante poco glamorosa, como casi toda buena infraestructura: pensar primero, publicar después, y dejar un artefacto remoto sólo cuando ya está listo.

MINI_RESUMEN|Redactar localmente permite publicar el RETURN de forma atómica, reducir I/O y separar claramente el trabajo intelectual de los fallos de transporte.
