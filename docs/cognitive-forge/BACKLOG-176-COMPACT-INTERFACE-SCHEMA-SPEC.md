# BACKLOG 176 · Contrato reusable de interfaces compactas · Spec ejecutable

## Estado

- Backlog origen: **176 · Contrato exacto de interfaces compactas**
- Estado propuesto: **DISEÑADO**
- Schema: `prometeo.forge-point-interface/v1`
- Consumidores previstos: integrador de sección (177) e integrador global (178)
- Esta spec define contrato y validación; no ejecuta todavía los integradores.

## Problema

Los puntos 165 y 166 establecen que cada canonical largo debe producir una interfaz compacta con propósito, inputs, outputs, estados, funciones, eventos, invariantes y pruebas. Falta una forma durable y versionable que permita integrar 84 puntos sin releer texto largo ni perder provenance.

## Objetivo

Definir un payload pequeño, machine-readable y auditable que represente el contrato implementable de un punto sin sustituir su documento canonical.

## Contrato v1

```json
{
  "schema": "prometeo.forge-point-interface/v1",
  "point_id": "P001",
  "interface_version": 1,
  "source": {
    "canonical_ref": "forge://blueprint/P001/canonical",
    "canonical_version": 1,
    "source_hash": "sha256:..."
  },
  "purpose": "...",
  "inputs": [],
  "outputs": [],
  "states": [],
  "operations": [],
  "events": [],
  "invariants": [],
  "dependencies": [],
  "tests": [],
  "open_decisions": []
}
```

## Campos normativos

### Identidad y provenance

- `schema`: MUST ser exactamente `prometeo.forge-point-interface/v1`.
- `point_id`: MUST referenciar un punto durable existente.
- `interface_version`: entero positivo, monotónico por punto.
- `source.canonical_ref`: referencia estable al canonical del que fue extraída.
- `source.canonical_version`: versión observada al compilar.
- `source.source_hash`: hash del canonical exacto cuando esté disponible.

Una interfaz nunca reemplaza el canonical. Si cambia la fuente, la interfaz existente queda históricamente válida pero debe marcarse stale hasta recompilarse.

### Purpose

String breve que describe qué responsabilidad tiene el punto en el sistema. MUST expresar responsabilidad, no implementación accidental.

### Inputs y outputs

Cada entrada/salida MUST tener:

```json
{
  "id": "input.work_item",
  "type": "WorkItem",
  "required": true,
  "description": "...",
  "constraints": []
}
```

IDs estables; tipos explícitos; opcionalidad explícita. No se acepta una lista de nombres sin contrato.

### States

Cada estado MUST declarar `id`, significado y si es terminal. Las transiciones pertenecen a `operations`, no a narrativa libre.

### Operations

Cada operación MUST declarar:

- `id`;
- `requires_state` cuando aplique;
- inputs consumidos;
- outputs producidos;
- `next_state`;
- eventos emitidos;
- failure modes observables.

### Events

Cada evento MUST tener `id`, trigger y payload mínimo. Los eventos describen hechos observables; no chain-of-thought ni estados mentales.

### Invariants

Cada invariante MUST tener:

```json
{
  "id": "inv.no_stale_overwrite",
  "statement": "...",
  "evidence_ref": "..."
}
```

Un invariante sin evidencia o derivación rastreable puede existir como candidate, pero no como canonical.

### Dependencies

Cada dependencia MUST usar identidad explícita:

```json
{
  "point_id": "P012",
  "relation": "REQUIRES|CONSUMES|EXTENDS|CONFLICTS_WITH",
  "interface_version": 2
}
```

No inferir dependencia por similitud de texto durante integración.

### Tests

Cada test MUST declarar `id`, precondición, acción y expected observable result. Debe poder convertirse después en trabajo ejecutable.

### Open decisions

Sólo decisiones realmente abiertas. Cada entrada MUST incluir pregunta, alternativas conocidas y provenance. Una decisión canonical cerrada no vuelve a abrirse por aparecer en este campo.

## Reglas de compilación

1. Extraer sólo claims soportados por el canonical.
2. Normalizar vocabulario sin borrar el término fuente; conservar alias.
3. Si dos fragmentos del canonical se contradicen, no elegir silenciosamente: emitir una decisión abierta o conflict ref.
4. Mantener interfaces compactas: detalles explicativos permanecen en `canonical_ref`.
5. Ningún campo requerido puede satisfacerse con placeholders como `TBD`, salvo `open_decisions`.

## Validación mínima

Una interfaz v1 es VALID sólo si:

- point_id y canonical_ref existen;
- interface_version es positiva;
- source identifica una versión/hash rastreable;
- purpose no está vacío;
- todos los IDs internos son únicos;
- referencias de estados, inputs, outputs y eventos resuelven;
- dependencias apuntan a IDs explícitos;
- tests tienen resultado observable;
- no hay decisiones cerradas reintroducidas como abiertas.

## Integración downstream

El integrador de sección puede consumir interfaces v1 como unidad primaria y volver al canonical sólo para resolver conflicto, ambigüedad o evidencia faltante. El integrador global debe consumir Section Specifications, no los 84 canonicals directamente.

Esto mantiene la separación:

`canonical largo → point interface → section spec → system spec → build graph`.

## Casos de aceptación

1. Compilar una interfaz válida desde un punto con canonical existente.
2. Rechazar IDs duplicados.
3. Rechazar referencia a estado inexistente.
4. Detectar stale cuando cambia canonical_version/hash.
5. Conservar dos versiones históricas de la interfaz.
6. Representar una contradicción sin resolverla silenciosamente.
7. Convertir al menos un test de interfaz en criterio de build verificable.
8. Permitir al integrador reconstruir provenance hasta el canonical fuente.

## No objetivos

- No resumir todo el canonical.
- No implementar los integradores 177/178.
- No decidir storage final.
- No promover interfaces automáticamente por longitud o completitud superficial.
- No perder versiones históricas.

## Criterio de cierre

BACKLOG-176 pasa de DISEÑADO a HECHO cuando el schema esté persistido/versionado, exista un validador reproducible, al menos tres puntos reales hayan sido compilados, los ocho casos de aceptación tengan evidencia y un integrador de sección pueda consumir esas interfaces sin releer los canonicals en el camino normal.


## Implementación verificada · 2026-09-22

El núcleo ejecutable de este contrato ya existe en `main`:

- JSON Schema versionado: `docs/cognitive-forge/contracts/forge-point-interface.v1.schema.json`.
- Validador reproducible sin dependencias externas: `scripts/validate-forge-point-interface.mjs`.
- Suite contractual: `tests/forge-point-interface-v1.mjs`.
- Verificación sobre los bytes actuales del repo: **9/9 checks PASS** (válido, IDs duplicados, referencia de estado inexistente, stale por versión/hash, coexistencia histórica, contradicción explícita, criterio de build observable, provenance preservada y rechazo de `TBD` fuera de decisiones abiertas).
- `FORGE_SECTION_INTEGRATOR` v1 ya declara `prometeo.forge-point-interface/v1` como input primario.

### Brecha restante para HECHO

El estado correcto continúa siendo **DISEÑADO**, no HECHO. Al momento de esta verificación `blueprint_points` contiene **0 canonicals reales** no vacíos, por lo que no es posible fabricar honestamente los tres ejemplos reales requeridos por el criterio de cierre. Cuando existan al menos tres canonicals, el siguiente paso es compilarlos a v1, validarlos contra este contrato y ejecutar un consumo real por el integrador de sección conservando provenance.