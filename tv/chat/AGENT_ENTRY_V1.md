# Prometeo · Un mensaje por chat → página/TV/demo · entrada breve

**SOURCE, no instalación automática de ChatGPT.** Un nuevo chat con el conector GitHub autorizado puede leer ESTE archivo para resolver pedidos con un solo mensaje. La pantalla en la TV es `https://juanmanuelpm.github.io/prometeo/tv/chat/`.

## 0. Distinguir las tres intenciones
- **Rápido, mostrar**: `🔥tv calendario` o `🔥prometeo rápido mostrame la demo`. Sólo cambiar `gh-pages:tv/chat/state.json`, con SHA/lectura independiente. No tocar código del widget.
- **Generar escena pública de ideas**: `🔥tv ideas` con ideas explícitamente destinadas a exhibición. Editar `tv/chat/scene/scene.json` y apuntar `focus.path` a `/prometeo/tv/chat/scene/`. Jamás volcar mensajes privados completos a GitHub.
- **Desarrollar y demostrar**: `🔥prometeo modificá el calendario y mostrame una demo`. Cargar el owner `shared/calendar/v1` y `pages/calendar/`; aprobar cambio contra pruebas; usar `JuanManuelPM/Experimentos/demo-engine-v6` y su `UNIVERSAL_BUILD_DEMO_PROTOCOL_V1.md`. El lab V6 original NO valida por sí solo el widget real.

## 1. Micro-prefight obligatorio (NO arqueología)
1. Leer `gh-pages:tv/chat/state.json`, `tv/chat/DEMO_PROTOCOL_V1.md`, el HEAD fresco de `gh-pages` y, sólo si hay modificación real, owner/current/Design DNA correspondiente.
2. Si la orden es rápida, actualizar un único estado: `display.mode="page"` con `focus.path` existente bajo `/prometeo/`; o `display.mode="demo"` para el lab V6 original. Usar el mismo esquema `prometeo.tv-from-chat-state/v1`.
3. Comprobar que el JSON preserva `changes` previos, aumenta `revision` una sola vez, y agrega un recibo público compacto del cambio realizado. Escribir con GitHub CAS/revision; lectura independiente después. No esperar workers.
4. Reportar claramente SOURCE / GH-PAGES-ACTIONS / SERVED; no inventar tiempos. Refresco de TV cada 15 segundos, no garantía de actualización de Pages en ese plazo.

## 2. Qué hacer con tareas de estudio y notas
- Facultad: página existente `/prometeo/shared/study-system/` y páginas de `/prometeo/shared/study/`; preservar el módulo.
- Evento/calendario personal: Google Calendar autenticado del usuario cuando disponible; el calendario de Prometeo guarda en localStorage del navegador, NO hay sincronía automática. No incluir horarios privados en TV público.
- Notas personales: Google Drive privado conectado o almacenamiento local; no subir mensajes, audios, nombres de alumnos ni transcripciones a GitHub.

## 3. Registro y continuidad real
- GitHub público: sólo acción clasificada, ruta/widget público, cambios SHAs, resultado, evidencia, errores no sensibles y duración si se midió. No publicar tokens, datos personales o raw audio.
- Privado: cuerpo del mensaje, voz, notas y contexto personal viven en ChatGPT y/o un owner autenticado como Drive SI se guarda explícitamente con recibo. Esta demo aún no implementa subida privada automática.
- Otra conversación no hereda literalmente todas las charlas: obtiene la continuidad **persistida** por este contrato y sus owners. No inventar autonomía/background.

## 4. Archivos estrictamente suficientes
- `tv/chat/state.json`: escena y feed actual
- `tv/chat/DEMO_ADAPTER_V1.json`: fuente actual de Demo Engine V6
- `tv/chat/DEMO_PROTOCOL_V1.md`: dos rutas DEMO LAB versus DEMO PROBADA de widget
- `tv/chat/scene/scene.json`: lienzo de ideas públicas
- `tv/chat/ACTIVITY_PROTOCOL_V1.md`: evidencia y cronología
- `coordination/one-turn/v1/CHAT_INPUT_TV_OUTPUT_20261009.md` y PR #71: skill candidata y comando FIRE

## 5. No hacer
No crear cola/work graph/scheduler/Supabase ni sistema de input web. No rehacer Demo Engine; no cambiar V15/UI sin referencias. No hacer pasar la demo sintética por resultado funcional de calendario. Un mensaje por chat para acciones normales, sin `.` salvo preparación pedida.
