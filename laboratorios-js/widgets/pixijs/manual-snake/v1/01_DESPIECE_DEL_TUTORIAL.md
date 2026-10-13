# 01 · Despiece íntegro y categorizado del tutorial de Hugo (Snake + PixiJS)

**Método de lectura:** el video se recibió como transcripción automática de una única línea de unas 4.033 palabras; **no hay marcas temporales, imágenes del código, URL inequívoca ni proyecto descargable**. Aquí se conserva el recorrido de principio a fin sin inventar comandos o archivos no pronunciados.

**Leyenda:** `[VIDEO]` = consta en la transcripción; `[CORRECCIÓN]` = fallo/riesgo detectado al analizarla; `[DOC PIXIJS]` = ampliación confirmada en la documentación de PixiJS 8; `[EXTENSIÓN]` = propuesta nuestra para versiones nuevas.

## A. Qué se construye y qué NO

- **[VIDEO]** El narrador se presenta como **Hugo** y propone una versión sencilla de Snake para aprender PixiJS. Al comienzo muestra una edición más avanzada que intenta seguir el cursor, pero reconoce que funciona de forma torpe. **El juego enseñado aquí utiliza únicamente teclado.**
- **[VIDEO]** Al terminar hay una serpiente representada mediante casillas, movimiento cardinal, comida, crecimiento, una cadena que sigue a la cabeza, alimento reposicionado de forma aleatoria en un área limitada y reinicio tras autocolisión.
- **[VIDEO]** El autor menciona que deja su código en un repositorio vinculado desde la descripción del video y muestra otra versión en `simplepointingames.com`, pero **la transcripción no contiene enlace concreto a ese código**. No atribuirle licencia ni detalles que no se ven.
- **[CORRECCIÓN]** No incluye una pantalla final de derrota, puntos, adaptación real al tamaño de pantalla, controles móviles, obstáculos, audio, guardado, compilación para distribución móvil ni mediciones de FPS.

## B. Entorno: levantar, entender y distribuir un proyecto

1. **[VIDEO]** Instala/usa VS Code y Node.js. En un directorio de proyectos abre terminal (o usa `cd`); prefiere nombres con guiones como `pixiejs-simple-snake-game` para evitar espacios molestos.
2. **[VIDEO]** Usa el generador desde la guía oficial Quick Start, elige la plantilla de empaquetador **Vite** y crea la carpeta del proyecto. El video **no deja visible el comando literal** en la transcripción.
3. **[DOC PIXIJS]** Comando actualmente documentado: `npm create pixi.js@latest`; requiere Node.js ≥ 20. No confundir esta comprobación posterior con una cita del video.
4. **[VIDEO]** En el proyecto ejecuta `code .`, luego `npm install`. Las dependencias se instalan en `node_modules` conforme a `package.json`.
5. **[VIDEO]** Observa los scripts `start`, `build`, `lint`, `dev` de su plantilla, ejecuta `npm run build` y luego `npm run start`. Según su plantilla, el build encadena lint, compilación de TypeScript (`tsc`) y `vite build`.
6. **[VIDEO]** `src/main.ts` alberga la lógica fuente que consume la entrada HTML; el proceso de compilación genera salida para navegador y referencias a JavaScript empaquetado, no destinado a edición manual.
7. **[CORRECCIÓN]** `npm run start` no está garantizado en todas las plantillas: verificar `package.json`. La guía oficial recomienda `npm run dev` en su Quick Start. El resultado generado por `dist` no sustituye el código fuente.
8. **[EXTENSIÓN]** Conservar una receta reproducible: versión de Node, versión de PixiJS, scripts reales, comando de build, assets, licencia, pruebas automáticas y captura de pantalla. Sin esto, otra guía adivina en qué estado quedó el juego.

## C. Primer objeto visible: forma, posición, centro y render

