# BACKLOG 223 · Rangos y contratos de Deep Skills · Spec ejecutable

## Estado

- Backlog origen: **223 · Rangos y contratos de Deep Skills**
- Estado propuesto del backlog: **DISEÑADO**
- Tipo: contrato durable de ejecución para Skills cognitivas profundas
- Provenance canónica: `docs/cognitive-forge/BACKLOG.md#223`
- Relacionados: BACKLOG-197/198 (registry + versionado), BACKLOG-207..218 (familia Deep Skills), BACKLOG-222 (persistencia de Deep Skills), BACKLOG-224/225 (utilidad y evolución).
- Esta spec no persiste todavía las Deep Skills ni cambia el scheduler.
- Schema machine-readable: `docs/cognitive-forge/schemas/deep-skill-contract-v1.schema.json`.

## Evidencia previa y dedupe

Antes de redactar esta spec se verificó:

1. `forge_skills` y `forge_skill_versions` existen y preservan identidad, versiones, schemas, procedimiento, rollback, verificación, evidencia y provenance.
2. El directorio `docs/cognitive-forge/` no contiene una spec para BACKLOG-223.
3. No había jobs READY/LEASED/WORKING cuyo título o instrucción mencionara “Deep Skill” o “223”.
4. El Guide State vigente indica preservar deduplicación y no crear trabajo paralelo sin una brecha verificable.

Por lo tanto, la brecha seleccionada es real: existe la familia conceptual de Deep Skills, pero no un contrato reusable que diga cuánto trabajo admitir, qué output es obligatorio y cuándo una ejecución puede considerarse verificable.

## Problema

Una Deep Skill no puede depender de un prompt largo y ambiguo. Sin rangos y outputs obligatorios, dos workers pueden ejecutar “la misma” Skill con profundidad incompatible, omitir partes críticas o producir texto imposible de validar. Tampoco existe una frontera clara entre trabajo cognitivo útil y longitud inflada.

El contrato debe convertir una Deep Skill en una unidad ejecutable y versionable sin confundir presupuesto con calidad.

## Objetivo

Definir `prometeo.deep-skill-contract/v1`, un contrato portable que pueda adjuntarse a una versión de Skill y que determine:

- condiciones de entrada;
- presupuesto cognitivo y de output;
- operaciones obligatorias;
- artefactos de salida;
- evidencia mínima;
- criterios de rechazo;
- reglas de degradación cuando faltan inputs o herramientas.

## Unidad durable

Cada versión de Deep Skill MUST tener un `execution_contract` equivalente a:

```json
{
  "schema": "prometeo.deep-skill-contract/v1",
  "profile": "ANALYZE|SYNTHESIZE|ADVERSARIAL|TRANSFORM|META",
  "budget": {
    "min_words": 600,
    "target_words": 1000,
    "max_words": 1600,
    "max_tool_calls": 12,
    "max_children": 3
  },
  "required_operations": [],
  "required_outputs": [],
  "stop_conditions": [],
  "failure_modes": [],
  "verification": {},
  "degradation_policy": {}
}
```

El storage exacto puede resolverse en implementación mediante una columna `execution_contract jsonb` en `forge_skill_versions` o una representación normalizada equivalente. No debe esconderse dentro de texto libre.

## Semántica del presupuesto

Los límites de palabras son guardrails de forma, no una métrica de calidad.

- `min_words`: piso para impedir una respuesta superficial cuando el contrato exige varias operaciones.
- `target_words`: centro de planificación, no requisito de exactitud.
- `max_words`: techo antes de exigir compresión.
- `max_tool_calls`: límite de coordinación; no obliga a consumir herramientas.
- `max_children`: expansión permitida sólo si aparece trabajo nuevo e independiente.

Una ejecución fuera de `min_words/max_words` no debe publicarse como completa. Debe corregirse localmente primero, igual que OBEY-v2 hace con outputs de jobs.

## Perfiles iniciales

Los perfiles no reemplazan la Skill; sólo dan defaults revisables.

### ANALYZE
Para diagnóstico, abstracción y clasificación.

- rango: 700–1400 palabras;
- outputs mínimos: observaciones, modelo causal, supuestos, hallazgos no obvios;
- verificación: cada conclusión importante debe apuntar a una evidencia o a una inferencia explícita.

### SYNTHESIZE
Para reconciliar perspectivas o documentos.

- rango: 900–1800 palabras;
- outputs mínimos: tensiones, decisiones reconciliadas, propuesta integrada, trade-offs;
- verificación: ninguna perspectiva crítica puede desaparecer sin justificación.

### ADVERSARIAL
Para atacar diseños y detectar fallos.

- rango: 700–1500 palabras;
- outputs mínimos: amenazas, contraejemplos, invariantes rotos, reparaciones priorizadas;
- verificación: al menos un intento explícito de falsar la solución.

### TRANSFORM
Para convertir análisis en arquitectura/procedimiento.

- rango: 800–1700 palabras;
- outputs mínimos: estado inicial, transformación, contrato resultante, rollback o reversibilidad;
- verificación: el resultado debe ser ejecutable por otro worker sin reconstruir contexto esencial.

### META
Para rethink de alto nivel y compresión del sistema.

