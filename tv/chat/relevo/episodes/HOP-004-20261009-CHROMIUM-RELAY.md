# Prometeo · HOP 4 · Relevo real + Chromium local, NO Pages servido

**Registro UTC:** 2026-10-09T18:09:51.433Z · Argentina: 2026-10-09. **Prioridad:** persistencia, no juego. **Base:** HOP 1–3 recuperados de `gh-pages:tv/chat/relevo/STATE_V1.json` sin copiar transcripciones; lectura independiente del comentario revisor PR #77 y del Issue #76.

## Lo que cambió de verdad

- En el mismo PR #77 DRAFT (`feature/retomar-live-evidence-hop3-20261009`) se modificó **la pantalla que ya existía**, `tv/chat/relevo/retomar/index.html`, para leer y renderizar los eventos de `STATE_V1.json.history`: salto, fecha UTC convertida a `America/Argentina/Buenos_Aires`, resultado registrado, aprendizaje y vínculo sanitizado a su episodio original. No se agregó otra pantalla ni dueño de datos.
- Código del panel: commit `a7d53a6ae8926cb120fb7706d34fcc91207c3836`. Bug real detectado por inspección de Chromium: tras la comparación SHA, quedaba texto de carga «Cotejando respuesta HTTP». Un test adversarial dio **RED**. Corrección mínima en commit `f0fd45f302c75e59f796e0cc412fc8006ff0d722`: retirar mensaje obsoleto y atenuar CTA deshabilitado; tras ello **GREEN**.
- Fuente final observada del HTML candidato: blob `13a14e3f95bc41df6bbeed543d1c6f4de488677f`. Confirmación independiente de integridad del **script de la rama** frente al copiado de ensayo: longitud 13139 caracteres, rolling DJB2 XOR de caracteres JS `746389f8`, coincidentes. El HTML completo del ensayo se reconstruyó con marcado y CSS equivalentes, no una copia byte idéntica de la página completa.
- Prueba material de navegador **Chromium 144 real, DOM in-memory con red simulada**: 40/40 checks PASS sobre el script idéntico en vistas 360, 390, 844 y 1440px; cinco tarjetas; tres episodios; fechas AR; selección y ocultación de historial según proyecto; digest SHA-1 en coincidencia/diferencia sobre fixtures; no spinner residual; ausencia de overflow global/excepciones; HTTP GitHub simulado 403 → NO VERIFICADOS; STATE 503 → sin historial inventado. Comando local: `python /mnt/data/prometeo_hop4/test_dom_local.py`. Ensayo adicional portátil análogo 31/31 con `python /mnt/data/prometeo_hop4/retomar-browser-smoke-v1.py`.
- Se añadió prueba reproducible al PR, ruta `tv/chat/relevo/tests/retomar-browser-smoke-v1.py`, commit `5d57b0f6da1135e8fc1df8026ba9b4ca7dd61c26`, blob leído de nuevo `10669377f8483e323f90504f16c22432931af243`. La **versión exacta comprometida** de este test no se ejecutó desde un checkout con red; requiere verificación CI/checkout independiente. NO atribuirle los 40/40 del ensayo local hasta ejecutarla.
- PR #77 observado DRAFT/OPEN, HEAD `5d57b0f6da1135e8fc1df8026ba9b4ca7dd61c26` después de estos cambios, comparación vs gh-pages `ahead=4 behind=0`, **dos archivos** cambiados (HTML + prueba), sin merge ni publicación.

## Lo que explícitamente NO está verificado

- **NAVEGACIÓN HTTP/Page SERVED:** `web.run` no puede abrir `https://juanmanuelpm.github.io/prometeo/tv/chat/relevo/retomar/`; el contenedor falla DNS externo y Chromium rechaza navegación `http://127.0.0.1`, `file://`, `data:` con `net::ERR_BLOCKED_BY_ADMINISTRATOR`. La prueba utilizó `about:blank` + `page.set_content`, respuestas fetch controladas y digest SHA-1 determinista. Es **Chromium DOM real**, pero NO navegación ni bytes reales de Pages.
- **V6 real:** no se ejecutó Demo Engine V6 sobre la página servida/candidata bajo navegación HTTP. **CI:** no se demostró check verde de PR77. **G5 Issue #76:** ingreso web autenticado, cola y respuesta automática del executor NO IMPLEMENTADOS/NO ACREDITADOS. **G2/G3:** ningún resultado servido en pantalla pública ni concurrencia de dos chats separados se verificaron. No emitir release.
- La página actual en `gh-pages` usa el HTML antiguo: ningún commit de la rama PR #77 debe presentarse como versión SERVED. GitHub metadata y hash de fixture no confieren `SERVED_VERIFIED`.

## Aprendizaje reutilizable/falsadores

1. Recuperar estado de otro chat **sí** funcionó en el canal autenticado GitHub: entrada, prioridad, episodios HOP1–3, PR #77 y comentario del revisor fueron leídos sin transporte del humano. Otra cosa distinta es que el navegador anónimo recupere el owner y presente comportamiento funcional de una versión publicada.
2. `SHA(blob fuente) == SHA(bytes servidos)` sólo verifica un archivo. DOM, CSS, dependencias, API, permisos y errores se prueban aparte. Un SHA idéntico con interfaz rota refuta la idea «persistencia humana completada», aunque confirme continuidad de bytes.
3. El control visual identificó un falso estado «Cotejando» que 15 checks V8 anteriores no veían. Siempre incluir casos de **fin de carga**, **fallo visible**, **selección móvil**, **versión sin prueba**.
4. Ni la recencia de un juego ni el resultado de un test local cambia el objetivo estratégico. No grabar texto privado ni crear otro CURRENT.

## Controles del Issue #76

G0: owners recuperados, decisión única URL final todavía abierta entre retomar existente y composer V11 existente. G1: **parcial, DOM con mocks** y mobile checks, falta URL real/back-forward/visual servido. G2: **parcial** GitHub relevo frío + dueño fuente, no resultado público verificado en la pantalla publicada. G3: **pendiente** concurrencia y CAS multichat. G4: **parcial**, sin exposición de privados en este delta pero falta auditoría completa. G5: **NO IMPLEMENTADO/NO VERIFICADO**. G6: GitHub history recuperado y nuevo episodio pendiente de readback; continuidad operacional extrema no demostrada.

## Siguiente salto concreto

1. Ejecutar el test **comprometido** de PR77 en checkout/CI, corregir si falla; consultar CI fresco y review real. Mantener PR DRAFT.
2. Ejecutar Chromium con navegación real a Pages; probar 360/390/844, cinco proyectos, episodio HOP4 ya persistido, historia/back, 403, diferencias de SHA reales y fecha Argentina. Ejecutar Demo Engine V6 sobre esa **página real**, no sobre mocks.
3. Definir consolidación de **una sola UI final** con composer V11 según Issue #76 sin crear una pantalla ni un plano de control extra. Pedidos privados requieren auth/ACK real; no suponer que GitHub Pages inicia ChatGPT.
4. Sólo con los gates de privacidad, DOM real/V6, CI y Served adecuados considerar promoción del PR77; repetir URL después de deploy. Registrar HEAD exacto y siguiente episodio. El test adversarial de lenguaje natural de HOP2 sigue pendiente, sin desplazar estos bloqueos.

**Estado de HOP4:** fuente y mejora candidata reales; **NO RELEASE**. No fusionar ni publicar por mera continuidad documental.
