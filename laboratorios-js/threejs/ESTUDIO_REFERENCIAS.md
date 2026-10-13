# Three.js / Prometeo · Investigación contrastada (13-10-2026, Argentina)
**Estado:** investigación verificable + prototipo de lógica aislada. No hay widget publicado ni test de render 3D aprobado.  
**Rama propietaria:** `research/threejs-worlds-20261013`, creada desde `gh-pages` commit `3972c256ef357915922e96489516a5c3709325c0`.  
**Límite:** solo `laboratorios-js/threejs/**`; no editar escritorio, `registry/threejs.json`, otros laboratorios ni Coliseo canónico sin prueba de integración.

## Fuentes primarias del pasado (separar memoria y código verificable)
1. **Sendero / UMBRAL III, 12-10-2026:** el usuario exige exploración NO lineal, WASD/flechas y clic en suelo para caminar; el movimiento del mouse solo debe rotar cámara respecto del personaje. Versiones conversacionales: `UMBRAL_V3.html`, `Prometeo_Sendero_Mundo_3D_Illustrado.html`, `Prometeo_Taller_Unix_Revisado_3D_Musica_Vida_Tiempo.html`. Historial: Canvas 2D/proyección, assets 2.5D, cámara orbital, navegación local y rutas alrededor de árboles; WebGL2 NO verificado. **No se localizaron sus bytes en las ramas `main` y `gh-pages` de Prometeo, por lo que no inferir compatibilidad ni declarar su código importado.** Fuente: conversación de usuario recuperada, no comprobación de ejecución.
2. **Coliseo:** fuente real en `gh-pages:demos/coliseo-3d/index.html`, reglas de producción en `demos/coliseo-3d/PRODUCTION_RULES.md`. Separación física de geometría vs contenido legible. Carteles físicos permanecen orientados en espacio del mundo; no girar paneles completos hacia cámara ni usar HUD fingiendo objeto. La colección `demos/coliseo-3d-component-lab` explora cámara/proyección/oclusiones compartidas y ocho mapas; son investigación de renderer propio, NO equivalen a una base Three.js.
3. **Modelos reutilizables de otro repo propio:** `JuanManuelPM/Experimentos` en `gh-pages:lofi-asset-factory/`. `common-3d/CONTRACT_V2.json` registra cuatro formas CC0 de Kenney con mallas, UV, animaciones y 12 recetas de paleta: mini personaje (723 triángulos, 7 huesos, 32 clips), dungeon humano (465 triángulos, 7 huesos, 32 clips), pingüino (558 triángulos) y fantasma (413 triángulos). Rutas GLB verificadas en árbol Git, no descargadas ni renderizadas ahora. Evitar la forma Blocky de 72 triángulos rechazada por auditoría; verificar atribuciones/archivos fuente antes de incluir en producto.

## Curaduría de referencias (consultadas 13-10-2026)
Puntaje: **A** primer benchmark para replicar una capacidad específica; **B** explorar una técnica; **C** referencia contextual, no copiar. Las licencias solo autorizan redistribuir recursos cuando se haya verificado el archivo exacto. Acceso público ≠ permiso de reutilizar arte.

