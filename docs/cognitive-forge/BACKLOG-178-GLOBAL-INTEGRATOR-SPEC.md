# BACKLOG 178 · Integrador global · Spec ejecutable

## Estado

- Backlog origen: **178 · Integrador global**
- Estado alcanzado por este cambio: **DISEÑADO**
- Consumidor upstream: integrador de sección (177)
- Contrato de punto: `prometeo.forge-point-interface/v1` (BACKLOG-176)
- Ejecución final: **BLOQUEADA** hasta que existan canonical reales, interfaces compactas y las siete Section Specifications.

Esta spec define el contrato y las validaciones de la compilación global. No autoriza fabricar una System Spec a partir de canonical incompletos ni saltar el integrador de sección.

## Objetivo

Compilar las siete especificaciones de sección en una única **PROMETEO COGNITIVE FORGE SYSTEM SPEC** trazable, verificable y apta para producir el Build Graph de BACKLOG-179.

La compilación global no resume documentos largos. Reconcilia contratos compactos ya integrados por sección y conserva provenance hasta cada canonical de origen.

## Entradas obligatorias

Deben existir exactamente siete Section Specifications, una por:

1. `fundamentos`
2. `planificacion`
3. `ejecucion`
4. `aprendizaje`
5. `visualizacion`
6. `experimento`
7. `evaluacion`

Cada entrada MUST exponer, como mínimo:

```json
{
  "schema": "prometeo.forge-section-spec/v1",
  "section_id": "ejecucion",
  "section_version": 1,
  "source_interfaces": [
    {
      "point_id": "P001",
      "interface_version": 1,
      "source_hash": "sha256:..."
    }
  ],
  "types": [],
  "states": [],
  "operations": [],
  "events": [],
  "invariants": [],
  "dependencies": [],
  "decisions": [],
  "open_decisions": [],
  "conflicts": []
}
```

El integrador global MUST rechazar entradas narrativas que no puedan rastrearse a interfaces `prometeo.forge-point-interface/v1`.

## Gates de admisión

Antes de compilar:

- **G1 · Seven sections:** están presentes las siete `section_id` exactas, sin duplicados.
- **G2 · Coverage:** cada punto esperado del Blueprint aparece exactamente una vez como fuente primaria de una sección. Referencias cruzadas pueden repetirse, ownership primario no.
- **G3 · Provenance:** cada `source_interfaces[]` contiene `point_id`, versión y hash; no se acepta provenance implícita.
- **G4 · Freshness:** ninguna interfaz está marcada stale respecto de su canonical.
- **G5 · Conflict gate:** no existen conflictos de severidad `BLOCKING` sin resolución explícita.
- **G6 · Referential integrity:** tipos, estados, operaciones, eventos e invariantes referenciados existen en el símbolo global o están declarados como externos.
- **G7 · Decision status:** toda decisión abierta está identificada y ninguna se presenta como canonical cerrada.

Si falla cualquier gate, no se emite una System Spec canónica.

## Pipeline

### 1. LOAD

Cargar las siete Section Specifications y validar schema/version. Ordenarlas por `section_id`; el resultado no debe depender del orden de llegada.

### 2. BUILD_SYMBOL_TABLE

Construir un índice global por identidad estable:

- tipos;
- estados;
- operaciones;
- eventos;
- invariantes;
- dependencias;
- decisiones.

Dos objetos con el mismo ID y definición equivalente se fusionan con provenance acumulada. Dos objetos con el mismo ID y semántica distinta producen conflicto.

### 3. NORMALIZE_VOCABULARY

Aplicar aliases explícitos definidos por las secciones. Nunca fusionar términos por similitud textual solamente. Toda normalización debe conservar:

- nombre original;
- nombre canónico;
- fuentes;
- razón de equivalencia.

### 4. RECONCILE_DUPLICATES

Clasificar repetición como:

