# EXP-007 · Prompt Tournament

Cinco variantes del prompt compiten con el mismo backend lógico:
- 2 workers por variante
- 4 bloques idénticos
- registry y allocator frescos e independientes
- branches aisladas por worker
- mismos límites de retries y mismas reglas de no duplicación

La UI registra el instante real del botón COPIAR con `Date.toISOString()` y lo inyecta dentro del prompt:
- `launch_id`
- `launch_clicked_at`
- `launcher_button`

El worker persiste esos valores en su state. La métrica principal es:

TTFW = first_claim_at - launch_clicked_at

La medición final puede auditar el primer commit CLAIMED contra el timestamp servidor de GitHub.

No comparar variantes si no terminaron las dos instancias o si hubo error crítico de infraestructura ajeno al prompt.
