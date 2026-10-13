# PLAN EJECUTABLE · PIXIJS · FASE 2

**Estado:** aprobado únicamente para preparación durante Fase 1, desarrollo/publicación de los tres widgets autorizado cuando el usuario envíe exactamente `.`. **No empezar antes.** Fecha: 13/10/2026 (Argentina).

**Recuperación de un chat nuevo:** abrir primero `atlas-tecnico/v2/conocimiento.json`, este plan y los dos documentos en `docs/`. Consultar HEAD real de `gh-pages`, `AGENTS.md`, `coordination/GLOBAL_AGENT_CONSTITUTION_V1.md`, `agent-runtime/epoch.json`, `laboratorios-js/CONTRATO.md` y `registry/pixijs.json`. Verificar PR #108 y #109 y el estado servido antes de tocar archivos. Esta fase guarda conocimiento para una IA futura, no deja tareas corriendo.

## Regla de ejecución y límites de autoridad

- Proyecto GitHub: `JuanManuelPM/prometeo`. Único escritorio PixiJS: `https://juanmanuelpm.github.io/prometeo/laboratorios-js/?lab=pixijs`.
- Rutas de escritura: `laboratorios-js/widgets/pixijs/**` y, **tras verificar servidas y probadas**, `laboratorios-js/registry/pixijs.json`. No modificar portada, índice general, constitución, otra biblioteca, TV, proyectos personales ni infraestructura global.
- Cada producto debe contener `index.html`, `README.md`, tests (`tests.mjs` o equivalente), fuentes/licencias y notas de verificación. Código y gráficos originales o con licencia clara. Nada de rutas ni botones simulados.
- `PixiJS 8` debe estar **realmente ejecutándose** cuando se afirma Pixi. Un fallback Canvas 2D es compatible, pero siempre debe informarse cuál renderer está activo. El CDN externo es gratuito pero exige conexión; para cero dependencia offline se puede incluir el runtime MIT vendorizado en versión fijada, previa auditoría de licencia y peso. Nunca API de pago, cuota o credencial.
- El iframe del escritorio tiene `sandbox` sin `allow-same-origin`: no `localStorage`, IndexedDB ni fetch relativas dependientes de CORS. Preferir HTML autocontenido y recursos embebidos, o URLs absolutas públicas sin secretos. Exportación mediante descargar JSON si sandbox lo permite; si no, copiar JSON como texto seleccionable.
- Cada cambio abre rama propia; conflicto con otro chat se resuelve por scope/merge, no por `force`. Los PR #108 y #109 no son evidencias de publicación. No declarar éxito sin bytes servidos en Pages y prueba UI real.

## EXPERIENCIA 1 · Proyecto emblemático

### «El bosque de las cartas · edición definitiva»
**Tipo:** aventura exploratoria 2D, horizontal, ilustrada, con un capítulo completo. **Destino:** `widgets/pixijs/bosque-de-las-cartas/v1/` **solo si la carpeta del PR #108 aún no fue publicada**; si existe v1 servida, continuar en `v2/`, sin sobrescribirla. **Origen:** PR #108 (`feature/lab-pixijs-bosque-de-tinta-v1-20261013`, commit histórico `0f5dff9...`), que incluye HTML, créditos y tests. Primero revisar estos bytes. El juego no se reconstruye desde cero.

**Historia y fin observable.** La caminante atraviesa cinco planos de un bosque nocturno para reunir tres cartas extraviadas, llega a un faro e inicia un desenlace. Un principio legible, tres hitos y un final real son mínimos, no decoraciones.

**Visual:** paleta verde oscura, cortezas y tinta, trazo botánico irregular, telas terracota, paisaje continuo; spritesheet de seis o más fotogramas con marcha y descanso; iluminación y parallax proporcionados, primer plano que oculta al personaje naturalmente. Ninguna lluvia de círculos ni pantallas negras con botones. Preferir arte existente **original del PR #108** si se puede aprovechar; no importar imágenes de un videojuego comercial.

**Interacción:** WASD/flechas con keydown/keyup; controles táctiles grandes, clic/toque para destino solo si hubo intención explícita; recogida única por carta, HUD 0/3 → 3/3 y textos; al faro con menos de 3 no termina, con 3 concluye; reinicio completo; mensajes por estado. Cámara sigue personaje y clampa mundo sin revelar vacíos.

