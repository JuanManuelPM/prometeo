# El bosque de las cartas · PixiJS · v1

**Estado:** candidato hasta contar con prueba pública de Pages y de la tarjeta. El manifiesto no debe anticipar el resultado.

## Qué se puede jugar

Una caminante con atlas de seis fotogramas entra en un bosque de 2.440 × 560 unidades. Con clic/toque se marca un destino preciso. Las flechas o WASD permiten movimiento libre sobre la franja caminable. Las tres cartas aparecen a distintas distancias y se recogen acercándose a menos de 61 unidades; sólo tras recuperar las tres se habilita el desenlace al alcanzar el faro. Reiniciar limpia las tres cartas. Mover el cursor **nunca** mueve al personaje.

## Criterios observables (specification by example / TDD)

1. **Carga:** abrir el HTML sin parámetros produce paisaje, HUD, personaje y cartas. Si el CDN no permite cargar PixiJS o WebGL falla, se mantiene una versión jugable en Canvas 2D y el HUD especifica el motor real. Sin almacenamiento local, audio automático, permisos ni telemetría.
2. **Clic:** estando en x≈115, un clic sobre un lugar lejano ordena caminar hasta allí; el personaje no se desplaza por mera posición del cursor. La cámara sigue progresivamente el desplazamiento.
3. **Teclado y móvil:** al mantener A/flecha izquierda la caminante avanza a la izquierda; soltar detiene. W/S controlan profundidad dentro de la franja. En móviles los cuatro controles táctiles también funcionan y un toque en el camino elige destino.
4. **Regla de recogida:** llegar a (530,408), (1210,451), (1920,417) en ese orden o en otro recoge cada carta **una sola vez**. Marcador 0/3 → 1/3 → 2/3 → 3/3, con un texto propio para cada carta.
5. **Cierre:** llegar a x>2160 con menos de tres cartas no termina; hacerlo con las tres muestra el desenlace. Reiniciar devuelve 0/3 y x≈115 sin recargar.
6. **Aislamiento:** no toca ningún otro laboratorio; imágenes generadas por código original dentro de este HTML; solo una dependencia JavaScript externa con versión fijada.

## Dirección artística

**Bosque de tinta crepuscular**: dramaturgia visual en cinco distancias (cielo, serranía, bosque, terreno, sotobosque); papel de correspondencia perdido entre helechos, caminante con abrigo crema y capa terracota, faro pétreo. La vegetación utiliza siluetas botánicas con curvas Bézier, ramificaciones y láminas irregulares, no lluvia de circunferencias/rectángulos. El recorrido tiene comienzo, tres puntos de atención y remate. Las gradaciones, sombras y luz lunar construyen legibilidad espacial; la interacción sigue el sentido de la caminata, no el mouse.

## Elecciones técnicas

| Técnica | Aplicación en v1 | Decisión |
|---|---|---|
| **Spritesheet + AnimatedSprite** | Atlas Canvas de 6 × 96×128, sin seis requests ni seis texturas fuente | Sí, personaje animado con cuadros reales de zancada. |
| **Capas parallax** | Cuatro sprites de paisaje y tres offsets de cámara distintos, plano jugable separado | Sí, profundidad 2.5D sin 3D. |
| **RenderTexture** | No se usa en cada fotograma: las cuatro capas SVG se rasterizan una sola vez y se convierten en texturas estáticas | Evitar recaptura costosa y GPU churn en móvil. |
| **Filtros** | Desenfoque de una sola capa de fondo en escritorio si WebGL y Pixi lo admiten | En móvil se omite por coste de múltiples pases. |
| **Optimización** | Ticker limitado a 60 fps, dpr ≤ 1.5, antialias desactivado, una textura por capa y seis subtexturas compartiendo fuente | Evitar texturas dinámicas, filtros sobre toda la escena y cientos de objetos independientes. |
| **Accesibilidad** | Controles teclado, botones táctiles, HUD HTML con aria-live, texto de controles y reduced-motion | Movimiento de juego necesario; oscilaciones ambientales se reducen. |
| **Compatibilidad** | Fallback Canvas 2D explícito, sin ofrecerlo falsamente como ejecución PixiJS | El juego puede ejecutarse en dispositivos con WebGL limitado. |

## Referencias investigadas, NO copiadas

- [PixiJS Showcase](https://pixijs.com/showcase): incluye títulos publicados, por ejemplo *Happy Wheels*, *Suroi* y *Emerald Woods*. Sirve como exigencia de producto y no como licencia para reutilizar arte.
- [PixiJS Open Games (MIT)](https://github.com/pixijs/open-games): *Bubbo Bubbo* y *Puzzling Potions*. Este último ejemplifica navegación de pantallas, paquetes de assets y efectos con transiciones. La licencia MIT cubre el código de ese repositorio; aquí no se copió código ni arte del juego.
- [Guía PixiJS 8 / sprites](https://pixijs.com/8.x/guides/concepts/performance-tips), [eventos](https://pixijs.com/8.x/guides/components/events), [texturas](https://pixijs.com/8.x/guides/components/textures) y [renderers](https://pixijs.com/8.x/guides/components/renderers). PixiJS 8 usa eventos federados, WebGL por defecto y recomienda spritesheets.
- [Kenney / Scribble Platformer (CC0)](https://kenney.nl/assets/scribble-platformer): referencia de lenguaje artesanal de línea. **No** se importaron sus sprites ni recursos al juego.

## Licencias y red

- **Arte:** paisajes SVG y atlases Canvas generados en el código de esta versión; diseño específico del widget, sin recursos binarios de terceros ni fuentes externas.
- **Runtime:** PixiJS v8.21.0, [repositorio MIT](https://github.com/pixijs/pixijs/blob/dev/LICENSE), descargado del CDN `cdn.jsdelivr.net` (es la única petición fuera de GitHub Pages).
- **Privacidad:** el CDN recibe datos habituales de una solicitud HTTP (por ejemplo IP y user agent); no se envían posiciones, cartas recogidas ni archivos. Sin cookies propias, tracking, localStorage o servicios adicionales. Si falla el CDN se ejecuta Canvas 2D con aviso de motor.
- **Limitación que debe comprobarse:** prueba en navegador real con render WebGL y Pixi cargado, controles táctiles físicos y lectura de la tarjeta embebida. Un análisis estático por sí solo NO satisface ese control.

**Principio de publicación:** solamente registrar este widget tras probar la versión alojada en la URL real y releer el manifiesto de la misma biblioteca.