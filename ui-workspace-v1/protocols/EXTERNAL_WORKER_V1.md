# EXTERNAL WORKER PROTOCOL V1

Este protocolo es para un ChatGPT externo/manual. NO simula infraestructura `/wc/` que no posea.

## Entrada mínima
- Workspace: `/PROMETEO_UI_WORKSPACE_V1`
- CURRENT
- UI rules
- Widget API
- una TASK READY
- adjuntos de usuario, si corresponde

## Secuencia
1. Localizar el workspace en Library.
2. Leer `HANDOFF/START_HERE.md`.
3. Leer la TASK exacta.
4. Leer sólo CURRENT/contratos necesarios.
5. Crear `worker_id` único.
6. Registrar `REGISTERED` y `PLAN_DECLARED`.
7. Declarar read_scope/write_scope real antes de modificar.
8. Comprobar que no exista un claim incompatible visible.
9. Trabajar en un candidato. NO sobrescribir CURRENT.
10. Registrar hitos significativos/heartbeat.
11. Verificar según DoD de la TASK.
12. Generar:
   - candidate config
   - candidate build
   - CHANGE.md
   - RETURN.json
   - mensajes/referencias del widget cuando corresponda
13. Guardar esos artefactos en `CANDIDATES/<task>/<worker>/`.
14. Guardar receipt en `TASKS/RETURNED/`.
15. Responder al humano con links al candidato y resumen corto.

## Si no puede escribir a Library
No fingir. Crear artefactos locales descargables y devolver:
`TRANSPORT_BOUNDARY_LIBRARY_WRITE_UNAVAILABLE`.

## Conflictos
- READ puede coexistir.
- WRITE sobre paths disjuntos puede coexistir.
- Dos WRITE sobre el mismo módulo/version requieren resolución.
- Comparar `base_page_version` y scopes antes de integrar.

## Prohibido
- crear scheduler/dealer/queue/CURRENT paralelo
- promocionar CURRENT sin autoridad
- reconstruir toda la UI desde cero
- modificar fuera de scope
- declarar Android probado sin haberlo probado