**Arquitectura:** `GameState` con `player:{x,y,vx,vy,direction}`, `collected:Set<ID>`, `ending`, `camera`; `input` normalizado; fixed timestep o delta real acotado; `PIXI.Application` + `Container` por capa + `AnimatedSprite` + `Sprite` + Atlas. Partir del código preexistente y preservar su contracto, incluidos fallback y accesibilidad. Evitar instanciar gráficos cada frame, limitar DPR, verificar Pixi v8 exacto y URL CDN.

**Recursos:** arte SVG/Canvas original generable desde el código candidato, sin assets terceros; PixiJS MIT. Comprobar el archivo pixi.min.js fijado realmente existente en CDN o vendorizado autorizado; no asumir que 8.21.0 está disponible sin comprobar. Sin música necesaria; sonidos solo con interacción humana y fuente autorizada.

**Pruebas por ejemplos (TDD):** (B1) carga inicial crea personaje, fondo, HUD con renderer visible; (B2) pasar mouse sin clic no mueve; (B3) clic/teclas/táctil mueven, cámara sigue y se detiene al soltar; (B4) recoger cada carta exactamente una vez, cualquier orden; (B5) faro bloquea final con 0–2 cartas; (B6) faro + 3 da pantalla de desenlace; (B7) reiniciar restaura estado/tiempos y foco; (B8) fallo CDN informa fallback o error, nunca dice Pixi activo; (B9) móvil 360×720 y escritorio ≥1280 sin clipping ni scroll accidental; (B10) 120 s sin errores ni crecimiento descontrolado.

**Aceptación:** pruebas de lógica y Chrome/Firefox (táctil/teclado) + Pixi WebGL real activo con captura; revisión visual de escena completa, terminal, medidas básicas de memoria/FPS en móvil; luego merge/página/registro y URL comprobadas. **Prohibido registrar antes.**

**Ampliación futura:** escenas alternativas, editor de diálogo, inventario, criaturas, recorridos narrativos.

## EXPERIENCIA 2 · Laboratorio interactivo

### «Atelier de Mundos · inspector de escena»
**Tipo:** herramienta de construcción visual, no un juego narrativo. **Destino:** `widgets/pixijs/atelier-de-mundos/v1/`. **Origen:** HTML local `Atelier_PixiJS_Mundos_Vivos.html` y `Anatomia_de_Juegos_PixiJS_Laboratorio.html`, ambos con pruebas Canvas en conversaciones anteriores. **No asumir que el Pixi remoto fue probado**; estos archivos están disponibles en la conversación que los creó, no en GitHub, por lo que si una IA nueva no puede acceder a ellos debe recuperar la descripción y reproducir contratos, no inventar que leyó bytes.

**Propuesta:** escena de bosque original y objetos seleccionables; al tocar personaje, fondo, vegetación o pickup muestra tipo, transformación y datos verdaderos; sliders afectan propiedades reales y actualizan frame/texto; microscopio pausa animaciones y avanza estados; control de capas y parallax; cambio de filtro y vista sin filtro; editor de propiedades y exportación transparente.

**Visual:** escritorio creativo editorial con canvas central dominante, barra de herramientas contenida, inspector abajo en móvil, panel lateral opcional en escritorio. Botones accesibles, estados activos distinguibles; tipografía legible, no mini-tarjetas.

**Funciones y componentes:** (A) selección de escena y correspondencia objeto↔`PIXI.Container`/`Sprite`/`AnimatedSprite`; (B) timeline manual `frame/step` con pausa, siguiente/anterior y scrub; (C) editor de transformaciones, orden, cámara/parallax, filtros; (D) inspector de performance medido (fps de ticker real, número de nodos renderizados); (E) presets y exportación del estado como JSON legible; (F) undo/redo real mediante historial de comandos. Persistencia por archivo de exportación o texto, no `localStorage`.

**Arquitectura:** `DocumentModel{entities,properties,selection,history,playback}`, `ActionBus`, `PixiSceneAdapter`, `Inspector`, `Timeline`, `Exporter`; recursos preparados una vez y sincronizados por diff. Las operaciones tienen inverse/undo determinista. No confundir «simular un objeto» con referenciar el Pixi stage real.

