# PROMETEO · Lectura · Manual técnico completo v1

**Especialidad** PDF.js + EPUB.js. **Complemento aprendido** jsPDF. 13 de octubre de 2026.

## Evidencia y limitaciones
Se recibió **una transcripción inglesa completa** sobre una factura React/Next.js/jsPDF. No se suministraron URL, autor identificable, fecha, duración, repositorio ni código completo. La secuencia [VIDEO] procede solo del texto; [CORRECCIÓN] propone ajustes; [INVESTIGACIÓN] remite a los enlaces oficiales registrados. No se copia material protegido ni documentos personales.

## Secuencia completa del tutorial

### paso-01 · Inicio y stack
[VIDEO] Next.js/TypeScript; Tailwind y shadcn/ui; separa form y preview.

[CORRECCIÓN/EXTENSIÓN] No imponer Next.js al atlas estático ni hacer depender widgets de servicios.

### paso-02 · Diseño de detalles
[VIDEO] Cards, labels, inputs, date; responsive 1/2 columnas.

[CORRECCIÓN/EXTENSIÓN] Controles táctiles de 44px y ancho de texto cómodo.

### paso-03 · Contactos
[VIDEO] Secciones from/to duplican estructura de campos.

[CORRECCIÓN/EXTENSIÓN] Reemplazar por metadatos bibliográficos, ficha y citas.

### paso-04 · Ítems
[VIDEO] Array de filas, map(), key, grilla 12 columnas 5+2+2+2+1.

[CORRECCIÓN/EXTENSIÓN] Evitar grilla densa de escritorio en móvil.

### paso-05 · Tipos
[VIDEO] InvoiceItem e InvoiceData tipados; datos iniciales con un ítem.

[CORRECCIÓN/EXTENSIÓN] Modelos originales Document/Anchor/Annotation/ExportDraft.

### paso-06 · Context Provider
[VIDEO] InvoiceProvider expone invoice a componentes y usa useInvoice.

[CORRECCIÓN/EXTENSIÓN] Seccionar estado para evitar rerender de todo el visor.

### paso-07 · Edición controlada
[VIDEO] value/onChange + updateInvoice({campo:valor}) con spread.

[CORRECCIÓN/EXTENSIÓN] Separar borrador de valor guardado y validar.

### paso-08 · Agregar ítem
[VIDEO] addItem genera ID y suma al array.

[CORRECCIÓN/EXTENSIÓN] ID estable; crypto.randomUUID y actualizaciones funcionales.

### paso-09 · Eliminar ítem
[VIDEO] removeItem por índice con filter; impide quitar última fila.

[CORRECCIÓN/EXTENSIÓN] Borrar por ID, no posición mutable.

### paso-10 · Actualizar ítem
[VIDEO] updateItem(index,field,value) recrea el objeto.

[CORRECCIÓN/EXTENSIÓN] Evitar mutaciones y estado obsoleto en actualizaciones.

### paso-11 · Números editables
[VIDEO] Valor vacío como string; onBlur normaliza cantidad=1 y tarifa=0.

[CORRECCIÓN/EXTENSIÓN] No forzar cambios mientras se está escribiendo una nota.

### paso-12 · Cálculos
[VIDEO] amount=quantity*rate; reduce para subtotal; porcentaje de impuesto; total.

[CORRECCIÓN/EXTENSIÓN] Separar funciones puras; no duplicar estado derivado.

### paso-13 · Preview sincronizado
[VIDEO] Vista HTML lee el mismo Context que el formulario y usa formatters.

[CORRECCIÓN/EXTENSIÓN] Misma fuente para anotaciones, cuaderno y PDF generado.

### paso-14 · PDF con jsPDF
[VIDEO] Genera textos, tabla y totales mediante posiciones x/y.

[CORRECCIÓN/EXTENSIÓN] Medir líneas, saltos de página, tipografías y Unicode.

### paso-15 · Preview de PDF
[VIDEO] doc.output('blob'), URL.createObjectURL, iframe local.

[CORRECCIÓN/EXTENSIÓN] Revocar object URLs; no guardar archivos personales en Pages.

### paso-16 · Descarga
[VIDEO] doc.save(nombre.pdf) al cerrar el tutorial.

[CORRECCIÓN/EXTENSIÓN] Exportación de cuadernos propios y datos JSON editables.

### paso-17 · Pruebas ausentes
[VIDEO] No aparece una suite automática de tests ni prueba móvil exhaustiva.

