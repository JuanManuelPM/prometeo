# D3.js · PLAN EJECUTABLE FASE 2 · Prometeo
Fecha: 2026-10-13 (Argentina). Estado: PLANIFICADO; **ninguno de los tres widgets existe todavía**.
Propietario exclusivo: laboratorios-js/widgets/d3/** y laboratorios-js/registry/d3.json.
Atlas de conocimiento: ./index.html y ./knowledge.json (publicación v2; v1 anterior preservada).
Fuente: dos transcripciones aportadas, documentación D3 y proyectos públicos enlazados desde knowledge.json.
Disparador: un mensaje cuyo contenido sea exactamente "." autoriza construir, probar y publicar estas tres experiencias, sin solicitar otra selección.

## Invariantes
1. No tocar otros laboratorios, portada ni constitución.
2. No falsear bibliografía, relaciones, cifras, registros, URLs ni estado de publicación.
3. Las tres apps se entregan como HTML independiente, responsive, con teclado, tacto y controles reales; sin localStorage obligatorio.
4. Publicar en versiones v1 separadas; preservar toda versión anterior; registrar solamente tras pruebas.
5. Dependencia D3 fijada a versión comprobada con alternativa local o aviso de dependencia externa; datos abiertos locales versionados cuando sea posible.
6. Distinguir [HECHO] / [INFERENCIA] / [HIPÓTESIS] y mostrar procedencia.

## 01 · TRÁNSITO DE IDEAS (proyecto emblemático)
**Concepto.** Atlas académico histórico-conceptual con dirección editorial (fichas de archivo, tipografía, fechas, citas). No extraer documentos personales.
**Datos.** Dataset curado de hitos públicos verificables: personas, obras, instituciones, lugares, relaciones y enlaces de fuente. Cada registro: id, type, title, date_start/end, coordinates? (si comprobadas), references[], claims[], relationIds[] y provenance. Para la primera entrega usar 12–25 hechos confirmados individualmente en fuentes abiertas, no un corpus masivo falso. Una ubicación ausente se muestra sin pin.
**Mecánica.** Usuario selecciona un autor → muestra ficha y hechos fechados → cambia entre mapa, línea temporal y tabla de relaciones manteniendo selectedId → compara dos autores con coincidencias y diferencias citadas → vuelta a contexto general. Buscar y filtrar por fecha y categoría. Estados vacíos explícitos. La red conceptual puede enlazarse al Cytoscape existente, sin reescribirlo.
**Arquitectura.** data/facts.json validado; src/model.js normaliza fechas y referencias; src/selectors.js calcula filtros y vecindarios; src/views/map.js usa d3-geo; src/views/time.js usa scaleUtc, axis, joins; src/views/compare.js usa facetas; src/state.js reducer; index.html accesible. Integración por mismo estado, no localStorage.
**Arte.** Superficies sobrias, fichas con fuerte jerarquía, textos que explican; sin telarañas ilegibles.
**Entradas.** Teclado, toque, scroll normal; búsqueda, fecha, selección, modo y comparador. Sin hover obligatorio.
**Pruebas ejemplo (Adzic).** Dado autor A con dos obras citadas, cuando filtro por año previo a ambas, se ve estado vacío sin perder A. Dado un hecho sin coordenadas, nunca se inventa un punto geográfico. Dado dos autores, la comparación cita sus registros. A 360 px no hay desborde horizontal.
**Aceptación.** 12+ hechos auditados; >=3 vistas funcionales, selector persistente entre vistas, 360/768/1440 px, lector de teclado, cero afirmaciones sin fuente, navegación fluida; capturas y datos de pruebas reales.
**Extensión.** Bibliografía, itinerarios narrados, enlaces a fuentes primarias.

## 02 · PROYECCIONES (laboratorio interactivo)
**Concepto.** Taller cartográfico donde una misma geometría adopta diferentes proyecciones con explicación de distorsiones.
**Datos.** Natural Earth 110m desde GeoJSON Atlas CC0 o world-atlas (pin SHA, condiciones y política de límites); no incluir propiedades económicas inventadas.
**Mecánica.** Globe ortográfico arrastrable, Mercator y Equal Earth/Natural Earth según soporte; cambio sin pérdida de país activo, graticulado configurable, lat/lon centro, escala, comparación de proyecciones, exportar parámetros y SVG. Panel que explica limitaciones y muestra coordenadas.
**Arquitectura.** data/world.geojson; core/geo.js proyecciones y path; core/interaction.js Pointer Events con pointercapture, cancel y keyboard; ui/controls.js enlaza estado y rerender; render con requestAnimationFrame y ResizeObserver. Opcional D3-geo exclusivamente, evitando un motor paralelo.
**Pruebas ejemplo.** Arrastrar 100 px modifica rotación solo mientras pointer capturado. Pointercancel deja el globo inmóvil. Cambiar de proyección mantiene ID activo y nombre. En móvil, toque selecciona un país y permite scroll fuera del visor. Alternar retícula no cambia datos geográficos.
**Aceptación.** 3 proyecciones útiles, 2 layouts, selección táctil/teclado, export SVG no vacío, fuente/versión visibles, ningún error CORS, rendimiento aceptable en móvil.
**Extensión.** Indicadores de distorsión con métricas correctamente calculadas, guardado descargable de configuración.

## 03 · PULSO DOCUMENTAL (variación radical)
**Concepto.** Transformar el proceso de detectar falsos 'trending' del video de Hardcover en una herramienta real de análisis de actividad documental o de proyectos.
**Datos.** Export público de commits o JSON/CSV importado por usuario; capturar fuente, fecha y límites de API, sin tokens cliente. Si la API pública bloquea CORS o cuota, ofrecer importación local o snapshot etiquetado con commit SHA y fecha. No recurrir a números simulados.
**Mecánica.** Comparar actividad bruta, actividad por autor y actividad por archivo; explorar temporalmente, observar anomalías, aplicar reglas de depuración y ver dos gráficos sincronizados ANTES/DESPUÉS. Registrar exclusiones con razón. Crear pequeñas anotaciones [HECHO]/[HIPÓTESIS] enlazadas a commit o fila. Exportar JSON del análisis.
**Arquitectura.** loader/parser schema-first, normalizador de identidad y fecha, agregador con ventanas, detector de outliers, motor de reglas determinista, state, vistas line chart + small multiples + ranking, auditoría exportable. D3 para escalas, joins y brush.
**Pruebas ejemplo.** Fixture marcado DEMO: 706 registros duplicados de un actor en un día. El conteo bruto observa 706; al aplicar unicidad por evento, el conteo se reduce según la clave especificada. Con baseline cero, crecimiento relativo queda 'sin base', nunca Infinity. Una línea sin commit asociado no produce link.
**Aceptación.** Importación real, limpieza reversible, al menos 3 perspectivas visuales, auditoría de todas las exclusiones, exportación reproducible, errores API claros, móvil y teclado útiles.
**Extensión.** Conectar catálogo público de investigación o historial de un proyecto GitHub distinto.

## Orden de ejecución al recibir "."
1. Recuperar este archivo, knowledge.json, contrato y estado actual gh-pages; respetar modificaciones concurrentes.
2. Fijar paquetes y datasets públicamente reproducibles con licencias; validar esquema y fechas.
3. Crear fixtures de aceptación e implementar modelo y estado de las tres apps, conservando independencia.
4. Implementar interacciones principales antes que el pulido; pruebas end-to-end en navegador real y en iframe sandbox.
5. Perfeccionar lenguaje visual, a11y, control móvil, reduced-motion, errores y rendimiento.
6. Inspeccionar diferencias y permisos; publicar rutas:
   - laboratorios-js/widgets/d3/transito-de-ideas/v1/index.html
   - laboratorios-js/widgets/d3/proyecciones/v1/index.html
   - laboratorios-js/widgets/d3/pulso-documental/v1/index.html
7. Actualizar solo registry/d3.json agregando tres entradas y conservando atlas y versiones existentes.
8. Verificar bytes servidos, recarga, links del escritorio y capturas; si una app falla, no fingir publicación terminada, dejar constancia concreta.

## Marco de calidad
Kent Beck: ciclo rojo→verde→refactor sobre modelo de datos, gestos y accesibilidad.
Gojko Adzic: escenarios de aceptación anteriores como ejemplos ejecutables.
Freeman y Pryce: pruebas end-to-end recorren desde dataset/entrada hasta ficha, gráfico y exportación.
Contraejemplos obligatorios: duplicados, base cero, GeoJSON inválido, pantalla 360px, falta de conexión, pointercancel y links externos caídos.

## Continuidad para otro chat
Abrir README.md de Laboratorios y CONTRATO.md, este PLAN_FASE2.md y knowledge.json; contrastar con gh-pages HEAD actual. No necesitan volver a ver videos. Las URLs originales de ambos videos, sus fechas, duraciones y código fuente no fueron aportados, no inventarlos. Antes de ejecutar distinguir la información observada [VIDEO] del diseño propuesto [EXTENSIÓN].
