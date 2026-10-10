# PROMETEO · M01 · Tablero vivo de encargos · Brief maestro de calidad de producto

**Estado:** BRIEF EJECUTABLE, no solución ya integrada.
**Incluye:** J02 (bandeja visual), J03 (estados y evidencia), J04 (novedades/lectura), J05 (avisos con consentimiento) de \`gh-pages:tv/chat/relevo/retomar/IDEAS_ENCARGOS_DE_ALTA_CALIDAD_V1.md\`.
**Owner de UI:** exclusivamente la misma página \`gh-pages:tv/chat/relevo/retomar/index.html\`, con su test suite existente. Nunca nueva app, registro, cola, scheduler o backend por comodidad.
**Dependencia:** J01 (acuse temprano) ya enviado a otro chat. No editar simultáneamente los contratos/owners de J01; implementar un consumidor robusto, reconciliar con su esquema y no fusionar hasta disponer de evidencia válida.

## La ambición

Crear una **experiencia de producto integrada, de acabado profesional**, capaz de convertir el trabajo material realizado desde chats descartables de ChatGPT en una narración visual verificable y cómoda de seguir desde el teléfono, desde el primer reconocimiento de una orden hasta la última prueba publicada. No alcanza una prueba de concepto ni una maqueta con datos inventados. El usuario no debería necesitar GitHub, transcripciones, copiar resultados ni ir leyendo los textos largos de varios chats para saber qué ocurre.

Profesional significa: excelente jerarquía visual, consistencia y personalidad, accesibilidad, estados causales honestos, interacciones reales, decisiones de diseño deliberadas, manejo de errores, performance, calidad en seis viewports, un sistema de pruebas que encuentre fallas **y una versión pública cuya identidad se pueda verificar**. Si alguna fase no se puede implementar honestamente con las capacidades del momento, dejar una candidata útil y un bloqueo explícito con evidencia. Nunca decir «terminado» sólo por escribir código.

## Resultado humano DO / SEE

1. En un chat nuevo el humano dicta un pedido de 1–2 frases, el ejecutor lo interpreta y, con las herramientas realmente conectadas y autorizadas, registra un **ACK público sanitizado**. Al abrir la página común, **ABAJO** aparece una nueva entrada que cuenta «Pedido interpretado», con objetivo breve, proyecto al que pertenece, pasos y hora argentina del evento. Esto depende de J01: no simular un hook nativo de ChatGPT que no existe.
2. Cada entrada agrupa por \`work_id\` los eventos durables posteriores (p. ej. CANDIDATE, TESTED, SERVED_VERIFIED, BLOCKED); tiene un **diagrama/árbol limpio** de 3–6 pasos o ramas, navegable por teclado y lector de pantalla, y una cabecera que indica avance + último evento real. Los pasos no se pintan verdes por estar en el plan.
3. Sin hacer scroll infinito, un resumen fuerte, con la **prueba y fecha auténtica**, permite saber qué cambió en cada proyecto. Investigación, manuales, razones, PRs, commits, errores, capturas y fuentes viven en un panel de detalles expandible con enlaces trazables; no aparecen dumps masivos de texto en el inicio.
4. La sección inferior se ordena por la última novedad real descendente, con acceso visual a su historia causal, sin omitir eventos antiguos del mismo \`work_id\`. El feed superior previo y todas las funciones existentes se mantienen.
5. Cada tarjeta de proyecto muestra «Nuevo» únicamente cuando es creación reciente comprobada, **última actualización** con fecha/hora de Argentina derivada del evento verdadero, y «Sin leer» sólo según estado local del dispositivo/gestos. Puede haber contador de novedades sin duplicados. La lectura en un teléfono **no significa** leída en la computadora. Nunca publicar la actividad privada del usuario.
6. Un control pequeño permite activar/desactivar **avisos opcionales** ante un resultado nuevo. Sin gesto/permiso no suena ni vibra. El mismo evento no dispara alertas duplicadas en refresh/focus/Back; respetar preferencias del sistema, autoplay, reduced-motion, tab oculta, accesibilidad y silencio. No prometer push al cerrar la pestaña sin infraestructura y pruebas reales.
7. La experiencia conserva tema oscuro verdadero, portadas tipográficas sobrias o ilustración auténtica, cartas grandes tipo una por pantalla y títulos perfectamente legibles; un usuario percibe con claridad los cambios publicados. Reutilizar PR #92/#93 y auditoría PR #95, NO volver a portadas de formas geométricas. Evitar que el nuevo feed compita con los proyectos en el primer scroll.

## Modelo de evidencia y estados (regla innegociable)

- Evento: \`event_id\` o \`receipt.id\`, \`work_id\`, \`project_id\`, tipo, estado, \`occurred_at_utc\`, fuente verificable, resumen público seguro, versión/proof cuando aplica. Respetar contratos actuales y cambios del chat J01; leerlos de nuevo al integrar.
- Etiqueta **RECIBIDO**: hay ACK material. Etiqueta **EN PROGRESO**: solo con señal de actividad reciente y fuente comprobada, nunca porque hay un PR abierto. Sin señal después de un umbral razonable: **SIN SEÑAL RECIENTE / ESTADO DESCONOCIDO**, no afirmar error o abandono. **ROJO** únicamente para error/bloqueo documentado; **VERDE** únicamente para el hito cuya verificación exacta se indique; CANDIDATE/TESTED no son SERVED.
- La fecha del registro del ACK es conocida si tiene fuente; hora de dictado, inicio de sesión de ChatGPT y fin de chat pueden ser **DESCONOCIDAS**. No usar hora de commit como hora de conversación. Nunca una spinner infinito como sustituto de un latido real.
- Un chat **no es** un proyecto. Un pedido puede abrir un nuevo trabajo dentro de un proyecto ya existente. No inflar el catálogo con una tarjeta por conversación.
- Todos los cambios del catálogo/recibos deben sobrevivir concurrencia (readback, HEAD fresco, SHA/CAS, reconciliación, idempotencia). No recopilar prompts privados completos. No perder entradas nuevas de otros chats ante un refresh tardío.

## Alcance técnico autorizado y compatibilidad

- Editar solo la UI existente \`tv/chat/relevo/retomar/index.html\` y sus tests localizados, en **rama propia**. Preferible CSS/JS/HTML encapsulados o módulos verdaderamente justificados, no una segunda página de Prometeo.
- Consumir el catálogo de proyectos real, \`public_receipts\`, owners ya existentes y el trabajo de J01 **cuando se haya guardado y verificado**. No inventar nueva tabla en Supabase, worker, scheduler, bus, token, servidor persistente ni autoridad paralela.
- El código puede usar datos sintéticos exclusivamente en tests etiquetados como fixtures. En producción debe soportar: 0 eventos nuevos, 1 ACK, muchos eventos y proyectos, datos parcialmente inválidos, red caída, 403 GitHub, evento atrasado, estados desconocidos y dos chats trabajando sobre distintas ramas.
- No tocar ni fusionar PR #87/#88, assets artísticos sin aprobación, código de Facultad, Rutina/Ritmo, juegos u otros propietarios. No degradar Back/Forward, scroll horizontal, selección, historial, responsividad, expediente PR88 o versiones anteriores.
- **Atención a rama experimental** \`feature/retomar-work-intent-ledger-20261010\`: allí quedó una prueba anterior de bottom ledger creada *antes* de este nuevo encargo. Compararla con fuente actual; salvar lo que sirva y corregir incompatibilidades. **NO** asumir que ese experimento pasó CI o es publicado. Nunca sobrescribir la versión oscura por rescatar un HTML anterior.

## Direccionalidad visual y nivel de terminación

Antes de dibujar, decidir una estética funcional para las fichas: tipo registro narrativo contemporáneo, no pseudoterminal, ni cajas genéricas repetitivas. Se valora la composición editorial, excelente uso de espacio, jerarquía tipográfica y señales muy económicas de estado. Usar líneas únicamente si cumplen una relación causal clara entre fases; no son «arte generado» y no deben ser decorativas. Colores verde, amarillo y rojo **sólo** para estados semánticos, con texto e icono redundantes (accesibilidad). Microinteracciones moderadas y reduced-motion.

Probar lectura desde teléfonos realmente angostos 360/390, 430, 480×1800, tablet 844 y escritorio 1440; zoom 200%, contraste, foco/teclado, área táctil ≥44px, posible modo sin JS/datos parcialmente disponibles y elementos largos en español. Al hacer scroll el feed debe seguir legible y los proyectos no desaparecer.

## Pruebas de aceptación no negociables

**Protocolo FEATURE → PROOF:**
1. Inventariar baseline actual con SHA y pruebas anteriores, explicar exactamente qué funciones se preservan.
2. Definir 6 historias observables con criterios automáticos claros; tests de contrato para eventos, error y fuente; test de render.
3. Probar con Chromium **contra el DOM real** para 360/390/430/480/844/1440 y capturas antes/después; verificar archivos de arte cargados, legibilidad, overflow, uso táctil, disposición de la banda de proyectos y orden causal.
4. Para el input inicial, usar un ACK **auténtico** de GitHub de J01 cuando exista. Si J01 no terminó, completar consumidor visual con fixtures de test y dejar PR candidato probado, **no fingir** cumplimiento E2E ni merge incompatible.
5. Verificar la existencia de al menos un \`REQUEST_CAPTURED\` y un desenlace verdadero, sin mostrar un chat como trabajador activo si no hay señal nueva. Simular timeout en pruebas para demostrar que no se pinta rojo falsamente.
6. Después de reconciliar con J01 y pasar gates, publicar sobre la **misma URL** con autorización, comprobar HTTP/bytes/DOM/fechas/proyecto/actividad/orden/escena y conservar evidencia durable con timestamps y URLs reales. Si el gate no pasa, explicar y conservar rama sin integración.

## Contrato de entrega del chat ejecutor

La respuesta final breve es secundaria. El producto es **la experiencia visual y los receipts**: PR/commit real, prototipo plenamente navegable y probado, comparativas de capturas, decisión artística, matriz de pruebas y estados, video/arte si es pertinente, pruebas de fallos y plan de rollback. Corregir errores encontrados durante el turno sin pedir un segundo mensaje. No apropiarse de trabajos simultáneos; si el owner fue modificado, reconciliar en vez de forzar.

Guardar aprendizajes (éxitos, límites, decisiones rechazadas) en fuentes propietarias, con una salida explícita: DONE/TESTED/SERVED o BLOQUEADO POR [prueba], sin resultados inventados.

**Esta misión reemplaza, para un chat constructor único, la necesidad de enviar 4 mensajes J02–J05 por separado.** J01/J06/J07 corren paralelos con owners distintos.
