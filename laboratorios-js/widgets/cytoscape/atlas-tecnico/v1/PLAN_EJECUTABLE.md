# Plan ejecutable Cytoscape.js v1

ESTADO: solo Fase 1, atlas de conocimientos. La señal '.' autoriza Fase 2.

## Autoridad y conservación
Recuperar widget de inteligencia de relaciones ya existente antes de modificarlo, constatar selección, pan/zoom, consultas, grupos y estado. No reconstruir capacidades asumidas ni atribuir pruebas no ejecutadas. Preservar archivos existentes, trabajar sólo en widgets/cytoscape y registry/cytoscape.json. Revalidar EPOCH, HEAD y colisiones.

## Experiencia I: Atlas de relaciones (emblemático)
Grafo bibliográfico con búsqueda, foco, grupos, selección doble, comparación explicada y fuentes.
Arquitectura: data JSON validado -> modelo de selección/búsqueda -> Cytoscape.js -> panel de fuentes. Recuperar grafo original → validar modelo → búsqueda → foco → ficha editorial → grupos → comparador → exportación → pruebas.
Aceptación: Búsqueda tolera acentos, selección preserva aristas, A/B muestra vecinos comunes correctos, navegación por teclado y táctil a 360px.

## Experiencia II: Taller de grafos (laboratorio)
Editor real: nodos, aristas, deshacer, layouts, métricas, simulación de densidad e import/export JSON.
Arquitectura: modelo de comandos y undo -> controladores -> Cytoscape y medidas calculadas -> exportación. Modelo y comandos → canvas Cytoscape → controles y parámetros → algoritmos → undo/redo → serialización → pruebas.
Aceptación: Los botones alteran datos reales, undo restaura aristas, layouts cambian, export/import mantiene identidad y 200 nodos son manejables.

## Experiencia III: Arqueología de una idea (variación radical)
Historia de relaciones reconstruida desde eventos, dos instantáneas comparables, timeline reversible y explicación de cada cambio.
Arquitectura: eventos con fecha, fuente y operación -> replay puro -> dos snapshots -> diff -> Cytoscape, GSAP para HTML narrativo. Esquema de eventos → validador → replay determinista → scrub/play/pausa → diff → visualización → pruebas.
Aceptación: t1/t2 producen estados distintos verificables, retroceso restaura estado, eventos inválidos se reportan y reduced-motion funciona.

## Dependencias y recursos
Cytoscape.js con versión fija desde fuente pública compatible; GSAP opcional para animaciones externas al canvas; CSS y JS sin framework obligatorio; imágenes originales o con licencia verificada. Diseño editorial oscuro, tipografía clara, controles táctiles, teclado, reduced-motion. Sin secretos, sin localStorage en iframe sandbox.

## Ejemplos y pruebas
1) Dado nodo A con vecinos B,C, al enfocar A se destacan exactamente A,B,C sin borrar otros. 2) Dado A y D que comparten C, comparar muestra exactamente C y evidencia de ambas aristas. 3) Dado dos nodos conectados, eliminar uno elimina aristas; undo restaura nodo/arista y exportar/importar mantiene IDs. 4) Dado evento de crear arista a las 10 y borrar a las 11, avanzar y retroceder reloj reproduce ambas topologías determinísticamente. 5) A 360px y con teclado, cada función es operable. 6) A 200 nodos, medir interacciones, no inventar cifras. 7) En sandbox sin allow-same-origin funciona sin almacenamiento local.

## Fase 2 al recibir '.'
Recuperar esta ruta y conocimiento.json. Inspeccionar grafo original y contrato. Construir y probar cada experiencia en navegador real antes de registrar. Publicar en carpetas independientes atlas-relaciones/v1, taller-grafos/v1, arqueologia-idea/v1 y agregar entradas sin sobrescribir registro. Comprobar URL Pages, iframe y commit real. No presentar fallos como éxitos.

## Conocimiento
Ver conocimiento.json. El video fuente es GSAP (transcripción del usuario, URL no recuperada); Cytoscape.js proviene de documentación oficial y proyectos externos, algunos del Cytoscape desktop, diferenciados en el registro.
