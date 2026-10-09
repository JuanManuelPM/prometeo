# 🔥 Prometeo · Dirección operativa entre chats · V1

**Publicado en `gh-pages`. Owner: `tv/chat/DIRECCION_OPERATIVA_V1.md`.** Es un índice para observación y despacho, no un agente vivo, un scheduler, una cola nueva, una fuente CURRENT ni un servicio de persistencia privada.

## Objetivo humano
El chat actual funciona como director/editor: conversar, detectar oportunidades, convertirlas en encargos con criterios observables y recuperar resultados. El usuario abre otros chats del mismo Proyecto o usa Work para ejecutarlos, y **no tiene que traer de vuelta el texto de sus respuestas**. Todo resultado material se guarda en GitHub con commits/PR, pruebas y recibos. Las conversaciones son prescindibles.

## Regreso tras interrupciones y olvido

`gh-pages:tv/chat/relevo/RETOMAR_V1.md` fija la regla antideriva para conversaciones de estrategia, priorización y «¿qué sigue?». Su pantalla `/prometeo/tv/chat/relevo/retomar/` es una lectura humana, NO un nuevo controlador. La prioridad propuesta del próximo producto se encuentra en `reentrada.json`; antes de ejecutarla recuperar el owner actual para comprobar que nadie la completó. **Éxito = artefacto humano verificable, no sólo arquitectura, skills, docs o commits.** Preservar las otras ideas y registrar reemplazos de prioridad.

## Consulta al comienzo de cada mensaje relacionado con Prometeo
1. Leer este índice sólo si todavía no se leyó en la sesión, o si se perdió el contexto. **Siempre refrescar** las fuentes dinámicas que interesan a la pregunta actual.
2. Comprobar GitHub `JuanManuelPM/prometeo`: `GET /pulls?state=open` y para PRs pertinentes `GET /pulls/<N>`, `GET /actions/runs?branch=<branch>`. No tratar el último resumen del chat como estado vigente. Repositorio separado `JuanManuelPM/Experimentos` sólo para una demo/tarea que dependa de él.
3. Si se pregunta «¿terminó?» exigir resultado en owner: cambio de estado PR, comprobaciones realmente completadas, evidencia de demo, publicación y URL servida si corresponde. No convertir `CI PASS` en `VISIBLE EN TV`.
4. Leer solo las rutas correspondientes del índice de pendientes `coordination/chat-bootstrap/v1/PENDING_INDEX_V1.json` del PR #73 o su integración actual, y Design DNA únicamente si aplica. El índice no demuestra que sus pendientes siguen abiertos; revalidar.
5. Responder breve y con decisiones accionables, mostrando quién está trabajando mediante PR/ticket, lo comprobado y lo pendiente.

## Encargos que el director puede publicar sin modificar otro chat
- Elegir un **Issue de GitHub** cuando la tarea todavía no tiene PR, o comentar en el **PR existente** cuando sí tiene dueño. No duplicar tickets por sistema, ni crear otra autoridad.
- Escribir el paquete de trabajo como comentario o body del Issue/PR: `objective`, `owner`, `write_scope`, `source_head` (lectura fresca), `DO/SEE/CHECK`, gates de pruebas/demo/privacidad, evidencias y condición exacta de aceptación. Evitar transcripciones, datos académicos/personales o URLs privadas en GitHub público.
- El ejecutor en otro chat puede recibir un mensaje mínimo `🔥prometeo Ejecutá la tarea del Issue #N / PR #N; leé el encargo actual y persistí resultados.` Un GitHub Issue no abre por sí solo un chat de ChatGPT; **no afirmar despacho automático**.
- El ejecutor publica commits/PR/recibos, corrige errores comprobados, actualiza su ticket con links y estado. Un segundo chat independiente puede verificar. El director consulta esos mismos owners al próximo mensaje.
- Resolver conflictos con lectura de HEAD, scope, pruebas y compare-and-swap; no sobrescribir trabajo concurrente. No fusionar ni publicar cambios sin permisos y gates.
- Una automatización de observación opcional puede avisar cuando un PR cumple condiciones verificables de integración; no puede completar pruebas visuales ni ejecutar un chat externo por sí misma.

## Tarea integradora ya existente, no abrir duplicado
**PR #74**, `https://github.com/JuanManuelPM/prometeo/pull/74`, integra candidatos #71 (skills y TDD), #72 (regresión TV) y #73 (bootstrap). Está en rama `integration/prometeo-71-72-73-20261009`, estado DRAFT observado 2026-10-09, no necesariamente vigente al próximo turno. **SIEMPRE RECUPERAR CI/HEAD ACTUALES**. El autor ya registró que quedan demo V6 sobre escena real, smoke servido, arranque frío desde otro chat, controles de CI y release gates. No reclamar `READY` hasta que evidencia actual cierre esos pendientes.

## TV y privados
- Lo servido está en `gh-pages:tv/chat/state.json`. La TV lee este estado; sólo cambiarlo para resultados **públicos realmente autorizados**, no para escribir el contexto íntimo de los chats.
- Una bitácora privada de acciones existe en Google Drive conectado; buscar por título **PROMETEO · Bitácora privada de acciones desde chats · V1** si hay autorización de consultar/anexar. No colocar ID ni contenido en GitHub público.
- No inferir que todos los chats comparten estado en vivo. **La colaboración real ocurre en los owners externos**. El chat no continúa trabajando cuando acaba su turno a menos que exista un runtime aparte.

## Criterio rector
Un mensaje puede producir mucho trabajo y pruebas; la sesión es descartable y sus resultados no. No escatimar cómputo por dogma. Preferir el siguiente avance material y verificable a propuestas de otra infraestructura de coordinación.
