# PixiJS · Fase 2: aceptación parcial, evidencia y continuidad

**Fecha:** 2026-10-13 (Argentina). **Estado actual:** tres aplicaciones HTML candidatas en rama aislada. **No registrar como aprobadas ni asegurar publicación completa antes de comprobar PixiJS real en Chromium y GitHub Pages.** El punto del usuario autoriza publicar *después* del control de calidad; no autoriza declarar pruebas inexistentes.

## Alcance exacto de la rama

- `widgets/pixijs/bosque-de-las-cartas/v1/index.html`: versión recuperada del PR #108, preserva escena ilustrada, personaje con atlas animado, parallax, cartas, HUD, controles, cierre, reinicio, fallback Canvas 2D. Se actualizó CDN PixiJS 8.21 → **8.22.0**, cuya versión aparece en la página oficial de releases; su render efectivo no ha sido probado en WebGL real. Incluye `CREDITOS.md` y `tests.mjs` recuperados del PR #108.
- `widgets/pixijs/optica-de-pixeles/v1/index.html`: producto nuevo para seleccionar elementos de escena, manipular capas/parallax/cámara, desenfoque de Pixi, cantidades reales de hojas, velocidad, pausa/paso único, presets y exportación/importación JSON. Escenario y figuras originales generados en Canvas, mostrados como sprites Pixi cuando carga el motor; fallback Canvas identificado.
- `widgets/pixijs/jardin-de-micelio/v1/index.html`: juego táctico nuevo con 12×8 celdas, grafo permanente y ramificado, selección táctil/teclado, tres árboles objetivo, rocas, reservas de nutrientes, recursos agua/carbono, undo, reinicio y condiciones de victoria/derrota. Texturas originales hechas por código y subidas a Pixi; fallback Canvas explícito.
- `widgets/pixijs/qa-fase2/v1/tests.mjs`: seis casos de ejemplo ejecutables con `node --test`, en DOM/Pixi simulado; son tests de lógica, **no** prueban GPU.
- **No se tocó** ninguna otra biblioteca, los archivos del atlas, `laboratorios-js/index.html` ni `registry/pixijs.json`.

## Criterios y resultados realmente comprobados en esta conversación

| Criterio | Resultado | Método |
|---|---|---|
| Tres HTML con JS sintácticamente válido | PASA | `new Function(inlineScript)` sobre el contenido recuperado de GitHub |
| Versión PixiJS 8.22.0 publicada como release | Confirmado | `https://github.com/pixijs/pixijs/releases/tag/v8.22.0` |
| Bosque: movimiento hacia primera carta y recogida | PASA simulación | DOM + Canvas 2D simulado, `__PIXILAB__.goTo(530,408)` y 240 ticks |
| Bosque: arranque de ruta Pixi con API simulada | PASA simulación | Stubs de `Application`, `Container`, `Texture`, `AnimatedSprite`, ticker |
| Óptica: avance único estando pausada | PASA simulación | `pause();step()` → contador +1; error inicial corregido |
| Óptica: filtros, escala y partículas en modelo | PASA simulación | API Pixi simulada; `blur=4`, `scale=1.5`, `particles=0` |
| Micelio: ramificación, rocas, deshacer | PASA simulación | Dos ramas, bloqueo de roca, undo |
| Micelio: victoria con 3 conexiones | PASA simulación | 17 movimientos predefinidos, estado `won`, 18 nodos, recursos positivos |
| Micelio: agotar recursos | Regla corregida | Condición de derrota independiente de historial de nutrientes |
| Pruebas Node integrales de `tests.mjs` | **AÚN NO EJECUTADAS en Node** | Código persistido; ejecutarlas en entorno que pueda obtener archivos GitHub |
| PixiJS 8.22 con WebGL **real** en Chromium | **SIN VERIFICAR** | La red de este contenedor no resuelve CDN (DNS `EAI_AGAIN`) |
| Capturas de los tres HTML exactos en escritorio/móvil | **SIN VERIFICAR** | La conexión GitHub no ofrece bytes locales directamente al Chromium del contenedor |
| URLs de las tres experiencias en GitHub Pages | **NO PUBLICADAS** | Sin merge y sin registro; prohibido decir que están servidas |
| Arte, audio y licencias | Original procedural; sin audio de terceros | Canvas 2D de creación propia + PixiJS MIT por CDN |
| Persistencia insegura en iframe | NO | Sin localStorage, cookies, cuentas ni credenciales |

## Aceptación pendiente para el próximo agente ejecutor (sin repetir investigación)

1. Recuperar HEAD de `gh-pages` y esta rama, resolver concurrencia antes de integración; confirmar PR #108 no se ha integrado en paralelo.
2. Ejecutar desde raíz del repo: `node --test laboratorios-js/widgets/pixijs/qa-fase2/v1/tests.mjs`; ejecutar también `node --test laboratorios-js/widgets/pixijs/bosque-de-las-cartas/v1/tests.mjs`. Si uno falla, corregir la causa y registrar salida.
3. Abrir los tres `index.html` por HTTP en **Chromium real con CDN accesible**. No aceptar fallback como si fuera Pixi: el indicador visible debe decir `PixiJS 8.22 · WebGL`. Inspeccionar consola y network. Verificar la existencia de `app.canvas` y uso real de `Sprite`, `Texture`, `Ticker`.
4. Capturas desktop 1440×900 y móvil 360×740. Detectar scroll horizontal, foco, tamaños de controles, protagonista y legibilidad. Corregir.
5. Bosque: recoger 3 cartas y completar epílogo; probar teclado, clic, touch, reinicio.
6. Óptica: seleccionar los tres sujetos mediante toques, pausar/reanudar/paso único, variar filtros/parallax/partículas, exportar JSON e importar reproduce configuración; FPS real >0 y se actualiza.
7. Micelio: expandir desde raíz por dos ramas, no atravesar roca, llegar a nutrientes, deshacer, reconectar los tres árboles; verificar victoria y reset; controlar que `texture.source.update()` efectivamente actualiza la GPU en Pixi 8.22.
8. Si los tres pasan, integrar de forma aditiva preservando archivos anteriores, esperar despliegue de Pages exitoso, comprobar tres URLs servidas/iframe y recién entonces agregar **tres entradas** a `registry/pixijs.json`. Conservar `atlas-tecnico` y versiones anteriores.
9. Si falla red o pruebas, mantener PR sin merge y estado verificable. No inventar tests ni decir «publicado» por existir un commit.

**Comando de continuación:** leer primero este archivo y el atlas fase 1; no pedirle al usuario volver a proporcionar la transcripción o el plan. La señal de ejecución ya fue dada, pero no sustituye los controles de aceptación.
