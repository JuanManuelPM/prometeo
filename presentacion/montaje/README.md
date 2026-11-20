# PROMETEO · SECUENCIA: montaje continuo V1

**Contrato**: en lugar de concatenar reproductores web, convertir `VideoRecipe` a un único MP4 H.264/AAC con montaje de fragmentos y tarjetas editoriales de menos de un segundo. Reproduce en un `<video>` HTML5 autónomo, **sin iframe de YouTube, controles, subtítulos de plataforma, anuncios insertados ni reacciones táctiles durante reproducción**. Un toque inicial `TOCÁ PARA VER` permite audio y reproducción de acuerdo con las políticas móviles; después el espectador solo mira.

## Implementación

- `scripts/presentacion/montaje/render.py`: renderizador Python+Pillow+ffmpeg con escala, recorte, normalización 30fps H.264/AAC y concat sin reencode, verificación ffprobe y recibo SHA256.
- `scripts/presentacion/montaje/demo.recipe.json`: montaje de 7 piezas con 3 fragmentos MP4 reales y 4 tarjetas de 0.7/1.0 s. Video fuente Big Buck Bunny ya alojado en `/presentacion/v2/media/`, de Blender Foundation (CC BY 3.0). No son noticias ni material de Hagamos Tendencia.
- `presentacion/montaje/index.html`: reproductor de película resultante, completamente pasivo después de un gesto inicial.
- `.github/workflows/secuencia-montaje-v1.yml`: construye en CI con fuentes existentes en la rama `gh-pages`, comprueba salida y publica una página candidata aislada `/presentacion/montaje/` y MP4 para compartir.

## Reutilización

El siguiente usuario podrá indicar fragmentos `file`, `start`, `end` sobre material disponible, y tarjetas `text`, `seconds` (0.25 a 3). **La transcripción es un origen posible de tiempos, no una dependencia**. Para otro vídeo se requiere el archivo multimedia en un lugar accesible al renderer; un enlace de YouTube NO es directamente un archivo de reproducción compatible. No se descarga automáticamente material de plataformas. No hay gasto de créditos de vidIQ.

## Calidad/evidencia

El renderer verifica dimensiones, audio AAC, video H.264, duración de cada tramo, duración total y SHA256. El ejemplo prueba continuidad de la película y del navegador; no demuestra que los cortes de una noticia real sean buenos ni se ha escuchado el audio en Android del usuario. Los fragmentos de Big Buck Bunny son materiales de prueba, no selección editorial que pueda atribuirse a una noticia.

Esta publicación NO reemplaza la presentación original `/presentacion/`, ni `/presentacion/cine/`, ni las pruebas de psicología. No altera otros espacios.
