# BACKLOG-248 · Goals generan trabajo — evidencia

Estado reconciliado: **HECHO**.

## Necesidad

BACKLOG-248 pedía que un Goal genere trabajo sin que una persona tenga que inventar manualmente cada cola.

## Evidencia backend verificada

El runtime durable ya implementa ese circuito:

1. `public.forge_enter(goal_id, agent_id)` toma un Goal `OPEN`, asigna exactamente un planner y lo mueve a `PLANNING`.
2. El planner recibe contexto durable mediante `forge_get_planner_context`.
3. `public.forge_publish_plan(goal_id, agent_id, plan)` valida el plan, materializa sus tareas en `forge_tasks`, persiste dependencias en `forge_task_dependencies`, rechaza ciclos, habilita raíces ejecutables y mueve el Goal a `RUNNING`.
4. Después de publicar el plan, el mismo worker vuelve al pool y el trabajo queda disponible para asignación normal.

Esto convierte Goal → planificación autónoma → DAG durable → trabajos ejecutables.

## Evidencia de ejecución real

Consulta verificada el 2026-09-22 sobre Supabase:

- Goal: `FORGE-8-01` — “Página interactiva de gatos”.
- Planner durable: `K001`.
- `plan_published_at`: 2026-09-22T00:02:12.763201+00:00.
- Tareas materializadas: **12**.
- Tareas DONE: **12/12**.
- Estado final del Goal: **DONE**.

La evidencia demuestra no sólo que existen las funciones, sino que un Goal real produjo una cola/DAG de trabajo que fue consumida hasta terminar.

## Criterio de cierre

BACKLOG-248 queda HECHO porque el sistema ya transforma Goals en trabajo durable sin preescribir manualmente la cola. Evoluciones posteriores —priorización más sofisticada, deduplicación, recomendación o expansión de backlog— son capacidades distintas y permanecen representadas por sus propios backlog items.