- rango: 1200–2400 palabras;
- outputs mínimos: mapa del sistema, simplificaciones, capacidades desbloqueadas, cambios de decisión y próximos experimentos verificables;
- verificación: distinguir hechos, inferencias, hipótesis y propuestas.

## Mapeo inicial de Deep Skills

Seed sugerido, sujeto a versionado:

- BACKLOG-207 `ABSTRAER EL PROCEDIMIENTO` → ANALYZE.
- BACKLOG-208 `CONSEJO DE PERSPECTIVAS` → SYNTHESIZE.
- BACKLOG-210 `RADICAL_SIMPLIFIER` → ADVERSARIAL.
- BACKLOG-211 `¿Por qué esto no es una función?` → ANALYZE.
- BACKLOG-212 `Reconstrucción sin original` → ADVERSARIAL.
- BACKLOG-213 `DIEZ VECES MÁS` → META.
- BACKLOG-214 `¿Qué estamos haciendo dos veces?` → ANALYZE.
- BACKLOG-215 `Arquitecto de automatización` → TRANSFORM.
- BACKLOG-216 `CEO vs Ingeniero` → SYNTHESIZE.
- BACKLOG-217 `Futuro retrospectivo` → META.
- BACKLOG-218 `FORGE_DEEP_RETHINK` → META.

Estos defaults no convierten los conceptos en HECHO. La persistencia durable sigue perteneciendo a BACKLOG-222.

## Outputs obligatorios

Toda Deep Skill debe declarar `required_outputs` como objetos verificables, no sólo encabezados narrativos. Tipos mínimos permitidos:

- `FINDING`: hallazgo con evidence_ref o inferencia explícita.
- `DECISION`: decisión tomada y alternativas descartadas.
- `RISK`: riesgo, trigger y mitigación.
- `SPEC_DELTA`: cambio concreto a un contrato o sistema.
- `EXPERIMENT`: hipótesis, variable, medición y criterio de éxito.
- `CAPABILITY`: capacidad existente o nueva y evidencia de disponibilidad.
- `OPEN_QUESTION`: sólo cuando el dato faltante no es resoluble con capacidades disponibles.

Cada Skill define cuáles son obligatorios y su cardinalidad mínima.

## Política de degradación

Si falta un input esencial:

1. no inventar el dato;
2. marcar qué operación quedó bloqueada;
3. producir sólo outputs cuya evidencia siga siendo válida;
4. concluir `PARTIAL` o `BLOCKED`, nunca `COMPLETE`.

Si una herramienta falla, el contrato debe distinguir `TOOL_ERROR` de incapacidad del sistema. Si la herramienta se recupera, el receipt final conserva la recuperación.

## Verificación y receipts

Una ejecución de Deep Skill es `COMPLETE` sólo si:

- respeta rango de output;
- ejecuta todas las operaciones obligatorias o documenta una degradación permitida;
- entrega todos los tipos de output requeridos;
- cada claim crítico tiene provenance;
- cumple su `verification_contract`;
- preserva un receipt con `skill_id`, `version_no`, `contract_schema`, presupuesto usado, outputs producidos y evidence refs.

El receipt no debe incluir chain-of-thought ni scratchpad.

## Casos de aceptación

1. Una ejecución por debajo de `min_words` se rechaza antes de publish.
2. Una ejecución por encima de `max_words` se comprime sin perder outputs obligatorios.
3. Una Skill ANALYZE sin evidence refs en hallazgos críticos no puede cerrar COMPLETE.
4. Una Skill SYNTHESIZE que omite una perspectiva requerida falla verificación.
5. Una herramienta caída produce TOOL_ERROR/PARTIAL, no una falsa declaración de incapacidad.
6. Dos versiones de la misma Skill pueden cambiar presupuesto y outputs sin perder provenance histórica.
7. Un worker distinto puede ejecutar la Skill a partir del contrato durable sin necesitar el prompt original.
8. El sistema puede medir después utilidad y evolución por `skill_id + version_no + contract_schema`.

## Plan de implementación

**Fase A.** Añadir soporte durable para `execution_contract` versionado y validación de schema.

**Fase B.** Persistir una muestra pequeña de Deep Skills existentes con los perfiles seed anteriores.

**Fase C.** Incorporar validación local de presupuesto/output antes de publish del job que invoque la Skill.

**Fase D.** Emitir receipts estructurados y conectarlos con utilidad histórica y banco de regresión.

**Fase E.** Ajustar rangos sólo con evidencia de ejecuciones reales; nunca por longitud promedio aislada.

## No objetivos

- No usar palabras por minuto para evaluar calidad.
- No forzar el mismo rango a todas las Deep Skills.
- No guardar razonamiento privado.
- No convertir headings presentes en prueba de que un output existe.
- No persistir todavía toda la familia; eso pertenece a BACKLOG-222.
- No promover automáticamente una versión por haber cumplido longitud.

## Criterio de cierre

BACKLOG-223 puede pasar de DISEÑADO a HECHO cuando el contrato esté persistido/versionado, al menos tres Deep Skills reales lo usen, la validación de rango y outputs sea automática antes de publish, y los ocho casos de aceptación produzcan receipts reproducibles.
