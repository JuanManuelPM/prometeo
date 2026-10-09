# G1 · Evidencia de puente existente · 2026-10-08
**Estado: CODE_PATH_CONFIRMED, RUNTIME_WRITE_UNVERIFIED.** Este documento no declara la integración single-turn terminada.

## Fuentes servidas analizadas, no editadas
- `gh-pages:shared/capture/v1/change-loop.js`: `createChangeLoopClient` llama por POST al endpoint de función `prometeo-change-loop-v1` con bearer secret del workspace vinculado; métodos `syncPage`, `detail`, `trabajar` (`prepare_execution`), `pensar` (`prepare_research`), `markSeen`. UI `saveText` llama `adapter.createTextCapture`, luego `ingestLocal` y refresca. UI `launch` prepara `MANUAL_CHAT` por defecto o `WORKER_POOL` si el adaptador así decide.
- `gh-pages:shared/capture/v1/github-change-loop.js`: sanitiza envelope de ejecución hacia GitHub; rechaza campos privados/tokens.
- `gh-pages:current-tree/control-v11/chat-canary/input-module-v1.js`: guarda outbox local, exige transporte autentificado/validación de correlación. `queued=true` requiere ref durable correcto.
- `gh-pages:current-tree/control-v11/ingress-v1.js`: transportes privados de captura/hot y canary explícito; distintos límites y estados. No probar `queued` mediante simple inspección fuente.
- `main:coordination/AI_DESIGN_SESSION_PROTOCOL_V1.md`: save privado `prometeo_save_ai_session_v1(token,payload)` bajo permiso; fallback de un enlace si la llamada directa no existe.
- `main:coordination/PAGE_CHANGE_THREAD_CONTRACT_V1.json`, `PAGE_CHANGE_FEED_CONTRACT_V1.json`: propietarios semánticos de hilo/resultado; al inspeccionar su status es ACTIVE_CANDIDATE.

## Riesgo que bloquea afirmar ONE TURN
`saveText` no muestra por sí sola el ACK privado de Capture; `ingestLocal` captura internamente algunas fallas de sync. La indicación "Nota guardada" podría representar persistencia local o sincronización no verificada según el path. `launch` depende de notes preparadas y puede abrir ChatGPT vía `chatgpt_url`; el flujo no demostró un solo submit atómico ni ejecución sin paso humano. No hay prueba de E2E, fresh-agent, read-after-write o readonly regresión sin secretos. No toqué ninguna credencial.

## Implementación mínima exacta a ejecutar por owner autorizado
1. **G1a**: inspeccionar en el branch canónico dueño de `adapter.createTextCapture`, `adapter.syncNow`, `ingestLocal`, función privada backend y recepción de `prepare_execution`; conocer ACK y privacidad reales. Aislar cambios fuera de Page Host/Worker Bus.
2. **G1b**: contrato `submitOneTurn(text,page,mode,request_id)`: persistir local, sync privado, leer y verificar mismo capture_id+revision y receipt, solo entonces `prepare_execution` con `delivery_mode=WORKER_POOL` si realmente disponible. Si backend no confirma, responder `PERSISTENCE_BLOCKED` sin lanzar. Nunca hardcodear ese modo si el owner lo prohíbe.
3. **G1c**: idempotencia por request_id+revision/ETag, no duplicar si reintenta; evitar plaintext token en URL/repo.
4. **G2**: canary 1 mensaje inocuo desde página vinculada con permiso legítimo; read-after-write, ejecución/RETURN y Page Change Feed actualizado. Sin canary privado exitoso, dejar candidato.
5. **G3**: nuevo chat sin transcript recibe context packet del mensaje y última respuesta, lee skills, no pide resumen. La ejecución no puede continuar después de cerrar la llamada del modelo sin runtime externo real.
6. **G4**: test del frontend original, responsive, audio y tareas antiguas, independencia de promotor y no repetir ciclos.

## Límite de autoridad
Esta auditoría documental no habilita cambiar `gh-pages`, deploy, funciones Supabase privadas, secretos, Work Graph, allocations, permisos ni RLS. Reusar sus owners. Fuente pública en main y GH Pages puede divergir; refetch antes de escribir.
