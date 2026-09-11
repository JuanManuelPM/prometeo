# Study Library — pendientes durables

Fecha: 2026-09-10

Este archivo es el backlog operativo de Study Library. No convierte trabajo parcial en terminado. Antes de tocar una lane, resincronizar `main`, leer el handoff de Study Library, este backlog y las autoridades de `.study-system/v2/`.

## P0 — Blackboard Bridge / fuentes externas

### Estado verificado

- El calendario server-side de Blackboard funciona de forma independiente.
- 2026-09-11 00:35–00:36 UTC: **primer Browser Bridge real verificado end-to-end** desde Firefox/Windows.
- El complemento fue detectado (`extension=true`), emparejado (`paired=true`) y completó un `browser_bridge` sync con `status=ok`.
- Sync verificado: **11 páginas recorridas, 1 materia en el crawler principal y 29 items ingeridos**. Después, los snapshots de páginas abiertas elevaron el catálogo persistido a **4 course keys** y **36 items**.
- Tipos persistidos observados: 18 announcements, 6 links, 4 pages, 3 content, 2 files, 2 announcement-pages y 1 calendar-page.
- Se detectaron, entre otras, referencias reales a Modelos y Teorías II, Sociología, Sensación y Percepción y Estadística Aplicada a la Psicología.
- No hubo `needs_login` ni error de ingesta en el sync exitoso.

### Problemas ya resueltos en el bootstrap

1. `instalar puente` cargaba el complemento pero no entregaba por sí solo el token del workspace al navegador.
2. El content script podía anunciar `PROMETEO_BB_READY` antes de que Study Library registrara su listener.
3. En una PC nueva había demasiados pasos manuales.

Correcciones vigentes:

- `study-bb-pairing-fix-v1.js` (internamente pair-fix-v2) reintenta STATUS/PAIR, registra probes y dispara sync cuando el Bridge queda emparejado.
- `study-v10-loader.js` carga esa recuperación.
- Firefox Bridge 0.3.0 incluye `bootstrap.js` y despierta/recarga Study Library después de instalarse.
- `blackboard-bridge.html` genera un instalador Windows que prepara la carpeta, abre Blackboard, autoriza Study Library y deja `manifest.json` listo para el único clic privilegiado que Firefox exige en `about:debugging`.
- El token del workspace no queda persistido en GitHub.

### Pendientes Blackboard que siguen abiertos

- **Corregir canonicalización de materias.** El crawler puede sobrescribir el nombre de una materia con el título de una página/archivo; por ejemplo la course key de Modelos terminó temporalmente titulada `Las_Dos_Revoluciones_Cognitivas.png`.
- **Ampliar cobertura de crawling.** El sync principal encontró 1 materia, mientras snapshots de páginas visibles descubrieron 4 course keys. Debe recorrer de forma determinística todas las materias actuales sin depender de que el usuario visite páginas.
- **Mirror de archivos todavía no validado.** Se detectaron 2 items tipo `file`, pero `study_bb_files` seguía vacío después del primer sync; no considerar archivos offline/mirrored como cerrado.
- Reemplazar el bootstrap privado/manual de token por un flujo owner-authenticated para dispositivos nuevos sin publicar secretos en JS.
- Mapear materias Blackboard ↔ materias canónicas de Study Library por identificadores y alias durables, no sólo similitud de título.
- Integrar fechas de entregas/parciales/finales en el calendario/agenda principal, no como panel lateral separado.
- Integrar materiales, anuncios, clases y archivos como fuentes canónicas del curso para que Study System resuelva autoridad/cobertura.
- Mostrar estados separados en UI: calendario conectado / complemento detectado / navegador emparejado / login Blackboard requerido / última ingesta de contenido.

## P1 — datos reales de materias y biblioteca