[CORRECCIÓN/EXTENSIÓN] Especificación por ejemplos y E2E de navegador reales antes de publicar.

## Modelo alternativo para lectura
```ts
type Anchor = {format:'pdf',page:number,rect?:[number,number,number,number],quote?:string} | {format:'epub',cfi:string,quote?:string};
type Note = {id:string,documentId:string,anchor:Anchor,body:string,tags:string[]};
type BookRef = {id:string,title:string,authors:string[],format:'pdf'|'epub'};
type Notebook = {schema:'lectura-notebook/v1',blocks:Array<{id:string,kind:'quote'|'note'|'heading',text:string,source?:Anchor}>};
```

**Diseño:** separar motores PDF/EPUB, anclajes, estado de lectura, anotaciones, presentación y exportación. IDs estables, funciones puras, desmontaje de páginas/recursos, controles de error.

## Biblioteca de capacidades operativas

### cap-01 · Carga PDF local [Archivos]
1. **Qué permite:** Un visor sin servidor.
2. **Cómo funciona:** File→Uint8Array→getDocument({data})→page render.
3. **Componentes:** PDF.js + File API.
4. **Qué aprendimos:** pdfjs-guia, pdfjs-ejemplos; consultar esas fuentes y distinguir [VIDEO] de [INVESTIGACIÓN].
5. **Limitaciones:** Encriptado/escaneos; PDF enorme.
6. **Error a evitar:** No fingir carga pdf local si la prueba de aceptación falla..
7. **Proyecto derivado:** Un visor sin servidor.
8. **Patrón reusable:** Adapter 01: File→Uint8Array→getDocument({data})→page render.
9. **Prueba de aceptación:** PDF seleccionado se ve y sus bytes no viajan por red.

Pseudocódigo de interfaz (esquema orientativo, **no** código de biblioteca ejecutable): `function capability(input) { validate(input); const state=apply('Carga PDF local',input); assert(state); return state; }`

### cap-02 · Carga EPUB local [Archivos]
1. **Qué permite:** Lector reflowable.
2. **Cómo funciona:** File→ArrayBuffer→ePub(bytes)→rendition.display().
3. **Componentes:** EPUB.js, ZIP interno, File API.
4. **Qué aprendimos:** epubjs-api, epubjs-types; consultar esas fuentes y distinguir [VIDEO] de [INVESTIGACIÓN].
5. **Limitaciones:** DRM, HTML potencialmente activo.
6. **Error a evitar:** No fingir carga epub local si la prueba de aceptación falla..
7. **Proyecto derivado:** Lector reflowable.
8. **Patrón reusable:** Adapter 02: File→ArrayBuffer→ePub(bytes)→rendition.display().
9. **Prueba de aceptación:** EPUB libre abre dos capítulos; scripts embebidos no se ejecutan.

Pseudocódigo de interfaz (esquema orientativo, **no** código de biblioteca ejecutable): `function capability(input) { validate(input); const state=apply('Carga EPUB local',input); assert(state); return state; }`

### cap-03 · Anclas PDF y EPUB [Navegación]
1. **Qué permite:** Lectura interrumpible.
2. **Cómo funciona:** PDF{page,rect,text}; EPUB{cfi,text}.
3. **Componentes:** AnchorAdapter, EPUB CFI, textLayer.
4. **Qué aprendimos:** video-01, epubjs-api; consultar esas fuentes y distinguir [VIDEO] de [INVESTIGACIÓN].
5. **Limitaciones:** CFI no equivale a página física; offsets visuales cambian.
6. **Error a evitar:** No fingir anclas pdf y epub si la prueba de aceptación falla..
7. **Proyecto derivado:** Lectura interrumpible.
8. **Patrón reusable:** Adapter 03: PDF{page,rect,text}; EPUB{cfi,text}.
9. **Prueba de aceptación:** Retoma al mismo párrafo tras recarga/importación.

Pseudocódigo de interfaz (esquema orientativo, **no** código de biblioteca ejecutable): `function capability(input) { validate(input); const state=apply('Anclas PDF y EPUB',input); assert(state); return state; }`

