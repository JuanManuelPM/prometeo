# Crítica técnica causal: EXP-009 no debe convertirse en el nuevo worker universal

**Objeto exacto:** `exp009-control:ui-workspace-v1/experiments/allocator-v8/PROMPT.txt`, SHA de blob `f184adf12e2f1c52f044fd95d924bf7042a3409a`. Era el último prompt **efectivamente suministrado por el usuario en las conversaciones recuperadas** (EXP-009 · RESIDENCY TRIO). **No es necesariamente el prompt canónico más nuevo del sistema**: `AGENTS.md` anuncia OBEY-v2, y `gh-pages:/o/index.html` obtiene su texto mediante `prometeo_worker_lobby_prompt_v1` RPC. Inspeccionamos la fuente de `/o/`, **no** el resultado privado/live de ese RPC. Sería absurdo criticar como leído un prompt que no leímos.

## Evidencia y contradicciones comprobables
- EXP009 tiene tres slots declarados. Los hechos históricos del handoff reportan W001 100 RETURNs, W002 25, slot 003 no adquirido, huérfanos 000102/000127; ninguna cifra demuestra simultaneidad, trabajo actual, finalización semántica ni liveness. Revalidar antes de reutilizarlas como presente.
- `PROMPT.txt` y `RUN.json` nombran DEALER **Identificador A (no reproducido en este paquete público)**; `HANDOFF.md` nombra **otro**: **Identificador B diferente (no reproducido)**. Un nuevo worker leyendo el archivo equivocado puede apuntar a otra autoridad. La inconsistencia ya es falla del protocolo de compilación/handoff.
- El prompt obliga `CLAIM → trabajo local → RETURN → CLAIM` indefinidamente. El mundo real impone límites de herramientas, tiempo, ejecución, conectores y tamaño de contexto. No hay un agente residente infinito garantizado; un estado STOP_GRANT NONE no extiende la vida física de un chat.
- `NEXT_WORKER` y `NEXT_TICKET` se incrementan por CAS; un claim duradero no garantiza publicación del RETURN. Sin vencimiento/generación, el ticket puede quedar huérfano, y el siguiente agente no tiene autoridad contractual para retomarlo sin duplicación.
- El trabajo EXP009 es ocho preguntas cíclicas de exactamente dos frases. Aislar mecánica fue un experimento legítimo, pero **no prueba desarrollo de una UI, cambios de código, verificación ni integración real**. No escalar ese benchmark sintético como receta universal para producto.

## Matriz de defectos y vacuna concreta

