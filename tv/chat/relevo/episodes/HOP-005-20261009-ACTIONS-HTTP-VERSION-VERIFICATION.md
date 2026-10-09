# Prometeo · HOP 5 · GitHub Actions ejecutado, HTTP candidato y Pages base reales

**Fecha de evidencia:** 2026-10-09 18:35 UTC / 15:35 Argentina. **Misión:** persistencia entre chats descartables. **Owner:** PR #77 + Issue #76 + STATE_V1.json. Este archivo es evidencia pública, no autorización de publicación del código ni creación de pantalla adicional.

## Recuperación independiente real

Este quinto chat leyó `gh-pages:tv/chat/AGENT_ENTRY_V1.md`, `RETOMAR_V1.md`, `STATE_V1.json` con HOP1–4, `reentrada.json`, revisión independiente del PR #77, Issue #76 y su anexo UX-01…24. El humano NO copió respuestas de otros chats. El PR #77 era DRAFT y todavía no tenía CI.

## Trabajo material en la misma rama candidata

Rama existente `feature/retomar-live-evidence-hop3-20261009`; no se tocó código de `gh-pages` ni se fusionó ni se alteró la escena TV:
- Test `tv/chat/relevo/tests/retomar-http-smoke-v1.mjs`: servidor HTTP de checkout bajo `/prometeo/`, Chromium real, 360/390/844/1440, 5 proyectos tomados de `reentrada.json`, `STATE_V1.json` real del checkout, historial de chats recuperado, fecha `America/Argentina/Buenos_Aires`, bytes locales reales contra SHA de blob calculado, carrusel, sin overflow, screenshots, fallos simulados 403/503 y diferencia de bytes. **Únicamente GitHub API es fixture controlado; NO se probó la API GitHub real en esta prueba de candidata**.
- Test existente exacto `tv/chat/relevo/tests/retomar-browser-smoke-v1.py`, ejecutado en Actions con Playwright Python.
- Workflow reutilizando patrón Actions/Playwright existente: `.github/workflows/persistencia-pr77-candidate-http-ci-v1.yml`, separado en job `candidate-http-chromium` (pre-publicación) y `public-existing-pages` (Pages base actual; NO candidato). No desplegar, no usar secretos ni worker/scheduler.
- Probe de Pages real `tv/chat/relevo/tests/retomar-public-baseline-v1.mjs`: GET externos de Pages y GitHub API, SHA Git blob de HTML público, Chromium remoto con 390/1440, screenshots y estado de relevos.

## RED → GREEN observado en GitHub Actions

- Run `37973785621` RED: interceptor Playwright usaba `request.url` sin `()`; corregido con lectura del log.
- Run `37973960674` RED: selector por nombre accesible ambiguo devolvía 2 en vez de 1; corregido con comparación exacta de los cinco títulos de `#track`.
- **Run `37974223279` GREEN, HEAD `4badd599b5366a939c59034a99c5182c5b6b114c`**:
  - Job candidato HTTP: **SUCCESS**. Test Python comprometido **31/31**. Navegación HTTP local Playwright Node **9 checks**: 4 viewports, historial/fechas AR, hashes en bytes, mismatch, 403, 503, sin excepciones JS. Evidencia y screenshots en artifact `persistencia-pr77-http-candidate-evidence` (artifact ID `11637788459`).
  - Job Pages público **existente**: **SUCCESS**; `https://juanmanuelpm.github.io/prometeo/tv/chat/relevo/retomar/` HTTP **200**, GitHub API de SHA **200**, `STATE_V1.json` público HTTP **200**; sha blob calculado sobre HTML servido = sha del archivo en `gh-pages`: `0c2dcf56e7809f8ec3606b15b6515e5d9c9b8d0b`; `last_hop=4` y `history_count=4` vistos en ese momento, Chromium 390/1440, 5 tarjetas, sin overflow ni pageerrors. Artifact `persistencia-actual-pages-baseline-evidence` (artifact ID `11638242934`).
  - Logs, artefactos y status: https://github.com/JuanManuelPM/prometeo/actions/runs/37974223279

## Separación estricta de estados

- `CANDIDATE_HTTP_TESTED` **SÍ** para PR #77; los archivos, rutas, responsive y degradación se ejecutaron sobre la rama por HTTP local. Su API GitHub fue controlada por fixtures.
- `EXISTING_PAGES_SERVED_BASELINE_VERIFIED` **SÍ** para HTML anterior de `gh-pages` y su estado real HOP4, bajo GitHub Actions con HTTP público externo.
- `PR77_PUBLISHED` **NO**; `PR77_SERVED_VERIFIED` **NO**; el SHA `0c2dc...` pertenece a la pantalla vieja, no al candidato. No convertir esa prueba en “PR77 ya salió”.
- Demo Engine V6 sobre DOM real del PR77 **NO EJECUTADO**; navegación Back/forward de Issue #76, trazabilidad por pedido/versiones, G3 CAS concurrente, G5 composer autenticado y respuesta de ejecutor **NO DEMOSTRADOS**. Cuatro relevos en JSON y SHA iguales NO demuestran continuidad integral de la app final.
- Ningún resultado de PR #75 PULSO se promovió como versión servida. Las 24 ideas UX del Issue #76 conservan su owner para integrar después en **una sola** experiencia humana.

## Gate formal siguiente: autorización antes de promoción

**PRE**: test HTTP candidato en Actions GREEN (cumplido en SHA indicado), test V6 real y navegación/restauración móvil/back-forward y revisión independiente del delta/privacidad aún pendientes; consultar CI fresco y HEAD candidato al actuar. **No exigir que la candidata ya esté en Pages.**

**PROMOCIÓN**: sólo con autorización efectiva y controles PRE suficientes, merge no forzado sobre gh-pages fresco, sin borrar cambios concurrentes ni alterar V15; registrar commit y release Actions reales.

**POST**: abrir la URL pública con Chromium real DESPUÉS de su despliegue, cotejar bytes de index servido contra SHA GitHub de esa misma versión y verificar en DOM HOP5 + cinco proyectos + fechas AR + historial y fallos, activos responsivos. Si hay CDN atrasado, estado no verificado, sin afirmar release. Comprobar flujos de Issue #76 y que otros chats recuperan una tarea y respuesta pública auténtica. La pantalla final y G5 siguen pendientes.

**Siguiente relevo:** consultar `AGENT_ENTRY_V1.md`, `STATE_V1.json` último, PR #77 / Issue #76 y sus pruebas vivas; usar el CI GREEN de este hop, corregir los gates visuales/V6 reales que faltan, obtener autorización efectiva sólo si corresponde, luego verificar POST sin confundir candidato con servido. No abrir PR/UI/scheduler/brain paralelo.