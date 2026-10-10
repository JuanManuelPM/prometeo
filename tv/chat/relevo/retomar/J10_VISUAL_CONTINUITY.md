# J10 · Archivo nocturno · continuidad visual V1

Estado: **INTEGRADO Y SERVIDO**: PR #97 fusionado en `gh-pages` en commit `36e98d83dc0e8a39824270d2ef4741b6c3807ea0` (10/10/2026 Argentina). Prueba externa real confirmada en PR #99, run `38095992283`, job `114341883636`. Alcance: `tv/chat/relevo/retomar/`, misma pantalla de Prometeo, misma fuente pública `reentrada.json`. No nueva app, registro, worker ni cambios en `main`.

## Inspección previa de otros chats artísticos (2026-10-10, Argentina)

- PR #88: `Archivo Habitado`, escena raster auténtica 1-bit 256×171, tres direcciones documentadas; permanece **DRAFT, NO merged, NO aprobada**. El expediente fue publicado por PR #89, no el rediseño.
- PR #89: **merged**; proyecta investigación, arte 1-bit, decisiones/alternativas, fechas y límites en la pantalla existente.
- PR #91, #92, #93, #95: **merged**. Pantalla oscura real, texto y proyectos grandes, fechas argentinas, verificación de títulos completos y Page bytes. Priorizar esta línea de trabajo, no pisarla.
- El contrato de `visuals/VISUAL_PROTOCOL_V1.md` y sus comentarios rechazan las figuras SVG geométricas y portadas proceduralmente simuladas. No se restauraron.

## Entrega de este candidato

- Nueva ilustración de biblioteca nocturna real como asset raster original. La imagen final comprimida está versionada en `art/j10-atlas-384.webp.b64` (384×256, WebP decodificable; archivo base64 en GitHub Pages).
- Verificación independiente de bytes: blob Git **d2eec4e15a470c6bb9f340b80bfbc5596565d101** coincide con el texto codificado original de 11.512 caracteres; WebP original comprimido SHA256 **2702a173359081dd83293cddd2e60aea93ccf5d1c6de64c6b4a21ce8dfbb4117**. Arte generado exclusivamente para esta candidata; los 1536×1024 fuente no están versionados en el repo.
- En móvil (360–720px), la escena ocupa la portada del proyecto **Persistencia**; no agrega 450px antes de Actividad. Un gran proyecto por deslizamiento, feed debajo.
- En escritorio y tablet ancha, la imagen y explicación editorial comparten la cabecera. Cuando el archivo falta o no decodifica se conserva el raster público PR88 o el diseño tipográfico, sin inventar arte ni estados.
- Separación estricta: `j10-editorial.css` sólo visual; `index.html` integra el arte sin modificar datos, propietarios, enlaces, fechas, comprobación de bytes, historial, portadas restantes, proyectos, feed, timer ni navegación.
- Lectura contrastada: `#e0e0df` sobre `#151619` = 13,70:1, acento `#f1c48b` sobre `#151619` = 11,21:1 (WCAG AA superado por amplio margen). Sin gradientes, tramas SVG o geometría decorativa.

## Pruebas / controles

- GitHub Actions **38095426673**: Chromium de integración **PASS 45** (HTTP localhost 360/390/430/480/844/1440, fuente real HOP8, Firefox NO probado). Capturas en artefacto `integrated-visual-candidate` id **11685353408**. Datos GitHub 403, back/forward, offline, actividad ordenada, fechas AR, WebP 384×256 decodificado, pantalla oscura y sin overflow durante la navegación principal. No confundir con Pages servido.
- Un test HTTP heredado falló al intentar usar `j10-editorial.css` como `text/plain`; el navegador no lo aplicaba, y el `<img>` de la cabecera invisible visualmente se salía del ancho. Se corrigió el **MIME del servidor de tests** a `text/css`, sin ocultar el problema con `overflow-x:hidden`. La suite completa debe volver a estar VERDE antes de fusionar.
- Gates todavía necesarios: CI final verde en todos los jobs, capturas aprobadas sin pérdida de funcionalidad, comprobación fresca de `gh-pages` para cambios concurrentes y **verificación Pages HTTP/bytes después de merge**. No confundir merge con publicación.

## Publicación real comprobada (2026-10-10T23:43:52Z; 20:43 Argentina)

Prueba independiente `tv/chat/relevo/tests/j10-pages-readback-v1.mjs` sobre GitHub Actions **run 38095992283** (job `114341883636`, SUCCESS) descargó directamente desde `https://juanmanuelpm.github.io/prometeo/tv/chat/relevo/retomar/`:

- `index.html`: HTTP 200, hash SHA256 de bytes HTTP **idéntico** al archivo Git `gh-pages`; resultado `c7051fe81d0c9f943ac337b32703b25c43e1b34bcda0e647cb2a14cf1591ad46`.
- `j10-editorial.css`: HTTP 200, hash SHA256 exacto.
- `art/j10-atlas-384.webp.b64`: HTTP 200, hash SHA256 exacto (imagen original incluida en sitio, no enlace de terceros).
- Chromium **real remoto** a 390 px: WebP decodificada 384px; portada visible, escena editorial no desplaza actividad; `activity.top=649.5px`, overflow horizontal **false**.
- Chromium **real remoto** a 1440 px: escena en cabecera; `activity.top=1199.2px`, overflow horizontal **false**.
- Resultado persistido en artefacto de GitHub Actions `artifacts/retomar-pr77-http/j10-pages-result.json`, más dos capturas reales (`j10-pages-390.png`, `j10-pages-1440.png`).

En la misma corrida falló únicamente el test **heredado** `retomar-public-baseline-v1.mjs`: exigía una sola imagen cuando J10 agrega legítimamente la segunda. Se corrigió en PR #99 para proteger **ambos raster originales** PR88 256×171 + J10 384×256; la reejecución completa debe ser verde antes de fusionar ese test de regresión. No es falla de bytes servidos ni de navegación en sitio.

## Conservación y rollback

Cambios en sólo: `retomar/index.html`, `retomar/j10-editorial.css`, `retomar/art/j10-atlas-384.webp.b64`, `tests/retomar-integrated-ux-v1.cjs`, `tests/retomar-http-smoke-v1.mjs` y esta nota. Se reemplaza solo el CSS/HTML de J10, sin volver atrás PR #89–95 ni tocar rediseño PR #88.

Fuente canónica J10: https://github.com/JuanManuelPM/prometeo/pull/97
