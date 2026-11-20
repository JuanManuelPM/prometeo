# SECUENCIA · Elegí tu camino · HealthyGamerGG

**Estado:** candidato audiovisual interactivo independiente, no reemplaza el montaje lineal ni la portada original.

## Qué cambió

La presentación anterior reproducía 4 clips secuencialmente. Esta versión es un **grafo narrativo** con tres rutas: `sentir` (dos segmentos), `circuito` (uno) y `salida` (dos). Los enlaces al terminar cada fragmento tienen sentido editorial, no son un menú plano: se puede seguir al subtema, atravesar a otra ruta o volver al mapa. Completar dos rutas desbloquea una síntesis; la tercera sigue siendo opcional. El progreso persiste durante la sesión del navegador, no a través de una cuenta.

| Ruta | Nodos | Rango de video | Condición de cierre |
|---|---|---|---|
| Nombrar la experiencia | `a1` → `a2` | 02:36–03:16; 03:16–03:47 | `a2` visto |
| Entender el mecanismo | `b1` | 05:57–06:58 | `b1` visto |
| Actuar / buscar evaluación | `c1` → `c2` | 14:47–15:39; 17:10–17:52 | `c2` visto |

## Cómo se usa

- Entrar en `/presentacion/montaje/elige-tu-camino/` con `#src=<MP4 firmado por vidIQ, URL encoded>` en el fragmento de la URL. **La URL firmada no está incluida en este repositorio.** Caduca según el proveedor.
- También se puede elegir un archivo de video local si la fuente temporal falla; no se envía al servidor.
- En la portada tocá «EXPLORAR LA HISTORIA», luego elegí cualquier tema. Cada elección inicia solamente su clip. Durante el video no existen controles de plataforma, UI de YouTube ni acciones táctiles. Al terminar el fragmento se ve una pantalla con opciones.
- El motor usa un solo `<video>` con `currentTime`, comprobación de corte temporal y `play()` disparado por un gesto. Una tarjeta editorial breve oculta el seek inicial. **No garantiza ausencia de buffering de una fuente MP4 remota**, ni permite saltos de red instantáneos a cualquier momento.
- Se puede volver y repetir un tramo. El progreso está en `sessionStorage`, no en Google Analytics ni en un backend. «REINICIAR RECORRIDO» lo elimina.

## Cómo extenderlo a otro video

1. Copiar este directorio y editar `story.json`: fuente, 2–6 rutas, nodos, recortes, decisiones y condiciones de desbloqueo. Los clips están en segundos y requieren archivo MP4 accesible (proporcionado por URL fragment o selección local).
2. Verificar que todas las flechas de `choices` refieren a nodos existentes y que cada ruta tiene entrada y nodo de completitud. Ejecutar `python build.py`. El HTML resultante es autocontenido; el JSON queda también legible para futuras IA.
3. Probar `python -m unittest -v test_branching` con Playwright Chromium y ffmpeg locales, o implementar pruebas equivalentes. Comprobar por escucha los límites de cada frase en el video concreto antes de declararlo final.
4. Publicar en una ruta exclusiva sin sobrescribir `presentacion/montaje/` ni versiones aprobadas.

## Procedencia y límites

Fuente editorial: transcripción sin timestamps que entregó el usuario en este hilo y las ventanas temporales de la prueba anterior, obtenidas de una transcripción pública del episodio. URL original: https://youtu.be/CgIGel3zXEI. **Las ventanas no son alineación por palabra ni están auditadas escuchando cada principio y final.** Las explicaciones médicas pertenecen a la fuente, no son diagnóstico ni consejo individual.

No se consumieron créditos de transcripción ni se importaron archivos del usuario a GitHub. Esta página **no incluye ningún MP4 de la entrevista**, no exporta un video lineal y no garantiza que un enlace temporal siga válido luego de su expiración. El demo de reproducción fue testado con un MP4 sintético H.264/AAC, no contra el navegador Android del usuario.
