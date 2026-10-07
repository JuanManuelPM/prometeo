EXP-004
ticket|010
block|BLOCK-010
worker_id|exp004-20261007T111451976Z-1lna36
worker_slot|001
assigned_worker_at|2026-10-07T11:49:06.415Z
local_work_started_worker_at|2026-10-07T11:49:12.853Z
local_work_ended_worker_at|2026-10-07T11:50:23.590Z

RESPUESTA|
El ciclo mínimo empieza una sola vez con el registro del worker. Ese registro le da una identidad de ejecución y un slot fijo, y deja un primer ping durable para que exista evidencia pública de que el worker entró al sistema.

Después comienza el bucle de trabajo. El worker pide GET_NEXT al allocator. Si recibe un ticket, no elige nada por su cuenta: usa exactamente el bloque asociado a ese ticket y lee sólo ese archivo. En cuanto termina la lectura, empieza el trabajo local. La respuesta se redacta completa sin tocar Drive, GitHub ni ninguna otra fuente externa, de modo que el razonamiento quede separado del transporte.

Cuando el contenido está terminado, el worker registra la intención de publicar y crea un único RETURN completo con ticket, bloque, identidad, timestamps y respuesta. Luego hace una sola verificación del RETURN para comprobar que el artefacto durable existe y corresponde al ticket correcto.

Si la verificación pasa, limpia su tarea activa y pide inmediatamente otro GET_NEXT. El ciclo se repite bloque por bloque, siempre con una sola tarea activa. Cuando el allocator responde EMPTY, el worker termina. Es deliberadamente mecánico: menos decisiones libres significan menos formas creativas de romper una prueba sencilla.

MINI_RESUMEN|Registrar, pedir, leer, trabajar localmente, publicar, verificar y volver a pedir forma el ciclo mínimo completo de un worker fungible.
