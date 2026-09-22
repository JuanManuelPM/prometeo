# BACKLOG 252 · Cada Goal deja dos productos

## Estado

- Objetivo: **resultado pedido + mejora potencial de capacidad**
- Storage: `forge_goal_products`
- Migración: `supabase/migrations/20260922043000_forge_goal_two_products_v1.sql`
- Contrato: `prometeo.forge-goal-product/v1`

## Semántica

Todo Goal que llega a `DONE` deja exactamente dos productos durables:

1. **RESULT**: manifiesto trazable de los outputs que constituyen el resultado pedido.
2. **CAPABILITY_CANDIDATE**: pregunta/paquete de aprendizaje ligado al resultado para decidir si puede convertirse en Skill, Tool, Plume, Recipe o protocolo reusable.

El segundo producto es deliberadamente `CANDIDATE`: no afirma que haya aparecido una capacidad nueva ni la promueve automáticamente.

## Materialización

`forge_goal_materialize_products(goal_id)` es idempotente. Lee el Goal y `forge_outputs`, conserva referencias/hash/word count, crea el RESULT y crea el CAPABILITY_CANDIDATE con `promotion_allowed=false`.

No copia el texto completo del output: conserva referencias a `forge_outputs`.

## Invariante de cierre

Un trigger `forge_goal_products_on_done` ejecuta la materialización después de todo cambio de estado hacia `DONE`. Así el contrato no depende de que un worker recuerde hacer una segunda llamada.

La migración también backfillea Goals que ya estaban `DONE`.

## Lectura y auditoría

- `forge_goal_products_for(goal_id)`: devuelve los dos productos.
- `forge_goal_two_product_audit()`: verifica todos los Goals DONE.
- `forge_goal_two_product_smoke_test()`: comprueba auditoría, trigger, RESULT, CAPABILITY_CANDIDATE y ausencia de auto-promoción.

## Promoción posterior

El candidato puede alimentar aprendizaje durable, incluido `forge_skill_candidate_from_learning`, pero sólo después de análisis y evidencia específicos. “Dos productos” no significa “crear una Skill por cada Goal”; significa que ningún Goal pierde la oportunidad de aprendizaje.