- Sacar del runtime los cursos/fechas/unidades de ejemplo que todavía están hardcodeados en `C` cuando no son autoridad real.
- Eliminar fillers y placeholders visuales que no correspondan a materias reales.
- Mover catálogo de materias, cuatrimestres, evaluaciones y fuentes a registros de datos durables.
- Incorporar carátulas reales provistas por el usuario; las imágenes de contenido pueden usar sus propios colores sin romper el sistema de dos colores de UI.

## P1 — calendario / agenda

- Consolidar vista mes / semana / agenda con fuentes autoritativas.
- Agenda debe priorizar el próximo parcial, final o entrega y mostrar relación con la materia.
- Evitar que Blackboard sea una segunda agenda desconectada.

## P1 — Study System V2

- Mantener `Study Library → Materia → Parciales → evaluación → Study System V2` como única jerarquía de producto.
- Modelos y Teorías II · P1 ya funciona como reference surface, pero su contenido completo todavía se reconstruye mediante el lineage comprimido viejo.
- Migrar la demo completa M1–M5 a una instancia real y completa de `prometeo.study.exam/v2`; el `EXAM_INSTANCE.example.json` actual es sólo ejemplo mínimo, no la demo completa.
- Construir/terminar el renderer data-driven reusable que consuma instancias validadas sin generar una nueva página por examen.
- Mantener OVERVIEW → UNDERSTAND → RECALL → PRODUCE, mapas transversales adaptativos, checks de recuperación y práctica alineada al examen real.
- Definir sincronización cross-device del progreso/mastery personal sin mezclarlo con estado compartido de clase.

## P1 — Universal Whiteboard

- WB10 sigue siendo la autoridad mientras `.study-system/v2/MANIFEST.json` no promocione otra versión.
- Validar en hardware real mouse + touch + Wacom/iPad/stylus, long-press suppression y palm rejection cuando existe `pointerType=pen`.
- Validar desde Study Library class mode texto, formas, imágenes, tinta sobre objetos, templates, expansión vertical y preview source-rendered.
- Mantener previews como derivadas; nunca volver a usar screenshot pequeña como estado canónico.
- Mejorar concurrencia de pizarrones compartidos: hoy la persistencia es whole-state/revision, no CRDT por stroke. Evitar clobber de ediciones simultáneas antes de llamarlo colaboración conflict-free.

## P1 — clases / colaboración

- QA real entre dos dispositivos: perfiles, colores, Walky, audio, realtime, grabación, transcripción, notas y varios pizarrones abiertos/publicados.
- Verificar end-to-end la separación personal/compartido.
- Hacer que transcripciones, notas, pizarrones y materiales de clases puedan referenciarse como fuentes para futuros parciales, sin duplicar dentro de Study Library la lógica de autoridad del Study System.

## P2 — UX / diseño

- Terminar la biblioteca + calendario según la visión acordada: biblioteca principal ancha, calendario funcional mínimo, sin dashboard genérico ni cards falsas.
- Refinar el interior de materia; la referencia visual final del estado `materia abierta` todavía no quedó cerrada.
- Blackboard debe terminar siendo una capa de fuente/estado subordinada a Study Library, no un panel de depuración pegado arriba.
- Mantener exactamente dos colores en chrome/UI; las carátulas y contenido pueden tener color propio.

## P2 — operaciones / QA durable

- Resincronizar antes de cada escritura importante porque Prometeo tiene trabajo paralelo frecuente.
- Nunca hacer force sobre `gh-pages`; reconstruir sobre su HEAD si avanzó en paralelo.
- Mantener manifests, handoffs, backlog y QA actualizados.
- Agregar pruebas de navegador para los flujos que hoy sólo tienen static QA cuando sea razonable.

## Definición de “cerrado”

Un ítem no se cierra porque exista un archivo o un adapter. Se cierra sólo cuando su flujo material está integrado en Study Library, persiste en la autoridad correcta y pasó el QA que requiere (estático, navegador, multi-device o hardware según corresponda).
