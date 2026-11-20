# SECUENCIA · Video visibility invariant v2 · 2026-11-20

## Reporte y causa

El usuario comprobó en Android que la rama reproduce audio sobre pantalla negra. En el HTML publicado antes de la corrección, `enterNode()` llamaba a `show('interlude')`, lo que asignaba `display:none` a `#video-view`, y luego iniciaba `film.play()`. Se esperaba a que el audio empezase y que transcurriesen 650 ms para mostrar `#video-view`, pero nunca se comprobaban píxeles visibles. Esa secuencia es una causa técnicamente plausible del comportamiento observado. No se ha probado en el dispositivo del usuario que sea la *única* causa (también podría fallar el códec/decodificador o la transferencia del MP4 temporal).

## Contrato transversal de reproducción

`[scripts/presentacion/shared/video-frame-guard.js](../../../scripts/presentacion/shared/video-frame-guard.js)` es la implementación **reutilizable y única**: el video permanece montado y con dimensiones positivas, los paneles editoriales se superponen y solo se muestra el video cuando la API `requestVideoFrameCallback()` notifica al compositor un fotograma correspondiente al tramo buscado, con `videoWidth` y `videoHeight` positivos. Si la API no existe, se admite la evidencia más débil de un contador de frames decodificados y se indica el método, nunca se supone que `play()` por sí solo sea suficiente.

Si transcurre la espera máxima sin fotogramas, el reproductor se detiene, muestra un error recuperable y NO marca el nodo como visto. Ni los controles de YouTube ni los controles nativos de video quedan expuestos. La URL firmada no se guarda en el repositorio.

## Preservación de producto

Sin cambios en: texto, tres rutas, cinco nodos, citas y segundos, desbloqueo de dos rutas, paleta, tipografías, decisiones, persistencia de sesión y comportamiento de toque sin pausa. La versión anterior se mantiene en Git y existe rollback por SHA. Se conserva la portada y el diseño aprobado.

## Prueba local

Chromium con MP4 H.264/AAC generado por FFmpeg con colores de prueba y sonido (no una simulación de `play()`):

- PASS: video compositado durante la tarjeta previa, antes de mostrar la imagen.
- PASS: `requestVideoFrameCallback` notifica el fotograma correcto.
- PASS: captura en pantalla vertical contiene píxeles de video de colores (no solo audio).
- PASS: pantalla horizontal, video con ancho positivo y compositor visible.
- PASS: MP4 con **solo audio** nunca muestra un video falso ni desbloquea un tema; pausa y muestra error.
- PASS: regresar a ramas, decisiones y síntesis después de dos rutas.
- PASS: ausencia de iframes, YouTube UI y controles nativos.
- PASS: fuente ausente no se transforma en una reproducción aprobada.

La prueba local no implica que el origen firmado de 127 MB funcione en cualquier Android. Validación humana del medio real queda `NOT_RUN` hasta ver el resultado en el dispositivo afectado. Un fotograma presentado no garantiza que su contenido sea correcto: la prueba de píxeles cubre esa condición con una fuente de colores controlados.

## Regla permanente para próximos trabajos

Un nuevo montaje o recorrido con video **no pasa a producción** si solo demuestra sonido, `play()` o `readyState`. Debe probar un fotograma realmente visible (código/decodificación/estilo), el control del inicio y final, ausencia de UI de plataforma, preservación de los flujos aprobados, ausencia de datos privados publicados y un método explícito de rollback.
