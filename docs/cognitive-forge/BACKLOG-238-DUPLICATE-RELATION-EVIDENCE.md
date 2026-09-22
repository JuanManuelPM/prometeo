# BACKLOG-238 · Evitar duplicados · Evidencia

## Resultado

**HECHO.** El backlog ya puede analizar similitud y relaciones entre necesidades sin depender únicamente de IDs y sin auto-fusionar estados.

## Implementación

- Auditor: `scripts/audit-backlog-relations.mjs`
- Tests: `tests/backlog-relations-v1.test.mjs`
- Autoridad del reporte: `ANALYSIS_ONLY_NO_AUTO_MERGE_OR_STATUS_CHANGE`

El auditor:

1. normaliza mayúsculas, acentos, plurales y derivaciones españolas comunes;
2. compara título, resumen y vocabulario combinado;
3. calcula similitud determinista;
4. clasifica pares como `DUPLICATE_CANDIDATE`, `RELATED` o `EXPLICIT_RELATION`;
5. detecta referencias explícitas del tipo `BACKLOG-99`, `item 99` o `#99`;
6. nunca cambia estados, nunca fusiona ítems y nunca concede autoridad.

Esto complementa, pero no reemplaza, mecanismos anteriores:
- fingerprint exacto de propuestas en `scripts/discovery-dedup-lib.mjs`;
- dedupe por clase activa del Work Reservoir en `20260922032000_reservoir_active_class_dedupe.sql`.

## Verificación

Batería local ejecutada sobre el código committed:

`node --test tests/backlog-relations-v1.test.mjs`

Resultado: **7/7 tests PASS**.

Cubre:
- normalización;
- detección de candidato duplicado sin IDs iguales;
- relación semántica por debajo del umbral de duplicado;
- referencia explícita;
- rechazo de pares irrelevantes;
- ausencia de self-relations;
- salida analysis-only;
- determinismo.

## Snapshot sobre backlog real

Ejecutado con thresholds por defecto (`duplicate=0.68`, `related=0.30`) sobre el backlog actual:

- items: **253**
- relaciones detectadas: **27**
- duplicate candidates: **0**
- explicit relations: **0**
- related: **27**

El resultado conservador es intencional: no inventa duplicados cuando sólo existe cercanía temática.

Muestras reales:
- 130 ↔ 131/132/133/134: familia de pesos por fase.
- 33 ↔ 46: `32 Cognitive Cards` ↔ `Cognitive Card`.
- 167 ↔ 177: `Integración por secciones` ↔ `Integrador de sección`.
- 112 ↔ 113/114: zonas visuales de Tools/Plumas/Recipes.

## Uso

```bash
node scripts/audit-backlog-relations.mjs --input docs/cognitive-forge/backlog.json
```

Opcionalmente:
- `--output <archivo>`
- `--duplicate-threshold <n>`
- `--related-threshold <n>`

## Criterio de cierre

BACKLOG-238 queda cubierto por una primitive reusable, determinista, testeada y separada de la autoridad de ejecución. El sistema puede detectar cercanía y relaciones para revisión sin asumir que similitud equivale a identidad.
