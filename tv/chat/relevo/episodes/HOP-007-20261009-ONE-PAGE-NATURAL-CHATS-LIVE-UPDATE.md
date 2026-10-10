# HOP 7 · Una página de resultados, chats nuevos libres

**Alcance:** mejora material del flujo humano existente. El usuario mira siempre la misma ruta pública, abre cualquier chat del Proyecto para dar una orden oral transcripta, preguntar estado o conversar sobre otra cosa. No necesita transportar un prompt, la respuesta anterior ni la evidencia manualmente.

## Resultado técnico verificado
- PR #82 fusionado al `gh-pages` en `ad532079fea6d12b3932a362c9c9254e7adbf383`, sobre la URL existente `/prometeo/tv/chat/relevo/retomar/`. Sin nueva pantalla, worker, scheduler, backend ni base de datos.
- `tv/chat/AGENT_ENTRY_V1.md` contiene ahora distinción explícita **ORDEN / PREGUNTA DE ESTADO / CONVERSACIÓN / ¿QUÉ SIGUE?**. Un texto dictado o transcripto no requiere símbolos especiales. Esta regla es SOURCE que chats nuevos pueden recuperar, **no instalación de código dentro de ChatGPT ni garantía de obediencia fuera de instrucciones del Proyecto**.
- La pantalla consulta `STATE_V1.json` público cada 60 segundos con pestaña visible y al recuperar foco; reconsulta los commits públicos con límite de 15 minutos, para evitar abuso de GitHub API. Mantiene el último feed ante fallo de red, etiquetando la actualización como no comprobable. La carrera entre lecturas se protege contra degradación de HOP ya visto.
- Pruebas exactas: [Actions run 38018982864](https://github.com/JuanManuelPM/prometeo/actions/runs/38018982864), `SUCCESS` 3/3 jobs. Chromium móvil/desktop (360,390,430,844,1440), navegación, arte, 403, historial público HOP6, prueba de **evento futuro FICTICIO sólo en test** recibido en la misma pestaña por evento de foco, y desconexión preservando último registro. No existe evidencia de un mensaje real externo automático para ese evento ficticio.
- [Pages deploy 38019144023](https://github.com/JuanManuelPM/prometeo/actions/runs/38019144023) `SUCCESS`, `gh-pages` HTML blob `2d0e150e06f6d8a1f249f61cf4424251b86b332e`. Post-deploy HTTP+SHA+Chromium [Actions 38018982864 attempt 2](https://github.com/JuanManuelPM/prometeo/actions/runs/38018982864): 200, blob Pages servido igual a `2d0e150e06f6d8a1f249f61cf4424251b86b332e`, 3 portadas cargadas y feed de seis relevos.

## No declarar resuelto
Un nuevo chat sólo recupera lo realmente escrito en los owners; no hereda automáticamente transcripciones privadas, memoria completa ni se despierta solo. Si el usuario sale del chat, la herramienta no garantiza continuación en background. Para que el pedido aparezca como resultado en la página, el chat que lo ejecuta tiene que finalizar la tarea y escribir un recibo público adecuado, sin datos privados. Una pregunta o charla sin cambio material NO debe producir commit público automáticamente. No existe aún ingreso/compositor web autenticado G5, notificaciones push ni feed privado de mensajes por chat.

## Falsadores y siguiente avance funcional
1. Un chat nuevo sin `🔥` pregunta «¿cómo viene persistencia?» → debe consultar estado real y contestar, sin abrir PR ni activar tarea.
2. Un chat nuevo recibe voz transcripta «Facultad: cambiá Piaget» → actuar sobre owner específico, pruebas, publicación y recibo sanitizado; la página abierta debe enterarse sin recarga manual.
3. Mensaje ajeno al proyecto o una conversación no imperativa → no fabricar trabajo para reflejar actividad.
4. El próximo salto debe ensayar 1 y 2 con **chats efectivamente distintos**, no sólo fixture Playwright; G5 real autenticado sólo si hay owner/permisos verificables. `Issue #76` sigue como owner, sin duplicar control plane.
