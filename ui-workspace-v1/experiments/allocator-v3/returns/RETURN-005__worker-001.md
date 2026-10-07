EXP-004
ticket|005
block|BLOCK-005
worker_id|exp004-20261007T111451976Z-1lna36
worker_slot|001
assigned_worker_at|2026-10-07T11:25:20.619Z
local_work_started_worker_at|2026-10-07T11:26:24.741Z
local_work_ended_worker_at|2026-10-07T11:27:06.471Z

RESPUESTA|
Un ticket necesita guardar poca información, pero la suficiente para reconstruir su recorrido sin depender de memoria humana. Como mínimo debería incluir un identificador único, el bloque o tarea que representa y el worker al que fue asignado. También conviene registrar el momento exacto de asignación, porque permite ordenar eventos y medir cuánto tiempo pasó antes de que empezara el trabajo.

Después, el ticket debería conservar los hitos principales: cuándo comenzó el trabajo local, cuándo terminó, dónde se publicó el resultado y cuándo se verificó. Si hubo conflictos, retries o errores, deberían quedar asociados al mismo ticket con sus timestamps y un estado final claro, por ejemplo COMPLETED o FAILED. No hace falta guardar una novela sobre cada paso; alcanza con datos que permitan responder preguntas concretas: quién lo tuvo, qué hizo, cuándo lo hizo y cuál fue el resultado durable.

Por ejemplo, si dos tickets parecen haberse procesado al mismo tiempo, esos campos permiten comprobar si realmente hubo duplicación o sólo ejecución paralela legítima. Y si un RETURN falta, se puede distinguir si el problema ocurrió antes de redactar, al publicar o al verificar.

MINI_RESUMEN|Un ticket auditable necesita identidad, tarea, worker, timestamps de transición, resultado durable y cualquier conflicto o error relevante.
