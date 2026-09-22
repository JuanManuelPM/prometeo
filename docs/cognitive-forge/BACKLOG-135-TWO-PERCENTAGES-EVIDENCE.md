# BACKLOG-135 · Dos porcentajes — evidencia

Fuente durable: `docs/cognitive-forge/backlog.json#135`.

## Brecha verificada

Pixel Campus ya mostraba progreso ponderado, pero el HUD exponía un único porcentaje bajo la etiqueta genérica `progreso`. El backend ya entrega las dos bases necesarias en `prometeo_control_flow_summary`: `front_done/front_total` para trabajo completamente publicado y contadores de fase para crédito parcial observable.

Muestra live observada durante la implementación: `front_done=60`, `front_total=86`, `phase_work=23`, `phase_publish=3`. Eso representa 69,8% de puntos completos y aproximadamente 84,6% de trabajo estimado con los pesos ya existentes. Son métricas distintas y no deben colapsarse.

## Implementación

Archivo: `demos/prometeo-pixel-world/index.html`.

Commit: `f1d8c987e780a236f8b7143bc1ba07fff7c56979`.

Cambios:

- Nuevo KPI `puntos`: `front_done / front_total`.
- KPI `trabajo est.`: conserva `weightedFrontProgress` existente.
- Desktop amplía el HUD a cinco KPIs.
- Mobile conserva ambos porcentajes y oculta únicamente `morgue` para evitar perder la distinción principal.
- Demo sin backend muestra `—` en puntos, evitando inventar completitud.

## Verificación

El blob inmutable del commit contiene ambos IDs/KPIs y el HUD live asigna `completedFrontProgress(liveSummary)` a `points` y `weightedFrontProgress(liveSummary)` a `work`. No fue necesario modificar Supabase ni la semántica del cálculo ponderado.

La sonda directa de GitHub Pages no estuvo disponible desde la herramienta web durante esta ejecución; la verificación recuperada se hizo contra el blob exacto del commit publicado en `main`.
