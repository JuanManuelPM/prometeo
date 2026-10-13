# Fase 2 MediaPipe · evidencia y límites · 2026-10-13 (Argentina)

## Alcance
Se conservaron Atlas v1 y Atlas v2. Se crearon tres aplicaciones independientes, sin modificar otros laboratorios:
- `escultor/v1/index.html` — malla 3D de 1.260 vértices, deformación por vecindad, giros, tres materiales, undo/redo, importación JSON y exportación OBJ/JSON/PNG.
- `gestuario/v1/index.html` — objeto ilustrado movible, objetivo, umbrales de pinza, filtro, ciclo con histéresis, perfil JSON, camera opcional.
- `eco/v1/index.html` — escena Canvas original, árboles/plantas/mariposas/luciérnagas, 3 actos, 3 intensidades de postura, parámetros, interacción táctil, captura PNG.

## Comprobaciones realizadas efectivamente
- Se recuperaron los tres HTML desde `gh-pages` mediante el conector GitHub y se compilaron sus `<script>` con `new Function` en V8: 3/3 sin errores de sintaxis.
- Pruebas con DOM y Canvas simulados ejecutando el JavaScript de los HTML recuperados:
  - ESCULTOR: generación de 1.260 vértices, 626 visibles en una orientación, edición de 820 vértices en gesto sintético, deshacer y rehacer restauran exactamente el antes/después.
  - GESTUARIO: variación de los tres parámetros, cierre/apertura estable, una pinza contabilizada como un ciclo, traslado de pieza al destino, reinicio de sesión. Se corrigieron dos errores de enlace de variables de sliders e importación.
  - ECO: render con Canvas simulado sin excepciones, cambio de estado, avance de acto, intensidad y brillo, atracción por pointer.
- Inspección de código: viewport móvil, `touch-action:none`, handlers `pointerdown`, activación explícita de cámara, `@mediapipe/tasks-vision@1.1.0` fijada, ausencia de `localStorage` y solicitudes explícitas de fotogramas al servidor.
- Las rutas de modelos Hand/Pose coinciden con ejemplos oficiales de Google AI Edge; esto NO sustituye ejecutarlas contra una webcam real.
- Las tres rutas y el código se verificaron en GitHub `gh-pages` (no en Pages).

## Comprobaciones NO realizadas
- NO se comprobó la respuesta HTTP servida de GitHub Pages. El sistema de navegación web devolvió `DisabledError`; el contenedor no puede resolver DNS.
- NO se ejecutó la aplicación completa en un navegador navegando a la URL. Chromium en el entorno bloqueó `file://`, `data:` y navegación normal con `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Solo permite `page.set_content`, que no es verificación de los HTML publicados.
- NO se autorizó ni utilizó una cámara física; el seguimiento real, la latencia, MediaPipe/WASM y la Permissions Policy del iframe siguen SIN VERIFICAR.
- NO se midió FPS/temperatura en teléfono Android físico.
- NO se probaron importación/exportación mediante descarga real en navegador.
- NO se verificó visualmente en móvil el producto publicado.
- Por tanto las experiencias están **implementadas y sometidas a pruebas de lógica**, pero no deben describirse como "aprobadas por pruebas de navegador/hardware" ni "verificadas en Pages".

## Criterios de aceptación pendientes
1. Abrir las 3 URLs directas bajo `https://juanmanuelpm.github.io/prometeo/laboratorios-js/widgets/mediapipe/`; comprobar HTTP 200 y contenido exacto.
2. Abrir `https://juanmanuelpm.github.io/prometeo/laboratorios-js/?lab=mediapipe`; comprobar visualización de Atlas v2 y los tres widgets después de actualizar el registro.
3. Probar arrastre, deshacer/rehacer, importaciones/exportaciones y estado final en Chrome/Firefox escritorio, Android y dentro del iframe sandbox.
4. Dar permiso a la cámara de manera explícita y probar modelos reales, rechazo de permisos, apagado de tracks, manos izquierda/derecha, pérdida de detección y rotación.
5. Medir rendimiento sostenido de 5 minutos y degradación térmica. Ajustar resolución e inferencia si la latencia perjudica.
6. Validar dependencia externa de CDN/WASM/modelos y consentimiento sobre métricas de MediaPipe.
7. Una vez confirmado todo, publicar nueva versión v2 con pruebas de navegador y hardware: nunca reescribir la versión histórica v1.

## Dependencias y privacidad
Los renders, controles manuales y exportaciones están escritos en HTML/Canvas/JavaScript propio. El modelo opcional se descarga de Google; la librería MediaPipe Tasks Vision, licencia Apache-2.0, usa inferencia on-device y puede enviar métricas técnicas a Google (según su aviso oficial). No se transmiten fotogramas voluntariamente desde nuestra aplicación. No afirmar funcionamiento completamente offline antes de descargar los modelos.

## Continuidad
Las fuentes y la planificación persisten en `atlas-tecnico/v2/` y `atlas-tecnico/v1/PLAN_EJECUTABLE.md`; las aplicaciones se encuentran en tres carpetas independientes. Reanudar con la comprobación de navegador/hardware, no con reconstrucción de código.

## Restricción confirmada del escritorio de Laboratorios
Se leyó `laboratorios-js/index.html` en `gh-pages`: el iframe se crea con `allow="fullscreen"` y `sandbox="allow-scripts allow-forms allow-downloads allow-pointer-lock"`. La política no delega `camera`, por lo que la webcam debe considerarse **no disponible dentro del iframe**. El propio escritorio ofrece por cada widget el enlace `Abrir completo ↗` (`target="_blank"`), que permite acceder directamente fuera del sandbox para intentar el permiso de cámara. No se modificó el shell compartido ni otros escritorios.