### cap-04 · Render PDF fluido [Render]
1. **Qué permite:** Visor de papers.
2. **Cómo funciona:** Viewport, escala, DPR limitado y cola cancelable.
3. **Componentes:** PDFPageProxy, canvas, worker.
4. **Qué aprendimos:** pdfjs-guia, pdfjs-ejemplos; consultar esas fuentes y distinguir [VIDEO] de [INVESTIGACIÓN].
5. **Limitaciones:** Fugas de memoria y renders antiguos.
6. **Error a evitar:** No fingir render pdf fluido si la prueba de aceptación falla..
7. **Proyecto derivado:** Visor de papers.
8. **Patrón reusable:** Adapter 04: Viewport, escala, DPR limitado y cola cancelable.
9. **Prueba de aceptación:** 20 cambios de zoom no superponen páginas.

Pseudocódigo de interfaz (esquema orientativo, **no** código de biblioteca ejecutable): `function capability(input) { validate(input); const state=apply('Render PDF fluido',input); assert(state); return state; }`

### cap-05 · Reflow EPUB [Render]
1. **Qué permite:** Novelas y manuales.
2. **Cómo funciona:** Theme + flow + spread; mantener CFI al variar fuente.
3. **Componentes:** Rendition, temas CSS.
4. **Qué aprendimos:** epubjs-api, epubjs-types; consultar esas fuentes y distinguir [VIDEO] de [INVESTIGACIÓN].
5. **Limitaciones:** EPUB con estilos rígidos, imágenes anchas.
6. **Error a evitar:** No fingir reflow epub si la prueba de aceptación falla..
7. **Proyecto derivado:** Novelas y manuales.
8. **Patrón reusable:** Adapter 05: Theme + flow + spread; mantener CFI al variar fuente.
9. **Prueba de aceptación:** Tamaño de fuente cambia sin perder sección.

Pseudocódigo de interfaz (esquema orientativo, **no** código de biblioteca ejecutable): `function capability(input) { validate(input); const state=apply('Reflow EPUB',input); assert(state); return state; }`

### cap-06 · Margen y columna PDF [Render]
1. **Qué permite:** Lectura de dos columnas.
2. **Cómo funciona:** Recorte reversible, coordenadas inversas.
3. **Componentes:** CropPreset, viewport transform.
4. **Qué aprendimos:** pdfjs-guia, pdfjs-ejemplos; consultar esas fuentes y distinguir [VIDEO] de [INVESTIGACIÓN].
5. **Limitaciones:** Columna rota, recorte de notas laterales.
6. **Error a evitar:** No fingir margen y columna pdf si la prueba de aceptación falla..
7. **Proyecto derivado:** Lectura de dos columnas.
8. **Patrón reusable:** Adapter 06: Recorte reversible, coordenadas inversas.
9. **Prueba de aceptación:** Deshacer crop recupera contenido y anclas.

Pseudocódigo de interfaz (esquema orientativo, **no** código de biblioteca ejecutable): `function capability(input) { validate(input); const state=apply('Margen y columna PDF',input); assert(state); return state; }`

### cap-07 · Índice textual progresivo [Buscar]
1. **Qué permite:** Buscador documental.
2. **Cómo funciona:** Extraer por página/sección, normalizar, indexar y navegar.
3. **Componentes:** getTextContent; texto EPUB; SearchIndex.
4. **Qué aprendimos:** pdfjs-guia, pdfjs-ejemplos; consultar esas fuentes y distinguir [VIDEO] de [INVESTIGACIÓN].
5. **Limitaciones:** PDF escaneado carece de texto.
6. **Error a evitar:** No fingir índice textual progresivo si la prueba de aceptación falla..
7. **Proyecto derivado:** Buscador documental.
8. **Patrón reusable:** Adapter 07: Extraer por página/sección, normalizar, indexar y navegar.
9. **Prueba de aceptación:** Buscar retorna ubicaciones reales y puede cancelarse.

Pseudocódigo de interfaz (esquema orientativo, **no** código de biblioteca ejecutable): `function capability(input) { validate(input); const state=apply('Índice textual progresivo',input); assert(state); return state; }`

### cap-08 · Selección y subrayado [Anotar]
1. **Qué permite:** Comentarios y fichas.
2. **Cómo funciona:** PDF rect/texto; EPUB CFI; guardar nota separada.
3. **Componentes:** AnnotationStore, SelectionAdapter.
4. **Qué aprendimos:** video-01, epubjs-api; consultar esas fuentes y distinguir [VIDEO] de [INVESTIGACIÓN].
5. **Limitaciones:** Selección de PDF puede fragmentarse.
6. **Error a evitar:** No fingir selección y subrayado si la prueba de aceptación falla..
7. **Proyecto derivado:** Comentarios y fichas.
8. **Patrón reusable:** Adapter 08: PDF rect/texto; EPUB CFI; guardar nota separada.
9. **Prueba de aceptación:** Anotación se mantiene tras zoom/reflow.

