# Validación Fase 2 · Embeds

Chromium local: 48/48 pruebas superadas en escritorio 1365 px y móvil 360 px. Se probaron funciones locales, exportación/importación, validación de URLs y ausencia de errores de JavaScript.

También se probó el arranque de las tres experiencias en un iframe aislado sin allow-same-origin. En Hemeroteca se comprobaron edición de título y vaciado sin diálogos nativos.

**Límite:** este entorno bloquea conexión a servidores externos. No se verificó respuesta real de GeoGebra, diagrams.net, YouTube ni Vimeo. Sus integraciones usan URLs o SDK oficiales y exponen estados honestos, pero sus capacidades remotas están pendientes de prueba de navegador conectado. No considerar iframe.onload como prueba de funcionamiento.

El atlas técnico anterior se conserva intacto.