1. **[VIDEO]** Reemplaza el conejo inicial del proyecto por un `Graphics` con un rectángulo de lado `gridCellSize = 20` y relleno blanco. Inicialmente usa coordenadas cercanas a `(100,100)`.
2. **[VIDEO]** Se da cuenta de que conviene crear la geometría en **coordenadas locales** `rect(0,0,20,20)` y colocar el objeto con `position`. Así después solo se cambia `x/y`, sin reconstruir la figura.
3. **[VIDEO]** Experimenta con rotación y descubre que `pivot` controla el centro: `(size/2, size/2)` hace girar el cuadrado sobre su centro. Finalmente elimina la rotación, porque Snake no la necesita.
4. **[DOC PIXIJS]** PixiJS 8 permite `new Graphics().rect(0,0,20,20).fill(0xffffff)` y `graphic.position.set(x,y)`. El método `fill` completa la geometría. `Graphics` es un objeto retenido por la escena, no una orden para dibujar en cada frame.
5. **[CORRECCIÓN]** No usar el cuadrado como acabado visual. En una variante con arte usar sprites, atlas, ilustraciones o contextos gráficos reutilizables, y centrar correctamente ancla/pivote sin alterar la lógica de colisión.

## D. Modelo de datos: la serpiente no es su dibujo

**[VIDEO]** Introduce tipos TypeScript conceptuales:

```ts
type Coordinate = { x: number; y: number };
enum Direction { Up, Left, Down, Right }
type Snake = { head: Coordinate; body: Coordinate[]; direction: Direction };
```

- `head`: posición actual de la cabeza.
- `body`: secuencia ordenada de coordenadas de segmentos.
- `direction`: dirección cardinal actual.
- `food`: otra coordenada, inicialmente descrita cerca de `(200,200)`.

**[VIDEO]** Usa `const snake` y aclara que `const` impide reasignar la variable completa, pero no impide actualizar `snake.head` o `snake.direction`. Como `food` se reasignará tras comer, la define con `let`.

**[CORRECCIÓN]** El caso de aliasing: no insertar `snake.head` directamente en el array de segmentos porque compartirían el mismo objeto mutable; insertar **una copia** `{ x: snake.head.x, y: snake.head.y }`.

**[EXTENSIÓN]** Representar coordenadas de juego en **celdas enteras** (por ejemplo `{col,row}`) y convertir a píxeles solo para la vista. El tutorial usa saltos de 20 px directamente; separar ambas magnitudes simplifica escalado, cámaras, DPI y otras topologías.

## E. Reloj y movimiento cardinal

1. **[VIDEO]** Mueve la actualización visual de la posición al `app.ticker`, porque cada tick debe mostrar el estado vigente.
2. **[VIDEO]** Separa conceptualmente secciones de **lógica** y **renderizado**: primero actualizar dirección/coordenadas, luego sincronizar la posición del objeto de PixiJS.
3. **[VIDEO]** Fija `app.ticker.maxFPS = 10` para que Snake avance en pasos discretos de diez actualizaciones por segundo; no usa `deltaTime` en esta versión.
4. **[VIDEO]** Cada paso modifica una coordenada exactamente `gridCellSize`: arriba resta Y, abajo suma Y, izquierda resta X, derecha suma X. Primero se equivoca en un eje y lo corrige al probar.
5. **[VIDEO]** Agrega escucha de `keydown`; según `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown` actualiza `snake.direction`.
6. **[CORRECCIÓN]** La frecuencia límite de un ticker no constituye una simulación independiente del render: si un dispositivo no llega a 10 FPS, también se retrasa el mundo. Mejor un **paso fijo de lógica** (100 ms) desacoplado de un render a ~60 FPS, con acumulador y máximo de pasos para no producir espiral de atraso.
7. **[CORRECCIÓN]** Guardar una intención de giro pendiente; en Snake clásico no aceptar inversión instantánea de 180° si hay cuerpo (evita muerte absurda por dos teclas seguidas).
8. **[EXTENSIÓN]** Teclado y táctil deberían traducirse al mismo `Action` abstracto. Para jugar con clic hay que definir *otra mecánica* (ruta discreta, dirección hacia destino o navegación), no copiar el control de cursor avanzado que el autor reconoce defectuoso.

## F. Comida: representación, contacto y orden visual

