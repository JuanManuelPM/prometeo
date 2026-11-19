# FLUJO · De un video a una presentación
Contrato maestro: [FLOW_INDEX.json](./FLOW_INDEX.json) y [flow.json](./versions/1.0.0/flow.json).

```mermaid
flowchart LR
  A["URL / título / canal"] --> B{"Identidad verificada"}
  B -->|no| BA["Opciones verificables; no adivinar"]
  B -->|sí| C{"¿Permiso para MP4?"}
  C -->|sí| D["Reproductor nativo y medios propios"]
  C -->|no| E["Embed oficial del proveedor"]
  D --> F{"¿Transcripción temporizada?"}
  E --> F
  F -->|sí| G["Normalizar + validar tiempos"]
  F -->|no| H["YouTube: Mostrar transcripción"]
  H --> I{"¿Timestamps comprobados?"}
  I -->|sí| G
  I -->|no| J{"¿ASR legalmente posible?"}
  J -->|sí| G
  J -->|no| K["NOT_RUN; sin cortes inventados"]
  G --> L["Puntuar ideas y contexto"]
  L --> M["Recortes no solapados"]
  M --> N{"¿Las frases de slides son fieles?"}
  N -->|no| L
  N -->|sí| O["VideoRecipe"]
  O --> P["SECUENCIA · diseño preservado"]
  P --> Q["QA navegación / sonido / reentrada"]
  Q -->|FAIL| P
  Q -->|PASS| R["GitHub gh-pages"]
  R --> S["HTTP + SHA + receipt"]

```

No son pasos decorativos: cada caja se corresponde con IDs del JSON. Al bloquearse cualquier prueba se conserva la evidencia y se marca `FAIL/NOT_RUN`.
