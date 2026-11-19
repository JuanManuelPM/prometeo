# PROMETEO · SECUENCIA 01

Presentación cinematográfica HTML sin editor visible. Una sola pantalla horizontal, dos flechas; escenas de tipografía/diagrama y recortes de YouTube que avanzan automáticamente.

## Presentación publicada

`https://juanmanuelpm.github.io/prometeo/presentacion/`

## Receta

En el `<script>` final de `index.html`, editar el arreglo `recipe`: `youtube` acepta `videoId`, `start` y `end` en segundos del video original; `durationMs` controla el avance automático de las slides de texto. `cover` se conserva hasta la primera pulsación para evitar el bloqueo de reproducción móvil. Los clips se cortan con `loadVideoById({startSeconds,endSeconds})`, evento `ENDED` y un reloj de comprobación de 90 ms.

Flechas y teclado izquierdo/derecho funcionan siempre. Deslizar horizontalmente también navega. Primer gesto: intento de pantalla completa y bloqueo de orientación horizontal. Si el navegador no permite `screen.orientation.lock`, CSS presenta el lienzo horizontal rotado en móviles verticales. Ninguna web puede garantizar pantalla completa sin intervención ni forzar audio de YouTube cuando el navegador bloquea autoplay. En ese caso el reproductor reintenta en silencio y permite recuperar sonido con un nuevo gesto en una flecha. No se descarga ni reedita el video de terceros.

## Video demostrativo

`aqz-KE-bpKQ`: *Big Buck Bunny*, © Blender Foundation, distribuido como Creative Commons Attribution 3.0. En este ejemplo se incrusta por YouTube, sin distribuir copias. Las secuencias de muestra son 01:05–01:17, 02:22–02:33 y 03:40–03:50. El sitio depende de la disponibilidad de YouTube, conexión a internet y permisos de inserción.

## Verificación

Ejecutar `python -m pytest tests/test_presentation.py -q` con Playwright y Chromium disponibles. Las pruebas se conservan en `tests/test_presentation.py`. La prueba simula la API de YouTube y no presupone que el navegador pueda acceder a la web de YouTube. No se confunde el test de lógica con reproducción remota realmente validada.

## Límite del producto

Esto es un reproductor-presentación web, no un MP4 exportado, un editor de video ni una prueba de audio real en YouTube. Un cambio de receta exige nueva publicación estática. No modifica los proyectos 3D ni el control general de PROMETEO.
