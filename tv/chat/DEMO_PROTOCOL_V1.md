# Pantalla TV + Demo Engine V6 · Protocolo operativo para nuevos chats

## La demo recuperada, no inventada
Autoridad original: `JuanManuelPM/Experimentos` en `gh-pages`. `demo-engine-v6/CURRENT.json` indica `DEMO_ENGINE_V6 / PUBLIC_CURRENT`; el laboratorio `demo-engine-window-lab-v3/` está catalogado `PUBLIC_EXPERIMENT`. Se usa directamente como módulo externo de **misma procedencia y versión** dentro de `/prometeo/tv/chat/`; no se copia ni se reemplaza por una simulación casera.

Contrato principal: https://juanmanuelpm.github.io/Experimentos/demo-engine-v6/UNIVERSAL_BUILD_DEMO_PROTOCOL_V1.md

## Órdenes rápidas de un solo mensaje
- `🔥 prometeo rápido: poné el calendario en la tele`: acción mínima sobre `gh-pages:tv/chat/state.json`, `display.mode="page"`, `focus.path="/prometeo/pages/calendar/"`, sin workers.
- `🔥 prometeo rápido: mostrame la demo V6`: `display.mode="demo"`; original `/Experimentos/demo-engine-window-lab-v3/` es la **única** demo permitida por el visor actual. `demo.autoplay=true` desencadena DEMO del laboratorio al cargar si same-origin.
- `🔥 prometeo mostrame el material de Psicología Evolutiva`: resolver ruta **real existente** dentro de `/prometeo/`, verificar que sea pública; cambiar `focus.path` sin inventar páginas ni datos de un alumno.
- `🔥 prometeo arreglá el widget calendario y mostrame una demo`: no basta con cambiar JSON. Recuperar `shared/calendar/v1`, `pages/calendar`, Current/Design DNA; definir mapa FEATURE→PROOF, modificar código local, verificar, inspeccionar manifest real, compilar la receta semántica Demo Engine V6, probar y publicar sólo si hay autoridad y los gates pasan. Si todavía no hay demostración real de ese widget, marcar `DEMO_NOT_VERIFIED`, mostrar solo página publicada y link a laboratorio genérico por separado.

## Multi-chat y concurrencia
1. Leer `tv/chat/state.json` y HEAD fresco de `gh-pages`. Verificar `revision` y OWNER.
2. Cambiar solamente `display` y `focus` para un cambio rápido de escena, sin editar `ui-workspace-v1/current.json`, `tv/ai/` ni el calendario.
3. Publicar **una** revisión con commit CAS: si el HEAD cambió por otro chat, refrescar, fusionar conservando cambios y reintentar sólo contra la versión leída. Ningún chat debe sobrescribir la escena de otro a ciegas.
4. Guardar un evento público mínimo con `id`, `date`, `status`, `kind`, `title`, `commit`/URL verificable, `duration_ms` sólo si medido. Hasta 20 eventos recientes en el state; no guardar transcript, voz, fecha de clase privada, tokens, nombres de alumnos ni rutas de Google Drive privado.
5. Verificar el JSON por lectura independiente. Dejar que GitHub Pages despliegue el commit y renderice la revisión. No afirmar TV ACTUALIZADA sólo porque el estado de GitHub cambió; hay demora CDN y el navegador puede estar cerrado.

## Privacidad y auditoría
GitHub Pages es público. **NO** persistir el mensaje bruto/audio/facultad/agenda de la persona en `tv/chat/state.json`. La entrada original está en ChatGPT. Para auditoría privada entre chats, usar Google Drive/Calendar autenticado si existe owner y acceso, con recibo de escritura independiente; esta integración no hace la sincronización privada automáticamente.

Observabilidad profunda queda oculta por defecto. En registro público únicamente artefactos/estados verificables; tiempo por operación sólo si se midió realmente. Un chat NO queda vivo tras terminar, no hay monitor ejecutor/worker asociado a esta TV. Los 15s son la frecuencia de consulta del archivo, no un tiempo prometido para la publicación.

## Modo demo versus prueba de producto
**DEMO LAB:** six chapters ilustran capacidad del motor reutilizado. Es simulación etiquetada, no evidencia de que calendario o facultad cumplan una tarea.

**DEMO DE UNA PÁGINA:** receta semántica compilada contra targets `data-demo-id` de la página real + FUNCIONAL_REPORT PASS + DEMO_REPORT PASS + LOCAL_ACCEPTANCE READY_TO_PUBLISH + prueba de URL publicada. Sólo entonces la TV puede anunciar `VERIFIED_DEMO`.

## Límite de activación en nuevo chat
Archivos de GitHub no se autoinstalan como Project instructions. El nuevo chat debe tener habilitado el conector GitHub y un bootstrap que reconozca `🔥` y lea este owner. El estado de la tele sí es autónomo para **mostrar** una actualización ya publicada; no ejecuta instrucciones.
