# Cytoscape.js · Plan ejecutable de tres experiencias / V1
Fecha: 2026-10-13 (Argentina) · Especialidad: `cytoscape`
Ruta atlas: `laboratorios-js/widgets/cytoscape/atlas-tecnico/v1/index.html`
Fuente estructurada: `laboratorios-js/widgets/cytoscape/atlas-tecnico/v1/knowledge.json`
Autorización: la señal "." autoriza la FASE 2, incluidos desarrollo y publicación de tres aplicaciones verificadas. Este archivo NO acredita que ya estén construidas.

## Estado, evidencias, continuidad
- El registro de Cytoscape estaba vacío al iniciar la fase 1. No se encontró un widget Cytoscape existente en la carpeta pública.
- Hay **una transcripción íntegra de usuario** de un tutorial GSAP/JSMastery; carece de URL, fecha, duración, versión exacta y kit de recursos, por lo que no se reproducen ni inventan. La aplicación de cócteles NO es Cytoscape.
- Fuentes externas verificadas: documentación Cytoscape.js, tutorial de datos/estilos/layout/algoritmos, fCoSE, CoSE-Bilkent, expand-collapse (declara no estar mantenido), Cytoscape Web, GSAP. Enlaces y anotaciones en `knowledge.json`.
- El grafo original de inteligencia de relaciones es un requerimiento a conservar. Su implementación **no fue recuperada** en la revisión del laboratorio; no asumir que los nuevos proyectos pueden sustituirlo o que está probado aquí.
- El atlas se implementa como HTML y datos JSON de análisis original, sin scripts externos, sin datos personales ni archivos audiovisuales de terceros.
- No introducir servidores ni APIs pagas: infraestructura estática GitHub Pages y bibliotecas gratuitas, asegurando licencia y dependencia real en fase 2.
- No depender de localStorage dentro del iframe aislado. Persistir el trabajo de los widgets mediante exportación/importación explícitas de JSON.
- Propiedad única: `laboratorios-js/widgets/cytoscape/**` y `laboratorios-js/registry/cytoscape.json`; preservar atlas y todas las versiones anteriores.
- Leer al ejecutar: `AGENTS.md`, constitución, `laboratorios-js/CONTRATO.md`, registro actual, HEAD y contenido de este plan. Separar ramas, comparar archivos y no tocar escritorios ajenos.

## Modelo común (solo contratos de reutilización; tres apps independientes)
```js
{
 schema:"prometeo.graph/v1",
 graphId:"...",
 nodes:[{id:"n1",type:"autor",label:"...",tags:[],sources:[]}],
 edges:[{id:"e1",source:"n1",target:"n2",type:"menciona",
         evidence:{kind:"documentada",url:"https://...",note:"..."}}],
 events:[],
 meta:{license:"...",provenance:"...",updatedAt:"..."}
}
```
Validar IDs únicos, referencias existentes, URLs con protocolo seguro, peso finito, etiquetas no vacías, licencias e información publicable. Datos del ejemplo claramente etiquetados como demostrativos o sustentados por fuentes verificadas. No asignar vínculos históricos sin documentación.

## Experiencia 1 · CARTOGRAFÍA DE TEORÍAS
**Papel:** proyecto emblemático. Producto visual de consulta académica, sobrio y distintivo; contraste alto, grandes títulos editoriales y fichas bibliográficas bien compuestas, no círculos decorativos.
**Referencia:** Cytoscape.js docs, CoSE/fCoSE y patrón de foco inteligente; aprendizaje GSAP de secuencias de lectura.
**Interacción central:** buscar conceptos/autores/obras → centrar y destacar vecindario → filtrar relación → abrir ficha con fuente → elegir dos entidades → comparar vecindarios y rutas sin afirmar causalidad inexistente → volver al encuadre anterior.
**Características:** buscador sin acentos, historial exacto, controles +/−/encuadrar, agrupamiento/colapso reversible, selección desde lista accesible, panel de fuente y exportación de consulta.
**Arquitectura:** `data.js` dataset público pequeño curado; `graph.js` instancia Cytoscape y proyecciones; `queries.js` selectors/BFS/comparison; `ui.js` búsqueda/fichas/lista; `motion.js` transiciones opcionales; `index.html`, `styles.css`. No React obligatorio; vanilla JS reduce paquete y responde al iframe estático.
**Bibliotecas:** Cytoscape.js MIT, opcional GSAP gratuito. Probar primero layouts incluidos; adoptar fCoSE solo si aporta valor medido.
**Recursos/licencia:** datos bibliográficos públicos con URL fuente en aristas; sin PDFs protegidos ni capturas privadas. Tipografía de sistema y composición tipográfica original.
**Orden de ejecución:** (1) dataset+validación, (2) vista grafo/selección, (3) foco y búsqueda, (4) agrupamientos y navegación, (5) comparación y procedencia, (6) export, (7) móvil, teclado, pruebas.
**Ejemplos de aceptación Adzic:** Dado A→X y B→X, cuando comparo A y B, X aparece en «Compartido» con fuente; dado A→Y solamente, Y aparece en «Solo A». Dado autor buscado sin tilde, la selección coincide con su nombre acentuado.
**Pruebas Beck/Freeman-Pryce:** unitarias de schema/sets/BFS, integración del modelo con la selección Cytoscape, aceptación DOM y flujo en navegador. 360px y teclado; 40 acciones rápidas no generan estados fantasmas. Focus/restaurar reproduce coordenadas.
**Escalabilidad:** importaciones públicas filtradas, referencias cruzadas con Prometeo, búsqueda indexada y export.
**Publicación futura:** `widgets/cytoscape/cartografia-teorias/v1/`; entrada única distinta de atlas.

