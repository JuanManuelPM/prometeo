# Laboratorio de lectura · Plan ejecutable para el mensaje «.»

**Versión 1 | 13/10/2026 | ESTADO: PLANIFICADO, NO CONSTRUIDO**

La fase 2 autoriza tres experiencias reales, probadas y publicadas, sin pedir más elecciones. Su código deberá preservar este atlas y el registro existente.

## 1. FARO · Lector académico · Proyecto emblemático
- **Concepto y objetivo:** Lector de PDF/EPUB local con experiencia móvil refinada y biblioteca editorial de sesión; búsqueda, anotaciones, posición y TTS progresivo.
- **Dirección artística:** Papel cálido y noche grafito, tipografía editorial, controles discretos grandes, sin adornos geométricos
- **Interacciones y reglas:** Abrir, navegar, seleccionar, marcar, escuchar, exportar anotaciones, restaurar JSON
- **Arquitectura:** FileAdapter, PdfEngine, EpubEngine, AnchorAdapter, SearchIndex, AnnotationStore, SpeechController, BackupPort
- **Dependencias y recursos:** PDF.js, EPUB.js empaquetados localmente + Web Speech API nativa, cero API pagas
- **Pruebas y aceptación:** PDF de varias páginas + EPUB con 3 capítulos; móvil 390px; búsqueda, zoom/reflow, anotaciones roundtrip, TTS pause; ningún upload
- **Ampliación:** Calibre OPDS opcional y colecciones.
- **Fuentes del conocimiento:** IDs del `conocimiento.json`; PDF.js / EPUB.js / KOReader / Calibre / MDN.
- **Ruta:** `laboratorios-js/widgets/lectura/faro-lector/v1/index.html`.

## 2. MESA · Laboratorio de paginación · Laboratorio interactivo
- **Concepto y objetivo:** Comparador de render reales para aprender por experimentación: mismos archivos en dos paneles con parámetros diferentes y resultados observables.
- **Dirección artística:** Superficies A/B editoriales, regla de margen y medición discreta, nada de botones vacíos
- **Interacciones y reglas:** Variar escala PDF, DPR, rotación, crop reversible y tipografía/flow EPUB; ver tiempos medidos, presets JSON
- **Arquitectura:** ComparisonViewport, RenderQueue, Engines, ProfileStore, MetricsTimer
- **Dependencias y recursos:** PDF.js, EPUB.js, Performance API, cero servicios
- **Pruebas y aceptación:** Cambios producen diferencias visibles; CFI persistente; renders cancelables; métricas medidas o explícitamente estimadas
- **Ampliación:** Comparador accesibilidad y PDFs complejos.
- **Fuentes del conocimiento:** IDs del `conocimiento.json`; PDF.js / EPUB.js / Foliate.
- **Ruta:** `laboratorios-js/widgets/lectura/mesa-paginacion/v1/index.html`.

## 3. TRAZA · Cuaderno de citas · Variación radical del tutorial
- **Concepto y objetivo:** Transformar el CRUD de facturas y jsPDF en editor de fichas/citas con atribución, notas propias, reordenamiento y PDF multipágina real.
- **Dirección artística:** Fichas sobrias y composición tipográfica A4, no tablas comerciales
- **Interacciones y reglas:** Añadir cita desde lector o manualmente, editar, reordenar, exportar PDF y JSON, previsualizar usando PDF.js
- **Arquitectura:** CitationModel, FormStore, LayoutEngine, jsPDF adapter, PdfPreview, JSONBackup
- **Dependencias y recursos:** jsPDF y PDF.js en versión empaquetada sin cuenta externa
- **Pruebas y aceptación:** 40 fichas sin cortes ni Unicode roto; respaldo JSON; teclado/móvil; URL blob revocada
- **Ampliación:** Bibliografías comprobables y plantillas.
- **Fuentes del conocimiento:** IDs del `conocimiento.json`; video-01 / jsPDF / PDF.js.
- **Ruta:** `laboratorios-js/widgets/lectura/traza-cuaderno/v1/index.html`.

