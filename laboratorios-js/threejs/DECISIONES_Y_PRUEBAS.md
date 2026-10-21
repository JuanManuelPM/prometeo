# Three.js · Decisiones, criterios y pruebas de aceptación
Fecha argentina: 13/10/2026. Autoridad del espacio: `laboratorios-js/CONTRATO.md`. Esta rama NO publica/mergea automáticamente.

## Criterio de producto
Una **experiencia 3D excepcional** es una escena con composición/arte real y objetivo, control fiable, interacción comprensible y funcionamiento medido en móvil, no un montón de primitivas brillantes. Se acepta por demostración visible (Kent Beck: pruebas; Adzic: especificación por ejemplos; Freeman/Pryce: crecimiento guiado por tests) y comparación antes/después con Sendero/Coliseo, no por descripción.

## Contrato de preservación (antes de tocar mundos canónicos)
- Requested delta: investigar Three.js, reutilizar capacidades y assets sin conservar defectos.
- Preserve: WASD/flechas, clic a suelo, cámara sin control accidental del avatar, navegación no lineal, zoom, minimapa opcional; Coliseo físico y semántico con oclusión real, orientación fija de props, estética textural oscura.
- Rechazar: movimiento del jugador por mouse, viaje ferroviario, bolas por personajes, billboards físicos orientados cámara, Canvas 2.5D presentado como Three.js, detalles en miniatura para móvil, escenas hechas de geometría decorativa genérica, efectos costosos sin medición.
- Camino inicial: núcleo puro `navigation/navigation.mjs`; pruebas `navigation/navigation.test.mjs`. Es un primer componente reutilizable, NO un renderizador, NO un navmesh 3D, NO un widget publicado.
- Riesgos: Sendero original de 12/10 existe en entregas conversacionales pero no fue localizado como fuente en ramas inspeccionadas. Coliseo usa motor propio. Migrar sin importar capacidades desde sus bytes sería una reconstrucción ciega.

## Escenarios que deben convertirse en test antes de una publicación
| ID | Dado / Cuando | Entonces | Estado |
|---|---|---|---|
| M01 | Parado, arrastro mouse 120px | La cámara gira; posición y heading del avatar no se modifican | Función pura implementada; browser pendiente |
| M02 | Mantengo W y desplazo cámara | Avanzo según orientación de cámara, sin que cámara se convierta en input del personaje | Función pura implementada |
| M03 | W+D a la vez | No gano velocidad diagonal | Test de código |
| M04 | Clic sobre suelo y obstáculos intermedios | Se crea una ruta navegable; no atravesar troncos/muros ni cortar esquinas | A* 2D implementado; raycast/escena pendiente |
| M05 | Camino y toco WASD durante ruta automática | Control manual tiene prioridad, ruta se cancela | Implementado |
| M06 | Roto celular vertical | Modelo/escena siguen encuadrados; adaptar FOV horizontal, no usar distancia fija | Matemática implementada; visual pendiente |
| M07 | Pasan 10 s con pestaña suspendida | Reanudar sin salto monstruoso de posición | DT limitado; integración pendiente |
| M08 | Personaje pasa de Idle a Walk a Run a Idle | Animaciones son clips reales con mezcla suave y rotación coherente | Pendiente |
| M09 | Me acerco a una pared en ángulo | El personaje desliza sin atravesar ni vibrar | Deslizamiento simple implementado; física de pendiente pendiente |
| M10 | Cursor/clic/touch en smartphone pequeño | Sin scroll de página al caminar, sin mezcla clic/arrastre, botones legibles | Pendiente en navegador real |
| M11 | Dispositivo sin WebGL2 o falla descarga GLB | Mostrar estado claro y alternativa no engañosa (no falso 3D) | Pendiente |
| M12 | GitHub Pages tras publicación | URL da 200, píxeles reales del mundo, control funcional; registry indica solo esa versión válida | Bloqueado: sin widget ni publicación |
| M13 | Zoom hacia escena o resize | No recorta avatar en pantalla vertical y ofrece reencuadrar | Función pura para bounding sphere; browser pendiente |
| M14 | Cambia shader/fx | Captura A/B evalúa valor artístico y presupuesto de GPU antes de activar | Pendiente |

