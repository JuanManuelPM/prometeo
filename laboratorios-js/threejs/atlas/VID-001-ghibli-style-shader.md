# VID-001 · Árboles ilustrados de cuatro bandas (craftzdog)

Fecha: 2026-10-13 (Argentina). Estado: código estudiado, 9 tests locales Node, pruebas GPU y móviles pendientes.
Repositorio: https://github.com/craftzdog/ghibli-style-shader
Demo: https://ghibli-style-shader.vercel.app/
Video: https://www.youtube.com/watch?v=IGK6eceWyU4
Fuente estudiada: README, package.json, shaders, scene, Trees, Ground, FiberContainer, CSS, tests y arranque. Inventario de 32 elementos; GLB (526.752 bytes) y JPG NO decodificados. No se reprodujo el video.

## Arquitectura comprobada
- App.js -> FiberContainer.jsx (Canvas de React Three Fiber + OrbitControls) -> Scene.jsx (ambient, directional, dos árboles) -> Trees.jsx (useGLTF('/trees.glb'); nodes.Foliage.geometry; shaderMaterial) -> GhibliShader.js.
- Ground.jsx: plano de ShadowMaterial que recibe sombra; no significa que follaje con ShaderMaterial reciba sombras.
- GhibliShader.js es el material final; ToonShader.js y SimpleShader.js son exploraciones no usadas en Scene/Trees.
- Shader: vértices envían normal y posición; fragmentos calculan dirección a luz y producto escalar; seleccionan una de 4 bandas.
- Umbrales efectivos de Trees.jsx [0.6, 0.35, 0.001]; los defaults de GhibliShader.js [0.9, 0.45, 0.001] quedan reemplazados.
- Paleta A (alto a bajo): #427062, #33594e, #234549, #1e363f. B: #4a8d7e, #377f6a, #184f52, #143b36.
- Original Three.js ^0.149.0 / React 18 / R3F ^8.11.0 / Drei ^9.56.18. No adoptar React ni CRA en juegos Three.js puros solo por este recurso.

## Auditoría crítica y límites
- Original transforma normal por modelMatrix; no es la inversa traspuesta bajo escala no uniforme. Nuestro material usa normalMatrix y luz/normal en espacio de cámara.
- La rotación group.rotation.x = group.rotation.y += 0.01 depende de framerate; reemplazar por velocidad * delta.
- ToonShader.js compara brillo contra 10.99 y 20.99; son condiciones inalcanzables si light = max(dot(unitarios),0) <= 1. No copiar.
- SimpleShader.js es una prueba roja sin uso; App.test.js busca un link de CRA que App no tiene (test obsoleto).
- El shader final no incorpora PBR, AO, transparencia, mapa UV ni sombras recibidas. El arte del modelo importa más que el truco aislado.
- README declara MIT, pero no hay LICENSE separado; procedencia y redistribución de trees.glb/fotos aún NO verificadas: no copiarlos.

## Grafo del Atlas
- VID-001 enseña IDE-001 (cuatro bandas Lambert), IDE-002 (paletas por material), IDE-003 (normales correctas y color space), IDE-004 (distinguir experimentos de código activo), IDE-005 (silhueta+iluminación+composición), IDE-006 (material separado de React).
- CAP-001 es el módulo propio Three.js puro; AST-001 la receta de asset GLB con procedencia y UV pendientes.
- PRU-001..009: lógica Node 22.16.0 9/9 en archivo local. PRU-010..014: GPU WebGL, GLB, escala no uniforme, sombras, móvil pendientes.

## Próximo experimento observacional
GLB propio/licenciado -> `mesh.geometry` con normales -> material CAP-001 con dos paletas -> 3 luces y rotaciones -> screenshots + FPS + contraste en móvil -> opción de sombras físicas en variante separada. No registrar widget sin prueba browser.

## Trazabilidad
Atlas local de usuario: PROMETEO_THREEJS_MAPA_MAESTRO.md, edición v0.2-vid001-ghibli.
Material local: THREEJS_BIBLIOTECA/ghibli-bands/painted-foliage.mjs y tests Node. No afirmar que capturas de screenshots o el recurso GLB han sido verificados.
Fuentes: https://github.com/craftzdog/ghibli-style-shader/blob/main/src/GhibliShader.js ; https://github.com/craftzdog/ghibli-style-shader/blob/main/src/Trees.jsx ; https://github.com/craftzdog/ghibli-style-shader/blob/main/src/Scene.jsx
