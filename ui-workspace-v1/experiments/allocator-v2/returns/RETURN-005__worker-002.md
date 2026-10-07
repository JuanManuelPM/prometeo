# RETURN-005

TICKET|005
WORKER_SLOT|002
WORKER_ID|ALLOCATOR-V2-W002-20261006T2355Z
LOCAL_STARTED_AT|2026-10-07T00:01:06.975Z
LOCAL_FINISHED_AT|2026-10-07T00:01:52.850Z
LOCAL_WORK_MS|45875
IO_COUNTERS|BLOCK_READ=1;RETURN_PUBLISH=1;RETURN_VERIFY=1

Para poder auditar un ticket después, hay que guardar suficiente información para reconstruir tres cosas: qué se asignó, a quién se asignó y qué resultado produjo. Como mínimo, el ticket necesita un identificador único, la referencia exacta al bloque o tarea, el worker que lo recibió y la marca temporal de la asignación.

También conviene registrar el estado de la fuente en el momento de adjudicarlo, por ejemplo una revisión o versión del allocator. Eso permite distinguir una asignación válida de un intento basado en información vieja. Si hubo conflicto y reintento, ese dato debe quedar separado del ticket finalmente ganado.

Cuando el trabajo termina, la auditoría necesita vincular el ticket con un RETURN durable. Por eso deberían quedar la ruta o identificador del RETURN, el momento de publicación, el resultado de la verificación y, si existe, un hash o SHA del contenido verificado. Con eso se puede comprobar que el archivo leído después es el mismo que se publicó.

Finalmente, es útil conservar tiempos básicos y errores: inicio, fin, duración local, cantidad de operaciones externas y cualquier fallo relevante. No hace falta guardar cada detalle interno del razonamiento del worker. La auditoría debe probar la cadena observable de asignación, ejecución y entrega, no reconstruir pensamientos privados.

MINI_RESUMEN|Un ticket auditable debe enlazar identidad, tarea, worker, versión de asignación, tiempos y RETURN verificado para reconstruir de forma objetiva qué ocurrió.
