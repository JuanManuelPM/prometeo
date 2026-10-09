# PROMETEO · HANDOFF ANTES DE RECIBIR EL RESULTADO DE WORK
**Fecha:** 2026-10-09. **Estado:** intención pública de producto persistida; no equivale a entrada privada del usuario ni a implementación/verificación E2E. **Próximo mensaje del usuario esperado:** la respuesta final de su otra sesión de ChatGPT Work.

## Instrucción del usuario en el presente turno
Corregir ahora el uso de skills y el sistema de activación; NO volver a diseñar la UI antes de recibir fotografías de referencia; conservar sin pérdida la historia antes y después del lanzamiento de Work. Cuando el usuario pegue el resultado de Work, conocer el siguiente paso y auditarlo con independencia, sin exigir al usuario otro recap.

## Visión principal (NO DESPLAZAR)
El humano escribe **UN MENSAJE en la página web de Prometeo**; la página lo guarda en memoria privada DURABLE con ACK verificable y deduplicación ANTES de cualquier worker. Si no hay worker, queda pendiente sin inventar ejecución. El Work Graph V1.1 y Worker Bus V2 asignan al entrar una shell real (la capacidad/worker se lanza cuando corresponda, sin exigir que ChatGPT despierte solo). El RETURN se verifica, queda guardado y genera respuesta VISIBLE en la **misma página**. Un chat totalmente nuevo recupera contexto, decisiones, errores, tareas, trabajo y resultado desde los owners de continuidad autorizados, sin repetir la conversación. El objetivo NO es dos turnos humanos en la página.

### Dos niveles distintos de activación, no contradictorios
- **Modo normal productivo:** `🔥`, `🔥personal`, `🔥libros`, `🔥examen`, etc. + texto son intenciones enviadas UNA SOLA VEZ a la página. La página guarda/coloca en cola; el worker asignado trabaja/retorna. Ni el parser, ni una skill instalada implican backend listo.
- **Modo de preparación deliberada EN ChatGPT:** `🔥prometeo [tema]` descubre todas las skills realmente visibles (plugin/runtime y repo), selecciona las relevantes, LEE sus instrucciones cuando disponibles, declara plan operativo, aceptación, herramientas, rutas, riesgos y ledger de uso. **NO ejecuta todavía la tarea material.** Un mensaje posterior con `.` ejecuta ese plan fresco y autorizado, verifica y persiste RETURN. Esta modalidad excepcional de revisión humana puede requerir 2 mensajes EN CHATGPT; NO sustituye el flujo definitivo one-turn de la página.
- Si `.` llega EN UN CHAT NUEVO: sólo puede ejecutar si recupera un plan preparado y confirmado por storage autorizado (plan_id, rev, hash, scope). Si no, reportar `PLAN_NOT_FOUND` y NO inventar que retiene un plan anterior ni inferir uno por semejanza.
- `🔥prometeo` sin tema usa la tarea actual exacta y verificable o la última intención insatisfecha del owner privado si es accesible; si no hay contexto, inventaría skills pero no forja plan listo.

## Lo ocurrido ANTES de enviar el ZIP a Work
- Objetivo one-turn + preservación de la evolución modular EVO-001..EVO-045, Design DNA, Current/Lineage/Catalog y toda la UI V15. No crear otro scheduler, Current, memoria, cola o shell paralelo. No perder microkernel, cartuchos, capacidades, hooks de instalación, estado por cartucho, reversibilidad e idea de herencia automática.
- Se registraron 3 skills fuente: `prometeo-one-turn`, `prometeo-web-change`, `prometeo-verify-release`; se examinó el puente existente de P4 Capture + Page Change (G1 código observado, escritura privada aún NO probada).
- Se preparó fuera de GitHub un ZIP `prometeo_one_turn_lanzamiento.zip`, con análisis adversarial de EXP-009, un plan compartido, 12 cápsulas de tareas, prompt universal, verificación y freeze. Esos nombres son REFERENCIAS HISTÓRICAS, no garantías de que los bytes del ZIP vivan en GitHub.
- El usuario envió el ZIP y el prompt integral a **ChatGPT Work**, pidiendo implementación, pruebas, persistencia y publicación verificable. NO suponer que Work lo hizo hasta leer su respuesta, refetch y comprobar evidencia.

## Lo ocurrido DESPUÉS de enviar el ZIP a Work
- Mientras Work trabajaba se construyó un **atlas de libros** HTML local: fichas con portadas/editoriales/autores/ideas/preguntas/relación con órganos, categorías nuevas, importación/exportación. No equivale a módulo integrado/publicado.
- Se planteó sintaxis `🔥` como entrada universal y `🔥personal libros`, `🔥examen`, `🔥plan`, `🔥criticar`, `🔥publicar`, `🔥skills`, etc. como variaciones. Se desarrolló en rama separada y PR #71 draft. El usuario pidió luego `🔥prometeo` para descubrir **todas las skills** pertinentes, aunque algunas se repitan frecuentemente.
- Tras pedido de "toque final" se describieron métricas/núcleo visual y se produjo una maqueta HTML local `prometeo_mesa_local.html` con simulación, 12 gates de cierre y ZIP local. El usuario rechazó el resultado: **le parece horrible y poco útil**, porque se enumeraron skills sin usarlas realmente. No promocionar esta maqueta ni tratarla como dirección estética definitiva.
- El usuario pidió reformular protocolo a `🔥prometeo` => preparación transparente => `.` => uso real de skills y ejecución. Esta modificación SE ESTÁ PREPARANDO EN LA PRESENTE RAMA.
- **FOTOGRAFÍAS PENDIENTES:** el usuario enviará referencias visuales después de reparar continuidad/protocolo. No inventar estética ni publicar otro dashboard; esperar esas imágenes para Design DNA visual.
- **WORK ACABA DE TERMINAR según usuario**; todavía no pegó el resultado, commit, URL ni reporte. Se desconoce qué implementó y qué le falta.