- `IDENTICAL`: merge seguro;
- `SPECIALIZATION`: mantener relación base/extensión;
- `CONFLICT`: exige resolución;
- `COINCIDENTAL_NAME`: renombrar identidad para evitar colisión.

### 5. BUILD_DEPENDENCY_GRAPH

Construir grafo dirigido de módulos/operaciones/estados. Rechazar referencias colgantes. Los ciclos no son automáticamente error: deben clasificarse como ciclo operacional intencional o dependencia de construcción inválida.

### 6. RECONCILE_INVARIANTS

Agrupar invariantes por alcance. Si dos invariantes se contradicen, registrar conflicto con todas las fuentes y bloquear promoción hasta una resolución trazable.

### 7. DECISION_LEDGER

Separar:

- `CANONICAL_DECISION`
- `OPEN_DECISION`
- `SUPERSEDED_DECISION`

Una decisión abierta puede aparecer en la System Spec como deuda explícita, pero no puede convertirse silenciosamente en contrato implementado.

### 8. EMIT

Sólo con gates verdes, emitir:

1. `PROMETEO_COGNITIVE_FORGE_SYSTEM_SPEC.md`
2. `PROMETEO_COGNITIVE_FORGE_SYSTEM_MANIFEST.json`

El manifest MUST incluir hashes de las siete Section Specifications, cobertura de puntos, vocabulario normalizado, conflictos resueltos, open decisions y hash del System Spec resultante.

### 9. VERIFY

Releer los artefactos emitidos y verificar:

- cobertura completa;
- cero referencias colgantes;
- cero conflictos BLOCKING;
- provenance para cada contrato normativo;
- hash del System Spec coincide con el manifest;
- salida estable para las mismas entradas.

## Estados observables

- `WAITING_INPUTS`: faltan secciones o sus fuentes.
- `INPUT_INVALID`: schema/provenance/cobertura inválidos.
- `CONFLICT_BLOCKED`: existe contradicción sin resolver.
- `READY`: gates de admisión verdes.
- `INTEGRATING`: compilación en curso.
- `VALIDATION_FAILED`: salida no pasa VERIFY.
- `COMPILED`: System Spec + manifest verificados.

`COMPILED` es el único estado que habilita BACKLOG-179.

## Invariantes

1. **No raw-canonical shortcut.** El integrador global nunca consume directamente los 84 canonical como sustituto de Section Specifications.
2. **No provenance loss.** Todo contrato normativo del System Spec conserva ruta hasta sección, interfaz de punto y canonical.
3. **No silent conflict resolution.** Una contradicción sólo desaparece con una resolución registrada.
4. **Deterministic merge.** Misma colección de inputs versionados produce la misma estructura normalizada.
5. **No partial canonical output.** Con una sección faltante, el estado es `WAITING_INPUTS`, no una System Spec “provisional” presentada como final.
6. **Build boundary.** Esta fase compila conocimiento; no ejecuta cambios de runtime. El Build Graph pertenece a BACKLOG-179.

## Fixtures mínimos

- falta una sección → `WAITING_INPUTS`;
- section_id duplicado → `INPUT_INVALID`;
- un point_id con ownership primario doble → `INPUT_INVALID`;
- referencia a tipo inexistente → `INPUT_INVALID`;
- conflicto BLOCKING sin resolución → `CONFLICT_BLOCKED`;
- siete secciones completas, sin dangling refs ni conflictos → `COMPILED`;
- misma entrada con distinto orden físico → mismo manifest normalizado.

## Estado real al 2026-09-22

El Blueprint `FORGE-BLUEPRINT-84-01` todavía no tiene canonical finales persistidos; BACKLOG-177 sigue pendiente y no existen siete Section Specifications. Por lo tanto, esta spec completa el diseño ejecutable del integrador global, pero la compilación final permanece correctamente en `WAITING_INPUTS`.

No corresponde crear la System Spec global todavía.