## Ejecución obligatoria
1. Releer `AGENTS.md`, constitución global, HEAD y EPOCH actuales, `laboratorios-js/README.md`, `CONTRATO.md`, `registry/lectura.json` y `conocimiento.json`. Verificar rutas, ramas y PRs propios sin pisar trabajos concurrentes.
2. Recuperar licencia/versión exacta y archivos distribuibles de PDF.js, EPUB.js y jsPDF; si CORS o iframe impiden worker, documentar y solucionar dentro del contrato, sin agregar scripts remotos sin aviso.
3. Crear fixtures originales **libres**: PDF dos columnas, PDF de varias páginas, EPUB tres capítulos, un archivo corrupto. Nunca usar archivos privados en git.
4. Kent Beck: pruebas de las interfaces y funciones primero. Adzic: ejemplos concretos observables como criterios. Freeman/Pryce: pruebas del recorrido completo con navegador.
5. Construir FARO completo: archivos locales sin upload, motores, render, navegación, búsqueda, anotaciones, respaldo JSON, TTS con fallback real; en móvil controles claros y alta legibilidad.
6. Construir MESA con documento real en A/B, parámetros que alteran render y métricas honestas. Exportar presets en JSON; no depender de localStorage sandbox.
7. Construir TRAZA con fichas, citas, editor y ordenación, compositor jsPDF con paginación, PDF.js para preview, exportación PDF + fuente JSON.
8. Probar 390×844 y 1440×900 en navegadores reales, teclado, touch, sin red, archivos inválidos y largos, lifecycle/Blob cleanup. Inspeccionar capturas auténticas; corregir antes de registrar.
9. Crear rama independiente, comparar cambios concurrentes, conservar atlas y widgets previos. Registrar exclusivamente `registry/lectura.json` con ids/versiones/URLs reales y fechas argentinas.
10. Integrar a `gh-pages` sólo si tests y reglas superados; verificar Pages servido, interfaz iframe del laboratorio, descarga real y recursos. Publicación Git ≠ despliegue; si alguna prueba no es realizable, registrar bloqueo explícito.

## Contrato de datos
```text
Documents: File/ArrayBuffer -> Engine(open/page/chapter/search) -> View
Anchors:  PDF(page+normalized rects+quote) | EPUB(CFI+quote)
Annotations: {id, documentId, anchor, note, tags}
Backups: export/import {schema:'lectura-backup/v1', notes, preferences}
Notebook: blocks -> pagination -> jsPDF -> Blob/download; preview via PDF.js
```

## Riesgos y soluciones
- PDF escaneado: texto no disponible. Mostrar estado honesto, no afirmar OCR.
- EPUB con DRM: informar incompatibilidad; no eludir protecciones.
- TTS: event boundary no garantizado; respaldo por oración.
- Origen opaco del iframe: no depender de localStorage ni fetch de archivos arbitrarios; importación/exportación explícita.
- Calibre: integración futura opcional, autenticación segura y CORS; el lector no debe depender de él.
- Derechos de autor: sólo fixtures y código propios o bibliotecas redistribuibles con atribución/licencia.
- Recursos de celular: lazy rendering, limitar DPR, cancelar tareas y revocar URLs.

## Resultado observable exigido
Tres HTML de aplicación real servidos, tres IDs bajo `lectura` en registro, sin perder `atlas-tecnico`, URL pública de cada uno verificada en la galería, prueba real móvil/escritorio, y recibo de commits. No concluir por PR abierto.

## Continuidad para otra IA
Fuente primaria: `laboratorios-js/widgets/lectura/atlas-tecnico/v2/conocimiento.json`; despiece: `MANUAL_TECNICO.md`; atlas: `index.html`. La transcripción aportada no tenía URL ni metadatos seguros. La señal `.` tras este plan significa **ejecutar**, no volver a investigar ni preguntar.


## Concurrencia constatada
`atlas-tecnico/v1` existe previamente en gh-pages. Esta publicación v2 no modifica sus archivos. El futuro desarrollo debe conservar ambas versiones.
