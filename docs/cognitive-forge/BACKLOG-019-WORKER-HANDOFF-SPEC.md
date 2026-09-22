# BACKLOG 19 · Transferencia real entre workers

## Estado

- Necesidad: un worker produce y otro continúa, critica o verifica.
- Storage: `forge_task_handoffs`
- Migración: `supabase/migrations/20260922043500_forge_worker_handoff_v1.sql`

## Evidencia previa

El DAG ya transportaba outputs de dependencias al task consumidor, pero el allocator no exigía separación de identidad. En el Goal histórico `FORGE-8-01`, `T10`, `T11` (QA) y `T12` (goal comparison) fueron publicados por `K008`. Había transferencia de bytes, no independencia de worker.

## Contrato

Una arista de handoff une `producer_task_key → consumer_task_key` y declara:

- `CONTINUE`, `CRITIQUE` o `VERIFY`;
- `require_distinct_worker=true`;
- `evidence_ref` obligatorio;
- provenance.

`forge_task_handoff_conflict(goal, consumer, worker)` devuelve true si ese worker produjo cualquiera de los outputs protegidos que consume el task.

## Enforcement

`forge_allocate` excluye un READY task cuando existe conflicto de handoff para el worker actual. El task queda disponible para otro worker; no se falsifica una revisión independiente.

Las dependencias cuyo card consumidor pertenece a `CRITIQUE` o `VERIFICATION` crean automáticamente la regla correspondiente mediante trigger. Las dependencias históricas de esas familias se backfillean sin reescribir outputs pasados.

Para cadenas donde la transferencia debe ocurrir aunque el card no sea crítico/verificador, `forge_task_handoff_require(..., 'CONTINUE', ...)` permite declararla explícitamente.

## Failure mode

Si no existe ningún worker elegible, el task no se entrega a un productor conflictivo sólo para avanzar. Permanece READY/WAIT hasta que aparezca capacidad independiente. Eso convierte la falta de independencia en estado observable en vez de una falsa verificación.

## Smoke

`forge_task_handoff_smoke_test()` usa la historia `FORGE-8-01/T10→T11`: confirma que `K008` queda excluido, que `K001` puede consumir T11, que el allocator contiene el guard, que CRITIQUE/VERIFICATION fueron backfilleados y que un handoff CONTINUE explícito funciona y se limpia.
