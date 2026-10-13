# Atlas Cytoscape v1 · Fuentes y QA
- Fuente del usuario: una transcripción extensa GSAP/JSMastery (sin URL/título oficial/duración ni derechos sobre archivos multimedia). En el atlas se publican **síntesis originales**, no transcripción.
- Documentación Cytoscape.js https://js.cytoscape.org/ · MIT, API y rendimiento.
- Tutorial oficial https://cytoscape.org/cytoscape.js-tutorial-demo/ · datos, estilo, layouts, BFS/DFS.
- fCoSE https://github.com/iVis-at-Bilkent/cytoscape.js-fcose · MIT, layout compound.
- CoSE-Bilkent https://github.com/cytoscape/cytoscape.js-cose-bilkent · MIT.
- expand-collapse https://github.com/iVis-at-Bilkent/cytoscape.js-expand-collapse · MIT, repositorio avisa no mantenido.
- Cytoscape Web https://cytoscape.org/what_is_cytoscape.html · producto.
- GSAP https://github.com/greensock/GSAP · gratuito según anuncio público del 30/4/2025, https://webflow.com/updates/gsap-becomes-free.

## Verificaciones estructurales previstas
1. `index.html` autónomo, no invoca CDN, fetch ni localStorage.
2. `knowledge.json` es JSON válido, schema v1, 8 fuentes diferenciadas, todas las 22 capacidades con nueve campos, 5 patrones y 3 proyectos.
3. Buscador normaliza tildes; filtros «Todo/Fuentes/Capacidades/Patrones/Decisiones/Próximas» muestran fichas reales, no inventadas.
4. Los enlaces externos abren en otra pestaña, no contienen secretos y van a orígenes documentados.
5. Visibilidad de estado: atlas es documentación; próximas experiencias son PLAN, no publicadas.
6. Verificar CSS móvil y tab/focus/summary; comprobar Pages HTTP+contenido antes de afirmar despliegue servido.

## Deuda transparente
- Código exacto del grafo original no recuperado. La promesa es conservarlo cuando aparezca, no afirmar paridad actual.
- Tutorial GSAP: sin video verificable, autor/canal según la voz; no hay URL, fecha, duración ni zip/Figma original.
- No se realizó benchmark de layouts de fCoSE en dispositivos reales: la documentación propone experimentos para fase 2.
