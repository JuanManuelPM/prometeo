# D3.js · Reproducción técnica a partir de dos transcripciones aportadas
Estado de fuentes: **dos tutoriales únicos**; dos copias de la charla Adam Fortuna; ningún enlace original de YouTube ni archivos de código recibidos. Texto original del video no reproducido.

## [VIDEO 01] Adam Fortuna · Drawing Data with D3.js and AI
- Inglés, duración/publicación/URL/versiones de D3 no indicadas.
- Tipo: conferencia con demostraciones, NO repositorio reproducible recibido.
- Objetivo: desde la exploración asistida con D3 hasta una narrativa honesta de datos sobre libros en Hardcover.
- Estructura observada: SVG viewBox; g con translate; extent(datos); scaleLog().domain().range(); axis; selección de variables; comparación por small multiples; anomalía de 706 lecturas del mismo libro por un usuario en el mismo día; limpieza explícita; tendencia por cambio relativo, no popularidad bruta; area bump chart; anotaciones de hipótesis.
- Ciclo de actualización inferido: cambiar reglas o dataset → recalcular agregación y dominios → volver a dibujar/animar marcas → inspeccionar y redactar. No se muestra un repositorio completo ni API exacta.
- Reproducción equivalente: (a) usar CSV de eventos con id, actorId, itemId, occurredAt; (b) ejecutar validación; (c) agregar por ventanas; (d) renderizar perspectivas lineal, ranking y facetas; (e) permitir remover duplicados por clave; (f) conservar auditoría; (g) contar antes y después; (h) narrar solo conclusiones respaldadas.
- Pseudocódigo original:
```js
function trending(events, start, end) {
  const unique = dedupe(events, e => [e.actorId, e.itemId, week(e.occurredAt)].join(':'));
  const before = countByItem(unique.filter(e => inWindow(e.occurredAt, start)));
  const after = countByItem(unique.filter(e => inWindow(e.occurredAt, end)));
  return joinKeys(before, after).map(item => ({
    ...item,
    growth: item.before === 0 ? null : (item.after-item.before)/item.before
  }));
}
```
- [CORRECCIÓN] La deduplicación anterior es **una regla ilustrativa**, no la misma que aplica el orador; en otro dominio la unicidad puede ser diferente. Comparar conteos brutos y únicos, no ocultar ambos. Usar etiquetas para n pequeño y cero.
- [EXTENSIÓN] Crear detective de anomalías en actividad documental, narración de cambios públicos o rastreo de publicaciones.
- Pruebas: baseline=0 ⇒ null; usuario con 706 duplicados ⇒ máximo un registro por clave ilustrativa; ventanas limítrofes no se duplican; el eje informa unidades; facetas comparten escala.
- Recurso primario: transcripción aportada en el chat, no publicable íntegra.

## [VIDEO 02] Germán Álvarez / Garage Code · globo D3 interactivo
- Español, duración/publicación/URL/versiones de D3 no indicadas. Título reconstruido descriptivamente.
- Producto final: esfera SVG con países derivados de GeoJSON, retícula, información por país y drag para rotar.
- Estructura observada: index.html, carpetas CSS/JS; D3 desde CDN; GeoJSON externo con FeatureCollection (~175 países en archivo concreto), properties y geometry; d3.json carga; select/append SVG; geoPath sobre proyección; data join de features → path.d; clases country y graticule; geoGraticule; fitSize/translate; info panel; mouseover obtiene datum; color resalta; CSS transition; mousedown/up/move; rotate; recalcular d.
- Pseudocódigo original:
```js
const projection = d3.geoOrthographic().fitSize([w,h], features);
const path = d3.geoPath(projection);
const countries = svg.selectAll('.country').data(features.features, d=>d.id)
 .join('path').attr('class','country').attr('d',path);
const grid = svg.append('path').datum(d3.geoGraticule()())
 .attr('fill','none').attr('d',path);
function rotateBy(dx,dy) {
  const [lon,lat] = projection.rotate();
  projection.rotate([lon + dx * 0.35, Math.max(-85, Math.min(85, lat-dy*0.35))]);
  countries.attr('d',path); grid.attr('d',path);
}
```
- [CORRECCIÓN] geoOrthographic en el código anterior es **una elección técnica propuesta**: la transcripción no conserva con certeza el nombre de la proyección del tutorial. No atribuirla literalmente al video.
- [CORRECCIÓN] Sustituir eventos de ratón por Pointer Events y pointer capture; añadir arrastre con umbral para distinguir toque de selección. Escapar texto no confiable. ResizeObserver. Etiquetas/teclado y panel táctil.
- [CORRECCIÓN] No resetear estilos de todos los países ante cada hover. Mantener selectedId/hoverId, clases y estilos declarativos. Descartar estado de hover en pointerleave.
- [EXTENSIÓN] Narrar rutas documentadas, comparar proyecciones y exportar SVG.
- Pruebas: 3 proyecciones conservan id; el globo no gira sin pointerdown; pointercancel suelta captura; la retícula rota con países; interfaz usable con teclado; privacidad en iframe opaco.

## Transformaciones transversales de fuente a proyecto
[VIDEO] Técnica demostrada → [CORRECCIÓN] ajuste técnico → [EXTENSIÓN] uso distinto:
- scaleLog / small multiples → dominio y métricas auditables → comparador de actividad.
- geoPath / rotate / graticule → Pointer Events y responsive semántico → laboratorio de cartografía.
- data exploration → auditoría humana del sesgo → inspector de hechos históricos.
- DOM programático → join con IDs estables y funciones puras → interfaces componibles.
- panel hover → selección, estado persistente y ficha táctil → atlas accesible.

## Lo que falta y cómo abordarlo
No hay URL exacta de ninguno de los dos videos, duración, fecha, versión D3, código descargable, archivo GeoJSON original ni presentación completa. No inventar esas propiedades. Consultar APIs oficiales y datasets libres enlazados desde knowledge.json, fijar SHA/versión en cada aplicación que efectivamente reutilice recursos. La transcripción no demuestra corrección de interacción táctil, rendimiento ni licencias del código.
