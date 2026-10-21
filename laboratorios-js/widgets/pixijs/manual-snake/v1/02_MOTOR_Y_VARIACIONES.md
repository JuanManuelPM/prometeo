# 02 · Motor reutilizable, variantes radicales y aceptación

Este documento es una **guía de transformación rápida**, no una copia literal del tutorial de Hugo. El tutorial demuestra cabeza + cola + comida + teclado + tick + autocolisión; las arquitecturas, tipos ampliados, ejemplos de tests y variantes aquí propuestos son **[EXTENSIÓN]**, salvo cuando se indica **[VIDEO]** o **[DOC PIXIJS]**.

## 1. Antes de programar: describir el nuevo juego con 9 decisiones

| Decisión | Snake del tutorial | Pregunta obligatoria para una variación |
|---|---|---|
| Fantasía | Serpiente come objetos | ¿Qué ficción justifica moverse y crecer? |
| Unidad espacial | Grilla de celdas de 20 píxeles | ¿Grilla, carriles, nodos o espacio continuo? |
| Actor | Cabeza + cuerpo | ¿Qué conduce el jugador? ¿Qué lo sigue? |
| Entrada | Flechas | ¿Teclado, toque, clic, drag, mando? |
| Objetivo | Encontrar comida | ¿Recolectar, rescatar, entregar, conectar, escapar? |
| Recompensa | +1 segmento | ¿Progreso, inventario, energía, longitud, aliados? |
| Riesgo | Chocar con uno mismo | ¿Pared, enemigos, tiempo, tensión, sigilo? |
| Final de partida | Vacía cuerpo y respawn | ¿Victoria, pantalla final, vidas, checkpoint, capítulos? |
| Dirección artística | Cuadrados blanco/gris/rojo | ¿Escenario ilustrado, personaje legible, animación y sonido con función? |

**Regla de transformación:** cambiar solo colores/figuras es un *reskin*, no una experiencia distinta. Para una variación sustancial cambiar al menos una **regla central** (qué provoca progreso o fracaso) y una **relación espacial** (cómo o para qué se mueve la cadena).

## 2. Arquitectura mínima que sobrevive a todas las variantes

```text
INPUT (teclas, toque, clic)
   │    traduce a acciones discretas sin modificar gráficos
   ▼
INTENT QUEUE (dirección/destino/acción)
   │
   ▼
SIMULATION STEP (reglas puras y deterministas)
   ├── movimiento / límites
   ├── contacto con objetivos, enemigos y cuerpo
   ├── crecimiento, energía o transformación
   └── eventos: MOVE, PICKUP, DAMAGE, GAME_OVER, WIN
   │
   ▼
GAME STATE inmutable o actualizado bajo control
   │
   ├────────► HUD (puntos, inventario, ayudas, accesibilidad)
   ▼
PIXI RENDERER (cámara, capas, atlas, partículas justificadas)
   ├── crear recursos visuales una sola vez
   ├── actualizar posiciones / frames / visibilidad
   └── liberar recursos al cerrar
```

**Nunca** mutar la lógica desde un evento del renderer que no pase por la cola de acciones. Los tests deben poder importar el núcleo sin `window`, `document`, GPU o PixiJS.

### Propuesta de archivos (para una implementación futura, NO existentes todavía)

```src/
  config.ts       # dimensiones, reglas intercambiables, velocidad
  model.ts        # Vec, World, Actor, Segment, Pickup, GameState
  engine.ts       # step(state, action, rng) -> {state, events}
  spawn.ts        # celdas libres, semilla y distribución
  input.ts        # teclado, clic y tacto -> Intent
  pixi-view.ts    # Container, Sprite, GraphicsContext, atlas
  hud.ts          # UI DOM semántica
  main.ts         # async app.init, creación, render y cleanup
tests/
  engine.test.ts  # reglas, colisiones y reinicios
  input.test.ts   # cambios de dirección e inversión prohibida
  viewport.test.ts # tamaños del tablero y correspondencia puntero→mundo
```

No introducir un framework global, backend ni librerías de física para un Snake pequeño. Un núcleo puro pequeño alcanza.

## 3. Núcleo de Snake expresado como transición de estado