## Experiencia 2 · MESA DE TOPOLOGÍAS
**Papel:** laboratorio técnico real. Banco de experimentación que permite formular preguntas sobre composición y recorridos, no interruptores de colores.
**Referencias:** tutorial demo oficial Cytoscape.js, fCoSE y CoSE-Bilkent, API de algoritmos.
**Interacción central:** elegir dataset reproducible o dibujar relaciones con controles accesibles; aplicar distintos layouts y parámetros; ejecutar BFS/DFS/ruta mínima; comparar resultado y tiempo; guardar «antes/después» como JSON.
**Características:** editor de nodos/aristas con validación, presets árbol/malla/comunidades; inspector de densidad, cantidad de cruces aproximados y costo de layout; ejecución paso a paso; diff de parámetros; reinicio/undo/export.
**Arquitectura:** `datasets.js` presets determinísticos; `model.js` inmutable y validado; `algorithms.js` BFS/DFS/shortest path; `benchmark.js` performance.now; `graph.js` Cytoscape; `controls.js` panel móvil/teclado; `export.js`; HTML/CSS.
**Bibliotecas:** Cytoscape.js MIT; opcional fCoSE con compatibilidad comprobada, no dependencia necesaria de plugins abandonados.
**Recursos/licencia:** datos originales sintéticos y etiquetados «ejemplo». Sin servidor.
**Orden:** (1) oráculos de grafos mínimos, (2) editor/presets, (3) algoritmos, (4) layouts con semilla/snapshot, (5) comparación y métricas, (6) export y pruebas.
**Ejemplos:** grafo A→B→C: BFS desde A encuentra B y C; si elimino B→C, C deja de ser alcanzable; alterar parámetro de layout cambia posiciones, no ID/aristas; export/import reproduce exactamente la topología.
**Pruebas:** algoritmos contra fixtures conocidos, inputs inválidos sin excepciones silenciosas; límites de carga claros; comparación de tiempos sin presentarlos como benchmark universal; 360px sin pérdida de controles.
**Escalabilidad:** análisis de centralidad, layout incremental, criterios automáticos de legibilidad.
**Publicación futura:** `widgets/cytoscape/mesa-topologias/v1/`.

## Experiencia 3 · CRONOSCOPIO
**Papel:** variación radical. Traslada el principio GSAP Timeline/ScrollTrigger y revelado progresivo desde una landing comercial hacia arqueología temporal de redes.
**Referencias:** tutorial GSAP aportado, Cytoscape core; `time`, `history`, `provenance` y patrón `p-timeline` del atlas.
**Interacción central:** slider de fechas y play/pause → cambios de nodos/aristas por eventos → diff «antes/después» → inspección de qué fuente justifica cada aparición/desaparición → volver exactamente a un estado anterior.
**Características:** dos relojes separados («fecha del hecho» y «fecha de registro»); registro de decisiones públicas versionadas, eventos de incorporación/corrección/retiro y confianza; filtros de tipos; comparación lado a lado; export de timeline.
**Arquitectura:** `events.js` log público inmutable con IDs y fechas; `reducer.js` snapshots determinísticos; `diff.js` changeset; `graph.js` Cytoscape; `playback.js` timeline con GSAP o requestAnimationFrame; `ui.js` controles, evidencia, fecha; index/CSS. Reducer independiente del motor gráfico.
**Bibliotecas:** Cytoscape.js; GSAP gratuito opcional para progreso, nunca autoridad del estado histórico.
**Recursos/licencia:** historial de demostración producido a partir de acontecimientos técnicos públicos con URL/documentación o dataset inventado identificado explícitamente; no inventar fechas históricas ni usar trazas privadas.
**Orden:** (1) modelar evento/snapshot y oráculos, (2) visual de cambios, (3) slider + teclado, (4) reproducción reversible, (5) evidencia, (6) comparación/export, (7) móvil y estrés.
**Ejemplos:** evento e1 introduce A→B 2020-01-01, evento e2 cambia a A→C 2021-01-01: al volver a 2020 se restaura A→B; reproducción hacia adelante, atrás y saltos arbitrarios coincide bit a bit con reducer. Evento sin fuente pública se marca «demostrativo/no verificado».
**Pruebas:** snapshots deterministas, 100 scrubs consecutivos, play/pause, reduced-motion, nada de scroll obligatorio; teclado y 360px; sin memoria compartida del iframe.
**Escalabilidad:** diff de ramas, historiales de investigación, cambios de conceptos con procedencia.
**Publicación futura:** `widgets/cytoscape/cronoscopio/v1/`.

## Gates previos a publicación, aplicables a cada widget
1. **RED**: criterios observables especificados y tests que fallen antes de implementar.
2. **GREEN**: código y casos de prueba con dato pequeño conocido; ningún botón simulado.
3. **REFACTOR**: módulos reutilizables, separación modelo/datos/presentación, no matar capacidades.
4. **SISTEMA**: navegador real, teclado, toque/360px, responsive, dependencia/CDN, reduced-motion, error de red, rendimiento.
5. **PUBLICACIÓN**: branch propia, HEAD/constitución/contrato reread, PR o merge seguro, solo registry/cytoscape, comprobar servidumbre Pages/iframe y URL exacta; las versiones previas siguen.
6. **TRUTH**: commit ≠ deployed ≠ aceptado; si no se puede probar Pages, documentar explícitamente el bloqueo en lugar de inventar éxito.
7. **CONTINUIDAD**: actualizar este plan mediante nueva versión o delta específico, no sobrescribir decisiones probadas.

## Señal de ejecución
Si el usuario envía exactamente `.`, recuperar este archivo y el JSON del atlas, NO replanificar; ejecutar experiencias 1, 2 y 3, en ese orden, con publicación individual solo si pasan gates. La señal autoriza el desarrollo y la publicación, pero no inventar QA o resultados.