1. **[VIDEO]** Antes de implementar crecimiento agrega comida como coordenada variable. La dibuja en rojo usando otro `Graphics`, y la incorpora al `stage`.
2. **[VIDEO]** En el tick sincroniza `foodGraphic.position` con `food.x/y`.
3. **[VIDEO]** Comprueba colisión exacta de celda al comparar simultáneamente X e Y de cabeza y comida. Primero imprime un aviso en la consola para confirmar la detección con F12/Inspector.
4. **[VIDEO]** Observa que la cabeza parece estar *debajo* de la comida y cambia el orden de incorporación para que la cabeza tape el alimento al comerlo.
5. **[CORRECCIÓN]** Comparar coordenadas de celda (enteras), no coordenadas interpoladas de pantalla; separar el instante de aplicar movimiento del de comprobar comida. Los objetos que se recogen deben desaparecer o recolocarse **exactamente una vez**.
6. **[EXTENSIÓN]** El evento de comida alimenta un sistema genérico: `onPickup(entity)` puede sumar vida, puntos, inventario, longitud, tiempo o activar historia.

## G. Cuerpo: crecimiento, historia y continuidad

1. **[VIDEO]** Tras comer utiliza `snake.body.push` para agregar una nueva coordenada copiada, sin vincular por referencia el objeto `head`.
2. **[VIDEO]** Crea un `Container` para agrupar las representaciones gráficas de los segmentos y lo agrega a la jerarquía de escena.
3. **[VIDEO]** Para renderizar cada segmento crea un `Graphics` gris en su posición; en esa fase limpia hijos y **recrea** los gráficos dentro del tick. El propio autor reconoce que no está optimizado y lo deja como ejercicio.
4. **[VIDEO]** El truco principal de seguimiento es agregar a **principio** de la lista una copia de la anterior posición de la cabeza mediante `unshift` y retirar el **último** segmento mediante `pop`. Así conserva la longitud y cada segmento ocupa la antigua celda del anterior.
5. **[VIDEO]** Cuando se agrega un segmento tras comer, el desplazamiento con `unshift/pop` mantiene el orden y la cola sigue a la cabeza.
6. **[CORRECCIÓN]** **No reconstruir la vista en cada frame.** Mantener un array de sprites de segmentos, crear solo los nuevos y mover los existentes. Al disminuir longitud, reciclarlos o destruirlos correctamente; nunca confiar en `removeChildren()` como solución de memoria.
7. **[EXTENSIÓN]** El mecanismo de historial puede crear trenes, convoyes, cometas, colas de luces, estelas narrativas o criaturas articuladas. Para trayectorias continuas no basta con una celda por segmento: hacen falta muestras espaciales, interpolación y distancias.

### Paso conceptual de Snake (reconstrucción didáctica, no transcripción literal)

```ts
const previousHead = { ...snake.head };
// 1. Leer giro permitido; 2. mover cabeza a siguiente celda.
// 3. Revisar límites, obstáculo, cuerpo, alimento.
// 4. Si comió: conservar la cola y crecer.
// 5. Añadir previousHead al inicio de body; si no crece, retirar el final.
// 6. Publicar estado actualizado al renderer y HUD.
```

El orden exacto de comprobaciones en el código original **no puede reconstruirse al 100 % de una transcripción sin pantallas**. Es una receta de implementación robusta, no una atribución textual.

## H. Posiciones aleatorias, dimensiones y colisiones

- **[VIDEO]** Crea función generadora de coordenadas aleatorias de grilla mediante `Math.floor`, inicialmente restringida a unos **200 px de la esquina superior izquierda**. Sirve para ubicar comida/cabeza de comienzo y para reposicionar comida tras recogerla.
- **[VIDEO]** Reconoce que todavía **no calcula el tamaño real de la pantalla**, por eso aparecen objetos solo en esa subregión.
- **[VIDEO]** Incorpora autocolisión: compara la posición de la cabeza con *alguno* de los segmentos del cuerpo (equivalente a `body.some(...)`) y, al detectarla, vacía el cuerpo y recoloca la cabeza en una coordenada aleatoria.
- **[CORRECCIÓN]** La comida no debería aparecer en el cuerpo, en la cabeza ni dentro de muros; calcular celdas libres en el tablero visible y decidir qué ocurre si no queda ninguna libre.
- **[CORRECCIÓN]** Añadir política explícita para chocar con paredes. El tutorial deja sin especificar qué sucede fuera del cuadrante de juego.
- **[CORRECCIÓN]** El orden de prueba de autocolisión debe contemplar que la **última celda de la cola quedará libre** en un movimiento sin crecimiento; entrar en ella puede ser válido según las reglas elegidas.
- **[EXTENSIÓN]** Dividir reinicio en `resetRun()` (nueva partida), `respawnActor()` (pierde vida) y `resetLevel()` (mismo mapa): cada variante usa otra penalización.

