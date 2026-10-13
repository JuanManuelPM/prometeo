# Contrato · Laboratorios JS v1
Este espacio es una biblioteca pública de demostraciones verificadas por tecnología. NO es un nuevo motor global de Prometeo, ni un sistema de trabajadores en segundo plano. No modifica portada, TV ni el protocolo principal.

## Propiedad por biblioteca
`registry/<biblioteca>.json` y `widgets/<biblioteca>/**` tienen un especialista responsable. Evitá editar `index.html`, `README.md` o registros ajenos; si hace falta evolucionar el contrato, proponé un PR separado.
Los nueve IDs son: threejs, pixijs, tonejs, mediapipe, d3, cytoscape, motion, lectura, embeds.
Cada registro empieza vacío. **No inventar demos ni incluir prototipos viejos sin verificar su licencia, URL y funcionamiento real.**
Los archivos son servidos desde `gh-pages` dentro de `laboratorios-js/`.

## Esquema JSON del registro por especialista
```json
{"schema":"prometeo.library-widgets/v1","library":"threejs","widgets":[{"id":"bosque-vivo","title":"Bosque vivo","description":"Mundo jugable y documentado","current_version":"v2","versions":[{"version":"v1","url":"widgets/threejs/bosque-vivo/v1/index.html","published_at":"2026-10-15T15:00:00-03:00","notes":"Versión inicial"},{"version":"v2","url":"widgets/threejs/bosque-vivo/v2/index.html","published_at":"2026-10-16T12:00:00-03:00","notes":"Cámara corregida"}]}]}
```
El ejemplo es solo una especificación de formato; **NO está publicado**. La ruta exacta de cada versión debe existir, abrir por GitHub Pages y ser probada. Sólo se muestran items con título, descripción, versiones correctas y ruta segura de la misma biblioteca. El iframe se crea al mostrar el widget, sin pulsar «Iniciar».
Mantené `v1` y anteriores inalteradas. Las correcciones se publican como `v2`, `v3`, etc. No se renumeran versiones para aparentar progreso. La página ordena por `published_at` y permite cambiar de versión.
No incluir credenciales, tokens, material privado ni información académica identificable.

## Flujo de un chat especialista (v2 · conversación primero)
**La primera respuesta de cada chat es SOLO diálogo.** No leer repositorios ni lanzar búsquedas largas de forma automática al pegar el prompt. Presentar 2–3 experiencias plausibles, compararlas y esperar videos, repositorios y críticas del usuario. El objetivo inicial no es una demo, un PR ni una publicación.

1. **Explorar (sin herramientas en el primer turno):** responder rápido con ideas y una recomendación discutible. El usuario puede enviar referencias antes de decidir.
2. **Aprender juntos (videos/tutoriales):** estudiar en profundidad lo que el usuario proporciona, distinguir contenido accesible de inferencias, extraer técnicas y compararlas con lo anterior como conservar / sumar / reemplazar / descartar. Responder en texto y permitir múltiples rondas.
3. **Construir (petición explícita):** solo tras una orden de desarrollo, recuperar los prototipos y contratos relevantes, investigar y construir una demo local revisable, con pruebas y arte cuidado. No registrar widgets en la página pública.
4. **Publicar (segunda aprobación explícita):** después de que el usuario evalúe la demo, la considere suficientemente buena y pida publicar, recién entonces revisar `AGENTS.md`, constitución, este contrato, HEAD, conflictos, permisos y la ruta `registry/<biblioteca>.json`; publicar nueva versión en rama propia y registrar únicamente obras verificadas.
5. **Verificación:** comprobar el iframe en GitHub Pages, commit/PR, fecha argentina, capturas, pruebas móvil/escritorio y limitaciones. Si GitHub falla, conservar trabajo local sin simular publicación.

No inferir autorización de desarrollo ni publicación por recibir un video de YouTube, dar una crítica o debatir alternativas. No dejar al usuario sin respuesta esperando una conexión a GitHub. El primer mensaje de cada prompt manda por encima del flujo de publicación posterior.

## Contrato mínimo para widgets
- HTML real independiente; viewport responsive; navegación por teclado y táctil.
- Apertura automática visible al entrar en viewport (iframe `loading=lazy`); sonido/cámara sí requieren permisos y clic según navegador.
- El iframe usa sandbox sin `allow-same-origin`, por privacidad y separación. Por ello **no se debe depender de localStorage dentro del iframe**; persistir por descarga/local export o evolución explícita de contrato con revisión de seguridad.
- Scripts externos/modelos no necesariamente offline: mostrar aviso claro; sin secretos en front-end.
- Evidencia de navegador real y licencia antes de publicar.

## Ruta pública
https://juanmanuelpm.github.io/prometeo/laboratorios-js/?lab=<biblioteca>