Pseudocódigo de interfaz (esquema orientativo, **no** código de biblioteca ejecutable): `function capability(input) { validate(input); const state=apply('Selección y subrayado',input); assert(state); return state; }`

### cap-09 · Backup local verificable [Privacidad]
1. **Qué permite:** Archivo personal.
2. **Cómo funciona:** Exportar/importar JSON versionado, validar IDs/anclas.
3. **Componentes:** Blob, descarga, parser, schema.
4. **Qué aprendimos:** video-01, epubjs-api; consultar esas fuentes y distinguir [VIDEO] de [INVESTIGACIÓN].
5. **Limitaciones:** Iframe sandbox no garantiza localStorage.
6. **Error a evitar:** No fingir backup local verificable si la prueba de aceptación falla..
7. **Proyecto derivado:** Archivo personal.
8. **Patrón reusable:** Adapter 09: Exportar/importar JSON versionado, validar IDs/anclas.
9. **Prueba de aceptación:** JSON export/import conserva notas sin POST.

Pseudocódigo de interfaz (esquema orientativo, **no** código de biblioteca ejecutable): `function capability(input) { validate(input); const state=apply('Backup local verificable',input); assert(state); return state; }`

### cap-10 · Voz y seguimiento [Audio]
1. **Qué permite:** Lectura caminando.
2. **Cómo funciona:** Segmentos por oración, speechSynthesis, fallback sin boundary.
3. **Componentes:** SpeechController, Web Speech API.
4. **Qué aprendimos:** mdn-tts; consultar esas fuentes y distinguir [VIDEO] de [INVESTIGACIÓN].
5. **Limitaciones:** Voces y eventos varían por navegador.
6. **Error a evitar:** No fingir voz y seguimiento si la prueba de aceptación falla..
7. **Proyecto derivado:** Lectura caminando.
8. **Patrón reusable:** Adapter 10: Segmentos por oración, speechSynthesis, fallback sin boundary.
9. **Prueba de aceptación:** Play/pause/stop y resaltado honesto por oración.

Pseudocódigo de interfaz (esquema orientativo, **no** código de biblioteca ejecutable): `function capability(input) { validate(input); const state=apply('Voz y seguimiento',input); assert(state); return state; }`

### cap-11 · Estantería editorial [Biblioteca]
1. **Qué permite:** Biblioteca visual.
2. **Cómo funciona:** Metadatos, autor, obra, tags y progreso sin portadas falsas.
3. **Componentes:** CatalogEntry, cover extractor.
4. **Qué aprendimos:** calibre-manual, foliate; consultar esas fuentes y distinguir [VIDEO] de [INVESTIGACIÓN].
5. **Limitaciones:** Rutas locales no sobreviven al iframe sin permiso.
6. **Error a evitar:** No fingir estantería editorial si la prueba de aceptación falla..
7. **Proyecto derivado:** Biblioteca visual.
8. **Patrón reusable:** Adapter 11: Metadatos, autor, obra, tags y progreso sin portadas falsas.
9. **Prueba de aceptación:** Filtrar por autor y abrir libro importado.

Pseudocódigo de interfaz (esquema orientativo, **no** código de biblioteca ejecutable): `function capability(input) { validate(input); const state=apply('Estantería editorial',input); assert(state); return state; }`

### cap-12 · Calibre opcional [Biblioteca]
1. **Qué permite:** Colecciones LAN.
2. **Cómo funciona:** Adaptador OPDS/servidor sin acoplar lectura local.
3. **Componentes:** CalibreAdapter separado.
4. **Qué aprendimos:** calibre-manual, koreader; consultar esas fuentes y distinguir [VIDEO] de [INVESTIGACIÓN].
5. **Limitaciones:** CORS, autenticación, red local.
6. **Error a evitar:** No fingir calibre opcional si la prueba de aceptación falla..
7. **Proyecto derivado:** Colecciones LAN.
8. **Patrón reusable:** Adapter 12: Adaptador OPDS/servidor sin acoplar lectura local.
9. **Prueba de aceptación:** Sin Calibre el lector local sigue completo.

Pseudocódigo de interfaz (esquema orientativo, **no** código de biblioteca ejecutable): `function capability(input) { validate(input); const state=apply('Calibre opcional',input); assert(state); return state; }`

