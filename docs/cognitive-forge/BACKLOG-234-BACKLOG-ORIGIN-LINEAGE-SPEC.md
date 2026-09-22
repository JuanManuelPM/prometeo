# BACKLOG 234 · Backlog ↔ origen · Contrato durable

## Estado

- Backlog origen: **234 · Relacionar backlog con origen**
- Implementación: `forge_backlog_origins`
- Migración: `supabase/migrations/20260922042500_forge_backlog_origin_lineage_v1.sql`
- Objetos reutilizados: Goals, Blueprint points, Skills, Tools y Plumas existentes.

## Problema

Los registries de Forge ya conservan identidad y provenance parcial, pero el backlog histórico vive como documento y no existe una arista normalizada que permita responder de qué objeto durable surgió un pendiente. Copiar Goals, Skills o Tools dentro de cada item generaría otra fuente de verdad.

## Modelo

Cada arista contiene:

- `backlog_id`: identidad numérica estable del item.
- `origin_kind`: `GOAL | BLUEPRINT_POINT | SKILL | TOOL | PLUME`.
- `origin_id`: identidad del registry original.
- `origin_sub_id`: sólo para subidentidades; en v1 se usa para `point_no` de Blueprint.
- `relation_kind`: `ORIGINATES_FROM | DERIVED_FROM | DISCOVERED_FROM`.
- `evidence_ref`: evidencia obligatoria para no fabricar relaciones.
- `provenance`: metadata estructurada de quién/cuándo/por qué agregó la arista.

La tabla no duplica nombre, título, estado ni contenido del origen.

## Primitives

- `forge_backlog_origin_validate(kind,id,sub_id)`: confirma que la identidad existe en su registry y devuelve una referencia canónica.
- `forge_backlog_origin_link(...)`: valida, exige evidencia y crea una arista idempotente.
- `forge_backlog_origins_for(backlog_id)`: devuelve todas las aristas y canonical refs.

## Reglas

1. Nunca inferir una relación sólo por similitud textual.
2. Un origen inexistente se rechaza con `ORIGIN_NOT_FOUND`.
3. Duplicar la misma arista no crea otra fila.
4. `BLUEPRINT_POINT` exige `blueprint_id + point_no`.
5. El backfill histórico debe agregar sólo relaciones con evidencia observable; la ausencia de vínculo es preferible a uno inventado.
6. El backlog puede seguir siendo documental mientras los items 231/232 no definan su objeto online; esta tabla desacopla lineage de ese almacenamiento futuro.

## Smoke

`forge_backlog_origin_smoke_test()` enlaza un fixture temporal contra un Goal, un Blueprint point, una Skill, una Tool y una Pluma reales; prueba dedupe y rechazo de origen ausente y elimina todas las filas del fixture.
