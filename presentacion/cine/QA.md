# PROMETEO · CINE V1 · QA y límites reales

## Lo que demuestra

Navegación por `pointerup` y flechas de una presentación con video HTML5 nativo, sin iframe ni reproductor YouTube. La arquitectura **no recibe publicidad, título, controles ni subtítulos del reproductor YouTube** porque nunca lo carga. La opción `controls` está ausente en `<video>`, `pointer-events:none` hace que los toques pertenezcan al editor.

## QA ejecutada en Chromium 144 con medios H.264/AAC sintéticos reales

- PASS 390×844, 844×390 y 1280×720: arranque mediante gesto y reproducción efectiva `playing()` en elemento de video nativo.
- PASS `object-fit:contain` y video sin controles o iframes.
- PASS avance automático al terminar el intervalo y tarjetas intermedias de 1000 ms.
- PASS navegar adelante y atrás reinicia el fragmento desde el comienzo.
- PASS dos flechas presentes, contenido sin iframe, controles de video desactivados.
- PASS modo privado solicita archivo personal sin cargar YouTube.

En la ejecución local, `test_cine.py` generó y reprodujo un MP4 H.264/AAC de 2 s en Playwright sobre Chromium. Solo prueban la **capacidad del motor**. El código del test carga medios sintéticos y no reproduce la entrevista de Chris Williamson ni audita sus cortes.

## Fuentes reales existentes

El demo web referencia tres MP4 ya servidos en `presentacion/v2/media`, cuyo `manifest.json` GitHub contiene SHA256/duración. No se descargaron ni reprodujeron esos MP4 de la web pública durante esta sesión, por limitación de red del contenedor.

## Funcionalidades no resueltas

- Automatizar el paso YouTube URL -> extracción personal -> navegador privado en un solo clic: **NOT_IMPLEMENTED**.
- Reproducción real en Android del usuario: **NOT_RUN**.
- Verificación por escucha de los cortes exactos de psicología masculina: **NOT_RUN**.
- YouTube sin publicidad desde el iframe: **IMPOSSIBLE TO GUARANTEE** con parámetros de API oficiales. `controls=0` no quita anuncios ni toda la información superpuesta.

## Política de persistencia

No se publican ni se transmiten a GitHub los archivos privados que el usuario selecciona. La fuente queda en un Blob URL de navegador hasta cerrar la página; no se persiste en un servidor. Los MP4 de la demo provienen de Big Buck Bunny con atribución de la fuente y sus cambios publicados en `presentacion/v2/ATTRIBUTION.md`.

## Regresión

Este candidato se publica en `presentacion/cine/`, no reemplaza `presentacion/` ni `presentacion/ejemplos/psicologia-masculina-v2/`.