**[EXTENSIÓN]** Esta especificación corrige las ambigüedades del tutorial.

```ts
type Cell = { col: number; row: number };
type Dir = 'up' | 'down' | 'left' | 'right';
type Rules = {
  columns: number; rows: number; movesPerSecond: number;
  wrapAtEdges: boolean; allowReverse: boolean;
  collisionMode: 'die' | 'respawn' | 'lose-life';
};
type GameState = {
  head: Cell;
  body: Cell[];            // 1.er elemento = segmento detrás de cabeza
  direction: Dir;
  queuedDirection: Dir | null;
  pickup: Cell | null;
  score: number;
  status: 'playing' | 'won' | 'lost';
};
```

**`step(state, action, rng, rules)`**, una vez por paso lógico:

1. Normalizar input a dirección o acción; aceptar **una sola transición permitida** por paso.
2. Calcular siguiente celda `nextHead` de acuerdo con dirección.
3. Si el mapa hace *wrap*, envolver coordenadas; si no, validar límites y obstáculos.
4. Calcular `ate = pickup && sameCell(nextHead, pickup)`.
5. Para autocolisión comparar `nextHead` con el cuerpo, **excluyendo la última celda de la cola cuando no se crece**, ya que quedará libre al moverse. Si se crece, esa celda sigue ocupada.
6. Si hay choque, aplicar la política configurada (derrota, respawn, daño) y emitir evento. No seguir moviendo ese mismo tick.
7. Crear `nextBody = [copy(head), ...body]`; si no se comió, quitar la última entrada. El original usa `unshift` y `pop`: es la misma transformación con mutaciones controladas.
8. Actualizar `head = nextHead` y `score += ate ? 1 : 0`. Si hubo comida, reubicarla entre las celdas libres; si no existe celda libre, activar victoria en vez de colgar o colocar comida encima de un segmento.
9. Emitir eventos para sonido/animación/mensaje y **después** permitir que PixiJS sincronice la vista.
10. El render puede interpolar visualmente de celda anterior a nueva sin cambiar las reglas: la colisión ocurre en coordenadas lógicas.

**Spawn de comida seguro:**

```ts
const cells = allTraversableCells.filter(
  c => !same(c, state.head)
    && !state.body.some(b => same(b,c))
    && !obstacles.has(key(c))
);
const food = cells.length ? cells[Math.floor(rng() * cells.length)] : null;
```

En tableros grandes usar una estructura de celdas libres u ocupación, no generar 100.000 candidatos por tick; para un Snake breve alcanza y evita loop infinito. La función `rng` inyectada permite partidas y tests reproducibles. 

**Tiempo fijo (una posibilidad):**

```ts
let accumulatedMs = 0;
const fixedMs = 100; // 10 pasos por segundo, independiente de FPS visual
app.ticker.add(ticker => {
  accumulatedMs += Math.min(ticker.elapsedMS, 250);
  let steps = 0;
  while (accumulatedMs >= fixedMs && steps < 3) {
    const result = step(state, input.next(), rng, rules);
    state = result.state;
    dispatchEffects(result.events);
    accumulatedMs -= fixedMs;
    steps++;
  }
  if (steps === 3) accumulatedMs = Math.min(accumulatedMs, fixedMs);
  render(state, accumulatedMs / fixedMs);
});
```

**[DOC PIXIJS]** `app.ticker.maxFPS` limita la frecuencia del callback, pero no garantiza simulación de pasos idénticos cuando un dispositivo se atrasa. `elapsedMS` entrega los milisegundos transcurridos; `deltaTime` es otro valor normalizado. Ajustar límites e interpolación al juego real.

## 4. Render PixiJS eficiente: sustituir los cubos sin tocar el motor

**[VIDEO]** Hugo crea nuevos `Graphics` del cuerpo y limpia el `Container` dentro del ticker por simplicidad. Admite que sería mejor actualizar instancias existentes.

**[DOC PIXIJS]** En v8 usar geometría compartida con `GraphicsContext`, o sprites texturados con atlas, y **no** recrear geometría cada frame.

