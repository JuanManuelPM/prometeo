# Three.js — Plan de las tres experiencias (fase 2)

Estado: PLANIFICADO, no programado ni publicado. Responsable: Three.js.
Base de conocimiento: [Atlas](index.html) · [Datos](knowledge.json) · [Contrato](../../../CONTRATO.md).
Pruebas precedentes: PR #107 candidato; fábrica local v1 (51 tests Node reportados, sin WebGL real).
Diseño de aceptación: Beck (TDD), Adzic (ejemplos concretos), Freeman/Pryce (verticales integrados).

## 1. SENDERO · BOSQUE VIVO
ID: `sendero-vivo`. Ruta: `laboratorios-js/widgets/threejs/sendero-vivo/v1/index.html`.

**Producto:** territorio ilustrado no lineal con tres santuarios visitables en cualquier orden, consecuencias visibles, personaje GLB validado, obstáculos físicos, cámara orbital y pequeños descubrimientos.

**Controles:** WASD/flechas o clic sobre suelo para caminar; arrastrar mouse solo rota cámara, nunca personaje; zoom, teclas/touch amigables a móviles. Una pulsación WASD cancela la ruta automática sin teletransportar.

**Visual:** senderos orgánicos, vegetación pictórica y composición atmosférica; evitar escenario de conos/cubos, HUD que simule elementos en mundo y billboards giratorios. Reutilizar CAP-001/CAP-020/CAP-026/CAP-028/CAP-029/CAP-030/CAP-034.

**Arquitectura:** InputManager → IntentRouter → NavMesh o rutas validadas → CharacterMotor → CollisionAdapter → Avatar/CameraRig. Mundo y reglas separados de los modelos, shaders y FX. Progreso exportable/importable a JSON; nada crítico en localStorage del iframe.

**Recursos:** Three.js versionado, GLB de licencia individual comprobada, texturas/arte originales o libres con atribución; Rapier solo si necesario. No copiar trees.glb del tutorial sin acreditar licencia.

**Criterios Given/When/Then:**
- S01 Dado avatar quieto, cuando arrastro mouse 150px, entonces cambia cámara y avatar no se mueve.
- S02 Dado W+D pulsados, velocidad no supera avance recto.
- S03 Clic detrás de obstáculo encuentra ruta sin atravesarlo y sin cortar esquinas.
- S04 Manual cancela navegación automática.
- S05 Los tres santuarios producen consecuencias observables en cualquier orden.
- S06 Exportar → recargar bajo sandbox → importar restaura posición y progreso.
- S07 Vista 360x740/1280x720: no desborde horizontal, controles utilizables.
- S08 Error GLB/WebGL muestra explicación, no pantalla negra.
Ampliaciones: clima real, NPC y secuencias.

## 2. ESTUDIO DE MUNDOS
ID: `estudio-de-mundos`. Ruta: `laboratorios-js/widgets/threejs/estudio-de-mundos/v1/index.html`.

**Producto:** laboratorio interactivo y comparador A/B de construcción de mundos, no una lista de botones. Cambiar semilla, amplitud de ruido, bioma, densidad arbórea, material por bandas, luz y viento; ver efecto y métricas medibles. Presets guardables, undo/redo y export.

**Visual y UX:** preview 3D dominante, panel compacto legible, comparación con misma cámara; móvil prioriza preview y controles desplegables.

**Arquitectura:** PresetModel(schema) → CommandHistory(undo/redo) → SeededTerrain/BiomeRules → SceneCompiler → Renderer. Dos vistas A/B fijas, no comparar perspectivas diferentes.

**Criterios:**
- E01 Mismo seed/preset genera topología idéntica diez veces.
- E02 Cambio de paleta no modifica posiciones ni colisiones.
- E03 Cambiar semilla cambia distribución.
- E04 Undo restaura exactamente A y Redo exactamente B.
- E05 Export→Import reproduce JSON normalizado y escena.
- E06 Los contadores de GPU solo aparecen tras medición, nunca simulados.
- E07 Sliders funcionan en pantalla táctil y no congelan navegador.
Técnicas: VID-001/003/004/005, CAP-003/007/012/014/020/021/022/027.
Recursos: geometría propia; presets declarados y licencia clara.
Ampliaciones: editor de biomas, mallas exportables y LOD.