## I. Depuración y disciplina de trabajo

- **[VIDEO]** Construye mediante incrementos pequeños y regresa continuamente al navegador. Cada vez verifica el comportamiento anterior antes de agregar la siguiente mecánica.
- **[VIDEO]** Usa consola de desarrollador para comprobar la colisión antes de pintar cuerpo; el orden de las capas se corrige cuando lo detecta jugando.
- **[VIDEO]** Simplifica comentarios obvios (por ejemplo, etiquetar algo como inicialización cuando ya se ve `app.init`). Conserva el comentario que distingue animación.
- **[VIDEO]** Desactiva temporalmente **todo ESLint** colocando un patrón de ignorados que cubre todos los archivos, para que no bloquee mientras escribe tipos todavía sin usar; dice que lo reactivará luego.
- **[CORRECCIÓN]** No adoptar esta última técnica como estándar: pierde detección de errores reales. Usar `TODO`, archivos en construcción, warnings bien configurados o pequeñas excepciones localizadas, y restaurar todas las reglas antes de aceptar el PR.
- **[EXTENSIÓN]** Convertir los regresos manuales al navegador en ejemplos comprobables: *dado* estado, *cuando* una entrada avanza un tick, *entonces* estado esperado. Los tests de lógica no necesitan WebGL ni DOM; los de producto sí requieren navegador real.

## J. Cierre del material: lo que se aprende y lo que queda pendiente

**[VIDEO]** Termina con un Snake funcional en su demostración, pero sencillo. La versión alternativa vinculada en su sitio intenta seguir el cursor y tiene deficiencias reconocidas. Invita a experimentar por cuenta propia.

**Lo más reutilizable, en orden:** (1) estados tipados; (2) traslación de entrada a intención; (3) ticks discretos; (4) separación lógica/vista; (5) contacto con comida; (6) segmentos como historia de posiciones; (7) condición de falla; (8) reinicio; (9) ciclo observar → corregir.

**No afirmar que el tutorial enseña:** código listo para producción, colisiones sólidas contra bordes, controles multitáctiles, multijugador, estructuras de pooling, pathfinding, físicas, shaders, atlas artísticos o diseño profesional. Esas mejoras están en el documento 02 como extensión.

## K. Glosario mínimo para recuperar terminología

| Término | Significado operativo |
|---|---|
| `Application` | Preparación de renderer, stage y ticker. |
| `Graphics` | Geometría vectorial definida una vez, renderizada por la escena. |
| `GraphicsContext` | En v8, conjunto de geometrías y estilos reutilizable. |
| `Container` | Grupo de elementos con orden y transformaciones compartidas. |
| `stage` | Raíz de la escena; el orden de hijos afecta superposición. |
| `pivot` | Punto local alrededor del cual rota/escala el objeto. |
| `Ticker` | Planificador de actualizaciones; no reemplaza física determinista. |
| `deltaTime / elapsedMS` | Tiempo normalizado / tiempo real en milisegundos según API. |
| `unshift` / `pop` | Insertar al inicio / extraer del final de un array. |
| `Coordinate` / `Direction` | Modelo lógico independiente del renderer. |
| `some` | Comprobar si algún segmento cumple una condición. |

**Referencias externas verificadas:** [Quick Start](https://pixijs.com/8.x/guides/getting-started/quick-start), [Graphics](https://pixijs.com/8.x/guides/components/scene-objects/graphics), [Ticker](https://pixijs.com/8.x/guides/components/ticker), [Render Loop](https://pixijs.com/8.x/guides/concepts/render-loop). No confundir documentación posterior con afirmaciones del video.
