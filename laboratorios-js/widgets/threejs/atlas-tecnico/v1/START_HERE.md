# START HERE · Atlas técnico Three.js (fase 1)

**Página publicada en carpeta versionada:** `index.html`
**Fuente estructurada:** `knowledge.json` (`prometeo.threejs-knowledge/v1`)
**Plan de la fase 2:** `PLAN_FASE_2.md`
**Laboratorio receptor:** https://juanmanuelpm.github.io/prometeo/laboratorios-js/?lab=threejs
**Estado de tres juegos:** PLANIFICADOS; no se desarrollaron durante la fase 1.

## Recuperación verificable por otra IA

1. Leer `laboratorios-js/CONTRATO.md`, `laboratorios-js/README.md` y registro `laboratorios-js/registry/threejs.json`.
2. Leer este directorio `knowledge.json`: `videos[]`, `capabilities[]`, `references[]`, `decisions[]`. Contiene mecanismos, pseudocódigo, invariantes, límites y pruebas. La página `index.html` incrusta una copia del contenido para funcionar en iframe aislado sin fetch CORS ni localStorage.
3. Si toca código de navegación/material ya investigado, consultar PR #107: https://github.com/JuanManuelPM/prometeo/pull/107, rama `research/threejs-worlds-20261013`. PR en borrador no equivale a código público desplegado.
4. Leer `PLAN_FASE_2.md`, con tres experiencias, contratos, secuencia, assets, mecánicas, pruebas Given/When/Then y gates.
5. Revisar `agent-runtime/epoch.json`, constitución y último HEAD antes de escribir; no sobrescribir otras bibliotecas ni alterar UI global.

## Qué se recuperó y qué falta

- **VID-001**: tutorial de shader pictórico. Canal craftzdog/Takuya Matsuyama, URL de YouTube y repositorio analizado; código fuente real de shaders, Scene/Trees y README revisado. Video no reproducido.
- **VID-002**: transcripción del usuario: dirección artística con referencias, variaciones, generación de assets y parallax 2.5D. Autor/URL/duración/versiones no acreditados.
- **VID-003**: transcripción del usuario: vertex/fragment shader, uniforms, attributes, varyings y ShaderMaterial. Autor/URL/versiones no acreditados.
- **VID-004**: transcripción del usuario: árbol jerárquico con BFS, Catmull-Rom, mallas indexadas, Fresnel, depth, growth y pulse. Código original ausente.
- **VID-005**: video serie Minecraft (transcripción + repo dgreenheck); se examinó mundo, chunks, semilla, biomas, physics, player, renderer y guardado. Versión identificada en package.json; licencia integral de assets NO acreditada.
- **VID-006**: transcripción del usuario: entrada/cámara FPS-TPS, Rapier, colliders y Kinematic. Sin enlace al código original ni versión registrada.
- **Investigación anterior PR #107**: 14 referencias originales y 12 demos oficiales indexadas con licencias o advertencias; en este atlas se registra además el repositorio Ghibli y el Minecraft. `references` contiene 18 registros.
- **Fábrica local v1** entregada antes en este chat: dos proyectos, recetas, código y 51 pruebas Node reportadas. NO se sube a este atlas ni se afirma verificación gráfica. El ZIP local no se presume disponible a futuros chats.
- **Sendero histórico**: las variantes UMBRAL no estaban localizadas en las ramas principales al investigar; preservar requisitos sin mentir sobre importación.
- **Coliseo**: demo autónoma en `demos/coliseo-3d/`; no tocar.

## Regla sobre copyright y pruebas

Ni videos/transcripciones completos ni terceros GLB/PNG han sido publicados como parte del atlas. `knowledge.json` es análisis original con links a fuentes, no reproducción de sus archivos. La página contiene cero librerías externas, solo HTML/CSS/JS estático con datos en línea; se puede probar buscando «biomas», filtrando «Mundos» y abriendo VID-005.

**Publicación fase 1 ≠ tres juegos publicados.** En fase 2 cada experiencia tendrá carpeta propia, pruebas de navegador/GPU/touch, y se registrará solo tras aceptación y verificación de URL.

## Mapa de dependencias conceptual

- Forma: `VID-004 → CAP-014/015/016`; `VID-005 → CAP-020/021/022`.
- Apariencia: `VID-001 → CAP-001`; `VID-003 → CAP-009/010/011`.
- Movimiento: `VID-006 → CAP-028/029/030/031/032/033`.
- Producción: `VID-002 → CAP-002/003/007/008`.
- Transversal: `CAP-023` (journal, export/import), `CAP-034` (GLB, animaciones), `CAP-035` (pruebas y publicación).
- Tres aplicaciones: Sendero bosque vivo, Estudio de mundos, Jardín de ecos. Ver plan, no improvisar cuatro nuevas.

**Respetar historial y versiones:** `atlas-tecnico/v1` es inmutable tras publicación; si cambia el contenido, publicar una nueva versión y actualizar el registro con CAS sin eliminar v1.
