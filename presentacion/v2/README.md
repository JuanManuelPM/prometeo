# PROMETEO · SECUENCIA V2

Reproductor web programado en HTML, CSS y JavaScript con clips MP4 alojados por PROMETEO. La página muestra siete diapositivas y únicamente dos flechas horizontales. No hay API de YouTube, iframe, Canva ni librerías externas en tiempo de reproducción.

Página candidata: https://juanmanuelpm.github.io/prometeo/presentacion/v2/

La receta `recipe` en `index.html` determina el orden de escenas. Los videos están recortados por GitHub Actions desde una fuente oficial CC BY 3.0 y se sirven bajo `media/clip-01.mp4`, etc. `media/manifest.json` proporciona hashes, tramos y metadatos de QA.

Diseño visual intacto respecto de la ruta antigua. El primer toque intenta pantalla completa y horizontal, sujeto a restricciones del navegador; la reproducción con sonido puede quedar muteada tras un bloqueo de autoplay. La ruta anterior `/presentacion/` se preserva hasta QA del nuevo producto.