**Recursos:** capas y sprites ilustrados originales producidos para este widget; PixiJS 8 MIT; cero API externa de IA. Se puede reutilizar el atlas o arte original del bosque si la licencia y propietario lo permiten, pero evitar acoplamiento entre carpetas distintas.

**Pruebas por ejemplos:** (A1) inspeccionar árbol real muestra sus `x/y`, escala y capa; (A2) arrastrarlo modifica simultáneamente canvas y modelo; (A3) cambiar blur afecta imagen y poder deshacer restaura original; (A4) slider de parallax modifica la relación de dos capas visible; (A5) pause/siguiente/anterior mueve frame y lo reporta correctamente; (A6) cambiar sprite de personaje no cambia lógica del actor; (A7) export JSON contiene estado actual; importar crea estado equivalente; (A8) 100 operaciones undo/redo no pierden nodos ni crean leak; (A9) móvil conserva área de juego usable, foco y pointercancel; (A10) error WebGL o CDN no produce UI ficticia. Asegurar reduced-motion.

**Aceptación:** todo control cambia estado real, cálculo de FPS usa tiempo real y no promesa; medición y screenshot real con Pixi activo; exportación reproducible; prueba offline identifica fallback, sin falso éxito.

**Ampliación:** catálogo de entidades/prefabs, nodos de comportamiento y edición de mapas guardables.

## EXPERIENCIA 3 · Variación radical

### «Micelio · la red bajo el bosque»
**Tipo:** estrategia botánica por turnos/tiempo con mapa de subsuelo ilustrado. **Destino:** `widgets/pixijs/micelio-subsuelo/v1/`. **Origen:** transcripción Snake de Hugo, variantes del PR #109 y aprendizaje del prototipo local de jardín. **Mutación central:** la serpiente tiene una cabeza y una cola móvil; aquí la red es un **grafo persistente con múltiples extremos que crecen simultáneamente**. No es un reskin de Snake.

**Juego completo:** bosque seccionado en sustrato, vetas húmedas y piedra; un núcleo de micelio comienza con energía; jugador selecciona una punta y dirección, coloniza celdas conectadas; nutrientes aumentan energía, materiales endurecidos cuestan más, zonas contaminadas degradan; objetivos: conectar tres árboles mediante una misma red dentro de presupuesto. Victoria visible y reinicio; derrota por no poder crecer y energía agotada. Tres biomas y curvas de dificultad.

**Visual:** corte botánico realista/estilizado, raíces finas orgánicas, filamentos blancos, textura de suelo, insectos y esporas discretas; crecimiento progresivo de ramas según grafo, estados cromáticos de humedad/contaminación. No dibujar una fila de cuadrados disfrazada de hongo.

**Mecánicas:** `cells:Set<string>`, `edges:Map<id,Set<id>>`, `tips:Set<Cell>`, `energy:number`, `resources`, `connectedTrees`; cada orden `GROW(tip,neighbor)` valida vecindad, coste, ocupación y sustrato; al aceptar añade nodo/arista permanente (no hay `pop`); fuentes de energía se recogen una vez; poder de ramificación permite múltiples puntas; BFS desde núcleo verifica conectividad; un step periódico propaga peligro, no mueve cabeza automáticamente.

**Arquitectura:** núcleo puro con `grow`, `spreadHazard`, `connectedComponents`, `winCondition`; renderer PixiJS dibuja suelo estático por capas y filamentos con Geometry/GraphicsContext reutilizado o Mesh si procede, no redibuja todas las ramas cuando cambia una. Pointer/teclado/táctil traducidos a acciones, no tienen privilegios sobre motor.

**Recursos:** arte botánico propio o CC0 con URL, dimensiones y atribución; PixiJS MIT. Sin generador de imágenes comercial ni API paga. Generación de mapas seeded y escenas fijas reproducibles.

**Pruebas por ejemplos:** (M1) una punta puede generar dos ramas y ambas permanecen; (M2) crecer a piedra sin energía suficiente no modifica la red; (M3) recolectar el mismo nutriente dos veces no duplica energía; (M4) conectar árboles por caminos distintos activa la misma victoria; (M5) contaminación cierra un borde si la regla lo prevé, recalcular conectividad; (M6) 0 energía y ninguna expansión = derrota, no pantalla congelada; (M7) teclado/táctil pueden elegir punta sin desplazar viewport; (M8) restart restaura semilla y límites; (M9) 20 turnos generan grafo válido sin ciclos ilegales o referencias huérfanas; (M10) móvil 360px con botones manipulables.

