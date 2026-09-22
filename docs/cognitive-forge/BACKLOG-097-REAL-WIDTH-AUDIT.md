# BACKLOG-097 — Auditoría de ancho real del Blueprint 84

Fecha de snapshot: 2026-09-22
Fuente durable: `docs/cognitive-forge/backlog.json#97`
Blueprint: `FORGE-BLUEPRINT-84-01`

## Pregunta

¿Las 84 raíces evitan que el trabajo vuelva a concentrarse en muy pocos workers?

## Estado observado

El blueprint sigue `RUNNING`, por lo que este documento es una auditoría intermedia y no un cierre del run.

- Puntos: 84
- Puntos DONE: 0
- Jobs totales: 420
- Jobs DONE: 182
- Jobs READY: 75
- Jobs LEASED: 9

### Frontera por fase

| Fase | DONE | READY | LEASED | BLOCKED |
|---|---:|---:|---:|---:|
| ARCHITECT | 84 | 0 | 0 | 0 |
| DEEP_DEVELOPMENT | 73 | 3 | 8 | 0 |
| ADVERSARIAL | 25 | 47 | 1 | 11 |
| CANONICAL | 0 | 25 | 0 | 59 |
| LEARNING | 0 | 0 | 0 | 84 |

La frontera ejecutable es ancha en este snapshot: hay 75 jobs READY distribuidos entre DEEP_DEVELOPMENT, ADVERSARIAL y CANONICAL.

## Distribución de outputs por worker

La atribución se midió sobre `blueprint_outputs`, no sobre `blueprint_jobs.last_worker_code`, porque este último deja gran parte del histórico como NULL/UNASSIGNED.

| Worker | Outputs | Puntos distintos | Architect | Deep | Adversarial | Canonical | Learning |
|---|---:|---:|---:|---:|---:|---:|---:|
| K004 | 50 | 42 | 10 | 15 | 25 | 0 | 0 |
| K002 | 21 | 20 | 10 | 11 | 0 | 0 | 0 |
| K001 | 20 | 19 | 12 | 8 | 0 | 0 | 0 |
| K005 | 20 | 19 | 11 | 9 | 0 | 0 | 0 |
| K006 | 19 | 17 | 11 | 8 | 0 | 0 | 0 |
| K008 | 19 | 18 | 11 | 8 | 0 | 0 | 0 |
| K003 | 17 | 16 | 10 | 7 | 0 | 0 | 0 |
| K007 | 16 | 16 | 9 | 7 | 0 | 0 | 0 |

Total observado: 182 outputs. Los 8 workers produjeron resultados. El mayor aporte acumulado es K004 con 50/182, aproximadamente 27,5%.

## Hallazgos

1. **Las 84 raíces sí abrieron el arranque.** ARCHITECT terminó los 84 puntos y quedó repartido entre los 8 workers: cada uno produjo entre 9 y 12 outputs de esa fase. No aparece el patrón de un único worker absorbiendo casi todas las raíces.

2. **El ancho global no implica ancho sostenido por fase.** K004 produjo los 25 outputs ADVERSARIAL completados hasta este snapshot; los otros 7 workers todavía no registran outputs terminados de esa fase. Al mismo tiempo existen 47 ADVERSARIAL READY y 1 LEASED. Por lo tanto, la amplitud del DAG evita un cuello estructural de raíces, pero no garantiza por sí sola una distribución uniforme en etapas posteriores.

3. **La concentración acumulada es mucho menor que en el run FORGE-8-01 histórico, pero sigue siendo observable.** El worker con más outputs tiene 27,5% del total actual. Esta comparación sirve como señal descriptiva, no como criterio definitivo de éxito, porque el Blueprint 84 aún está en ejecución y las fases CANONICAL/LEARNING todavía no aportaron outputs.

4. **No corresponde cerrar la auditoría final todavía.** Hay 182/420 jobs DONE y 0/84 puntos DONE. Una conclusión final debe esperar a que las cinco fases hayan podido distribuirse.

## Criterio para el cierre final

Cuando el blueprint termine, repetir sobre `blueprint_outputs`:

- outputs totales y puntos distintos por worker;
- distribución por worker dentro de cada fase;
- participación de workers por fase;
- participación del worker con mayor cantidad de outputs;
- contraste entre el ancho inicial (ARCHITECT) y las fases tardías (CANONICAL/LEARNING).

BACKLOG-97 puede cerrarse como auditado cuando exista ese snapshot final. Hasta entonces, esta evidencia demuestra una respuesta parcial pero útil: las 84 raíces corrigieron el ancho inicial, aunque apareció concentración local en ADVERSARIAL y el ancho sostenido todavía debe validarse al finalizar el run.
