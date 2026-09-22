# BACKLOG-142 · Usar mediana · evidence

Status reconciled: **HECHO**

## Implementación encontrada

La necesidad ya estaba materializada en `pages/forge-blueprint/index.html` antes de este job.

Commit `7d3c59abfb06fee344ee0a34c6835b5074549f65` introdujo:

- `median(xs)`;
- `expectedJobMs(j)`, que toma la mediana de `elapsed_ms` de outputs de la misma fase;
- fallback robusto usando la mediana de duración normalizada por `jobWeight`.

Commit `16c8001bffd7c51007b0419130613cf4e0777068` reutiliza la misma mediana para `historyRates` cuando el ETA arranca desde runs históricos.

Esto reduce sensibilidad a extremos sin convertir el promedio en la única fuente de duración esperada.

## Evidencia live

Para `FORGE-BLUEPRINT-84-01`, el backend tenía muestras reales con dispersión suficiente para que la distinción importe:

| fase | n | promedio ms | mediana ms | min ms | max ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 84 | 64768.2 | 57953 | 43879 | 160844 |
| 2 | 73 | 148525.1 | 156004 | 3507 | 353784 |
| 3 | 25 | 4114.7 | 3867 | 3153 | 8416 |

La fase 2, por ejemplo, contiene extremos de 3.5 s a 353.8 s; la estimación de duración activa usa la mediana, no el promedio bruto.

## Límite

El estimador de throughput del run actual todavía usa la tasa agregada `done / elapsed`; BACKLOG-142 queda satisfecho porque las estimaciones de duración y el bootstrap histórico ya usan mediana. Cambiar el modelo completo de throughput pertenece a los ítems posteriores de capacidad/worker/scheduler y no se adelanta aquí.