## Diseño funcional y telemetría exigidos (no se pierdan)
- Pantalla cotidiana minimalista de conversación y sólo widgets que el usuario elija. Widgets instalables/desinstalables por cartuchos; sin migrar/destruir datos, preservar roles de kernel y límites de authority. No relleno, tarjetas repetidas ni diagramas cuadrados genéricos.
- Motor/nafta: resumen pequeño y legible **si el usuario lo activa** de workers realmente disponibles, con PIN/lease/CLAIM válido, RETURN, ocupación útil, capacidad libre, backlog real, últimos cambios/latidos, antigüedad/staleness, progreso, limitaciones de cuotas/combustible medibles. Números no medidos = DESCONOCIDO, no 0 ni color verde fingido. No pretender que un chat sigue vivo tras responder.
- **Telemetría completa continua, pero oculta visualmente por defecto**, consultable en página/pestaña especializada: start/midpoint/end, latencia de ACK y asignación, claim→primer cambio, ejecución material, RETURN→feed, throughput durable/tasa por minuto, tiempo por etapa E0-E9, intervalos/latidos observados, reads/writes/retries, conflictos de CAS, fallos, límites de herramienta, orphans/leases vencidas, costo/cuota/datos capturados, pendientes, versiones de fuente y hora de observación; guardar owner privado donde corresponda, optimizar writes para no agotar WAL/cuotas Supabase.
- Latencia de interfaz rápida/telemetría "casi instantánea" significa refrescar PROYECCIONES existentes en intervalos medidos, no emitir artificialmente writes/costos cada segundo ni inferir vivacidad de un timestamp viejo.
- Voz/transcripción cruda + clasificación con consentimiento, adjuntos, historial, borradores, notas, edición reversible, acceso móvil, offline/reconexión, autenticación, seguridad RLS, selección por página/propietario, anti-duplicados, errores recuperables, feed de novedades, proyectos/ideas/decisiones/artefactos/publicaciones enlazados, búsqueda y exportación/backup privado.
- Reportar SOURCE / TESTED / VERIFIED / PROMOTED / SERVED por separado. No declarar "listo" por un commit ni por un PR ni por HTML local.

## RELEVO OBLIGATORIO CUANDO EL USUARIO PEGUE LA RESPUESTA DE WORK
1. Tratar el mensaje de Work como **informe no verificado**, extraer: URLs, SHAs, ramas, archivos, tests, verificadores, certificados/recibos, bloqueos, pasos manuales requeridos y si hubo una entrada real desde la web con ACK privado + retorno.
2. Refetch `main`, `gh-pages`, PR #71, Current/EPOCH/owner y solo paths mencionados por Work; **nunca concluir éxito por su texto**. Detectar divergencia, colisiones y fuentes stale; no sobreescribir.
3. Evaluar G0-G8 en `coordination/one-turn/v1/EXECUTION_SPEC_V1.md` y 12 gates de cierre de la campaña. Caso imprescindible: input permanece durable con 0 workers; al entrar 1 worker compatible, asignación autorizada, RETURN durable, Feed visible, nuevo chat recupera.
4. Validar privacidad/autorización y telemetría honesta, conservar UX V15; registrar estados comprobables, fallos exactos, defectos y next.
5. Conciliar PR #71 (candidate `🔥`/scout/preflight/dot) con el desarrollo real de Work; merge sólo si no afecta base y la revisión independiente lo permite. No asumir que GitHub skills están instaladas en la app.
6. Priorizar cerrar el puente verdadero antes de cambiar estética. Para UI esperar fotos del usuario.
7. Dar respuesta ejecutiva con qué funciona, qué no, pruebas, qué falta y **un único paso concreto**, sin hacer que el humano transporte prompts o worker RETURNS.

## Owners/enlaces documentales
- `coordination/one-turn/v1/ONE_TURN_CONTRACT_V1.json`
- `coordination/one-turn/v1/EXECUTION_SPEC_V1.md` y `G1_EXISTING_BRIDGE_AUDIT_V1.md`
- `coordination/PAGE_CHANGE_THREAD_CONTRACT_V1.json`, `PAGE_CHANGE_FEED_CONTRACT_V1.json`
- `coordination/workers/CURRENT_WORKER_REUSE_CONTRACT_V1.json`, `WORKER_PIPELINE_V1.json`
- `ui-workspace-v1/continuity/evolution-v1/IDEA_INDEX_V1.json` (45 IDs)
- `coordination/design-dna/INDEX.json`, `coordination/GLOBAL_AGENT_CONSTITUTION_V1.md`
- PR #71: `https://github.com/JuanManuelPM/prometeo/pull/71`
No exponer identificadores privados, sesiones ni credenciales en este registro público.

## ADDENDUM VERIFICADO · RESPUESTA DE WORK RECIBIDA 2026-10-09
Respuesta recibida: 61m29s, PR #70 con 7 commits/54 archivos, 54 pruebas unitarias con dobles y cuatro Actions éxito, source recovery nuevo agente sólo GitHub, nada publicado. Confirmación independiente de ACTIVE Supabase v14 sin ONE TURN; SQL SELECT 1 y list_tables ECONNREFUSED; gestión ACTIVE_HEALTHY. No existe ACK ni RETURN privado. Resultado `DO_NOT_PROMOTE`. Auditoría exhaustiva en `coordination/one-turn/v1/FIRE_POST_WORK_AUDIT_20261009.json`, evaluación de 12 gates. NEXT = restaurar vía autorizada lectura SQL/schema, probar RPC/ACK privado; no merge sin verificación E2E; fotos de diseño todavía pendientes.