## 3. JARDÍN DE ECOS
ID: `jardin-de-ecos`. Ruta: `laboratorios-js/widgets/threejs/jardin-de-ecos/v1/index.html`.

**Producto:** puzzle espacial de crecimiento orgánico. El jugador planta nodos con presupuesto limitado, orienta las ramas y debe conducir pulsos a tres receptores. Los obstáculos redirigen crecimiento; cuando hay energía en los tres se abre una salida. No es una variante cosmética del bosque.

**Arquitectura:** PuzzleState → BranchGraph(BFS con límites) → CurveBuilder(CatmullRom + anillos indexados + frames estables) → DepthAttribute → GrowthShader/Glow → GraphConnectivity → WinState. Estado del puzzle independiente de los shaders.
**Interacción:** clic/touch planta semilla, arrastre define sesgo, iniciar/pausar muestra crecimiento, reiniciar restaura. No exigir pointer lock.
**Visual:** redes orgánicas, filamentos luminosos, entorno oscuro detallado, pulsos sobre trayectoria y no distancia radial.
**Criterios:**
- J01 Semilla fija produce mismo grafo independientemente del render.
- J02 Límites explícitos maxNodes/maxDepth evitan explosión.
- J03 Triángulos indexados tienen winding y normales válidas.
- J04 Profundidad de crecimiento sigue ramas monotónicamente.
- J05 Obstáculos impiden conexiones inválidas.
- J06 Material/cámara no alteran lógica del puzzle.
- J07 Solo tres receptores activados satisfacen victoria.
- J08 Reinicio y controles táctiles reales.
Técnicas: VID-003/004/006, CAP-010/014/015/016/017/018/028.
Recursos: código/geométricas originales, WebAudio nativo opcional mediante gesto.
Ampliaciones: niveles exportables y topologías alternativas.

## Núcleo reusable mínimo

```ts
type Recipe = {schema:'prometeo.threejs-game/v1'; id:string; seed:number;
 world:{kind:'authored'|'heightfield'|'voxel'|'graph';params:unknown};
 art:{palette:string[];assets:string[]}; rules:{kind:string;params:unknown}; };
interface Experience { mount(root:HTMLElement,recipe:Recipe):Promise<void>; dispose():void; exportState():Blob; }
```
Los tres juegos no necesitan idénticos motores internos: compartir solo contratos y componentes realmente útiles. Mantener cámara, control, mundo, material, físicas y persistencia desacoplados.

## Secuencia de ejecución futura

1. Releer atlas, este plan, PR #107, actual `gh-pages`, registro y epoch. No suponer que ZIP local esté en GitHub.
2. Recuperar código existente de motor/shader/cámara por bytes, auditar licencias y dependencias.
3. Escribir tests de S/E/J antes del código; implementar un vertical slice completo de cada aplicación.
4. Empaquetar Three.js para funcionamiento dentro del iframe sin `allow-same-origin`; comprobar ausencia de fallas CORS/ESM y dependencia de localStorage.
5. Probar WebGL real, teclado, touch, viewport vertical/horizontal, carga de recursos, colisiones, consola y rendimiento. Comparar arte A/B.
6. Corregir defectos y publicar **únicamente versiones verificadas** en carpetas nuevas `v1`. No reemplazar el atlas ni archivos de otros especialistas.
7. Registrar cada widget en `laboratorios-js/registry/threejs.json` con SHA actual, fecha Argentina, URL y nota. Comprobar que Pages sirve cada HTML y que el escritorio lo muestra.
8. Dejar informes de pruebas e instrucciones para otra IA. No anunciar terminado si solo pasan mocks.

## No negociables

Sendero: ratón no mueve personaje, caminar por clic y WASD se preservan.
No mover proyectos privados ni cambiar la portada general.
No arrastrar dependencias pagas ni redistribuir modelos externos sin licencia.
No fingir screenshots GPU o FPS móviles.
No crear tres variaciones triviales del mismo juego.
Si alguna gate falla, conservar candidato sin registrarlo como aplicación terminada.

## Continuidad

Otra IA debe leer `knowledge.json`, este archivo y `START_HERE.md`. El usuario activará la segunda fase mediante un mensaje `.` separado.
La fase 1 contiene solamente conocimiento público, atlas y este plan; los tres juegos aún **no existen como widgets públicos**.
