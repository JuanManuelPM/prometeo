EXP-004
ticket|006
block|BLOCK-006
worker_id|exp004-20261007T111451976Z-1lna36
worker_slot|001
assigned_worker_at|2026-10-07T11:30:57.921Z
local_work_started_worker_at|2026-10-07T11:32:10.362Z
local_work_ended_worker_at|2026-10-07T11:32:39.752Z

RESPUESTA|
Que un worker sea fungible significa que no depende de una identidad especial, una tarea favorita ni un contexto privado que sólo él conoce. Cualquier worker compatible puede tomar el siguiente ticket y ejecutar el mismo protocolo. Si uno desaparece, otro puede ocupar su lugar sin que el sistema tenga que reconstruir una personalidad, una cola propia o una ruta distinta para cada trabajador.

Eso ayuda a escalar porque la capacidad se vuelve intercambiable. Imaginá diez cajas iguales en un depósito: no importa cuál caja recibe un producto, siempre que cumpla las mismas condiciones. Del mismo modo, si hay dos workers hoy y diez mañana, todos pueden pedir trabajo al mismo allocator y recibir tareas independientes. El sistema no necesita diseñar una estructura nueva para cada aumento de capacidad.

La fungibilidad también simplifica la recuperación y la medición. Un worker lento o fallido no debería bloquear una rama entera del trabajo por ser “el único” que entiende esa tarea. El estado importante debe vivir en tickets, RETURNS y registros durables, no dentro de una sesión irrepetible. Así, escalar consiste principalmente en agregar más ejecutores compatibles, no en multiplicar coordinadores especiales.

MINI_RESUMEN|Un worker fungible es reemplazable e intercambiable, lo que permite sumar capacidad sin crear dependencias únicas ni rutas especiales.
