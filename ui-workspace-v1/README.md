# PROMETEO UI WORKSPACE V2

Estado: CURRENT local preparado para publicación pública aislada.

Objetivo: una UI modular y versionada en la que distintos chats/workers puedan trabajar en widgets independientes sin reconstruir la página, sin tocar módulos ajenos y sin confundir CANDIDATE con CURRENT.

Entrada humana recomendada:
1. Abrir `CONTINUITY/CURRENT_HANDOFF.md`.
2. Elegir el widget.
3. Copiar su `CONTINUITY_PROMPT.txt`.
4. El chat nuevo debe aprobar `READINESS_GATE_V1` antes de modificar nada.

Reglas duras:
- Kernel y funciones universales pertenecen al kernel, no a cada widget.
- Cada widget tiene versiones, contexto, historial, referencias y prompt de continuidad.
- Un worker externo produce CANDIDATE/RETURN; no promueve CURRENT.
- No afirmar liveness, pruebas físicas o integración que no estén demostradas.
- GitHub es código/versionado/proyección pública; almacenamiento pesado queda detrás de `StorageAdapter`.
- El futuro broker ideal expone sólo `claim_block()` y `submit_return()`.
