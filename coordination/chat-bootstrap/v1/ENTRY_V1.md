# 🔥 Prometeo · arranque de chat nuevo v1 (candidato)

**No se instala por estar en GitHub.** Entrada verificable para chats del Proyecto persistencia. Fuente: rama integradora `integration/prometeo-71-72-73-20261009` (candidata, no instalada ni fusionada); `main` y PR #71 son fuentes distintas, NO mezclar autoridad. No hay ejecución en segundo plano ni memoria de otros chats por magia.

1. Con GitHub conectado, leer **este archivo** y `coordination/chat-bootstrap/v1/ROUTES_V1.json` en la rama configurada; chequear `schema` y `version`; refrescar HEAD de `main`, `gh-pages` y rama de destino antes de escribir. Si faltan herramientas, marcar bloqueo, no inventar lectura.
2. Interpretar el **mensaje humano actual**. Seleccionar skills con las reglas de `ROUTES_V1.json`. **Leer realmente cada SKILL.md seleccionado, completo, desde su `source` y `ref`** (obligatorias `prometeo-one-turn` y `prometeo-verify-release`; `prometeo-fire` sólo para 🔥). Las skills de PR #71 son **candidatas**; leerlas no las instala ni autoriza cambiar código.
3. Resolver sólo los owners pertinentes en `PENDING_INDEX_V1.json`, `coordination/design-dna/INDEX.json`, Current/Constitution, y las instrucciones de la skill. Para TV leer `gh-pages:tv/chat/AGENT_ENTRY_V1.md`; para EVO leer sus requisitos; para widget leer READINESS y continuidad. No arqueología global salvo falta real de owner. No dar por resueltos los pendientes del índice.
4. Ejecutar la tarea concreta **en el mismo turno humano**, con permisos reales y scope limitado, validación, read-after-write y recibos. La palabra `.` sólo ejecuta un plan durable elegible previamente preparado mediante `🔥preparar`; nunca pedirlo para tarea concreta. Si no hay ejecución autorizada, devolver evidencia y bloqueo exacto.
5. **No publicar datos privados** (prompt, notas, alumnos, audio, tokens) en GitHub público. Privado exige owner autenticado y ACK real. Distinguir `SOURCE / IMPLEMENTED / TESTED / VERIFIED / PROMOTED / CURRENT / SERVED`. No duplicar workers, scheduler, Supabase, autoridad ni UI.

## Reproducción técnica
`node --test coordination/chat-bootstrap/v1/select-and-load.test.mjs` valida selección y lector con fixtures de archivos, no acceso a otros chats. `node coordination/chat-bootstrap/v1/select-and-load.mjs "🔥prometeo estudiar Piaget"` lee **de GitHub** los textos completos elegidos, no sólo el catálogo (requiere Node 18+ y red). Un chat dentro de ChatGPT usa su **conector GitHub**, no presupone que puede ejecutar Node.

## Actualización
`PENDING_INDEX_V1.json` conserva objetivos y EVO-001..045; es inventario de pendientes, **no** un segundo CURRENT. Un cambio material actualiza únicamente su owner autorizado y luego registra evidencia, sin sobrescribir el PR #71 ni branch TDD.
