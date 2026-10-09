# Prometeo · Un mensaje por chat → página/TV/demo · entrada breve

**SOURCE, no instalación automática de ChatGPT.** Un nuevo chat con el conector GitHub autorizado puede leer ESTE archivo para resolver pedidos con un solo mensaje. La pantalla en la TV es `https://juanmanuelpm.github.io/prometeo/tv/chat/`.

## 2026-10-09 · Puente de continuidad al trabajo de los PR #71, #72 y #73

Esta ruta `gh-pages:tv/chat/AGENT_ENTRY_V1.md` es la entrada mínima que ya invocan las instrucciones del Proyecto **persistencia**. **No crea ni instala skills por sí misma.** La tarea humana actual manda. Para evitar olvido entre chats, elegir SÓLO los contratos pertinentes:

- **Bootstrap y catálogo de pendientes**: recuperar `coordination/chat-bootstrap/v1/ENTRY_V1.md`, `ROUTES_V1.json` y, si es relevante, `PENDING_INDEX_V1.json` de la rama candidata **`feature/persistencia-cold-bootstrap-v1-20261009`** (PR #73). El índice contiene 45 EVO y 16 áreas, no las da por implementadas. Leer íntegramente las skills seleccionadas con el GitHub conectado. `ROUTES_V1.json.sources` tiene SHAs de **snapshot histórico**, NO garantiza apuntar al PR #71 vigente: al 2026-10-09 llevaba `52af4aa...`, anterior a la integración TDD del PR #71 (`ed5939ae...`). Para las capacidades nuevas, refrescar el HEAD real de la rama propietaria, NO afirmar que un selector anclado a snapshot ya las cargó.
- **Desarrollo de widget, página o cambio de comportamiento**: leer además `coordination/one-turn/v1/PROOF_FIRST_BUILD_METHOD_V1.md` de la rama candidata **`feature/fire-skill-dispatch-v1-20261009`** (PR #71, nunca suponer merged). Exigir capacidad humana DO/SEE/CHECK → diseño FEATURE/PROOF de demo primero → prueba baseline → mínimo código → GREEN/regresión → Demo Engine V6 sobre **DOM real** → gates de publicación. La demo sintética de Experimentos NO es prueba de widget.
- **Prueba candidata concreta**: PR #72 en `feature/proof-first-scene-20261009` arregla retención de tarjetas en escena tras JSON inválido, con RED/GREEN local y pruebas Chromium reportadas. **DRAFT**, sin demo V6 real, sin publicación del cambio ni prueba de versión SERVED. No promulgar como arreglo público hasta superar gates, reconciliando `gh-pages` HEAD vigente.
- **🔥tv / mostrar algo que YA existe**: ruta rápida de este archivo y `state.json`; NO imponer TDD o demo antes de cambiar una escena pública. Siempre recibir UN mensaje humano, ejecutar dentro del turno, registrar recibo verificado y preservar privacidad.
- **Estado de integración**: los tres PR siguen separados y pendientes de revisión, pruebas/merge autorizados. `main` es autoridad base, `gh-pages` exhibición actual, ramas PR son candidatos. Si otro chat cambió las ramas, recuperar HEAD y reconciliar; jamás actualizar a ciegas ni convertir commits en ejecución/servido.
- **Dato sensible**: no publicar contenido de voz, mensajes privados, notas de alumnos o clase, credenciales ni el documento privado de Drive. Los respaldos detallados requieren almacenamiento autenticado y ACK.
- **Pruebas realmente faltantes**: bootstrap frío desde otro chat REAL; configuración/autorización del proyecto verificable; prueba real de Demo V6 sobre escena PR #72; CI Node de PR #73; CI P4 de PR #71 (fallo histórico `missing loadContinueChat`); smoke SERVED de PR #72. Separar verificación de código, CI, publicación y funcionamiento visible.

Esta entrada permite recuperar las tres ramas sin volver a copiar prompts anteriores. No exige recrear arquitectura, memoria privada o scheduler.

## Descubrimiento autónomo de herramientas y entrega por cualquier chat

Ante cualquier tarea concreta en este Proyecto, **no exigir que el usuario escriba `@`, `🔥`, nombre de skill ni un prompt perfecto**. Consultar `gh-pages:tv/chat/relevo/CHATGPT_CAPACIDADES_Y_ENTREGA_V1.md` para recuperar contrato de autodescubrimiento, ampliación profesional, ejecución, pruebas, estado durable de entrega, privacidad y proyección de versiones por proyecto. `@GitHub` y `+` son accesos opcionales a apps conectadas cuando están disponibles, no condiciones de continuidad. Una skill guardada en GitHub no equivale a skill nativa instalada. **La persistencia del organismo es el objetivo estratégico; cumplir la tarea humana actual es la responsabilidad del turno.**

## Punto de retorno: nunca volver a perder un gran objetivo

Cuando el humano pregunta «¿qué sigue?», vuelve cansado/después de días, teme olvidar planes o pide que un chat nuevo recuerde TODO el trabajo creativo, **priorizar la persistencia del cerebro común, no el juego**, y leer primero `gh-pages:tv/chat/relevo/RETOMAR_V1.md` y su proyección `gh-pages:tv/chat/relevo/retomar/reentrada.json`, además de los owners de ideas necesarios. Mostrar la **próxima experiencia real** y qué evidencia falta; evitar reemplazar productos por nuevas instrucciones. Pantalla humana read-only: `/prometeo/tv/chat/relevo/retomar/`. No invocar este ritual para órdenes rápidas de TV, ni tratar la proyección como fuente de estado live.

## Prueba de relevo entre chats descartables

Leer `gh-pages:tv/chat/RELEVO_ENTRE_CHATS_V1.md` **y `gh-pages:tv/chat/relevo/CONTINUIDAD_INTELECTUAL_V2.md`** cuando la tarea sea **continuar intelectualmente una conversación en un chat nuevo**, no para órdenes rápidas de TV. Aplicar `gh-pages:tv/chat/relevo/PRUEBA_CONVERSACIONAL_V2.json` para distinguir continuidad de recitación. El estado incremental se conserva en `gh-pages:tv/chat/relevo/STATE_V1.json`. No significa que dos chats sean la misma instancia ni que se compartan memorias privadas.

## Dirección operativa (consulta a cada tarea relacionada con Prometeo)

Leer `gh-pages:tv/chat/DIRECCION_OPERATIVA_V1.md` para conocer el mecanismo de encargos entre chats descartables. El archivo sólo referencia owners; **no copia estados dinámicos**. Obtener el estado ACTUAL mediante GitHub PRs, commits, branches y Actions; sólo inspeccionar los PR/tareas pertinentes. La fuente de verdad sobre un trabajo es el PR/ticket y sus recibos, no un resumen conversacional ni esta página. Las órdenes rápidas `🔥tv` mantienen prioridad y no deben bloquearse por revisiones de CI ajenas.

## 0. Distinguir las tres intenciones
- **Rápido, mostrar**: `🔥tv calendario` o `🔥prometeo rápido mostrame la demo`. Sólo cambiar `gh-pages:tv/chat/state.json`, con SHA/lectura independiente. No tocar código del widget.
- **Generar escena pública de ideas**: `🔥tv ideas` con ideas explícitamente destinadas a exhibición. Editar `tv/chat/scene/scene.json` y apuntar `focus.path` a `/prometeo/tv/chat/scene/`. Jamás volcar mensajes privados completos a GitHub.
- **Desarrollar y demostrar**: `🔥prometeo modificá el calendario y mostrame una demo`. Cargar el owner `shared/calendar/v1` y `pages/calendar/`; aprobar cambio contra pruebas; usar `JuanManuelPM/Experimentos/demo-engine-v6` y su `UNIVERSAL_BUILD_DEMO_PROTOCOL_V1.md`. El lab V6 original NO valida por sí solo el widget real.

## 1. Micro-prefight obligatorio (NO arqueología)
1. Leer `gh-pages:tv/chat/state.json`, `tv/chat/DEMO_PROTOCOL_V1.md`, el HEAD fresco de `gh-pages` y, sólo si hay modificación real, owner/current/Design DNA correspondiente.
2. Si la orden es rápida, actualizar un único estado: `display.mode="page"` con `focus.path` existente bajo `/prometeo/`; o `display.mode="demo"` para el lab V6 original. Usar el mismo esquema `prometeo.tv-from-chat-state/v1`.
3. Comprobar que el JSON preserva `changes` previos, aumenta `revision` una sola vez, y agrega un recibo público compacto del cambio realizado. Escribir con GitHub CAS/revision; lectura independiente después. No esperar workers.
4. Reportar claramente SOURCE / GH-PAGES-ACTIONS / SERVED; no inventar tiempos. Refresco de TV cada 15 segundos, no garantía de actualización de Pages en ese plazo.

## 2. Qué hacer con tareas de estudio y notas
- Facultad: página existente `/prometeo/shared/study-system/` y páginas de `/prometeo/shared/study/`; preservar el módulo.
- Evento/calendario personal: Google Calendar autenticado del usuario cuando disponible; el calendario de Prometeo guarda en localStorage del navegador, NO hay sincronía automática. No incluir horarios privados en TV público.
- Notas personales: Google Drive privado conectado o almacenamiento local; no subir mensajes, audios, nombres de alumnos ni transcripciones a GitHub.

## 3. Registro y continuidad real
- GitHub público: sólo acción clasificada, ruta/widget público, cambios SHAs, resultado, evidencia, errores no sensibles y duración si se midió. No publicar tokens, datos personales o raw audio.
- Privado: cuerpo del mensaje, voz, notas y contexto personal viven en ChatGPT y/o un owner autenticado como Drive SI se guarda explícitamente con recibo. Esta demo aún no implementa subida privada automática.
- Otra conversación no hereda literalmente todas las charlas: obtiene la continuidad **persistida** por este contrato y sus owners. No inventar autonomía/background.

## 4. Archivos estrictamente suficientes
- `tv/chat/state.json`: escena y feed actual
- `tv/chat/DEMO_ADAPTER_V1.json`: fuente actual de Demo Engine V6
- `tv/chat/DEMO_PROTOCOL_V1.md`: dos rutas DEMO LAB versus DEMO PROBADA de widget
- `tv/chat/scene/scene.json`: lienzo de ideas públicas
- `tv/chat/ACTIVITY_PROTOCOL_V1.md`: evidencia y cronología
- `coordination/one-turn/v1/CHAT_INPUT_TV_OUTPUT_20261009.md` y PR #71: skill candidata y comando FIRE

## 5. No hacer
No crear cola/work graph/scheduler/Supabase ni sistema de input web. No rehacer Demo Engine; no cambiar V15/UI sin referencias. No hacer pasar la demo sintética por resultado funcional de calendario. Un mensaje por chat para acciones normales, sin `.` salvo preparación pedida.