```ts
// Ejemplo orientativo de PixiJS 8, ver import y async app.init:
const segmentContext = new GraphicsContext()
  .roundRect(0, 0, tileSize, tileSize, tileSize * 0.35)
  .fill(0x8ebca5);

// Se crea una sola vez por segmento cuando crece.
const views: Graphics[] = [];
function syncBody(body: Cell[]) {
  while (views.length < body.length) {
    const view = new Graphics(segmentContext);
    bodyLayer.addChild(view);
    views.push(view);
  }
  while (views.length > body.length) {
    views.pop()!.destroy();
  }
  body.forEach((cell, i) =>
    views[i].position.set(cell.col * tileSize, cell.row * tileSize)
  );
}
```

Este código es una **plantilla**, no el código del video. Para una dirección artística más elaborada reemplazar `Graphics` por `Sprite` y elegir textura según dirección del segmento (recta, giro, cabeza, cola), sin cambiar `GameState`. No abusar de rectángulos siquiera redondeados como arte final.

**Orden de escena sugerido:**

```text
app.stage
  ├── backgroundLayer      (ilustración, ambiente)
  ├── pathAndObstacles     (mapa / sendero)
  ├── collectibleLayer     (comida, objetivos)
  ├── bodyLayer            (segmentos del actor)
  ├── headLayer            (cabeza sobre comida cuando se recoge)
  ├── foregroundLayer      (vegetación y oclusión)
  └── optionalDebugLayer   (solo desarrollo)
```

El HUD accesible puede estar en HTML fuera del canvas. El último hijo de un `Container` suele dibujarse por encima; confirmar condiciones especiales de render groups/layers. Mantener los cambios visuales independientes de la lógica.

**Costos móviles:** atlas compactos, DPI controlado, pocas texturas grandes, carga por `Assets`, animaciones con propósito, filtros en una capa pequeña, evitar sombras y desenfoques de pantalla completa. La documentación de PixiJS 8 recomienda `GraphicsContext` reusable y no reconstruir `Graphics` en cada frame.

## 5. Matriz de variantes: qué reutilizar y qué cambiar

Las variantes siguientes **no están presentes en el video ni implementadas**. Son recetas nuevas derivadas del motor lógico descrito, no publicaciones existentes.

| Variación | Núcleo que se conserva | Cambios mecánicos imprescindibles | Arte/UX que la hacen distinta |
|---|---|---|---|
| **Tren nocturno** | Cabeza + segmentos + avance en celdas | Cola = vagones; recoger pasajeros en estaciones, entregarlos en un destino, bifurcaciones de vías; colisionar con señales | Ciudad nocturna ilustrada, vagones diferenciados, andén y mapa de líneas |
| **Abejas del invernadero** | Movimiento + recogida + cadena | Recolectar polen, fecundar flores para abrir nuevas rutas; energía limitada; sin autocolisión clásica | Jardín de láminas botánicas, flores en diferentes estados, vuelo visible |
| **Dragón de papel** | Segmentos siguiendo trayecto | Girar con inercia, cuerpo se curva; misiones de vuelo entre campanas, no comer | Teatro de sombras recortadas, articulación y animación de tela |
| **Hilo del faro** | Historial de posiciones | La cola es una cuerda que debe conectar dos puntos sin cortar el camino; tensión y anclajes | Puerto ilustrado, mapas náuticos, cabo dibujado con textura |
| **Rescate en incendios** | Grilla + actor + colisiones + objetivos | Recoger supervivientes; cambiar longitud por carga/velocidad; zonas que se cierran y rutas seguras | Ciudad en corte isométrico, humo informativo, mapas de peligro |
| **Micelio en crecimiento** | Expansión por celdas + puntos de alimento | En vez de cola móvil, dejar un **grafo persistente** de colonización con bifurcaciones; bloquear patógenos | Macroilustraciones de hongos, raíces y terreno húmedo |
| **Cables del observatorio** | Cuadrícula + secuencia de posiciones | Trazar cable desde fuente a receptor, evitar cruces y resolver puentes/conexiones, pulsos eléctricos | Instrumentos científicos, cableado de cobre, luz con función |
| **Caravana de mensajes** | Seguimiento y recogidas | Acumular cartas, entregarlas a destinatarios, rutas alternativas y riesgo de perder carga | Mundo editorial ilustrado, personajes y diarios desplegables |
| **Serpiente de tinta** | Movimiento discreto + historial | Pintar espacios y capturar regiones cerradas; la cola desaparece o se solidifica según reglas | Libro pop-up y manchas orgánicas, papel, sonido de plumín |
| **Sombras del museo** | Acción direccional y contacto | Guardias/luces patrullan; evitar visión, recoger piezas, esconderse; cola = estelas temporales visibles para IA | Salas ilustradas, focos verdaderamente útiles, minimapa |
| **Constelaciones vivas** | Colección + secuencia | Cada recogida agrega una estrella y la línea conecta nodos; patrones completados dan victoria | Carta astral con signos ilustrados, lectura visual de conexiones |
| **Río de memorias** | Segmentos ordenados + objetivos | Actor avanza con corriente; los segmentos son barquitos a rescatar que deben llegar juntos | Paisaje acuarelado, corriente visible, puentes y remolinos |

