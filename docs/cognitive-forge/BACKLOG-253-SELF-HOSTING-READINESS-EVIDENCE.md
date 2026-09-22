# BACKLOG 253 · Self-hosting cognitivo · Readiness executable

## Estado del objetivo

El objetivo 253 **permanece abierto**. No se declara self-hosting cerrado sin evidencia end-to-end.

## Cambio material

Se aplicó en Supabase `prometeo_self_hosting_readiness_v1()` y su smoke `prometeo_self_hosting_readiness_smoke_test()`.

La readiness mide ocho etapas durables:

1. GOAL_TO_WORK
2. ASSIGN_EXECUTE
3. TEST
4. PUBLISH
5. OBSERVE
6. WORK_TO_LEARNING
7. LEARNING_TO_SKILL
8. SKILL_TO_IMPROVEMENT

El smoke devolvió `SELF_HOSTING_READINESS_SMOKE_OK`, `shape=PASS`, `consistency=PASS`, `ready_count=7`, `closed_loop=false`, con `WORK_TO_LEARNING` como única etapa faltante según el contrato v1.

## Evidencia adicional

`prometeo_runtime_learning_snapshot` existe como **vista viva**, no como tabla manual. Su snapshot actual deriva de `prometeo_worker_postmortems` y `prometeo_positive_survival_candidates`, por lo que existe aprendizaje operacional durable y observable.

Una verificación posterior intentó confirmar si el camino PUBLISH alimenta indirectamente esas fuentes. El control de seguridad de la herramienta bloqueó la consulta dos veces. No se usó una ruta alternativa ni se declaró el puente como probado.

## Consecuencia

La readiness queda como instrumento reproducible para evitar afirmaciones vagas sobre self-hosting. En el estado observado, siete etapas tienen primitives/integraciones detectables y una requiere evidencia o integración adicional. El objetivo 253 no debe pasar a HECHO hasta que `closed_loop=true` y exista un smoke end-to-end que demuestre el ciclo completo.

Fuente versionada: `supabase/migrations/20260922043147_prometeo_self_hosting_readiness_v1.sql`.
