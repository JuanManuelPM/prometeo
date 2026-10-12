# Prometeo · V14 base local preservada · 2026-10-12

**Estado:** la V14 se toma como **base visual local aceptada provisionalmente**. El usuario dijo que el sistema de ventanas y particiones quedó «casi perfecto». El menú/barra superior **no está aprobado**, habrá cambios graduales. **No publicar ni integrar este prototipo a `gh-pages` sin pedido explícito.**

## Fuente ejecutable exacta
- Archivo: `prototypes/local-v14/prometeo-ideas-recursivas-v14-local.html`
- SHA-256 del HTML original: `dc3829e9c8fae72621e6708c2097768470354ceacd93806319710a5f64aa0721` (459952 bytes UTF-8).
- Es un HTML autónomo; sus imágenes de demostración están embebidas.
- Las conversaciones e ideas son ejemplos: **no están conectadas al historial real de ChatGPT**.
- Validación sintáctica: el JavaScript extraído pasó `node --check` el 12/10/2026. Esto no demuestra el funcionamiento integral del navegador.

## Contrato de diseño / comportamiento
- Escritorios como columnas dinámicas independientes, sin tres columnas obligatorias. Reordenables.
- Widgets trasladables y redimensionables, con persistencia local de disposición y contenidos.
- Estética Unix sobria, bordes grafito muy finos, esquinas rectas, alto contraste; espacio entre ventanas y sin tarjetas decorativas.
- Una sola barra superior global para foco/controles. No volver a introducir barras de título en cada panel ni pies de ventana.
- Scroll contextual: una ventana seleccionada puede tener desplazamiento propio; afuera se recupera el scroll de página/escritorio.
- Las esquinas para redimensionar deben ser funcionales sin indicadores gráficos visibles permanentes.
- Ideas, proyectos y conversaciones deben ser una entidad común: cada idea tiene Chat, Widgets y una o más Páginas.
- Motor de **particiones recursivas**: un panel permite dividirse horizontal/verticalmente, ajustar la proporción y cerrar particiones. Ej.: `Ideas | Chat`; luego el área Chat en `Chat / Página` y `Widgets`.
- Al seleccionar idea, las opciones del catálogo pueden ocultarse; se pueden recuperar. Móvil debe priorizar un panel legible por vez.
- Usar **composición modular y contratos verificables** (Kent Beck, Gojko Adzic, Freeman/Pryce), no inventar un sistema separado por widget o profundidad de división.

## Lo que NO está terminado
- Pulido del menú superior.
- Conexión con conversaciones reales; sincronización entre dispositivos.
- Publicación online de este prototipo.
- No confundir respaldar el HTML con respaldar el `localStorage` del navegador del usuario.

## Próxima idea (sólo conversación, NO implementada)
El usuario preguntó por un **widget navegador web** que sea una partición como las demás y admita direcciones, búsqueda, historial y pestañas. Algunas páginas permiten iframe; otras bloquean `X-Frame-Options` / CSP `frame-ancestors`. Para esos sitios, ofrecer apertura externa. Eso usa el motor del navegador actual, no ejecuta un segundo Firefox; para un navegador completo se necesitaría una aplicación de escritorio o navegador remoto y más permisos.

## Recuperación en otros chats
Usar GitHub conectado `JuanManuelPM/prometeo`, rama **`prototype/prometeo-v14-local-baseline-20261012`**, leer este archivo y el HTML anterior. Verificar SHA y funcionalidad antes de cambiar. Preservar la referencia V14; no reconstruir la interfaz desde cero.

Este branch es un respaldo aislado **sin publicación**. En caso de discrepancia entre reportes y código, el HTML es el artefacto ejecutable de referencia.