| Orden | Referencia | Qué estudiar / qué NO copiar | Evidencia / licencia | Prioridad |
|---|---|---|---|---|
| 1 | [Sketchbook](https://github.com/swift502/Sketchbook) | Locomoción de tercera persona, raycast/cápsula, cámara, FSM, NPC, vehículos. NO trasplantar motor entero ni Cannon como dependencia obligatoria. | Repositorio MIT verificado; archivado, no mantenido. [Demo](https://xesf.github.io/sketchbook/) | A |
| 2 | [Rapier Controller](https://threejs.org/examples/physics_rapier_character_controller.html) | Pendientes, escalones, suelo, choque y WASD; modularizar el controlador. | Ejemplo oficial Three.js; [documentación Rapier](https://rapier.rs/docs/user_guides/javascript/character_controller/). | A |
| 3 | [Ecctrl](https://github.com/pmndrs/ecctrl) | Animaciones coordinadas con velocidad, cámara, táctil, vehículos y forma de exponer parámetros. NO añadir React únicamente por un controlador. | Código MIT verificado, dependencia React Three Fiber / Rapier. [Demo](https://ecctrl.app/) | A |
| 4 | [Khronos glTF Assets](https://github.khronos.org/glTF-Assets/) | Esqueletos, animaciones, PBR, transmission, morph targets y errores en materiales. | Licencia POR MODELO; ciertos assets son solo para pruebas, prohibido asumir CC0. | A |
| 5 | [Three.js ejemplos oficiales](https://threejs.org/examples/) | Animation blending/morph/IK; GLTF compressed; instancing; luces; shadows; SSAO/bloom; Rapier; WebGPU. | Código oficial, arte y archivos con licencias separadas. | A |
| 6 | [Bruno Simon · Portfolio](https://bruno-simon.com/) | Diseñar la navegación física como el propio índice de contenidos; puntos de interés discernibles. NO copiar estética cúbica/infantil por defecto. | Sitio de inspiración, licencia de assets no acreditada. | A |
| 7 | [Bruno Simon · Infinite World](https://github.com/brunosimon/infinite-world) | Terreno/proceduralidad, continuidad de mundo, distribución coherente de elementos, distancia visible. | Código público; package declara ISC; auditar licencia de repositorio/assets antes de derivar. [Demo](https://infinite-world.vercel.app/) | A |
| 8 | [Mistwood Cottage](https://discourse.threejs.org/t/mistwood-cottage-a-small-stylized-world/85649) | Escena compacta cuidada, ambiente, luces y ritmo de pequeños descubrimientos. | Foro/demo como referencia visual; NO evidencia de licencia abierta. | B |
| 9 | [Alfi's Adventures](https://discourse.threejs.org/t/alfis-adventures-three-js-game/85754) | Gameplay real: trampas, reglas, obstáculos y objetivos comprensibles. | Showcase, no se comprobó código/licencia reutilizable. | B |
| 10 | [Red Reddington · Web Demos](https://github.com/red-reddington/web-demos) | Instancing, LOD, cielo, animación procedimental y rendimiento medido; distinguir demo de optimización de dirección de arte. | Repo público, licencia NO verificada: inspiración únicamente. | B |
| 11 | [Sandbox World](https://github.com/bhoot1234567890/sandbox-world) | GLSL cielo/agua, vegetación instanciada, composición día/noche; cautela con cargas de postFX en móvil. | Repo público, licencia pendiente. | B |
| 12 | [Decarlo Boyz](https://github.com/scalabled/decarlo-boyz) | Ambición sistémica: misiones, vehículos y mundo abierto como proyecto auditable. NO heredar técnicas de arte procedural simple; propio README advierte rendimiento móvil pobre. | Repo público, licencia pendiente. | C |
| 13 | [gltfpack / meshoptimizer](https://github.com/zeux/meshoptimizer) | Simplificación, compresión geometría, caché de vértices y atlas; comparar calidad visual antes/después. | MIT verificado. | A |
| 14 | [KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html) | Texturas comprimidas a GPU (Basis), transcodificación, móviles. | Manual oficial; depende de WASM/transcoder. | A |

### 12 demos oficiales para correr, evaluar y comparar por mecanismo
- Animación esquelética: https://threejs.org/examples/webgl_animation_skinning_blending.html
- Blending aditivo: https://threejs.org/examples/webgl_animation_skinning_additive_blending.html
- Morfología / gestos: https://threejs.org/examples/webgl_animation_skinning_morph.html
- glTF animado: https://threejs.org/examples/webgl_loader_gltf.html
- glTF comprimido: https://threejs.org/examples/webgl_loader_gltf_compressed.html
- Iluminación PBR: https://threejs.org/examples/webgl_lights_physical.html
- Sombras progresivas: https://threejs.org/examples/webgl_shadowmap_progressive.html
- Efecto selectivo (coste a medir): https://threejs.org/examples/webgl_postprocessing_unreal_bloom_selective.html
- Mallas instanciadas: https://threejs.org/examples/webgl_instancing_dynamic.html
- Físicas character controller: https://threejs.org/examples/physics_rapier_character_controller.html
- Vehículo Rapier: https://threejs.org/examples/physics_rapier_vehicle_controller.html
- WebGPU/TSL comparativo: https://threejs.org/examples/webgpu_postprocessing_bloom_selective.html
Nota: rutas de ejemplos indexadas por la documentación oficial; abrir cada demo y constatar su funcionamiento antes de convertirlas en evidencia de aceptación.

## Técnica por dominio: hipótesis comprobables
**Personajes y glTF:** glTF/GLB + `GLTFLoader`; instanciar personajes skinned con clonación correcta de esqueletos; reusar geometría/materiales; `AnimationMixer` con estados Idle/Walk/Run/Turn/Interact, transiciones suaves y sin reiniciar clips en cada frame. Mover la raíz por controlador, NO por giro accidental de mouse. Auditar clips reales (nombres/duración/orientación) por asset.
**Materiales:** PBR donde aporten volumen; textura de alta calidad dibujada/escaneada o pintada con atlas coherente. En retro gráfico, unlit/paletas solo para props justificados, no toda la escena; evitar roughness/metales aleatorios. Color management y tone mapping calibrados.
**Shaders:** viento para follaje, niebla con profundidad, agua/charcos focales, tinta/contorno local y partículas discretas. Cada shader requiere alternativa barata y captura A/B; WebGL `ShaderMaterial` no migra de forma directa a `WebGPURenderer`.
**Luz:** un key light direccional (sombras cuidadosamente acotadas), ambiente/HDRI filtrado, un par de luces prácticas bakeadas donde posible; no decenas de luces dinámicas. Contacto, volumetría y bloom solo cuando medidos.
**Cámaras:** tercera persona por defecto, yaw y pitch independientes, seguimiento amortiguado, orbit drag, colisión de cámara mediante ray/sphere cast, autoencuadre por vertical y horizontal FOV, cursor tap/click con umbral de arrastre; scroll/gestos no teletransportan avatar.
**Físicas:** Rapier kinematic como candidato para rampas/escaleras/collision groups; tick fijo 60 Hz con interpolación gráfica. No añadir motor de físicas para caminar en suelo plano antes de justificarlo. Un pathfinder de grilla no es equivalente a NavMesh de terreno irregular.
**Rendimiento:** limitar DPR dinámicamente según medición, culling y LOD, mallas instanciadas para repetidos, baked AO, KTX2 + meshopt/Draco cuando valgan bytes+tiempo de decode, métricas draw calls/triángulos/textura/frame. Parar FX a 30 FPS. No usar WebGPU como requisito: backend de producción inicial WebGL2; experimentar WebGPU/TSL aparte. Manual oficial: https://threejs.org/manual/pages/webgpurenderer

## Referencias visuales: tres rutas (propuestas, NO aprobaciones finales)
1. **Sendero de tinta:** bosque/senderos explorables estilo grabado, collage, recortes texturados, luces cálidas discretas; geografía y siluetas de verdad, personaje esquelético expresivo. Combina navegación de Sendero y cultura gráfica del Coliseo.
2. **Coliseo viviente:** arena circular con gradas en profundidad real, personajes/NPCs que ejecutan acciones reconocibles, antorchas y carteles anclados a materiales físicos; recorrido por niveles, no mera órbita de observador.
3. **Archivo de umbrales:** archipiélago nocturno de espacios reales unidos por puertas; cada ambiente representa un experimento o proyecto, pero el escenario no se convierte en otro escritorio ni en un menú 3D disfrazado.

**Selección tentativa:** ruta 1 para probar locomoción + legibilidad + inmersión. No generar arte geométrico genérico como sustituto de modelos, texturas o composición. La valoración visual final pertenece a capturas inspeccionadas, no al texto.

## Fuentes y honestidad
Consultas públicas realizadas 2026-10-13; URLs y código del usuario examinados mediante GitHub conectado. No ejecutamos demos externas en un navegador gráfico con GPU durante esta sesión ni comprobamos por inspección capturas propias. Una página encontrada en buscador no prueba que su render funcionará en el dispositivo del usuario. Mantener separado: referencia externa, inferencia técnica, código recuperado, prueba local de lógica y evidencia pública servida.