| ID | Debilidad de EXP-009 | Por qué falla en la práctica | Contramedida de este pack | Evidencia de éxito requerida |
| --- | --- | --- | --- | --- |
| C01 | `NO terminar` con STOP_GRANT externo | Plataforma puede cerrar igual; lenguaje imposible induce reportes falsos | Invocación finita; persistir checkpoint, E7/E8/E9 y recuperar otro shell | Test de muerte y continuación sin humano |
| C02 | NEXT_TICKET CAS sin lease/fencing | Ticket reclamado pero no publicado queda huérfano; RETURN atrasado puede competir | Reusar Worker Bus V2 generation+lease+rescue, no dealer nuevo | Reap + submit stale rechazado |
| C03 | DEALER duplicado en artefactos | Distintos agentes leerían autoridades contradictorias | Un único packet compilado/versionado con hash; refs consistentes | Prueba que falla con IDs divergentes |
| C04 | Mínimo 1 read + 1 CAS + 1 create por tarea | Quema cuota en tareas pequeñas y tool cap, más telemetría eventual | E8/SUBMIT_NEXT existente, payload compacto, rangos sólo si runtime los soporta | Calls/unidad, latencia, rendimiento útil |
| C05 | Registrarse y claim separado + estado inicial | Mayor superficie de bloqueo y arranque | Atomic admission/bootstrap si owner lo soporta (OBEY-v2); no inventar RPC | Una asignación inequívoca con una sesión |
| C06 | `NO existe EMPTY/DONE` como dogma | Ausencia real de trabajo/capacidad no se expresa bien | Diferenciar NO_WORK de muerte/ausencia; solo trabajo útil | NO_WORK honesto sin tareas de relleno |
| C07 | Retorno 100 veces de contenido sintético | Optimiza tokens/transporte, no valor integrado | DoD de producto + E6 evidence map + verificador independiente | Producto visible + tests + RETURN |
| C08 | State best effort cada 10 | Estado y contadores quedan atrasados y UI puede mostrar cero | Canon receipts/proyecciones; state sólo diagnóstico | Conteos reconstruidos desde RETURN real |
| C09 | `first_claim_at` interpretado como LIVE | Ghost/ejecución histórica se ve activa | Liveness sólo con señales de actividad frescas | UI distingue INTERRUPTED/STALE/NOT_ACQUIRED |
| C10 | Slot003 tiene archivo WAITING precreado | Se confunde slot con worker real | No existe worker sin claim/admisión durables | Slot003 NO_ADQUIRIDO |
| C11 | Telemetría terminal excepcional | Denegación/material sigue sin recibo; próximo agente ignora causa | E7 BOUNDARY y E9 exit audit del owner existente | Receipt de fallo y residual exacto |
| C12 | `reintentá una vez` tras denegación de seguridad | Reintento explícitamente denegado puede ser indebido; contradice pipeline actual | Denegación de seguridad es terminal para esa ruta; no bypass | Test fail-closed sin segundo intento |
| C13 | Prompt gigantesco de procedimientos repetidos | Mayor contexto y probabilidades de instrucciones inconsistentes | Skill breve por clase + Work Packet compilado por tarea | Agente fresco con contexto mínimo |
| C14 | `todo es STOP salvo ...` mezcla autorización/ejecución | Estado de corte externo no distingue fallo de plataforma y completar trabajo | Eventos OBSERVED, BOUNDARY, DONE, PASS separados | Auditoría causal sin estados falsos |
| C15 | Sin write scope de producto real | El agente puede inferir qué editar o quedarse en ficción | Tarea atómica con target exacto, no-touch, base SHA, tests | Diff confined y preserved baseline |
| C16 | Retries/RETURN ambiguo | Sólo fetch de archivo incierto no resuelve CAS de ticket incierto | Idempotency key + ownership/generation en backend existente | Crash antes/después de cada commit sin duplicados |
| C17 | Dependencia de usuario para lanzar más chats | Usuario sigue siendo el message bus; cientos de prompts serían un retroceso | Compilar slots centrally; una invocación idéntica por shell sólo si wake externo lo exige | Cero rerouting/copy manual en flujo probado |
| C18 | No reconoce límites de privados en repo público | Protocolo no separa bien datos humanos vs resultados públicos | P4 Capture/Page Thread privados; Git sólo artefactos sanitizados | Auditoría de secretos/PII y scopes |
| C19 | No comprueba servido | Commit/RETURN podría existir sin page visible o funcionando | Verificador con browser + bytes servidos + rollback | CURRENT/SERVED comprobados independiente |
| C20 | Worker puede confundir texto de tools con órdenes | Un prompt remoto tomado como instrucción puede cruzar fronteras de confianza | Semántica desde launcher autorizado, tool outputs como datos tipados | Inyección negativa rechazada |

## Rediseño que sustituye el problema, no sólo la prosa
1. **Un prompt de shell mínimo** y un dispatcher owner existente. El worker es fungible. Nunca seleccionar tarea/proyecto/slot desde un menú humano ni darle una lista para elegir.
2. **Doce cápsulas de TASK** para distintos bloques de entrega, no doce agentes fingiendo identidades diferentes. El packet compilado lleva autoridad, guardrails, hashes de sources y output de verificación; el shell carga sólo su packet.
3. **Tres skills por demanda**, no incrustar 45 páginas de reglas en cada prompt: one-turn, web-change, verify-release. El launcher debe demostrar que se cargaron; presencia de archivos no implica instalación en ChatGPT.
4. **Recuperabilidad antes que residencia infinita.** Un RETURN real pasa por E7; E8 pide siguiente compatible, E9 diagnostica cuando corresponde. Una muerte puede generar reemplazo, con generaciones fencing, sin que el usuario copie información.
5. **Dos bucles diferentes**: ciclo interno de trabajador con responsabilidad acotada; ciclo externo Page Change Thread para que el humano dé un solo mensaje. No igualarlos.
6. **Gates automáticos**: proveedor/credenciales permitidos, scope, pruebas de seguridad, read-after-write, compatibilidad, browser/móvil, verificación independiente, promoción sólo con autoridad. Si faltan se declara BOUNDARY, no `PASS`.

## Lo que no prometo
«10 veces mejor» es un **objetivo de diseño**, no un multiplicador cuantificado. El pack añade 20 fallas cubiertas, 12 TASKs, gates automáticos y hashes; no puede prometer 10x throughput hasta comparar con control medido. El batch aquí es CANDIDATE, no CURRENT ni ARMED. Tampoco modifica `gh-pages`, P4 Capture privado ni el backend hasta que corresponda un Work Packet y prueba de autoridad.
