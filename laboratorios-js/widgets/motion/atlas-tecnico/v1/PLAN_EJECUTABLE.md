# PROMETEO Motion + GSAP · Plan ejecutable v1
Fecha: 2026-10-13. Especialidad motion. Estado: PLANIFICADO, NO IMPLEMENTADO.
Fuente primaria: transcripción larga del curso GSAP Mojito Cocktails (autor se presenta Adrian; enlace, fecha y duración NO recibidos). Fuentes externas y capacidades: knowledge.json y atlas index.html.
## Principios
Preservar primero escritorio Unix y contratos; no crear otro escritorio, no tocar propietarios globales, no recargar iframe en transiciones; un solo motor dueño de cada propiedad. Modelo lógico independiente de animación. reduced-motion, teclado, touch, cancelación, foco y resize obligatorios. No almacenar estado en localStorage dentro de iframe aislado. No publicar prueba como demo terminada.
## Sistema común
Adaptador WindowAdapter con getWindows, getBounds(id), setRect(id), focus(id), getView(id), transitionTo(id,mode), cancel(id); implementaciones sobre escritorio real tras inspección de contrato, y sobre fixtures independientes para laboratorio. Motion para drag y springs de intención; GSAP para timeline, Flip y ScrollTrigger; CSS mask sin recursos ajenos. No incorporar Motion y GSAP a la misma propiedad sin exclusión explícita.
Arquitectura: app shell independiente; estado inmutable {windowId,rect,z,mode,projectId,focusId,scrollPosition}, controlador con comandos y undo, capa de render + motores, tests y control export/import JSON. UI accesible.
## 1. Unix Fluid · Emblemático
Interacción: arrastre por cabecera, acople bordes, apilamiento con foco, maximizar/restaurar, minimizar/regresar; atajos Enter/Escape y botones reales. Estructura: WindowStore, DragController, SnapResolver, LayoutTransition, ZStack, FocusManager, AccessibilitySwitch. Resolver destinos con bounding boxes y snap threshold escalado por dispositivo; guardar restoreRect por ventana. Recursos: tipografía local del sistema y contenido textual propio, sin imagen de terceros.
Ejemplos de aceptación (Adzic): dado A en (20,30,400,300), al maximizar, la geometría lógica pasa al viewport; al restaurar vuelve exactamente. Dado arrastre simultáneo con Escape, se revierte y no queda pointer capture. Dadas 10 ventanas, click de fondo aumenta z sin destruir iframes. Repeated maximize/restore 25 veces sin duplicar listeners. Reduced motion completa acciones sin transición.
## 2. Atlas Infinito · Laboratorio interactivo
Permite crear secciones, reordenar jerarquía y ajustar profundidad, densidad, pin y velocidad desde un mismo panel con efecto observado inmediato; no meros botones. Navegación por rueda/touch/teclado; anclas legibles y botón volver; inspector de scroll que explica trigger/start/end sin números ficticios. Arquitectura: ProjectTree, SectionRenderer, ScrollCoordinator, Controls, History, Measurements. Datos editoriales de ejemplo inventados explícitamente y JSON exportable. ScrollTrigger para anclas y pin limitado; sin hijacking.
Pruebas: 30 secciones y búsqueda, desplazarse a ancla y volver recupera scroll ±2px, aumentar tamaño de viewport no desplaza foco lógico, teclado puede llegar a cualquier sección, sin movimiento mantiene toda la estructura legible.
## 3. Portal · Variación radical
Deriva de máscara de cóctel y slider del tutorial, pero cambia mecánica: transformación reversible mundo->widget->pantalla usando la misma instancia de contenido funcional. No vídeo de cócteles ni decoración. Estructura: SceneRegistry, PortalController, SharedElementTransition (GSAP Flip), MaskLayer, HistoryStack, FocusManager. Antes de animar, capturar geometrías; tras actualizar layout, animar transición; si se interrumpe, terminar a un estado lógico consistente.
Pruebas: abrir/cerrar 20 veces preserva contenido y foco; transición al pulsar Escape recupera origen; durante movimiento otro gesto cancela operación anterior; tamaño móvil no desborda; no depender de máscara en reduced motion.
## Orden de ejecución al recibir «.»
0. Recuperar atlas, knowledge.json, README y CONTRATO, inspeccionar HEAD, trabajo concurrente y escritorio real sin pedir aclaraciones.
1. Fijar pruebas de contrato y fixtures, poner ejecución local accesible sin CDN riesgoso; mantener arte sobrio editorial y controles grandes.
2. Construir Unix Fluid completa, probar con navegador real teclado/touch, perfil de rendimiento y screenshots verificables.
3. Construir Atlas Infinito completo y experimentar con combinaciones de parámetros.
4. Construir Portal reversible con máscara/fallback y conservación del estado.
5. Ejecutar regresiones, validar HTML independiente + iframe aislado + celular + reduced-motion; corregir.
6. Crear versiones bajo widgets/motion/<slug>/v1/ y registrar solo aplicaciones probadas en registry/motion.json preservando versiones previas; verificar GitHub Pages servido y escritorio lab=motion; publicar tres solamente si pasan.
## Test suite mínima
Unit: geometrías snap, transiciones/estado, módulo índice, historia, exclusión de animadores. Integration: acción->estado->DOM, pointer capture, responsive, event cleanup. E2E Playwright: desktop 1440x900 y móvil 390x844, Chrome/Firefox donde posible, teclado, táctil emulado, reduced-motion, 20 ciclos de cada transición, enlaces y UI sin JS roto. Evidencia real separa implementado/candidato/publicado/servido.
## Continuidad
Entradas: atlas-tecnico/v1/index.html; knowledge.json; PLAN_EJECUTABLE.md. Fuente de verdad para el escritorio: código actual del repositorio, NO este plan. La secuencia «.» autoriza los tres desarrollos y su publicación solo si pasan los criterios. Si falta acceso, conservar artefactos locales y detallar bloqueo. No copiar transcript protegido ni reproducir assets de terceros.
