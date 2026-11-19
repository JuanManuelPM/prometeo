# CONTRATO PARA IA · PROMETEO AV TRANSCRIPT-TO-DECK 1.0.0

## Prompt mínimo
"Convertí este link/título/canal en una SECUENCIA audiovisual y publicala". No pedir a la persona que copie transcripciones.

## Flujograma operativo (la autoridad es JSON)
Leé FLOW_INDEX.json, seguilo hasta versions/1.0.0/flow.json. Para cada nodo conservá:
- ID exacto, entrada/fuente, resultado, evidencia y bifurcación tomada.
- Estados explícitos PASS / FAIL / NOT_RUN; no inferir permisos de descarga del hecho de poder reproducir YouTube.
- Guardá URL fuente y offsets exactos; una transcripción sin timestamps NO sirve para cortes.

## Adaptadores de fuentes
1. URL de YouTube: extraer el ID sin ambigüedad y verificar título/canal.
2. Título/canal: buscar candidatos, elegir solo si coincidencia inequívoca. Canal sin video, pedir precisar el título o permitir selección curada por agente cuando hay una instrucción de tema concreta; guardar evidencia.
3. Primer intento de subtítulos: youtube-transcript-api y yt-dlp --skip-download --write-subs. Si falla, browser automation en la página oficial: botón Show transcript/Mostrar transcripción; leer su lista de timestamps y textos, guardando proveedor, fecha, ID y evidencia.
4. Cuando no hay captions y se cuenta con media propia o legalmente licenciada, usar un ASR local/controlado como opción; verificar precisión de tiempo antes de elegir cortes.
5. Si solo hay texto plano, no fabricar tiempos: marcar NO_TIMED_TRANSCRIPT; usar fuente diferente o reportar bloqueo.

## Selección editorial
La IA lee de principio a fin (o un mapa de segmentos suficiente), identifica 2–4 argumentos, selecciona fragmentos fieles al contenido (ideal 8–30 segundos) con contexto necesario y diversidad. Las slides preceden el fragmento correspondiente y explican qué se va a mostrar; nunca atribuir nuestras frases al invitado. Textos cortos: título / verbo / giro. Sin decoraciones ni instrucciones en el reproductor. La heurística de engine.mjs produce candidatos, no avala la pertinencia semántica ni derechos.

## Reglas de reproducción
- Reingresar a un fragmento debe reiniciar desde sourceStart. Salir debe detener audio y video. Al llegar a sourceEnd, avanzar solo.
- Solo dos botones flecha izquierda/derecha. No controles en el video ni menús ni explicaciones.
- Si el browser bloquea audio/autoplay, fallback mute documentado; evitar poner PLAY adicional.
- El motor debe poder usar player nativo para material propio y IFrame API para vídeo ajeno; no convertir material ajeno a MP4 bajo un supuesto permiso.

## Calidad y publicación
Tests: FLOW_GRAPH, TIMED_CUES, RECIPE, DESCRIPTIVE_TRUTH, LICENSE_GATE, VISUAL_DNA, TWO_ARROWS, VIDEO_SEGMENT_START, SEGMENT_END, REENTER_RESTART, LEAVE_STOP, TIMER, BUFFERING, OFFLINE_FALLBACK, SERVED_READBACK.
No promover la nueva fábrica a reemplazo de /presentacion/. Sólo producir subrutas aisladas. Para un video nuevo generar con la request JSON disparada por push a main o workflow_dispatch, aplicar pruebas, revisar la pieza visualmente y registrar receipt exacto.
Si GitHub Actions no puede acceder al transcript, el chat puede recuperar tiempos mediante un navegador conectado y escribir una receta con esos offsets; no hay necesidad de que el humano copie/pegue la transcripción.