## Matriz de integración de módulos
- `InputAdapter`: pointer/touch/keyboard: solo transforma eventos en intents.
- `CameraRig`: yaw/pitch, zoom, follow, near clipping, shock absorption, occlusion.
- `Navigation`: ruta, waypoint, obstáculos, velocidad real y seguimiento; implementación pura aislada `navigation/navigation.mjs`.
- `Character`: GLB, humano/pingüino/fantasma propios, Mixer, estados/transiciones, audio y feedback.
- `World`: chunks/escena authored, terreno, árboles, materiales, landmarks y colisionadores; datos separados.
- `Renderer`: WebGL2 estable, tone mapping, luces, sombras y FX opcionales degradables.
- `Telemetry` interna: FPS, draw calls, memoria estimada, duración decode/carga, LOD; oculta al usuario salvo pantalla de prueba.
- `Host`: iframe sandbox según contrato actual, sin localStorage ni nuevos sistemas globales.

## Presupuestos iniciales como HIPÓTESIS, nunca resultados medidos
Objetivo de experiencia: 60 FPS en desktop cuando sea razonable, 30 FPS sostenidos en Android medio; recorte de dpr/postFX según frame time. Intentar primera interacción en pocos segundos en red doméstica, pero el umbral de bytes y números definitivos depende de los GLB/texturas medidos. Registrar medianas y p95 de frame; grabar hardware, resolución, DPR, browser, commit y fotos. Nunca publicar frases «60 FPS verificados» antes de evidencia real.

## Gates de promoción
0. Prototipo mecánico: tests Node positivos en código exacto.
1. Demo integrada: GLB real, controles y una zona pequeña con propósito, textura/art-direction trabajada.
2. QA real: Firefox y Chromium de escritorio, smartphone vertical/horizontal (no solo emulador), permisos/CORS, 5 minutos de recorrido, carga progresiva y errores.
3. A/B visual: captura antes/después; humanos pueden distinguir la mejora sin leer descripción.
4. Publicación: independiente `laboratorios-js/widgets/threejs/<id>/v1/` y CDN/modelos propios con licencias verificadas; solo después de URL real funcionante se añade `registry/threejs.json`.
5. Continuidad: pruebas, SHAs, ruta y límites leíbles por otro chat. No abrir segundo escritorio.

## Decisiones técnicas
- No meter librería completa (Sketchbook) o React (ecctrl) en el runtime por defecto; estudiar algoritmos e integrar solo módulos compatibles y con licencia.
- Three.js con WebGLRenderer/WebGL2 inicial; WebGPURenderer/TSL laboratorio aislado, porque `ShaderMaterial` y `EffectComposer` convencionales no migran directamente.
- Animación glTF auténtica, mapas texturizados originales y esqueletos, no simular una persona con cubos. Verificar cada GLB y su licencia.
- A* sobre grilla plana solo prueba de concepto: nivel 3D definitivo deberá resolver alturas, rampas, topología, discontinuidades y colisiones de cámara, preferiblemente NavMesh y/o Rapier cinemático según evidencia.
- Toda nueva versión publicada inmutable; registrar únicamente demo verificada. El escritorio existente es el único host.

## Prueba actual
`navigation/navigation.mjs` y `navigation/navigation.test.mjs` se incorporan en esta rama. Tests ejecutables: `node --test laboratorios-js/threejs/navigation/navigation.test.mjs`. No declarar éxito hasta ejecutarlos sobre los bytes actuales. La rama contiene candidatos y documentación; GH Pages `gh-pages` no fue modificada.
