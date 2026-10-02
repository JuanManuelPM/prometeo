# BACKLOG 165 · Interfaz compacta por punto · Evidencia de implementación

## Alcance cerrado

BACKLOG-165 pide que, además del canonical largo, cada punto pueda producir un contrato pequeño. El contrato estructural ya existía como `prometeo.forge-point-interface/v1`; faltaba un paso ejecutable que fijara identidad y provenance desde el canonical real sin permitir que una extracción cognitiva falsifique esos campos.

Se agregó:

- `scripts/compile-forge-point-interface.mjs`
- `tests/compile-forge-point-interface.mjs`

El compilador recibe metadata + bytes exactos del canonical y un draft semántico compacto. El compilador controla `schema`, `point_id` y `source`, calcula `sha256` sobre los bytes exactos del canonical y ejecuta el validador v1 existente antes de emitir output.

## Verificación

Suite ejecutada sobre los bytes de la rama:

```json
{
  "suite": "compile-forge-point-interface",
  "checks": 6,
  "passed": 6,
  "status": "PASS"
}
```

Cobertura verificada:

1. identidad PNNN + canonical_ref deterministas;
2. hash SHA-256 de bytes exactos;
3. output aceptado por `validateForgePointInterface`;
4. canonical vacío rechazado;
5. draft no puede inyectar provenance controlada por compilador;
6. referencias semánticas inválidas impiden compilación.

## Estado upstream observado · 2026-09-22

Consulta al backend `public.blueprint_points`:

- total: 84;
- status `IN_PROGRESS`: 84;
- canonicals no vacíos: 0;
- completados: 0.

Por lo tanto no se fabricaron interfaces "reales". La compilación real queda materialmente desbloqueada para el primer canonical disponible; el bloqueo restante es upstream y no del contrato/compilador.

## Relación con contratos existentes

- Schema: `docs/cognitive-forge/contracts/forge-point-interface.v1.schema.json`
- Validator: `scripts/validate-forge-point-interface.mjs`
- Spec: `docs/cognitive-forge/BACKLOG-176-COMPACT-INTERFACE-SCHEMA-SPEC.md`
- Consumidor downstream: `FORGE_SECTION_INTEGRATOR` v1

Separación preservada:

`canonical largo → extracción cognitiva → compilador determinista → point interface validada → section integrator`.

El compilador no intenta interpretar texto libre ni reemplaza el canonical.
