# SECUENCIA · Entrada de video + transcripción → montaje nativo

**Estado:** pipeline preparado; pruebas locales y GitHub Actions PASS con MP4 real. **La captura directa YouTube en GitHub Actions falló (HTTP 429)** el 20/11/2026; no confundir ese diagnóstico con la reproducción del MP4 que sí funciona. No confundir captura de medios con selección editorial ni con alineación exacta de palabras.

## Interfaz de trabajo: el próximo mensaje del usuario

El usuario puede suministrar solamente un enlace y una transcripción temporizada, o directamente una lista de cortes. No consumimos vidIQ. El chat analiza la transcripción, elige entre 2 y 6 tramos con ideas completas, decide textos puente de 0,5–1,0 segundos y escribe un trabajo `prometeo.secuencia/youtube-job-v1`.

No hace falta instalar una aplicación ni copiar los subtítulos otra vez. Entradas admitidas:

- YouTube `https://www.youtube.com/watch?v=<ID>` o `https://youtu.be/<ID>`, un solo video.
- Transcripción opcional `[0:30] frase…`, `[1:03:32] frase…`, SubRip (.srt) o WebVTT (.vtt), leída desde archivo cuando sea necesaria.
- Para cada corte: `start`/`end` numéricos **o** `startQuote`/`endQuote` exactas encontradas en la transcripción.
- Campos `startQuote`/`endQuote` pueden acompañar tiempos numéricos para comprobar su procedencia, pero no se los toma como prueba de precisión de audio.
- `source.localFile` permite trabajar con medios propios sin depender de servicios externos. Si está presente, siempre se prioriza.

## Arquitectura

1. `youtube_job.py` valida URL, frases, intervalos y textos. Si solo tiene citas, estima tiempos dentro de bloques de transcripción de manera proporcional y deja `ESTIMATED_FROM_CAPTION_BLOCK`. No inventa alineación por palabra.
2. `youtube_capture.py` intenta conseguir **solo** los tramos pedidos con `yt-dlp --download-sections` y `--force-keyframes-at-cuts`, ffmpeg y un runtime JavaScript. Nunca reproduce un iframe.
3. Reutiliza `render.py`: normaliza los medios a 1280×720 / H264 / AAC / 30 fps, inserta pantallas de texto y produce **un único MP4** con hash de recibo.
4. Reproductor HTML5 `index.html`: solo un gesto para comenzar el audio; no permite que los toques pausen, adelanten o revelen una interfaz de YouTube.
5. Validación con ffprobe, inspección audiovisual y `receipts`. Repetir el corte específico si no empieza/termina en un límite inteligible; los timestamps de subtítulos no garantizan exactitud fonética.

## Publicación y privacidad

La ruta candidata para MP4 no reemplaza `/presentacion/`, `/presentacion/cine/` ni `/presentacion/montaje/`. El workflow crea artefactos de Actions por defecto. Para el próximo video, el chat coloca el trabajo seleccionado en `presentacion/montaje/youtube/jobs/ACTIVE.json`: ese commit dispara el pipeline automáticamente en GitHub Actions, sin intervención manual en el sitio. **Publicación en GitHub Pages es opcional y requiere `publish: true` junto con `slug` único en el trabajo**, que el chat debe configurar únicamente cuando el usuario pida compartirlo públicamente. El publicador se niega a sobrescribir una producción anterior. El texto completo de las transcripciones no se publica automáticamente. GitHub Actions en un repo público no es un almacén privado: para material personal hay que usar un repositorio privado cuya configuración permita acciones, o ejecutarlo localmente.

## Límites comprobables

- No se garantiza extracción de *cualquier* video: YouTube puede exigir autenticación/tokens o bloquear IPs de GitHub Actions; NewPipe tampoco hace desaparecer ese riesgo. El script debe fallar con diagnóstico y conservar la receta.
- No descarga dos horas necesariamente: intenta descargar solo los segundos seleccionados. Pero algunos streams obligan a descargar más datos, y los encabezados/segmentos pueden no ser accesibles.
- Los archivos capturados son derivados de la fuente; para uso personal no se presume automáticamente permiso para alojamiento público.
- El reproductor nativo no inserta anuncios ni controles de YouTube porque trabaja con un MP4. Si la captura falla, no reemplaza silenciosamente con un iframe de YouTube.
- Una transcripción por bloques es evidencia de contenido, **no** una pista de alineación de audio. Precisión final = escucha/verificación de los fotogramas de corte.

## Pruebas

`python -m unittest discover -s tests -p test_youtube_job.py -v` valida parsing, URL, selección, errores, render con MP4 H.264/AAC real, audio y ausencia de iframe. El smoke de CI usa el material libre ya alojado en el repositorio, sin consumir créditos y sin volver a publicar los medios de prueba.

## Recibo esperado por entrega

`SOURCE_RESOLVED`, `TIMELINE_VALIDATED`, `MEDIA_CAPTURED`, `MP4_RENDERED`, `TRANSITIONS_VERIFIED`, `AUDIO_BOUNDARY_QA` y `PUBLIC_SERVED`. Marcar cada uno como `PASS`, `FAIL` o `NOT_RUN`, nunca deducir la calidad editorial de un `ffprobe` correcto.

## Fuente alternativa vidIQ sin créditos

El 20/11/2026 se verificó mediante el conector `vidiq_video_upload` una importación desde el video de prueba de Big Buck Bunny a MP4 temporal, con costo **0 créditos** y estado `ready`. Es una segunda vía concreta para obtener medios. El conector devuelve un enlace firmado que caduca; **no almacenarlo en GitHub**. El script `youtube_capture.py` acepta un enlace firmado de ese mismo tipo desde la variable de entorno `PROMETEO_SIGNED_MEDIA_URL`, descarga tramos con ffmpeg y nunca vuelca la URL a los recibos. **Pendiente de probarlo contra el runner en una producción real.** Si el video no es importable (tamaño, formato, restricciones), se utiliza la ruta normal `yt-dlp` o una fuente local.

## Comprobaciones reales posteriores a la publicación inicial (20/11/2026)

GitHub Actions run [44785829020](https://github.com/JuanManuelPM/prometeo/actions/runs/44785829020): **SUCCESS**. Nueve tests en runner y MP4 continuo de **5.921 segundos**, 5 segmentos, audio AAC y video H264. Artefacto `prometeo-secuencia-technical-candidate`, recibo SHA256 publicado dentro del ZIP de Actions. El **transporte remoto de YouTube** se probó con `aqz-KE-bpKQ` y falló con `HTTP 429 Too Many Requests` desde la IP de GitHub. La ejecución terminó en SUCCESS porque el probe de transporte era no bloqueante, no porque YouTube funcionara. El intento se activará ahora solo bajo `workflow_dispatch probe_youtube=true` para evitar reintentos innecesarios.

La alternativa vidIQ de **importación de MP4 desde URL** sí produjo `status=ready` con costo 0. Para editar/componer dentro de vidIQ se cobra por operación; no ejecutar esas funciones sin aprobación del gasto. El script permite recibir un MP4 firmado en una variable de entorno, pero la transferencia automática de ese URL privado a GitHub Actions **no está implementada**. Mantener esa frontera explícita.
