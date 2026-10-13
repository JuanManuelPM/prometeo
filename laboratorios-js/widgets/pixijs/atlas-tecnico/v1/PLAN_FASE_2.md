# PixiJS · Fase 2 autorizada exclusivamente por el mensaje «.»

**Estado:** PLAN EJECUTABLE, NO TRES WIDGETS TERMINADOS. **Fecha:** 13-10-2026 (Argentina). **Repositorio:** `JuanManuelPM/prometeo`, base `gh-pages`.

## Leer primero sin pedirle documentos al usuario

1. `laboratorios-js/widgets/pixijs/atlas-tecnico/v1/knowledge.json` y `index.html`. Inventario de fuentes, 16 familias de capacidades, errores, patrones y decisiones.
2. `laboratorios-js/CONTRATO.md`, `AGENTS.md`, `coordination/GLOBAL_AGENT_CONSTITUTION_V1.md`, EPOCH vigente y `laboratorios-js/registry/pixijs.json`. Respetar estructura, concurrencia y seguridad.
3. PR #109: `laboratorios-js/widgets/pixijs/manual-snake/v1/README.md`, `01_DESPIECE_DEL_TUTORIAL.md`, `02_MOTOR_Y_VARIACIONES.md`. Es conocimiento documentado en rama draft; verificar si ya fue integrado. Si no, leer usando ref del PR.
4. PR #108: `laboratorios-js/widgets/pixijs/bosque-de-las-cartas/v1/index.html`, `CREDITOS.md`, `tests.mjs` como candidato; **nunca anunciar que está publicado**, ni reescribir `v1` si se integró.
5. HTML locales de esta conversación si siguen montados: `/mnt/data/Anatomia_de_Juegos_PixiJS_Laboratorio.html` y `/mnt/data/Atelier_PixiJS_Mundos_Vivos.html`. Son prototipos y no demuestran ejecución PixiJS; extraer lógica, diseño UX, casos de prueba, no asumir que otra IA pueda montarlos.
6. Referencias externas: [PixiJS v8](https://pixijs.com/8.x/guides), [Open Games MIT](https://github.com/pixijs/open-games), [Puzzling Potions](https://github.com/pixijs/open-games/tree/main/puzzling-potions), [Bubbo Bubbo](https://github.com/pixijs/open-games/tree/main/bubbo-bubbo). Comprobar licencias de assets individualmente.

## Arquitectura compartida: reutilizar conocimiento, NO forzar tres juegos iguales

Tres aplicaciones aisladas en carpetas de PixiJS, sin infraestructura adicional ni dependencia de localStorage; un HTML que funcione dentro de iframe `sandbox` y aislado. Cada una debe poder cargarse directamente. Recursos relativos; si usa CDN, fijar versión, detectar fallos y declarar necesidad de conexión.

**Principios:** Kent Beck: tests de lógica antes de implementar; Adzic: ejemplos de aceptación concretos; Freeman/Pryce: pruebas de extremo a extremo con productos reales, no mocks presentados como pruebas del navegador. Primero funcionalidad visible y coherente, luego pulido, optimización y publicación.

### 1) PROYECTO EMBLEMÁTICO · EL BOSQUE DE LAS CARTAS

**Rol:** aventura narrativa 2D realmente terminada, continuación *verificada y reconciliada* del candidato PR #108.

**Carpeta propuesta:** `laboratorios-js/widgets/pixijs/bosque-de-las-cartas/v1/` si el PR aún no se integró y se puede completar ese candidato; si se integró o si el alcance cambia materialmente, **crear v2**, no sobrescribir v1 publicada.

**Experiencia:** recorrer un bosque editorial ilustrado con camino, colinas, vegetación y parallax; protagonista animado, cámara que acompaña, tres cartas con mensajes distintos y un faro como final de historia. Hay presentación, un recorrido con decisiones de interacción, cierre, reinicio y accesibilidad.

**Mecánicas:** movimiento discreto/continuo elegido con criterio; clic para ir a un destino, WASD/flechas y control táctil; recoger objetos dentro de radio; avance narrativo; HUD de progreso, estado y fallos. Lo distintivo es exploración y narrativa, NO una serpiente disfrazada.

**Técnicas reutilizadas:** escena y orden de capas, `AnimatedSprite`, `Sprite`, `Ticker`, cámara, input abstracto, colisiones y eventos, parallax, hit-testing, gestión de assets. Evitar geometría genérica y retener personalidad artística.

**Bibliotecas:** PixiJS 8 obligatorio; nada más salvo que mejore objetivamente el producto. Audio optativo y con gesto de usuario, recursos CC0 propios o de origen contrastable; no copiar assets del showcase.

**Fases de implementación:** (a) leer PR #108 y tests; (b) comprobar que CDN PixiJS versionada existe y realmente carga; (c) reparar ruta Pixi principal en Chromium; (d) analizar ilustración/cámara/personaje con capturas en 360px y 1440px; (e) añadir detalles y texto narrativo completo; (f) probar interacción teclado, pointer, toque, terminar/reiniciar; (g) optimizar y publicar.

**Criterios de aceptación (ejemplos):**
- Dado bosque sin iniciar, al abrirlo, se ve ya el personaje y entorno, sin pantalla vacía.
- Dado movimiento con flechas, al pulsarlas, cambia la posición real y la cámara conserva al protagonista.
- Dadas tres cartas disponibles, al recogerlas de a una se actualiza el inventario; cada carta se recoge una sola vez.
- Dadas las tres cartas recogidas y destino alcanzado, aparece un epílogo real; reiniciar reconstruye estado.
- Con pantalla móvil 360×740, personaje, controles e inventario siguen legibles.
- **Verificador de Pixi**: el canvas procede de `app.init`, las entidades se agregan al `stage` y la API PixiJS carga; una ruta Canvas fallback debe señalarse como fallback, nunca como Pixi comprobado.

**Ampliaciones:** personajes conversables, cartas ramificadas, clima, audio ambiental con consentimiento, editor de mapas.

### 2) LABORATORIO INTERACTIVO · ÓPTICA DE PÍXELES

**Carpeta:** `laboratorios-js/widgets/pixijs/optica-de-pixeles/v1/`.

**Rol:** laboratorio que permite dominar la relación entre **estado, render, animación y costos GPU**, en un escenario ilustrado representativo y no un muro de botones.

**Experiencia:** el usuario modifica directamente un escenario con capas de montaña, vegetación y personajes; compara modos (sprite estático, sprite animado, parallax, máscara/filtro, partícula) y visualiza consecuencias con un antes/después o controles vinculados a objetos en pantalla. Editor de escena de verdad: seleccionar → modificar → guardar la configuración como JSON descargable → volver a cargarla.

**Controles:** pausar/avanzar 1 tick/reproducir, velocidad, cámara, intensidad del filtro, densidad de efectos, escala de sprites, giro, orden visual y cantidad de partículas. Las métricas no pueden ser números inventados: FPS medido desde `ticker` con media y tiempo actual; conteo real de entidades. Un preset visual sobrio para celular.

**Técnicas:** `GraphicsContext`, `Assets`, `AnimatedSprite`, `Sprite`, `Container`, filtros, `RenderTexture` si procede, `ParticleContainer` **v8 con `Particle` y `addParticle`**, timestep fijo, limpieza de recursos. Reconocer que ParticleContainer tiene API experimental.

**Fases:** (a) maqueta de escena con una interacción completa; (b) manipulación en Pixi sin recrear objetos por frame; (c) integración control ↔ escenario ↔ explicación técnica; (d) guardado/exportación/importación sin localStorage; (e) métricas auténticas; (f) test móvil y rendimiento.

**Criterios de aceptación:**
- Dado un objeto seleccionado, al cambiar escala/posición, modifica **esa instancia** en escena y conserva las demás.
- Al modificar parallax, se mueven capas a velocidades relativas diferentes, sin alterar la coordenada del actor.
- Al pausar el tick lógico, la simulación deja de avanzar; avanzar un paso produce exactamente un cambio lógico.
- Al desactivar partículas, baja la cantidad **real**, no una cifra decorativa.
- Exportar JSON e importarlo reproduce la escena y controles sin almacenamiento persistente.
- Móvil 360px: interacción táctil accesible, panel legible y sin scroll horizontal.
- FPS aparece como medido con etiqueta de método/intervalo, no como un valor fijo o simulado.

**Ampliaciones:** profiler de draw calls con fuente real, editor de atlas, shaders propios, presets de dispositivo, captura PNG mediante APIs autorizadas.

### 3) VARIACIÓN RADICAL · JARDÍN DE MICELIO

**Carpeta:** `laboratorios-js/widgets/pixijs/jardin-de-micelio/v1/`.

**Rol:** transformar el mecanismo del cuerpo de Snake en **una red ramificada persistente**, con jugabilidad estratégica. No existe ya una cabeza que arrastra una cola móvil.

**Experiencia:** en un corte del subsuelo ilustrado, expandir una colonia de micelio para conectar zonas fértiles antes de agotar agua/energía; manejar dos recursos y un mapa de distintas clases de terreno. El jugador elige puntas de crecimiento y caminos; cada segmento queda fijo, puede bifurcarse y transportar recursos a la colonia.

**Reglas:** mundo discreto de celdas; cada celda puede ser suelo, roca, nutriente, hongo o red; red como grafo `Set<Node>` + adyacencia; un paso añade un nodo adyacente si hay recurso y celda libre; nodos conectados a depósitos reponen energía; objetivos por conexión/colonización, no por comer y crecer sin objetivo. Un modo de tensión equilibrada: humedad disminuye en algunos terrenos y puede recuperarse; derrota por recursos cero sin movimientos válidos y victoria al conectar tres nodos especiales.

**Origen de la técnica:** `Coordinate`, grilla, contacto, generación y step determinista del tutorial Snake; **reemplazo radical de `body.unshift/pop`** por grafo de crecimiento que no pierde la cola. Las reglas y objetivos se transforman.

**Visual:** red ramificada orgánica con raíces dibujadas de manera irregular y distintas capas de suelo; sprites ilustrados para flora, minerales y depósitos; cambios de escena según humedad; guía cromática accesible, símbolos además de color.

**Bibliotecas:** PixiJS 8; motor de reglas puro y serializable. Evitar librerías adicionales salvo que aporten algo esencial.

**Fases:** (a) tests de expansión/ramificación y conectividad; (b) tablero lógico pequeño con 2 tipos de terreno; (c) renderer Pixi con cámara/zoom/selección táctil; (d) sistema de 2 recursos y objetivo visible; (e) progresión, reinicio y partida reproducible con semilla; (f) tutorial dentro de la experiencia, QA y pulido.

**Criterios de aceptación:**
- Dado un nodo inicial y dos celdas libres adyacentes, se pueden crear **dos ramas simultáneas** sin mover ni borrar nodos existentes.
- La red no puede crecer sobre roca o fuera de límites, ni atravesar desconexiones.
- Conectar un depósito cambia de verdad la generación de recursos por tick.
- Una partida terminada muestra condición de victoria o derrota inequívoca; reinicio restablece mundo y recursos.
- Dos partidas con igual semilla + mismas acciones generan estados idénticos.
- Móvil 360px: seleccionar una celda y confirmar expansión sin toques ambiguos ni navegación accidental.

**Ampliaciones:** bacterias competidoras, estaciones climáticas, reglas ecológicas, múltiples especies, replays compartibles.

## Orden de ejecución al recibir «.»

1. **Recuperar este plan**, atlas y fuentes. No discutir ideas con el usuario ni solicitar copia de chats.
2. Inspeccionar HEAD de `gh-pages`, `pixijs.json`, PR #108/#109 y rama propia, detectar cambios concurrentes y contrato vigente.
3. Construir/testear los **tres componentes por separado** sin tocar otras bibliotecas. Test-first para funciones de motor.
4. Hacer pasar pruebas de navegador con **PixiJS auténtico**, Chromium desktop y 360px, clicks, teclado, pointer, screenshots y mediciones. Si falta conexión a CDN usar una distribución local legal verificable, o dejar bloqueo explícito, no afirmar que Pixi pasó.
5. Revisar copyright/licencia de **cada** textura, sonido y tipografía; evitar datos privados.
6. Crear tres versiones en carpetas distintas, sin reescribir versiones publicadas.
7. Registrar entradas como **widgets experimentales terminados**, cada una con `current_version`, `versions`, `url`, `published_at`, `notes`, sólo si sus archivos efectivamente están publicados y sirven en Pages. **Conservar el atlas sin cambios**.
8. Abrir página `https://juanmanuelpm.github.io/prometeo/laboratorios-js/?lab=pixijs`, comprobar las tres URLs, controles, carga sin hacer clic en botón de inicio, móvil, y registrar commits/capturas.
9. Si hay bloqueo de permisos/red/QA, conservar archivos y reportar el bloqueo exacto; no falsear publicación.

## Política de aceptación y continuidad

La señal `.` constituye **autorización humana expresa para desarrollar y publicar los tres widgets**, pero **no** dispensa de revisión de seguridad, copyright, tests reales ni reconciliación de concurrencia. No publicar ejercicios a medio terminar como juegos.

Publicar un informe de aceptación por widget con commit SHA, navegador, resolución, motor activo (Pixi o fallback), casos pasados, rendimiento, licencia, URLs y regresiones conocidas. Un nuevo chat debe poder recomenzar solo con este archivo y el atlas sin pedirle nada al usuario.
