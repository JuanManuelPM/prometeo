# Worker Runtime Lab · WORKER-RUNTIME-LAB-01

## Objetivo

Entender por qué algunos workers sobreviven y encadenan muchos jobs mientras otros mueren después de ENTER/WAIT/PUBLISH, y convertir esa evidencia en un protocolo OBEY mejor, menos polling y Worker Runtime Knowledge reusable.

## Principio

No optimizar sólo inteligencia o volumen. Medir:

- Productive Survival
- streak de jobs consecutivos
- reliability
- normalized throughput
- downstream quality evidence
- recovery
- utilization
- coordination cost
- death reason
- protocol version

## Jobs

- R001 · WorkerSession schema
- R002 · Taxonomía de muerte
- R003 · Checkpoint semántico
- R004 · Work Trace sin chain-of-thought
- R005 · Eliminar hot WAIT
- R006 · Métricas de supervivencia
- R007 · Autopsia y aprendizaje
- R008 · OBEY v2
- R009 · Experimento A/B
- R010 · Visualización de vida/muerte
- R011 · Worker Runtime Knowledge
- R012 · Síntesis Runtime Lab (depende de R001–R011)

## Política del proyecto

- priority: 130
- min_parallelism: 6
- desired_parallelism: 12
- max_parallelism: 24
- workers globales fungibles
- WAIT debe ser excepcional
- no pedir razonamiento privado; usar Work Trace estructurado
- cambios de protocolo se promueven sólo con evidencia A/B

## Salida esperada

Una especificación implementable para:
WorkerSession + death taxonomy + checkpoint + telemetry + scheduler anti-WAIT + OBEY v2 + survival metrics + autopsy + /control/ + A/B testing + Runtime Knowledge.