### cap-13 · Arquitectura React reusable [Estado]
1. **Qué permite:** Editor académico.
2. **Cómo funciona:** Provider/reducer/selector de documento sin duplicar derivado.
3. **Componentes:** DocumentStore, reducers.
4. **Qué aprendimos:** video-01; consultar esas fuentes y distinguir [VIDEO] de [INVESTIGACIÓN].
5. **Limitaciones:** Context muy global produce rerenders.
6. **Error a evitar:** No fingir arquitectura react reusable si la prueba de aceptación falla..
7. **Proyecto derivado:** Editor académico.
8. **Patrón reusable:** Adapter 13: Provider/reducer/selector de documento sin duplicar derivado.
9. **Prueba de aceptación:** Actualizar nota refleja preview inmediatamente.

Pseudocódigo de interfaz (esquema orientativo, **no** código de biblioteca ejecutable): `function capability(input) { validate(input); const state=apply('Arquitectura React reusable',input); assert(state); return state; }`

### cap-14 · Validación amable [Estado]
1. **Qué permite:** Formulario de referencia.
2. **Cómo funciona:** onChange borrador, onBlur validación, mensajes visibles.
3. **Componentes:** EditableField, validator.
4. **Qué aprendimos:** video-01; consultar esas fuentes y distinguir [VIDEO] de [INVESTIGACIÓN].
5. **Limitaciones:** IME y campos numéricos vacíos.
6. **Error a evitar:** No fingir validación amable si la prueba de aceptación falla..
7. **Proyecto derivado:** Formulario de referencia.
8. **Patrón reusable:** Adapter 14: onChange borrador, onBlur validación, mensajes visibles.
9. **Prueba de aceptación:** No perder texto inválido sin advertir.

Pseudocódigo de interfaz (esquema orientativo, **no** código de biblioteca ejecutable): `function capability(input) { validate(input); const state=apply('Validación amable',input); assert(state); return state; }`

### cap-15 · Compositor PDF multipágina [Exportar]
1. **Qué permite:** Cuaderno académico.
2. **Cómo funciona:** Bloques medibles, wrap, salto, título/citas/referencias.
3. **Componentes:** jsPDF, PageComposer.
4. **Qué aprendimos:** video-01, jspdf-doc; consultar esas fuentes y distinguir [VIDEO] de [INVESTIGACIÓN].
5. **Limitaciones:** Fuentes, Unicode, saltos, márgenes.
6. **Error a evitar:** No fingir compositor pdf multipágina si la prueba de aceptación falla..
7. **Proyecto derivado:** Cuaderno académico.
8. **Patrón reusable:** Adapter 15: Bloques medibles, wrap, salto, título/citas/referencias.
9. **Prueba de aceptación:** 40 fichas no se cortan ni salen de página.

Pseudocódigo de interfaz (esquema orientativo, **no** código de biblioteca ejecutable): `function capability(input) { validate(input); const state=apply('Compositor PDF multipágina',input); assert(state); return state; }`

### cap-16 · Aceptación integral [Pruebas]
1. **Qué permite:** Suite de calidad.
2. **Cómo funciona:** Given/When/Then con fixtures locales y navegador móvil/escritorio.
3. **Componentes:** Node tests, Playwright/Chromium.
4. **Qué aprendimos:** video-01, epubjs-api; consultar esas fuentes y distinguir [VIDEO] de [INVESTIGACIÓN].
5. **Limitaciones:** Test de sintaxis no verifica interfaz.
6. **Error a evitar:** No fingir aceptación integral si la prueba de aceptación falla..
7. **Proyecto derivado:** Suite de calidad.
8. **Patrón reusable:** Adapter 16: Given/When/Then con fixtures locales y navegador móvil/escritorio.
9. **Prueba de aceptación:** 390×844, 1440×900, teclado y sin red pasan.

Pseudocódigo de interfaz (esquema orientativo, **no** código de biblioteca ejecutable): `function capability(input) { validate(input); const state=apply('Aceptación integral',input); assert(state); return state; }`

## Algoritmos específicos originales