### Tres conversiones con el menor trabajo de motor

**A. Tren nocturno**: mantener `head/body/direction/step`; `food` pasa a `station`; `growth` crea un vagón; `lose` se activa ante cruce con obstáculo de vía. El renderer cambia por atlas de locomotora, vagones y ciudad. Añadir entrega para que no sea solo Snake con sombrero.

**B. Cables del observatorio**: mantener grilla, dirección y trazado histórico; transformar `body` en cable persistente (sin `pop`) mientras se dibuja, y permitir borrar/retraer. En vez de comida se buscan dos puertos. Las pruebas de cruce sustituyen autocolisión.

**C. Micelio**: mantener `Cell`, generación de objetivos y colisiones con ocupación; reemplazar historial lineal por un `Set`/grafo de celdas colonizadas. Una celda abre varias ramas simultáneas; el movimiento deja de ser locomoción. Reutilizar este código no equivale a forzar a que todo juego sea una serpiente.

## 6. Variaciones por aspecto de control

| Control | Conversión de input | Riesgo que hay que probar |
|---|---|---|
| Teclado cardinal | `keydown` → dirección pendiente; `keyup` si aplica | Giro inverso ilegal, repetición de tecla, pérdida de foco |
| Botones táctiles | `pointerdown/up` con `setPointerCapture` | Pulsaciones simultáneas, salida del dedo, `pointercancel` |
| Deslizamiento | `pointerdown` + delta de gesto > umbral → dirección | Scroll involuntario, bordes, pulgares |
| Clic a destino | Coordenada DOM → cámara → celda del mundo → plan de ruta | Scroll de página, escala CSS, clic fuera de zona caminable |
| Cursor continuo | Vector objetivo → orientación; **otro modelo físico** | Latencia, saltos de posición, movimiento involuntario |
| Mando | Gamepad API → acciones discretas | Zona muerta, desconexiones, navegación con foco |

**Advertencia específica al usuario:** el movimiento por mouse del Snake avanzado **no funciona bien según Hugo**. Para una variante exploratoria, el cursor solo puede orientar cámara o señalar destino; la caminata nunca debe dispararse por pasar el mouse sobre el canvas.

## 7. Pruebas por ejemplos: el contrato antes de los gráficos

Aplicar ejemplos (Adzic) → implementación pequeña (Beck) → pruebas del componente real y del navegador (Freeman/Pryce).

