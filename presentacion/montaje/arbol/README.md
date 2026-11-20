# SECUENCIA · ÁRBOL V1 · Video interactivo

**Versión aditiva**. El motor anterior de `elige-tu-camino/` no se reemplaza. Este candidato utiliza su **mismo grafo editorial y sus cinco intervalos**, pero transforma toda la navegación en un lienzo vertical desplazable con conexiones entre los temas.

- **Sin textos de instrucciones** en la pantalla: solamente los títulos, los números y las duraciones de los fragmentos.
- **Desplazamiento vertical natural** en celular vertical, horizontal y escritorio. Todas las tarjetas aparecen en un solo mapa, con líneas de bifurcación.
- **Sin la restricción de dos opciones**: cualquier fragmento del árbol puede reproducirse directamente. Las conexiones entre ramas se derivan del mismo `story.json`.
- **Retorno al mismo punto** al tocar la flecha `‹` o cuando termina el recorte. No se marca como visto si se sale a mitad.
- **Desbloqueo** de la síntesis cuando se completan dos rutas. Se conserva durante la sesión.
- **Video sin UI ni controles de YouTube**: un `<video>` HTML5 único sobre el MP4 temporal suministrado en `#src=` (o un archivo local). El elemento permanece compuesto en una capa visible mientras se reproduce; `VideoFrameGuard` no deja descubrir una pantalla negra por audio solamente.

## Reutilización en otro video

La IA modifica exclusivamente `story.json` (rutas, títulos cortos opcionales `label`, recortes `start/end`, desbloqueos), ejecuta `python presentacion/montaje/arbol/build.py` y las pruebas. El motor compartido de árbol se mantiene en `scripts/presentacion/shared/sequence-tree-v1.js` y el de verificación de fotogramas en `scripts/presentacion/shared/video-frame-guard.js`, ya probado anteriormente. El generador inserta ambos módulos junto con la historia en un HTML autocontenido, sin peticiones adicionales para leer la receta.

## Video del ejemplo

Fuente: `https://youtu.be/CgIGel3zXEI`. Se mantienen los cortes **02:36–03:16, 03:16–03:47, 05:57–06:58, 14:47–15:39 y 17:10–17:52** de la versión anterior. Son intervalos aproximados derivados de la transcripción por bloques, no alineación palabra a palabra. El MP4 original **no está en GitHub**. La URL temporal firmada de vidIQ se pasa en `#src=` en el enlace de lanzamiento; el usuario puede elegir un MP4 local si el enlace expiró. **No se consumen créditos de transcripción.**

## Frontera de evidencia

`UI_BROWSER_TESTED`: sí, seis pruebas automáticas locales con MP4 real sintético H.264/AAC y captura de fotogramas. `VIDEO_FRAME_PAINTED`: sí, en Chromium. `REMOTE_ANDROID_SOURCE_PLAYBACK`: pendiente de comprobar con el MP4 real del usuario. `AUDIO_BOUNDARY_VERIFIED`: no. `FINAL_SINGLE_MP4`: no, una experiencia interactiva deliberadamente no lineal. No declarar que el acceso remoto va a seguir funcionando después de la expiración de la URL firmada.