**Aceptación:** primera partida gana y pierde en escenarios testeados; no hay serpiente lineal ni mecánicas de recogida triviales; visual de suelo y micelio orgánico, Pixi render real, FPS y consumo medidos; una sola descarga sin credenciales.

**Ampliación:** ecosistemas cooperativos locales, simulación de humedad y defensa de raíces.

## Orden operativo al recibir «.»

1. Leer HEAD/registro, PR #108/#109, datos del atlas y contrato. Detectar cambios concurrentes con scopes reales, proteger la ruta del atlas.
2. Definir `SPEC.md` de cada widget y escribir tests de transición; comprobar fallos esperados antes del código. Elegir tres escenas con identidad visual muy distinta.
3. Desarrollar **Bosque** preservando PR #108 y mejorando renderer y UX; ejecutar test Pixi real; corregir.
4. Desarrollar **Atelier** como herramienta productiva reutilizando conceptos del bosque pero sin importar la escena del juego por HTTP ni tener dependencia entre widgets.
5. Desarrollar **Micelio** desde motor de grafo puro, tests de turnos, historia/objetivo, renderer y animaciones.
6. Ejecutar QA en Chrome/Firefox si están disponibles con 360/390/768/1440px, teclado, puntero y toque, assets/CDN/red; capturas reales + errores de consola. Si no hay navegador real disponible, dejar candidato comprobable pero no afirmarlo probado.
7. Publicar cada widget en carpeta versión nueva sin modificar anteriores; integrar branch cuando pase su aceptación. Verificar URL servida de cada `index.html`, actualizar JSON Pixi **solo para URLs servidas probadas**, verificar retorno JSON y página de laboratorio con iframes visibles; un incidente en una experiencia no debe bloquear la que sí pase.
8. Persistir resultados, SHA, fechas argentinas, screenshots de producto, errores reales y decisión de aceptación en `README.md` de cada versión. Mantener atlas registrado y accesible.
9. No crear otro motor global, trabajo asincrónico o sistema de métricas inventadas.

## Tabla de correspondencias y preservación

| Trabajo previo | Conservar | Corregir/cambiar | Riesgo |
|---|---|---|---|
| Tutorial Hugo | cuadrícula, tipos, movimiento, colisión, `unshift/pop` | paso fijo, spawns libres, UI táctil, gráficos reutilizables | licencias/URL de video ausentes |
| PR #108 | bosque, cámara, sprites animados, cartas, final | verificar Pixi v8/CDN, navegador real y publicación, polido visual | no confundir mock con WebGL |
| PR #109 | conocimiento categorizado y 12 variantes | pasar conocimiento estable al atlas | PR borrador no es Pages |
| Anatomía de Juegos local | inspección, historial, microscopio y mutaciones | PixiJS real en producto, mejor composición | solo Canvas 2D comprobado |
| Atelier local | bosque, editor, zoom, selección, exportación | manejo real de objetos/frames, historial determinista | CDN y renderer no verificados |

## Criterios transversales finales

- **Beck:** al escribir una regla nueva, primero caso fallido, luego implementación mínima y refactor.
- **Adzic:** ejemplos Given/When/Then para victoria, colisión, tocar, deshacer y reiniciar.
- **Freeman + Pryce:** arrancar una pequeña ruta end-to-end en navegador/DOM y mantenerla viva mientras se desarrollan componentes.
- **Visual:** escenario con intención; personaje legible; titular, HUD y botones proporcionados; 360px obligatorio, sin panel desktop aplastado.
- **Seguridad/privacidad:** no secretos, sin tracking, ningún dato privado; lectura pública, escritura solo mediante conector GitHub autorizado.
- **Verificación:** separar `bytes locales`, `commit/PR`, `test simulado`, `test navegador real`, `aceptación`, `served`. El resultado de uno no prueba los otros.
- **Reversión:** cada widget conserva `v1/v2`; el JSON puede volver a versión previamente servida si falla una nueva; nunca fuerza update de rama ajena.
