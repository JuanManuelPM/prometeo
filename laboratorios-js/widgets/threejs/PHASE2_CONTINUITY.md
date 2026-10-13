# PROMETEO THREE.JS — FASE 2: ESTADO Y RELEVO

**Fecha:** 13/10/2026 (Argentina)  
**Especialidad:** Three.js; sólo `laboratorios-js/widgets/threejs/**`.  
**Estado global:** tres experiencias codificadas y depositadas como **CANDIDATOS EN gh-pages**, pendientes de aceptación con navegador/GPU/móvil; **no registradas como widgets terminados**. No confundir que GitHub Pages despliegue código con que se verificaron las mecánicas ejecutadas.

## Archivos y rutas concretas

- Núcleo original compartido: [shared/v1/kit.js](shared/v1/kit.js).
- Juego 1: [sendero-vivo/v1/index.html](sendero-vivo/v1/index.html).
- Laboratorio 2: [estudio-de-mundos/v1/index.html](estudio-de-mundos/v1/index.html).
- Juego 3: [jardin-de-ecos/v1/index.html](jardin-de-ecos/v1/index.html).
- Pruebas reproducibles: [shared/v1/qa-contracts.test.mjs](shared/v1/qa-contracts.test.mjs).
- Evidencia detallada y SHAs exactos: [PHASE2_QA_CANDIDATES_20261013.json](PHASE2_QA_CANDIDATES_20261013.json).
- Conocimiento y plan fase 1: [atlas-tecnico/v1/START_HERE.md](atlas-tecnico/v1/START_HERE.md) / [PLAN_FASE_2.md](atlas-tecnico/v1/PLAN_FASE_2.md).

### Estado semántico por app

1. **SENDERO**: tres santuarios, avatar 3D **procedural original** (NO GLB ni animación esquelética), WASD/flechas, táctil direccional, clic a destino con A*, cámara orbital sólo de lectura, obstáculos cilíndricos y colisión simple, luces plantables, estado JSON export/import. No se integró Rapier real ni NavMesh 3D; la colisión es por disco y terreno basado en función altura. **Deuda**: render real + test de entrada táctil, saturación visual, progresión de objetivos y Dpad.
2. **ESTUDIO DE MUNDOS**: comparativa A/B con dos escenas y dos renderizadores Three, misma orientación de cámara, modificación real de semilla/relieve/bioma/densidad/paleta/niebla, regeneración, undo/redo, copiar B→A, export/import de preset, métricas `renderer.info.render` sin inventar FPS. **Deuda**: medir memoria/consumo de dos WebGL contexts en Android y ajustar DPR, deshacer/rehacer interactivo.
3. **JARDÍN DE ECOS**: puzzle de red orgánica con 10 nodos, 3 receptores, 3 barreras, longitud máxima 11.2, máximo nueve conexiones, alimentado sólo desde origen, rama tubular curva ShaderMaterial con `uGrowth` y pulso, receptor gana únicamente cuando los tres conectan, undo/reset/export/import transaccional. Una solución probada en geometría matemática consume nueve aristas S-A, S-B, A-C, B-D, C-E, D-F, E-R1, F-R2, D-R3. **Deuda**: shader GPU WebGL compilado, raycast táctil, iconos legibles y evolución visual de crecimiento.

### Ejecutar pruebas fuente/contrato
Tras descargar o clonar repositorio, desde `laboratorios-js/widgets/threejs/shared/v1`:

```bash
node --test qa-contracts.test.mjs
```

No necesita npm. En este chat se ejecutaron **29/29 comprobaciones V8 de sintaxis/lógica sobre los bytes leídos de GitHub**. La suite Node se subió y validó sintácticamente, pero no se ejecutó sobre una copia de disco del repositorio en esta sesión. Ninguna de estas pruebas certifica WebGL real, GLB o calidad visual.

### Dependencia deliberada
Los tres HTML importan `https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js`. Es una biblioteca gratuita MIT con versión fijada, pero necesita **red y CORS habilitado** para cargar desde el iframe del laboratorio aislado (sin `allow-same-origin`). El núcleo `kit.js` es script clásico alojado en el mismo repositorio. Todavía **no se verificó** esa combinación desde el dominio público bajo sandbox. Si falla, corregir import/CORS o empaquetar el módulo Three con su licencia dentro del scope Three.js sin crear infraestructura externa. No trasladar secretos a código cliente.

### Puertas que todavía bloquean el registro
- Abrir cada URL bajo la misma sandbox del laboratorio en navegador Chromium/Firefox; Three.js carga y `WebGLRenderer` dibuja realmente.
- Probar controles en escritorio: Sendero W/S/A/D+click+cámara independiente, Jardín conexiones/barreras/victoria, Estudio cambios reales A/B+undo+import.
- Probar móvil vertical 360px y horizontal, preferiblemente Android físico; sin paneos accidentales ni desbordes; verificar tiempo de carga.
- Medir FPS/draw calls, corregir fallas de shaders y revisar composición artística de verdad.
- Verificar licencia del motor y que no se incluyeron assets de terceros no autorizados.
- Confirmar URLs públicas servidas y cómo se ven dentro de `?lab=threejs`.

**Únicamente entonces**, y usando el SHA actual de `laboratorios-js/registry/threejs.json`, agregar tres entradas `sendero-vivo`, `estudio-de-mundos`, `jardin-de-ecos` con rutas `widgets/threejs/<id>/v1/index.html` y fecha real. Preservar entrada `atlas-tecnico`, versiones previas y otros especialistas. No usar métricas supuestas ni cambiar `laboratorios-js/index.html`.

## Dudas y limitaciones honestas
- Ni GitHub Pages exitoso, ni 29 pruebas V8, ni validar 15 pruebas Node **equivale a prueba en una GPU**.
- No se han copiado transcripciones completas ni assets ambiguos de tutoriales. El personaje modelado en código es un sustituto provisional, no el GLB de calidad exigido como visión de producto.
- No se publicó metadata de tres juegos completos en `registry/threejs.json`: eso deliberadamente evita anunciar falsos terminados.
- El ambiente de ejecución actual contiene Chromium pero no paquete Three.js y falla DNS para npm/CDN; también falló el acceso por herramienta web a las URLs GitHub Pages. Es una limitación de prueba, no prueba de que la web esté caída.

### Siguiente IA
Recuperar exactamente estos 7 archivos, volver a leer el registro y `epoch.json`, ejecutar Node, ejecutar Chrome WebGL real en un entorno con Three.js disponible y corregir hasta aceptación. No pedir al usuario que copie materiales ni rehacer el atlas. El usuario ya autorizó publicación de las tres experiencias **una vez aprobadas** por pruebas.
