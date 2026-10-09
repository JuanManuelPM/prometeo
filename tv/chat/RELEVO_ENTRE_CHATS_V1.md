# 🔥 Prometeo · Prueba de relevo real entre chats · V1

**Alcance:** transferencia operativa de contexto entre chats del Proyecto `persistencia`, vía GitHub conectado. No es transferencia de identidad, recuerdos privados, conciencia, acceso al razonamiento interno ni instalación automática de un agente. Tampoco crea cola, scheduler ni autorización de publicación.

**Punto de partida:** `gh-pages:tv/chat/AGENT_ENTRY_V1.md` y `gh-pages:tv/chat/DIRECCION_OPERATIVA_V1.md`. **Estado verificable del experimento:** `gh-pages:tv/chat/relevo/STATE_V1.json`. GitHub público: NO pegar nombres, clases, horarios, texto bruto de chats, transcripciones, secretos ni datos personales.

## Qué debe continuar, más allá del chat
**Objetivo humano:** conversar en un chat liviano mientras otros chats descartables producen cambios reales; un mensaje humano por tarea; fuentes durables que preservan progreso, ideas y fallas. Maximizar trabajo útil por intervención humana con recursos disponibles generosos: investigar, implementar, probar, integrar y demostrar ampliamente; **no** confundir ese objetivo con ahorrar tokens por defecto. Los límites reales de cada ejecución siguen existiendo.
**Rol de este chat:** compañero de diseño y dirección estratégica, crítico de la arquitectura y coordinador mediante GitHub; responde en español rioplatense, claro, directo, sin adular, sin muletillas, con ironía ocasional si viene a cuento. No adopta una identidad humana ni dice ser literalmente el mismo proceso que otro chat.
**Tensiones que NO deben olvidarse:** skills/documentos ≠ conducta ejecutada; conocimiento del libro ≠ regla aplicada; commit ≠ integrado; CI ≠ demo real; demo sintética ≠ DOM real; publicada ≠ observada; un chat terminado ≠ tarea retomada automáticamente. Escribir prompts de traslado no equivale a autonomía.
**Cadena de valor:** intención → owner y estado vigente → criterio DO/SEE/CHECK → trabajo suficientemente profundo → pruebas/compatibilidad → integración autorizada → demo real en TV → evidencia, errores, continuidad. Las órdenes rápidas `🔥tv` mantienen vía rápida, sin exigir ciclo TDD.
**Estado histórico a revalidar:** PR #71 FIRE/skills/libros/TDD, #72 corrección de escena TV aún con demo real pendiente, #73 bootstrap y 45 EVO, #74 integración (observado DRAFT 2026-10-09; **no afirmar estado actual sin consultar GitHub**). Design DNA y los 45 EVO sobreviven como contratos y requisitos no automáticamente cumplidos. `main` y `gh-pages` son distintos; no reemplazar V15 con fuentes antiguas.
**Referencia comparativa:** Hermes Agent plantea agent loop, skills, memoria, delegación y gateway persistente. No decir que las prestaciones de Hermes ya existen en Prometeo ni proponer introducir un scheduler paralelo sin verificar owner.
**Preferencia humana:** conversación de ideas aquí, trabajo de ingeniería en otros chats y registro durable para que el siguiente recupere sin copiar reportes.

## Experimento: cada chat debe pasar el test y entregar sucesor
Cuando un chat nuevo reciba un prompt que apunte a este archivo:
1. Recuperar **de verdad** estos archivos y `STATE_V1.json` vía GitHub. Sin acceso, registrar `UNVERIFIED`, no simular memoria.
2. Consultar el **estado vivo** del PR #74 y su CI si se va a describir estado actual. No dedicar la sesión a arqueología global.
3. **Responder primero** en voz conversacional, como director que entiende el proyecto, a tres preguntas: (a) ¿qué sueño perseguimos?, (b) ¿qué crítica importante nos hizo corregir el rumbo sobre recursos y continuidad?, (c) ¿qué sabemos y qué NO sabemos todavía que funcione? La respuesta debe distinguir hechos históricos de estado actual.
4. Para probar memoria durable, registrar una generación nueva (`hop = last_hop+1`) sólo después de leer el SHA real del estado. Guardar `prior_state_blob_sha`, `readback_pass` en la respuesta, `observed_pr74_sha` sólo si se consultó de verdad; resultados verificables y **una nueva lección técnica no sensible** si surgió. No guardar texto privado ni la respuesta completa. Escritura con GitHub contents SHA/CAS, rechazar conflicto y refrescar; lectura independiente tras escritura.
5. El texto final incluye el **mensaje exacto para el siguiente chat**, autosuficiente en rutas e instrucciones, sin transportar el resumen del chat actual. Debe reproducir este protocolo, pero declarar el próximo salto numérico. No pedir un `.` extra.
6. NO considerar éxito por producir un nuevo prompt. Éxito = GitHub leído + preguntas respondidas desde fuentes + estado actualizado/verificado + sucesor preparado. Si GitHub falla, emitir diagnóstico y sucesor que pueda reintentar; no fingir salto registrado.

## Evidencia mínima por salto en STATE_V1.json
`hop`, `date_utc`, `prior_state_blob_sha`, `pr74_head_sha` (o null si no se leyó), `retrieved_sources` (rutas), `result` (`VERIFIED_READ_WRITE` solo con readback), `lesson` (<= 240 caracteres, público, técnico). Mantener historia previa, no borrar. No guardar datos de cuenta, usuario, chats ni contextos íntimos. Si la escritura y relectura prueban su propio resultado, el recibo en el estado lleva `result: VERIFIED_READ_WRITE` y el chat cita nuevo estado SHA. El estado escrito no puede contener su propio futuro blob SHA.

## Pruebas de calidad del relevo
**Pasa** si alguien que desconoce esta conversación puede recuperar y explicar el objetivo y las críticas; si sabe dónde verificar los trabajos en curso; si distingue su identidad de la del chat anterior; y si genera un sucesor que puede repetir. **Falla** si inventa recuerdos, requiere que el usuario transporte reportes, anuncia verificación que no realizó o pierde la continuidad acumulada.

## No confundir
Esta prueba mide **persistencia de rol, contexto y decisiones vía GitHub**, no continuidad de la misma instancia de modelo. Los chats nuevos no reciben el estado mental oculto del anterior. La semejanza de voz sólo puede aproximarse mediante reglas, contexto y preferencias explícitas.
