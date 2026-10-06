# EXPERIMENTOS Widget · Draft Contract V1

## Purpose

`EXPERIMENTOS` es el cuaderno de laboratorio durable de Prometeo. Su función no es mostrar “actividad” ni decorar la UI con PASS verdes, sino conservar la relación entre hipótesis, método, evidencia, resultado, limitaciones y decisión.

## Design rule

Todo experimento debe poder responder, sin depender del chat donde ocurrió:

- qué se intentó demostrar;
- qué infraestructura real se usó;
- qué parte fue simulada;
- qué se midió;
- qué resultado se observó;
- qué no se midió;
- qué conclusión está permitida por la evidencia;
- qué conclusión sería una exageración;
- qué artefactos quedaron;
- qué experimento debe venir después.

## Minimum record

```json
{
  "experiment_id": "EXP-001",
  "title": "Drive Broker / Claim atómico",
  "date": "2026-10-06",
  "status": "PARTIAL_PASS",
  "question": "...",
  "hypothesis": "...",
  "method": "...",
  "environment": [],
  "artifacts": [],
  "measurements": {},
  "result": "...",
  "proves": [],
  "does_not_prove": [],
  "limitations": [],
  "decision": "...",
  "next_experiment": "EXP-002"
}
```

## Status vocabulary

`DRAFT | RUNNING | PASS | FAIL | PARTIAL_PASS | INCONCLUSIVE | SUPERSEDED`

## UI behavior

El widget puede mostrar un índice compacto con ID, título, fecha y estado. Al abrir una entrada debe mostrar la nota completa. Las correcciones posteriores se agregan como history entries; no se reescribe silenciosamente el pasado.

## Publication

La proyección pública no debe incluir IDs internos, credenciales ni URLs privadas. La fuente privada puede referenciar evidencia interna. El contenido publicado debe distinguir siempre evidencia observada de inferencia.
