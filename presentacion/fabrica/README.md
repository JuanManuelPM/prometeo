# SECUENCIA · FÁBRICA AUDIOVISUAL
Estado: V1 candidata aislada, 2026-11-19. Responsable: PROMETEO · Estudio Audiovisual.

## Qué se preserva
La página aceptada en /presentacion/ no se modifica. El ejemplo nuevo ocupa /presentacion/fabrica/ejemplos/masculinidad/. Conserva exactamente la familia visual de SECUENCIA: colores papel/negro/salvia, sistema tipográfico editorial, dos flechas laterales, escenario horizontal y reproducción completa sin controles propios. El visor del FLUJO es un producto separado.

## Entrada humana mínima
Un chat recibe el enlace, título, nombre del canal o tema. La IA identifica un video inequívoco y obtiene **transcripción con tiempos**, lee su contenido, elige 2–3 momentos con evidencia, redacta transiciones, genera una receta JSON y publica una página.

## Límites legales y de transporte
- Video de terceros: usar únicamente el embed oficial de YouTube, con startSeconds y endSeconds. No almacenar copias no autorizadas en Github. Los vídeos pueden bloquear embedding o autoplay y la API conserva branding/avisos propios.
- Videos propios o autorizados, con licencia verificable: generar fragmentos MP4 y alojarlos de forma nativa como V2, acompañados de licencia y hash.
- La transcripción no constituye por sí sola permiso para redistribuir el video. No confiar en la etiqueta "Creative Commons" sin evidencia.
- Si una búsqueda devuelve varios homónimos, una transcripción no está temporizada o no puede verificarse, detener la selección. Nunca inventar segundos para dar una ilusión de autonomía.

## Artefactos
- FLOW_INDEX.json + versions/1.0.0/flow.json = contrato durable versionado.
- FLOW.md = mapa mermaid legible + decisiones y rutas.
- index.html = visor visual interactivo de las etapas y las ramas.
- engine.mjs = selección determinista sobre cues reales.
- ingest.py = intento reproducible de capturar metadatos y subtítulos, sin descargar material ajeno.
- compile.mjs = transformar transcripción con tiempos en una receta candidata.
- tests/engine.test.mjs = tests falsables.
- ejemplos/masculinidad/ = demostración con fuente identificada y tiempos recuperados desde interfaz de YouTube.

## Operación por chat
1. Recuperar FLOW_INDEX y esta guía.
2. Resolver URL o buscar por título/canal, verificar identidad/autor.
3. Obtener subtítulos de YouTube a través del navegador, yt-dlp o transcript-api. En el caso de un canal que no exponga VTT, un navegador con acceso a «Mostrar transcripción» puede recuperar cues; documentar el método.
4. Validar offsets y no solapamiento; comparar frases contra el video.
5. Extraer temas, conservar segmento previo/posterior para evitar tergiversación, seleccionar momentos que sostengan las slides.
6. Escribir una receta versionada y compilar presentación usando los tokens visuales aceptados.
7. Probar en Chromium, Android cuando esté disponible, verificar GitHub readback y marcar estados por prueba.

## Estados que no deben confundirse
SOURCE_FOUND != TIMED_TRANSCRIPT_VERIFIED != RECIPE_BUILT != HTML_TESTED != PLAYER_LIVE_TESTED != SERVED.
