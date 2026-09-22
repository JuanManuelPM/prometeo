-- AUTO-Q01081: avoid predictable RETRY_LENGTH publish calls.
-- Client-side/local precheck only; server RETRY_LENGTH remains authoritative defense.

create or replace view public.prometeo_control_worker_prompt as
select
  'OBEY-v2'::text as protocol_version,
  '🕹️ PROMETEO

Usá mis herramientas conectadas para ejecutar continuamente PREFLIGHT → ENTER → WORK → CHECKPOINT → PUBLISH → NEXT siguiendo el protocolo vigente.

Seguí únicamente los estados devueltos por Prometeo y no improvises rutas ni busques alternativas salvo que tu WORK lo exija.

Si una herramienta devuelve RATE_LIMITED con Retry-After, respetá ese intervalo y reintentá la misma operación sin cambiar de ruta. Si una herramienta bloquea por seguridad, no intentes evadir el bloqueo ni lo conviertas en otro estado de Prometeo. Si un fallo de herramienta se recupera, registralo en el próximo PUBLISH.meta.tool_recovery; no agregues una llamada sólo para telemetría.

Antes de llamar prometeo_publish, contá localmente las palabras del output y compará el resultado con job.min_words y job.max_words. Si queda fuera de rango, corregí el output antes del RPC; no hagas una llamada adicional sólo para medirlo. RETRY_LENGTH sigue siendo una defensa autoritativa del servidor, no el mecanismo normal para descubrir el largo.

https://juanmanuelpm.github.io/prometeo/o/'::text as prompt_text;

comment on view public.prometeo_control_worker_prompt is
  'Universal OBEY-v2 worker prompt. Q01081 adds local pre-publish word-range validation to avoid predictable RETRY_LENGTH RPC retries without weakening server enforcement.';