```text
OPEN_LOCAL(file):
 verify extension AND signature; bytes=await file.arrayBuffer()
 engine=PDF ? PdfAdapter : EpubAdapter
 session=await engine.open(bytes)
 dispose previous session; show first location; errors visible

MAKE_ANCHOR(selection):
 if PDF: {format:'pdf',page,normalizedRects,quote}
 if EPUB: {format:'epub',cfi,quote}
 save note with stable ID; repaint highlight

SEARCH(query):
 cancel prior job; for every PDF page or EPUB section in batches:
  extract text locally, normalize tokens, store {snippet,anchor}
  yield to UI, show progressive matches and highlight true locations

COMPOSE_PDF(blocks):
 measure font + wrap; for each block:
  if height exceeds remaining page: split correctly/new page
  draw source attribution, note, heading and content
 export Blob, preview with PDF.js, save to device, revoke Blob URL

SPEAK(text):
 split into sentences; choose available native voice
 start utterance after user gesture
 on reliable word boundary: update word highlight
 otherwise: update sentence highlight only
 pause/resume/stop update real speech state
```

## Evaluación de aplicaciones existentes

- **KOReader:** Muy profundo para PDF y EPUB, gestos y OPDS; aplicación nativa, no dependencia para nuestro HTML. Reutilizar: Reflow PDF y ergonomía repetible. Precaución: Auditar licencia si se reutiliza código, no copiar interfaz.. https://github.com/koreader/koreader
- **Foliate:** Calidad tipográfica y notas; referente en escritorio GTK, no plantilla web. Reutilizar: Diseño de página y controles discretos. Precaución: Tomar principios UX, no activos ni código ajeno.. https://github.com/johnfactotum/foliate
- **Calibre Content Server:** Biblioteca real con metadatos, portadas y visor móvil; servidor opcional posterior, cuidado con credenciales. Reutilizar: Biblioteca, OPDS y búsqueda. Precaución: No copiar contenido bibliográfico de usuarios.. https://manual.calibre-ebook.com/es/server.html
- **PDF.js Viewer:** Base madura de navegación PDF y búsqueda; adaptar a interacción móvil sin reimplementar motor. Reutilizar: Render y acceso al texto. Precaución: Verificar paquete y avisos legales al incorporar.. https://mozilla.github.io/pdf.js/web/viewer.html

## Decisiones preservadas
- **Conservar:** Lector académico móvil (A), biblioteca visual Calibre opcional (B), voz/anotaciones (C); privacidad local y claridad editorial.
- **Agregar en paralelo:** Cuaderno académico exportable (D) nacido del tutorial jsPDF, sin sustituir visor PDF/EPUB.
- **Reemplazar:** Factura, cálculos de impuestos y PDF de coordenadas fijas se vuelven fichas, enlaces al origen y motor de paginación.
- **Descartar:** Archivos personales publicados, servidores obligatorios, falsa persistencia del iframe, OCR sin motor, DRM bypass, UI decorativa.
- **Condición técnica:** La galería usa iframe sandbox sin allow-same-origin. El atlas no depende de red, scripts externos ni localStorage; futuros widgets exportarán/importarán JSON.

## Pruebas por ejemplos
- Dado PDF válido de dos páginas seleccionado localmente, cuando se abre y se pulsa siguiente, se ve página 2 sin HTTP POST del archivo.
- Dado EPUB con tres capítulos, cuando se aumenta fuente y se vuelve a abrir ubicación CFI, se conserva el párrafo relevante.
- Dadas dos notas con IDs únicos, cuando se exporta e importa JSON versión v1, ambas reaparecen sin perder anclas ni texto.
- Dado navegador sin `boundary`, cuando se escucha voz, la UI no finge exactitud por palabra.
- Dadas 40 fichas, al exportar a PDF aparecen varias páginas sin texto fuera de márgenes, tildes correctas y referencias.

## Seguridad y elección técnica
El iframe público de Laboratorios se ejecuta sin `allow-same-origin`: no confiar en `localStorage`. Atlas autocontenido sin peticiones remotas; futuros widgets tienen que usar lectura local y export/import. EPUB puede contener HTML: deshabilitar contenido activo del libro; no habilitar scripts de terceros. Calibre sólo opt-in posterior; nunca publicar IP LAN/contraseñas. Determinar versiones/avisos de licencia de las dependencias en la construcción real.

## Reproducción desde cero y continuidad
1. Leer `conocimiento.json` (IDs estables, fuentes y dependencias).
2. Escribir tests de apertura, error, selección, anclaje, exportación, diseño 390px y teclado.
3. Reutilizar arquitectura de motores separados; no copiar componentes de factura de forma literal.
4. Realizar render browser para validar interacción antes de marcar terminado.
5. Plan completo: `PLAN_EJECUTABLE.md`.
