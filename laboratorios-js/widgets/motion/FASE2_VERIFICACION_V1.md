# Motion + GSAP · FASE 2 · Verificación de entregas v1

Fecha de ejecución: 2026-10-13 (Argentina, UTC-03). Estado: **código y registro escritos en gh-pages; despliegue servido pendiente de verificar desde navegador público**.

## Proyectos registrados, rutas y versiones

- Unix Fluid: `laboratorios-js/widgets/motion/unix-fluid/v1/index.html`. Ventanas táctiles, acoplamiento, foco, max/restaurar, notas sin perder estado, undo y JSON.
- Atlas Infinito: `laboratorios-js/widgets/motion/atlas-infinito/v1/index.html`. Buscador, profundidad, densidad, documento adicional, reorganización, navegación vertical y exportación.
- Portal: `laboratorios-js/widgets/motion/portal/v1/index.html`. Mismo nodo DOM a través de mundo, widget y pantalla completa, notas conservadas y Escape.
- Registro propietario: `laboratorios-js/registry/motion.json`; preserva atlas técnico anterior v1 y v2.
- El atlas técnico y sus fuentes y plan permanecen independientes; no se tocó el escritorio global.

## Evidencia de pruebas locales

Entorno: Chromium real, Playwright; prueba HTML standalone con `page.set_content`, escritorio 1280×850 y móvil 390×844 (viewport táctil). Se ejecutó con `prefers-reduced-motion: reduce` y solicitudes de red bloqueadas para verificar también el funcionamiento sin bibliotecas remotas.

**6 de 6** combinaciones aplicación/dispositivo pasaron sin errores JS de página:

- Unix Fluid escritorio/móvil: veinte ciclos maximizar/restaurar, minimizar/volver, conservación exacta de nota editada, controles ordenar/deshacer/restablecer; geometría no excede ancho del contenedor.
- Atlas Infinito escritorio/móvil: 30 fichas iniciales; profundidad máxima genera 36; búsqueda «Notas de campo» deja 6; cambio de densidad; agregar documento genera 37; reordenar conserva el recuento.
- Portal escritorio/móvil: 20 ciclos widget↔pantalla completa; Escape vuelve al mundo; la anotación conserva su contenido; solo existe una instancia del nodo principal.

Capturas reales locales generadas para escritorio y móvil. No están publicadas en GitHub Pages, por lo que no se presentan como evidencia del despliegue.

### Coincidencia del archivo probado con el archivo en GitHub

Comprobación carácter por carácter mediante hash de comprobación FNV-1a (Unicode codepoints), calculado sobre archivo local y sobre el contenido vuelto a leer desde GitHub:

| Proyecto | Largo JS | FNV-1a local = GitHub |
|---|---:|---|
| unix-fluid | 18145 | 18a040dc |
| atlas-infinito | 16736 | 7c6df97a |
| portal | 15945 | d056a7b0 |

SHA de los blobs del repositorio (conector GitHub): 
- Unix Fluid: `d976e46c4a5b3e6e54cab001cadea0a3e58d9a6b`.
- Atlas Infinito: `e1800f5b5f3406c92f70e991685430769fe8d259`.
- Portal: `e7af9dec3ed955a54e09cfd6392a9d9b3b503ae3`.

## Limitaciones y verdad de publicación

- **Confirmado**: contenido idéntico al probado y registro actualizado en `gh-pages`.
- **No comprobado**: respuesta HTTP de GitHub Pages, aparición dentro de la galería, carga de CDN GSAP/Motion en navegador conectado y pruebas en dispositivos físicos. El navegador de pruebas tenía el acceso de red bloqueado y el acceso HTTP público a Pages también falla en este entorno. No inferir `served` de un commit.
- Las bibliotecas GSAP 3.15.0 y Motion 13.5.0 se referencian por versiones fijas de jsDelivr; la lógica de respaldo con API web nativa sigue operativa sin CDN. Ningún dato privado se incluyó.
- Estas son **experiencias de laboratorio autónomas**, no integraciones al código actual del escritorio Unix; integración requeriría inspeccionar su contrato API y efectuar una iteración preservando la aplicación existente.

## Verificación de publicación pendiente

Comprobar HTTP 200 y funcionamiento real en:
- https://juanmanuelpm.github.io/prometeo/laboratorios-js/widgets/motion/unix-fluid/v1/index.html
- https://juanmanuelpm.github.io/prometeo/laboratorios-js/widgets/motion/atlas-infinito/v1/index.html
- https://juanmanuelpm.github.io/prometeo/laboratorios-js/widgets/motion/portal/v1/index.html
- https://juanmanuelpm.github.io/prometeo/laboratorios-js/?lab=motion

Validar bajo iframe `sandbox` sin `allow-same-origin`; comprobar teclado, puntero, 390px, motion normal/reducido, transiciones con CDN cargado y que el registro ofrece atlas técnico más tres entradas nuevas. No reclamar prueba E2E de red ni física antes de hacerla.
