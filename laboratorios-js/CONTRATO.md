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

## Flujo de un chat especialista
1. Abrir la constitución vigente de Prometeo, `AGENTS.md`, este contrato y el `registry/<biblioteca>.json` actual; identificar HEAD, cambios concurrentes y propietario.
2. Investigar proyectos publicados y licencia de todo recurso gráfico/audio/modelo.
3. Definir criterios visuales y de comportamiento verificables, con ejemplos y TDD.
4. Desarrollar `widgets/<biblioteca>/<id>/vN/index.html` y recursos relativos. No publicar una pantalla de demostración vacía.
5. Probar HTML en Chromium/Firefox, escritorio y celular; confirmar no hay regresiones, origen/red/permisos y contenido visible sin un botón «Mostrar».
6. Trabajar en rama aislada basada en HEAD de `gh-pages`; reconciliar concurrencia. Subir solo cambios de la biblioteca y abrir PR. Publicar/mergear cuando pasen todas las pruebas y se cumplan las aprobaciones aplicables.
7. Después de que exista la ruta pública, registrar o actualizar únicamente tu JSON; comprobar lectura posterior del JSON y la página servida. Si la publicación falla, dejar el JSON sin anuncios falsos.
8. Dejar evidencia: commit, fecha argentina, screenshots, resultados, limitaciones y siguiente paso. El nuevo chat recupera esos datos directamente desde GitHub. No inventar comunicación en vivo entre chats.

## Contrato mínimo para widgets
- HTML real independiente; viewport responsive; navegación por teclado y táctil.
- Apertura automática visible al entrar en viewport (iframe `loading=lazy`); sonido/cámara sí requieren permisos y clic según navegador.
- El iframe usa sandbox sin `allow-same-origin`, por privacidad y separación. Por ello **no se debe depender de localStorage dentro del iframe**; persistir por descarga/local export o evolución explícita de contrato con revisión de seguridad.
- Scripts externos/modelos no necesariamente offline: mostrar aviso claro; sin secretos en front-end.
- Evidencia de navegador real y licencia antes de publicar.

## Ruta pública
https://juanmanuelpm.github.io/prometeo/laboratorios-js/?lab=<biblioteca>