| Dado | Cuando | Entonces |
|---|---|---|
| Cabeza (2,2), cuerpo [(1,2),(0,2)], dirección derecha, comida (3,2) | Avanza 1 tick | Cabeza (3,2), cuerpo [(2,2),(1,2),(0,2)], +1 punto, nueva comida libre |
| Igual estado, comida lejos | Avanza 1 tick | Cabeza (3,2), cuerpo [(2,2),(1,2)], misma longitud |
| Cuerpo con longitud >0, dirección derecha | Usuario pulsa izquierda | No cambia a dirección inversa (si regla `allowReverse=false`) |
| Cabeza (2,2), cuerpo [(2,3),(3,3),(3,2)], dirección derecha, **sin comida** | Avanza a (3,2), celda que era cola | Permitido bajo política clásica: la cola sale en el mismo tick |
| Ese mismo estado con **comida en (3,2)** | Avanza al segmento final | Colisión: la cola NO se retira por crecimiento |
| Una fruta aparece en celda ocupada en un intento aleatorio | Generar objetivo | Elegir celda distinta, válida y alcanzable según reglas |
| Grilla totalmente ocupada | Generar objetivo | Declarar victoria o tablero completo, jamás bucle infinito |
| Falla por choque | Reinicio completo | Estado inicial, marcador y cadenas reiniciados una vez |
| Se muestran 50 segmentos | Se ejecutan 100 ticks sin crecer | No se crean/destruyen 5.000 objetos visuales; se mueven instancias existentes |
| Navegación en celular con ancho 360 px | Abrir juego / tocar controles | Tablero legible, botones utilizables y scroll externo controlado |
| Navegador sin WebGL o assets no cargan | Abrir juego | Mensaje de error real o fallback explícito; no pantalla vacía ni éxito inventado |

**Pruebas de variante:** escribir primero un ejemplo que ya **no** sea Snake. Tren: «tres pasajeros a bordo, al entrar en estación de destino se descargan y se registra entrega». Cable: «se conectan dos puertos sin cruce y se energiza la red». Hongo: «dos puntas crecen desde un nodo, por lo que ya no existe una cola lineal».

## 8. Procedimiento mínimo para construir una variante sin reconstruir

1. Recuperar este directorio y el **estado actual** del laboratorio PixiJS desde `gh-pages`; comprobar PRs concurrentes antes de elegir rama.
2. Elegir **una fantasía**, **una nueva regla central**, **un riesgo** y **un acabado artístico** de la matriz. Dejar constancia de lo que ya no será igual al tutorial.
3. Copiar **solo el núcleo conceptual de datos y transición**, no los dibujos de cuadrados ni los hacks de rendimiento. Antes de escribir la vista, validar los ejemplos lógicos.
4. Construir pantalla real con PixiJS: tamaño táctil, protagonista, objetivo, respuesta de entrada y HUD. Un arte temporal sobrio es preferible a geometría decorativa de «demo».
5. Conservar al menos una escena completa, un principio y un final. Probar navegador real en escritorio y móvil, incluido el caso de no tener assets/red.
6. Registrar licencia, fuente de assets, costos de red, cámara, FPS, memoria aproximada y limitaciones. Sin credenciales ni tracking.
7. Versionar en una carpeta nueva `widgets/pixijs/<nombre>/vN/` sin editar versiones anteriores; publicar y escribir `registry/pixijs.json` **solo tras demostrar URL servida**. Los documentos de este manual **no son widgets**.

## 9. Lista de fallas a evitar desde el primer commit

- [ ] Lint desactivado globalmente o advertencias ignoradas permanentemente.
- [ ] Ejes intercambiados / signos incorrectos al mover.
- [ ] Cabeza y segmentos comparten la misma referencia de objeto.
- [ ] `Graphics` regenerados en cada tick o `removeChildren()` sin limpieza.
- [ ] Framerate visual usado como única fuente de tiempo lógico sin política de atraso.
- [ ] Dos giros acumulados en el mismo paso provocan inversión inesperada.
- [ ] Comida aparece bajo actor, dentro del cuerpo, fuera del tablero o en un obstáculo.
- [ ] Último segmento usado erróneamente para autocolisión cuando sale del tablero lógico.
- [ ] El jugador sale de límites sin que haya una regla definida.
- [ ] El mapa no responde a distintos aspectos y tamaños de pantalla.
- [ ] El cursor mueve personaje sin intención explícita del jugador.
- [ ] Capas dibujadas en orden inadecuado; objetivo tapa al actor de manera confusa.
- [ ] El reinicio solo borra segmentos pero deja HUD, marcador, timers o efectos inconsistentes.
- [ ] Se confunde una prueba en mock con una prueba en Chromium/Firefox real.
- [ ] Un documento técnico se registra como «widget publicado».

**Resultado buscado:** un próximo chat debe poder elegir una receta, definir cuatro o cinco invariantes y empezar por tests, con un camino corto hacia un juego con identidad, controles robustos y licencia verificable.
