# BACKLOG-170 · Detectar contradicciones · evidence

Status reconciled: **HECHO**

## Capacidad durable

La detección/resolución de contradicciones ya está implementada por `FORGE_SECTION_INTEGRATOR` v1, fuente durable de BACKLOG-177.

Su procedimiento incluye explícitamente `detect_contradictions`:

- las afirmaciones incompatibles se materializan en `contradictions[]`;
- cada contradicción sólo puede quedar `OPEN` o `RESOLVED`;
- `RESOLVED` exige al menos un `evidence_ref`;
- si no existe evidencia suficiente, el conflicto debe permanecer `OPEN`.

El output validado es `prometeo.forge-section-spec/v1`, que incluye `contradictions` como colección obligatoria.

## Contrato verificado

`public.forge_section_integrator_result_validate(input, output)` aplica la regla:

- status distinto de `OPEN|RESOLVED` → `INVALID_CONTRADICTION_STATUS`;
- `RESOLVED` sin evidencia → `RESOLUTION_EVIDENCE_REQUIRED`;
- contradicción `OPEN` válida → `SECTION_SPEC_VALID`;
- contradicción `RESOLVED` con evidencia → `SECTION_SPEC_VALID`.

## Verificación live

El smoke del Skill devolvió:

- `SECTION_INTEGRATOR_SKILL_SMOKE_OK`
- `source_coverage = PASS`
- `execution_bundle = PASS`
- `valid_section_spec = PASS`
- `canonical_decision_reopen_guard = PASS`
- `authority_granted = false`

Fixture dirigido con dos interfaces:

1. contradicción `OPEN` → `SECTION_SPEC_VALID`;
2. contradicción `RESOLVED` sin `evidence_refs` → `RESOLUTION_EVIDENCE_REQUIRED`;
3. misma contradicción `RESOLVED` con `evidence://fixture` → `SECTION_SPEC_VALID`.

## Fuentes

- Spec: `docs/cognitive-forge/BACKLOG-177-SECTION-INTEGRATOR-SKILL-SPEC.md`
- Spec SHA verificado: `dd5353ce7b853b9151eea8e7ac0fd21f39fe0909`
- Migration declarada por la spec: `supabase/migrations/20260922042000_forge_section_integrator_skill_v1.sql`
- Skill: `FORGE_SECTION_INTEGRATOR` v1
- definition hash live: `md5:ef33bc902172eb256cb989c0b3dcb6bf`

## Límite

BACKLOG-170 queda satisfecho por la primitive de reconciliación: detecta incompatibilidades, obliga a representarlas y evita resolverlas sin evidencia. La producción de siete Section Specifications reales y el integrador global siguen siendo trabajos distintos (BACKLOG-174/178); no son condición para que la capacidad de contradicciones exista.
