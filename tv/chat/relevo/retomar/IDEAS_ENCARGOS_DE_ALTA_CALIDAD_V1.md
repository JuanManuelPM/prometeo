# Prometeo · Biblioteca de encargos de alta calidad · V1

**Clase:** BRIEF / requisitos humanos recuperables. **Estado:** IDEAS LISTAS PARA EJECUCIÓN INDEPENDIENTE, NO FUNCIONES IMPLEMENTADAS POR ESTE DOCUMENTO.
**Owner:** página y continuidad común ya existente, Issue #76. **Fecha:** 2026-10-10 (Argentina).
**Fuente humana:** conversaciones del Proyecto sobre independencia de chats, arte, audio, tarjetas, proyectos, conocimiento evolutivo y registros en página.
**Entrada canónica de un chat:** \`gh-pages:tv/chat/AGENT_ENTRY_V1.md\`. Este documento es un catálogo de briefs, NO una autoridad operativa, runtime, cola, scheduler, memoria privada ni sistema de workers.

## Regla de lectura para cualquier chat ejecutor

Cuando el usuario diga «Desarrollá JNN» en un chat nuevo, recuperá este documento desde \`gh-pages\` con el GitHub conectado, leé el **brief completo** del identificador pedido y **solamente** los owners/contratos necesarios para esa tarea. Refrescá estado en GitHub antes de implementar: los PR cambian. Si el trabajo está realmente implementado, no lo repitas: verificalo, corregí brechas y entregá pruebas.

Cada brief define **qué construir**, **qué evidencia constituye éxito** y **qué NO cambiar**. No reemplaces una entrega material por planificaciones infinitas. Los chats individuales no leen automáticamente este archivo sólo porque exista en GitHub: el mensaje corto debe identificar JNN y el repositorio o invocar una configuración de Proyecto comprobada.

**Objetivo humano absoluto:** emitir un solo pedido natural por texto/audio transcripto; el chat desarrolla material y lo guarda; la misma página \`https://juanmanuelpm.github.io/prometeo/tv/chat/relevo/retomar/\` permite observar proyectos, pedidos, ideas, investigaciones, decisiones, arte, código, resultados, candidatos, versiones y tiempos auténticos sin volver a la conversación.

## Baseline dinámica, leer de nuevo antes de actuar

- PR #83/#84: catálogo HOP8 y prueba Pages. PR #89/#90: expediente artístico PR88 TESTED visible. PR #91: legibilidad móvil. PR #92/#93: tema oscuro y portadas tipográficas, fusionados; PR #95: control independiente de su publicación (pendiente al redactar este catálogo).
- PR #94: **nuevo proyecto Ritmo de estudio**, fusionado a \`gh-pages\`, registrado en \`reentrada.json\`; no confundir integración con la comprobación de app servida/cold-chat.
- PR #87: Entrada Universal mapa/cartuchos candidato; PR #88: arte Archivo Habitado candidato SIN aprobación artística.
- Issue #76: requisitos humanos de entregas visibles, fichas tempranas y semáforos. El comentario del 10/10 sobre bandeja y progreso es una **idea** que debe desarrollarse, no una función live.
- Rama experimental separada \`feature/retomar-work-intent-ledger-20261010\`: contiene un primer recibo REQUEST_CAPTURED y UI experimental para fichas inferiores, con commits \`c3924dd9\` y \`eeb2a166\`. No publicada ni probada; antes de reutilizarla comparar cuidadosamente contra \`gh-pages\` actual (incluidos PR #92/#93/#94).
- Los **45 EVO** de \`main:ui-workspace-v1/continuity/evolution-v1/IDEA_INDEX_V1.json\` siguen siendo requisitos de diseño, no 45 features verdes. Los métodos de Design DNA, pruebas de oficio y los libros sobre arquitecturas evolutivas/TDD orientan pero NO sustituyen las pruebas reales.

## Invariantes para TODOS los encargos

**I1 · Fuentes y privacidad.** Registro público = sólo resumen autorizado y sanitizado, sin transcripción de audio privada, nombres privados, contraseñas, documentos de clase privados ni prompt íntegro de un chat. Si se requiere guardar input íntegro, usar owner privado autenticado y recibo, o declarar falta de capacidad.

**I2 · Estados y pruebas.** Distinguir REQUEST_CAPTURED (acuse) / CANDIDATE / TESTED / PUBLISHED / SERVED_VERIFIED / BLOCKED. Una CI verde o un merge no demuestra página servida. El estado «Trabajando» exige señal real reciente, no un spinner decorativo. Timeout = SIN SEÑAL/ESTADO DESCONOCIDO, nunca ERROR sin fallo probado. Fecha de commit ≠ fecha de dictado.

**I3 · Titularidad y concurrencia.** No crear nuevo catálogo/registro/cola/backend/worker/autoridad; extender \`tv/chat/relevo/retomar/reentrada.json\`, sus \`public_receipts\`, owners canónicos y la misma página. Escribir con HEAD fresco y SHA/CAS o reconciliación y readback; preservar changes/receipts de otros chats. Un chat solo cambia el owner indicado.

**I4 · Demostración.** Por función: DO (gesto humano) → SEE (resultado visible usable) → CHECK (test reproducible, Chromium con DOM/arte reales) → SOURCE/CANDIDATE/TESTED/SERVED separado → recuperación desde otro chat. Capturas reales en 360/390/430/480/844/1440 cuando corresponda. No basta HTML o mocks inertes.

**I5 · Calidad creativa.** Producto terminado y profesional, no wireframe, placeholder, íconos geométricos de IA o 20 tarjetas repetidas. Artística: leer \`main:visuals/VISUAL_PROTOCOL_V1.md\`, \`VISUAL_FEEDBACK_LOG_V1.md\` y \`EXECUTION_CHECKLIST_V1.md\`; producir/seleccionar ilustración de verdad si se justifica. En móvil, una acción y una jerarquía claras, fuente grande y controles accesibles. Las animaciones/sounds respetan reduced-motion y permisos.

**I6 · Honestidad.** No prometer «nunca un error» ni un hook nativo ChatGPT→GitHub automático no demostrado. La independencia buscada es durable: un turno con conector autorizado registra hitos cuando puede; no sabemos cuánto dura o cuándo se cierra un chat salvo medición explícita.

## J01 · Acuse temprano y captura de intención (PRIORIDAD ABSOLUTA)
**Problema:** el encargo solo aparece en página cuando el chat termina; el humano no sabe que fue entendido.
**Contrato humano:** tras interpretar una orden real y antes de trabajo pesado, guardar un acuse público mínimo; la página lo encuentra al refrescar; sin necesidad de copiar la respuesta.
**Owner de escritura:** protocolo de ejecutor en \`gh-pages:tv/chat/AGENT_ENTRY_V1.md\` y \`tv/chat/relevo/CHATGPT_CAPACIDADES_Y_ENTREGA_V1.md\`, proyección \`reentrada.json.public_receipts\` o contrato equivalente ya existente. No crear nuevo servidor.
**DO:** definir un identificador estable de *encargo* diferente del id de proyecto y del chat; identificar intención, propietario, resumen sanitario, ramas del plan (con criterios observables), hora de ACK real y fuente (issue/commit verificado). Escribir \`REQUEST_CAPTURED\` de forma idempotente con CAS y readback ANTES de implementar.
**SEE:** el acuse nuevo aparece en la misma página con nombre de proyecto, interpretación y hora argentina; si no hay canal público autorizado, dejar BLOQUEO explícito y no filtrar input privado.
**CHECK:** chat frío sin emoji que recibe orden de prueba pública; antes de terminar otra acción, otro navegador ve el ACK real por Pages. Simular offline, dos ACK simultáneos y reintento para asegurar cero duplicados/pérdidas. Diferenciar timestamp de ACK del dictado original (posiblemente UNKNOWN). Guardar evidencia de que la primera escritura ocurrió antes que el resultado.
**Dependencias:** ninguna nueva, recuperar owners actuales. **No editar las visuales**; este chat entrega captura/esquema/recibos y pruebas. Si se detecta que el puente directo no existe, documentar limitación, implementar la parte disponible y no fingir instantaneidad.
**Cierre:** un nuevo encargo se registra verificablemente antes de realizar todo el trabajo, con datos seguros y sin perder recibos anteriores.

## J02 · Bandeja visual inferior de encargos con árbol y resultado
**Problema:** la actividad es un feed de commits y texto; no permite ver una historia clara de cada pedido.
**Owner:** \`gh-pages:tv/chat/relevo/retomar/index.html\` y sus pruebas. Preservar PR #92/#93 arte oscuro y UX.
**DO:** consumir recibos reales agrupados por \`work_id\`, deduplicar eventos, insertar bandeja **debajo del catálogo y de la actividad**, con una ficha por encargo: pedido interpretado, proyecto, breve mapa de pasos/subramas, indicadores de fase, resultado y enlace a expediente. Diseño en pantallas 360/390/430/480/844/1440, scroll vertical natural, tamaño mínimo 17–19 px; que no aparezca primero una pared de texto.
**SEE:** nueva ficha abajo al tener ACK real; contenido plano o árbol accesible con iconos de completado de acciones efectivamente probadas; la interacción no pierde navegación Back/Forward, carga de proyectos ni historial.
**CHECK:** lectura de proyección publicada real, revisiones de contraste, aptitud táctil y lector de pantalla, presentación compacta y expansión de logs; mantener orden reciente primero dentro de la bandeja. Si hay un único recibo y no final, nunca dibujar cuatro pasos completos.
**Dependencias:** preferible J01; puede empezar aislado con bytes auténticos del ISSUE/owner sin afirmar que el chat está activo. La rama experimental \`feature/retomar-work-intent-ledger-20261010\` es sólo material candidato, debe compararse/rebasarse contra oscuro actual y recibir revisión visual real.
**Cierre:** nueva ficha legible y sin ficción publicada/servida en la misma URL.

## J03 · Máquina de estados y línea temporal causal verificable
**Problema:** verde, amarillo, rojo o spinner pueden mentir si no hay un recibo fresco.
**Owner:** contrato y validaciones de \`public_receipts\`, tests de persistencia; evitar tocar el CSS que ocupa J02.
**DO:** definir transiciones legales REQUEST_CAPTURED→CANDIDATE→TESTED→PUBLISHED→SERVED_VERIFIED o BLOCKED con evidencia; eventos adicionales WORK_STARTED, PROGRESS, LAST_SIGNAL, RECOVERED, WORK_ENDED sólo si realmente se observan. Encargos y eventos append-only, idempotencia y orden por timestamp/causalidad; conservar source_url y version SHA.
**SEE:** una ficha muestra hora de pedido registrado, primera señal, último cambio, prueba y release por separado. Amarillo sin nuevas señales durante umbral configurable = «sin señal reciente / no sabemos si sigue», rojo = error real registrado, verde = hito publicado y comprobado, no un icono de «chat activo». Animación solo para latido genuino reciente y reduced-motion.
**CHECK:** fixtures de retrasos, inversión temporal, duplicación, red intermitente, cambio de rama, fechas argentinas y alta concurrencia; luego leer y correlacionar evidencia de trabajo real en GitHub. Nunca convertir paso del tiempo en error confirmado.
**Dependencias:** J01 para esquema de recíbos; UI visual en J02. Puede desarrollar contratos/tests antes del UI.
**Cierre:** para cada etiqueta de estado existe prueba de origen o un «desconocido» explícito.

## J04 · Novedades, sin leer y última actualización por proyecto
**Problema:** no se distingue qué proyecto cambió desde la última visita.
**Owner:** proyecto \`reentrada.json\`, pequeñas etiquetas en tarjetas y visualización, reutilizando eventos, sin alterar owners.
**DO:** determinar evento público más reciente por proyecto, mostrar fecha completa Argentina y «Nuevo» si fue creado recientemente (distinguir nueva creación de actualización). Estado local de «visto» en navegador para lecturas verdaderas; el modo multisistema solo si hay owner privado autenticado con recibo, y nunca presentar localStorage como sincronía entre dispositivos. Una tarjeta tocada o expediente abierto puede marcarse visto con semántica clara; no al cargar automáticamente.
**SEE:** proyecto con novedades identificable de inmediato, contador sobrio o etiqueta y última fecha; puedes abrirlo y distinguir actividad nueva.
**CHECK:** primera visita, navegador nuevo, sin datos de localStorage, visita en otro dispositivo, usuario no logueado, fuente sin timestamps, actualizaciones simultáneas y accesibilidad. Persistir solo estado local no sensible.
**Dependencias:** J01/J03 y UI baseline J02; **no correr simultáneamente con J02/J05 en la misma página**.
**Cierre:** indicadores verídicos, no fingida sincronización privada.

## J05 · Avisos sonoros/visuales y control de molestias
**Problema:** para enterarse de una entrega habría que mirar permanentemente la página.
**Owner:** comportamiento local de la página en sección actual, sin crear worker ni infraestructura push.
**DO:** detectar nuevos IDs/versiones luego del último recibo visto, opción visible activar/desactivar sonido o vibración y notificación suave, respetar gesto de usuario, permisos navegador, muted, reduced-motion y configuración. Identificar correctamente qué evento disparó la novedad. No reproducir audios automáticamente al cargar, ni repetir avisos por la misma versión.
**SEE:** con consentimiento aparece aviso/sonido breve cuando se recibe un cambio real; sin consentimiento sigue funcionando silenciosamente. Si pestaña cerrada, no prometer push real sin service worker/autorización/infraestructura separadamente demostrados.
**CHECK:** móvil real cuando posible, políticas autoplay, focus/hidden, refresh/no duplicados, rate limit y acceso táctil.
**Dependencias:** J04 + lectura de eventos J01; secuencial respecto de otros cambios de UI.
**Cierre:** un aviso reproducible, opt-in, no invasivo, de una entrega real.

## J06 · Archivo intelectual completo recuperable por chat frío
**Problema:** ideas, libros, estudios y decisiones se pierden si solo quedan en mensajes.
**Owner:** owners existentes de Facultad, Widgets, TV y proyecto correspondiente; sus índices de continuidad. No copiar todo a \`reentrada.json\`.
**DO:** especificar manifiesto *por proyecto* enlazando idea original sanitizada, objetivos, decisiones, fuentes, alternativas, ejemplos, prototipos, código, arte, experimentos, fracasos, restricciones, licencias, hitos y próximos pasos. Reutilizar formatos/owners actuales y el catálogo de 45 EVO, con etiquetas IDEA/CANDIDATE/TESTED/SERVED_VERIFIED. Priorizar ejemplos reales: PR88 investigación artística y PR94 Ritmo.
**SEE:** desde un chat nuevo sin copiar nada, recuperar un producto y explicar por qué eligió su diseño, qué construyó, qué prueba le falta y cuál es su versión. La página puede abrir un resumen legible y fuentes, no mostrar un dump de GitHub.
**CHECK:** prueba cruzada auténtica con chat B recuperando trabajo de A; SHA/activos reales; un caso donde falla el último commit pero la versión anterior sigue usable; privacidad del mensaje íntegro.
**Dependencias:** independiente de J02/J04/J05; coordinar con proyecto Ritmo / PR94 y no reescribir su implementación.
**Cierre:** el chat frío puede continuar código/arte e ideas materiales con precisión sin necesitar la respuesta de A.

## J07 · Fichas maestras creativas y trabajo «AAA» por encargo
**Problema:** un prompt corto por sí solo produce resultados genéricos; la IA necesita instrucciones profesionales recuperables.
**Owner:** esta biblioteca, los docs/skills de especialidad existentes y el owner de cada producto. No inventar un nuevo framework total.
**DO:** para cada idea crear una ficha de producto con: problema humano, impacto y diferencia, investigación y benchmarking sin copiar obras, tres enfoques alternativos, dirección creativa, historias de uso, interacción y contenido, arquitectura mínima reutilizable, tareas independientes, criterios DO/SEE/CHECK, performance, responsive, offline/privacidad, accesibilidad, pruebas adversariales, salida pública y plan de mejora. Dar identidades y variantes reales de producto, con decisiones racionales; utilizar arte/image-first cuando aporta, no ilustraciones de cajas vectoriales.
**SEE:** un nuevo chat recibe «Desarrollá J07 o una ficha [nombre]», encuentra el brief y entrega prototipo verdadero en un turno si el alcance lo permite, con versión duradera y crítica profesional; no solamente un plan o un falso «juego AAA» entero. El estándar «AAA» significa nivel de pulido proporcional al producto, no presupuesto, contenido ni motor irreal en 10 minutos.
**CHECK:** evaluar 2 fichas de producto distintas (p. ej. juego 2D minúsculo y herramienta de estudio) para demostrar que mismo método da decisiones de diseño distintas y verificables. Comprobar referencias y propiedad intelectual.
**Dependencias:** independiente y seguro para ejecutar en paralelo a J01/J06, al no tocar UI.
**Cierre:** briefs que contienen suficiente información para ejecutar con un mensaje de 1–2 frases, sin revisar toda la conversación humana.

## J08 · Entrada Universal: chat nuevo reconoce intención sin protocolos
**Problema:** todavía dependemos de prompts técnicos largos para entrar correctamente en Prometeo.
**Owner:** \`AGENT_ENTRY_V1.md\` y contratos del PR87/PR73/PR71 pertinentes; no escribir al mismo tiempo que J01 sobre las mismas líneas sin coordinación.
**DO:** probar y mejorar descubrimiento de intención pedido/consulta/idea/continuar, selector de owner y skills realmente disponibles, manifest sin código arbitrario y contexto mínimo. No cambiar una consulta en acción irreversible. Recuperar el baseline del Proyecto y la conexión GitHub; no asumir que cualquier chat externo tiene esa configuración.
**SEE:** «Che, mejorá el calendario» encuentra el proyecto adecuado, planifica y ejecuta lo autorizado; «¿qué cambió?» responde con evidencia sin escribir; «Se me ocurrió algo» conversa sin crear trabajo no solicitado.
**CHECK:** prueba fría real en chats independientes con 4 tipos de intención, incluso uno ambiguo y audio transcripto; no contar tests sintéticos como chat real. Evidencia de lectura y resultados persistidos, con seguridad.
**Dependencias:** el mecanismo de ACK J01 debe reconciliarse, no duplicar.
**Cierre:** órdenes naturales con herramientas existentes, cero copy-paste de protocolos, límites explícitos.

## J09 · Alta de proyecto y segunda generación verificadas
**Problema:** un chat podría crear código real pero el producto no aparecer en la página ni sobrevivir a otro chat.
**Owner:** el catálogo \`reentrada.json\`, proyecto individual \`projects/<id>\` y pruebas; ya existe proyecto PR94, usarlo como baseline, no recrearlo.
**DO:** inspeccionar PR94 y su estado SERVED real; verificar herramienta, tests, idea, decisiones, links de navegación, fecha e integridad de los cinco proyectos originales. Crear otro proyecto pequeño solo si la primera prueba no cubre las condiciones y no hay duplicado. Integración CAS, estado real y enlace servido.
**SEE:** usuario ve Ritmo y abre una aplicación que realmente funciona, con expediente y versiones; luego un tercer chat reabre código/planificador y lo mejora sin copiar respuestas.
**CHECK:** test público de bytes Pages, interacciones humanas, regresión y chat independiente; preservar equipo artístico que toca la misma página. PR merge sin served + otro chat = PENDIENTE, no éxito.
**Dependencias:** parcial con PR94; **no lanzar en paralelo a una modificación de catálogo activa**.
**Cierre:** creación + entrega + recuperación + mejora real demostradas extremo a extremo.

## J10 · Arte propio, calidad móvil y portadas con identidad
**Problema:** arte falso AI geométrico y escala diminuta destruyen la utilidad y la estética.
**Owner:** UI principal y arte de cada proyecto; PR92/93 ya cambiaron a negro y portadas tipográficas. PR88 es **solo candidato**, no aprobar sin crítica visual.
**DO:** recuperar referencias narrativas 1-bit, pixel art mono, collage, grabado, dithering local, isometría, escenas materiales y crítica anti-geométrica; diseñar una identidad visual propia por proyecto o portada tipográfica sobria. Asegurar tamaño móvil real, uno por pantalla, buen swipe, espacio para actividad grande, alto contraste y sin texto cortado. Usar arte auténtico generado con herramienta adecuada y control de calidad, no generar sombras/decoraciones SVG para fingir ilustración.
**SEE:** pantalla realmente distinta y bella, sin perder navegación, eventos, historial y expediente; capturas comparadas con ejemplos negativos y brief, juicio visual separado del CI.
**CHECK:** PR95 + nueva auditoría visual móvil; pruebas de portadas y contraste, zoom/text-resize, 360/390/480/844/1440. No romper owners de otros chats.
**Dependencias:** diferir nuevos cambios visuales hasta cerrar PR95 y revisión real del usuario; **no ejecutar simultáneamente con J02/J04/J05**.
**Cierre:** usuarios ven pantallas legibles y obra auténtica o tipografía deliberada, no geometría decorativa.

## J11 · Auditor independiente de entrega, recuperación y resiliencia
**Problema:** tests sintéticos verdes ocultan la ausencia de publicación real.
**Owner:** pruebas y recibos, no propia implementación UI salvo bug pequeño y owner autorizado.
**DO:** descubrir trabajos J01–J10 realmente completados, confrontar SHA/PR/CI/Pages, fechas, scroll móvil, feed newest-first, snapshots, error boundaries, acceso offline, caché, privacidad, conflicto entre chats y enlaces de descarga. Mantener lista de defectos críticos con pruebas replicables, corregir si está dentro de alcance. Comprobar que los briefs no se marcaron DONE simplemente por existir.
**SEE:** un informe de evidencia por función con DO/SEE/CHECK, imágenes reales y estados verdaderos en owners, sin bloquear avances seguros por detalles burocráticos ni publicar algo falso.
**CHECK:** escenario chat A registra pedido; B lee desde otra sesión mientras A sigue; A guarda material; B/tercer chat recupera y modifica; Pages muestra estado verdaderamente servido. Necesita ejecuciones distintas con timestamps, no simulación de concurrencia.
**Dependencias:** lanzar al menos después de J01/J02/J09; checks parciales pueden empezar antes.
**Cierre:** fiabilidad comprobada por actos humanos de varios chats, no un «pass» textual.

## J12 · Demostración creativa: un juego pequeño con nivel de acabado profesional
**Problema:** toda la arquitectura podría quedarse en teoría sin mostrar la potencia productiva de un encargo corto.
**Owner:** producto/juego existente (revisar PR75 PULSO) u otro proyecto pequeño autónomo solo si no existe alternativa equivalente. No tocar pantalla de persistencia hasta tener producto.
**DO:** diseñar un alcance razonable (p. ej. arena 2D jugable móvil) con controls táctiles, física intuitiva, objetivos, estados de victoria/derrota, audio opcional, estilo artístico consistente, bugs corregidos, accesibilidad, instrucciones integradas, performance y test funcional, comparando tres direcciones visuales. Reutilizar PR75 si procede. No prometer un AAA comercial ni generar assets geométricos genéricos como atajo.
**SEE:** jugar un prototipo real en teléfono, sin teclado obligatorio y con gráficos y controles pulidos; su entrega aparece como proyecto/candidato con historia, decisión, imágenes, pruebas y version real.
**CHECK:** un chat creador, un crítico visual/QA distinto, prueba de videojuego real (no sólo load DOM) y página servida verificada, sin inventar tiempos.
**Dependencias:** mejor tras J01/J09/J06; puede desarrollarse en rama de juego en paralelo si no comparte propietarios.
**Cierre:** la independencia y el alto acabado demostrados mediante producto divertido, no documentación de un producto hipotético.

## Orden de lotes y scopes para chat paralelos

**Lote A (se pueden iniciar al mismo tiempo, sin pisarse):**
- J01: canal de ACK, esquema/owner y tests; no cambiar visuales de home.
- J06: archivo intelectual y recuperación, owner de docs de proyecto; no cambiar \`reentrada.json\`.
- J07: biblioteca creativa y briefs, sólo documentos/plantillas; no cambiar \`reentrada.json\`.
- J10: ya atendido en PR92/93/95: **NO reiniciar hasta verificar qué se publicó y cómo se ve**.

**Lote B (después de J01, con owners separados):**
- J02: bandeja visual, solo HTML/CSS/JS home.
- J03: eventos de trabajo, validadores/contratos; evitar editar home mientras J02 trabaja.
- J08: entrada en chats naturales, separar de edición a \`AGENT_ENTRY\` realizada por J01 y reconciliar.

**Lote C (tras integrar B; no todos a la vez):**
- J04 novedades por proyecto, después J05 avisos si realmente se desean.
- J09 validación proyecto nuevo usando PR94 y siguiente chat.
- J11 auditoría independiente tras entregas materiales.
- J12 juego profesional pequeño, owner del producto aislado.

**Prohibido:** lanzar dos chats editando \`tv/chat/relevo/retomar/index.html\` simultáneamente; lanzar dos a reescribir \`reentrada.json\` sin CAS; delegar QA a su propio autor; interpretar un ChatGPT app que queda abierto como heartbeat demostrable; publicar contenido privado para lograr apariencia de continuidad.

## Criterio de sistema cerrado (todavía no demostrado)

1. Pedido libre entendido y ACK real en la página antes del trabajo pesado.
2. Ficha con intención/ramas y la última evidencia, sin liveness ficticia.
3. Entregas/errores/versiones/arte/datos verdaderos, reloj Argentina con provenance.
4. Noticias por proyecto, consentimiento de sonido, buena UX móvil.
5. Archivo intelectual recuperable en un chat real distinto.
6. Integración entre producto funcional y página servida, sin duplicados ni regresiones.
7. Reusabilidad: un mensaje corto JNN lleva al brief y termina con un resultado material profesional.
8. Privacidad, control de cambios concurrentes y antideriva.
