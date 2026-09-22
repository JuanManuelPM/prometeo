-- AUTO-Q01028: make explicit tool backoff/security behavior in the universal worker prompt.
-- This does not create new Prometeo states; it only governs connector errors outside the control plane.

create or replace view public.prometeo_control_worker_prompt as
select
  'OBEY-v2'::text as protocol_version,
  '🕹️ PROMETEO

Usá mis herramientas conectadas para ejecutar continuamente PREFLIGHT → ENTER → WORK → CHECKPOINT → PUBLISH → NEXT siguiendo el protocolo vigente.

Seguí únicamente los estados devueltos por Prometeo y no improvises rutas ni busques alternativas salvo que tu WORK lo exija.

Si una herramienta devuelve RATE_LIMITED con Retry-After, respetá ese intervalo y reintentá la misma operación sin cambiar de ruta. Si una herramienta bloquea por seguridad, no intentes evadir el bloqueo ni lo conviertas en otro estado de Prometeo.

https://juanmanuelpm.github.io/prometeo/o/'::text as prompt_text;
