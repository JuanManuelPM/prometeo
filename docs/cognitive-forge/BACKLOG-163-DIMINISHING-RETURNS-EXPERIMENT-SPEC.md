# BACKLOG 163 · Medir beneficio decreciente de workers · Spec ejecutable

## Estado

- Fuente: `docs/cognitive-forge/backlog.json#163`
- Estado propuesto: **DISEÑADO**
- Objetivo: encontrar empíricamente el menor nivel de concurrencia después del cual sumar workers aporta poco throughput útil.
- Esta spec no declara todavía un knee: los datos actuales mezclan workloads y no permiten una conclusión causal limpia.

## Evidencia disponible

El runtime ya tiene outputs con `worker_code`, `elapsed_ms`, `published_at`, rescues y palabras, además de sesiones/eventos y `prometeo_launch_gate`. En el snapshot observado, WORK-RESERVOIR tenía 126 outputs de 31 workers distintos; otros proyectos tenían cohortes de 2–8 workers. Esa variación sirve para instrumentar, pero no para comparar directamente: proyectos, jobs y supply READY difieren.

Una consulta exploratoria destinada a construir la curva temporal fue bloqueada por el control de seguridad de la herramienta. No se reformuló ni se buscó una ruta alternativa. Por eso esta spec define cómo capturar evidencia suficiente sin inventar una medición.

## Hipótesis

Cuando hay trabajo READY suficiente, aumentar workers debería elevar throughput hasta que coordinación, ancho del DAG, tooling o latencia de jobs se vuelvan el límite. El knee es el menor N donde una subida de concurrencia produce una mejora marginal pequeña y estable.

## Definición operacional

Sea un escalón de concurrencia `N` y el siguiente escalón observado `N2 > N`.

```
gain(N→N2) = (throughput_N2 - throughput_N) / throughput_N
```

Un **knee candidate** aparece cuando, con supply suficiente:

- `gain < 10%` durante al menos dos escalones consecutivos;
- utilización productiva no aumenta materialmente;
- p50/p90 de tiempo de finalización no mejora más de 10%;
- retries/rescues/stale no empeoran de forma que oculten throughput;
- cada escalón tiene al menos 3 ventanas independientes o 30 outputs comparables.

No se promueve un knee con una sola ventana.

## Supply-sufficient

Nunca comparar ventanas donde faltaba trabajo ejecutable con ventanas saturadas.

Cada muestra MUST registrar al menos:

- `observed_at`;
- `project_id` o familia de workload;
- `ready_jobs`;
- `leased_jobs`;
- `working_workers`;
- `waiting_workers`;
- `assignable_slots`;
- `completed_outputs_delta`;
- `completed_words_delta`;
- `retry_length_delta`;
- `stale_lease_delta`;
- `rescues_delta`.

Una ventana entra al análisis principal sólo si `ready_jobs >= working_workers` al inicio o si existe otra evidencia equivalente de que supply no era el límite.

## Captura sin llamadas extra del cliente

La instrumentación MUST ocurrir dentro de transiciones server-side ya existentes (assignment, publish, wait/revival o reconciliación). No se agrega un RPC de telemetría por worker.

Propuesta durable:

```sql
prometeo_capacity_samples(
  sample_id bigint,
  observed_at timestamptz,
  reason text,
  project_id text,
  ready_jobs int,
  leased_jobs int,
  working_workers int,
  waiting_workers int,
  assignable_slots int,
  completed_outputs bigint,
  completed_words bigint,
  retry_length_count bigint,
  stale_lease_count bigint,
  rescue_count bigint
)
```

Los contadores acumulados permiten calcular deltas entre muestras sin duplicar eventos.

## Cohortes comparables

Prioridad de evidencia:

1. mismo proyecto y misma familia de jobs;
2. ventanas supply-sufficient del mismo protocolo/prompt;
3. misma política de leases;
4. mismo rango temporal razonable para reducir drift.

Datos de proyectos distintos pueden servir como exploratory evidence, no como prueba del knee.

## Curva

Para cada nivel/banda de `working_workers`, calcular:

- outputs/hora;
- palabras/minuto como secundaria, nunca score de calidad;
- p50/p90 elapsed_ms;
- utilization = productive_worker_time / available_worker_time;
- retry, stale y rescue por output;
- n de ventanas y outputs.

La salida MUST incluir confidence/evidence count.

## Decisión

Resultado posible:

- `INSUFFICIENT_DATA`
- `NO_KNEE_IN_RANGE`
- `KNEE_CANDIDATE`
- `KNEE_CONFIRMED`

`KNEE_CONFIRMED` requiere dos periodos/cohortes independientes que satisfagan el criterio con la misma política runtime.

## Integración con recommended_workers

Sólo después de confirmación, el knee puede informar `recommended_workers`. Nunca cambia `max_parallelism` automáticamente. La recomendación queda separada del safety cap y puede ser superada por experimentos explícitos.

## Casos de aceptación

1. Capturar muestras sin RPC cliente adicional.
2. Distinguir ventana supply-limited de supply-sufficient.
3. Derivar deltas sin doble conteo.
4. Producir curva por concurrencia con n de evidencia.
5. No declarar knee con muestras insuficientes.
6. Detectar un fixture con ganancia <10% en dos escalones.
7. Rechazar comparación causal entre workloads incompatibles.
8. Conservar retries/rescues/stale junto al throughput.
9. Repetir análisis en una segunda cohorte.
10. Emitir recommendation sólo tras `KNEE_CONFIRMED`.

## Fases ejecutables

**A. Instrumentación.** Persistir muestras server-side y tests de no-overhead cliente.

**B. Baseline.** Acumular ventanas supply-sufficient reales bajo OBEY-v2.

**C. Analizador.** Construir curva, gain y confidence con resultado conservador.

**D. Repetición.** Confirmar o refutar el knee en otra cohorte comparable.

**E. Integración.** Alimentar recommended_workers sin tocar safety caps automáticamente.

## Criterio de HECHO

BACKLOG-163 pasa a HECHO cuando A–D están verificadas, hay al menos dos cohortes comparables, el resultado es `KNEE_CONFIRMED` o `NO_KNEE_IN_RANGE` con rango explícito, y los receipts permiten reconstruir datos, thresholds y versión de runtime usados.
