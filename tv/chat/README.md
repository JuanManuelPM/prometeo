# TV desde chats · Contrato de salida pública V1
**Estado:** punto de visualización de GitHub Pages, no entrada ni backend. URL `https://juanmanuelpm.github.io/prometeo/tv/chat/`.

## Regla de un mensaje humano
Un chat NUEVO con conectores GitHub/Calendar/Drive puede recibir una sola intención y trabajar en ese mismo turno. Recuperar contexto del owner acotado, modificar el widget/estudio/doc autorizado, probar, guardar y entonces actualizar `tv/chat/state.json` en `gh-pages` por CAS con la fuente del RESULTADO PÚBLICO (no datos privados). NO exigir prompt de RETURN, envío desde la web, `.` de aprobación o worker para estas tareas. Debe existir en la sesión un bootstrap de Proyecto o la instrucción concreta para cargar las reglas: un archivo GitHub no se instala solo en ChatGPT.

## Protocolo al finalizar cambios públicos
1. Releer `gh-pages`, CURRENT/Design DNA, el owner exacto y el archivo del widget o materia. Implementar delta con pruebas; no auto-promover candidato si no tiene verificación/publicación autorizada.
2. Releer el último `tv/chat/state.json`; validar `schema`, `revision`, `changes`. **Nunca** sobrescribir cambios de otros chats.
3. Si y sólo si la tarea tuvo un resultado **real con evidencia** y se autorizó comunicarlo públicamente, escribir un registro `{status,date,title,note,url}`. Status `FUENTE`, `CANDIDATO`, `VERIFICADO` o `PUBLICADO` debe tener significado comprobable. Conservar 20 últimos registros; incrementar revision una vez por lote; `published_at` será fecha explícita observable, no invented timestamps.
4. Usar commit inmutable / compare-and-swap sobre el HEAD fresco, sin tocar `tv/ai/`, `ui-workspace-v1/current.json` ni otro widget. Confirmar `state.json` por una lectura independiente.
5. En televisor dejar esta URL abierta. Poll HTTP `state.json` cada 15s, sólo lectura, caché evitada. La distribución CDN puede demorar; esta UI nunca afirma ejecución en vivo por inferencia.
6. Si querés destacar un widget servido, fijar `focus.path` a una ruta absoluta **dentro de `/prometeo/`** y `focus.title` al nombre. El iframe se actualiza tras cambio de revision.
7. Si cambia un evento o nota privada, **NO** poner el título de la clase, horario, contenido ni link privado en GitHub ni en el JSON público. Dejar la confirmación privada en Calendar/Drive y en el chat.

## Límites actuales
Esta página **no recibe instrucciones ni ejecuta IA**. GitHub Pages es estático. La entrada es tu mensaje del chat de ChatGPT, y el asistente debe actuar con el conector. ChatGPT no continúa trabajando tras cerrar su turno, ni tiene garantizado acceso automático a todos los chats previos; se recupera solo lo guardado en owners autorizados. El sitio TV no prueba que el chat nuevo tenga instrucciones instaladas. Si el usuario pide diseño visual, esperar sus fotos; este es un visor funcional aislado, no el rediseño de Prometeo.

## Gate de demostración
- Primer commit publica `tv/chat/index.html`, `state.json` y este contrato sin tocar la UI existente.
- El chat hace un segundo commit con el primer registro no privado `TV_SETUP` al JSON y verifica por fetch GitHub.
- HTTP servido se comprueba por `https://juanmanuelpm.github.io/prometeo/tv/chat/` cuando esté propagado. Si aún no, declarar SERVED sin verificar.
- Las tareas futuras sobre calendario, facultad o widgets actualizan el owner correcto y escriben un recibo público mínimo al canal sólo cuando existe resultado verificable.


## EXTENSIÓN V6 (2026-10-09)
Se recuperó la demo EXISTENTE de `JuanManuelPM/Experimentos/demo-engine-v6` y `demo-engine-window-lab-v3`, no se reimplementó. El visor agrega botones PÁGINA / DEMO V6 y estado `display.mode`. El laboratorio es una escena sintética y NO prueba funcionalidades del calendario real. Contrato completo: `tv/chat/DEMO_PROTOCOL_V1.md` y `tv/chat/DEMO_ADAPTER_V1.json`. Asegurar que cada nuevo chat pueda cambiar escena con **un solo mensaje** y un solo commit seguro. La carpeta `tv/ai/` permanece intacta.
