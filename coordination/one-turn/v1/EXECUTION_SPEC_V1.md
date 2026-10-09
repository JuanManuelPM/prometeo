# ONE TURN · prioridad humana y ejecución del puente
**Estado: SKILLS + CONTRATOS FUENTE; INTEGRACIÓN REAL PENDIENTE DE VERIFICACIÓN.**
El usuario quiere que todos los chats sean descartables después de UNA entrada humana y que el estado viva en la página web, no en el historial del chat. Este documento existe para que una IA nueva retome la tarea sin volver a pedir el contexto.

## Conservar y reutilizar
- Constitution + Design DNA, UI Cartuchos/EVO-001..EVO-045, Work Graph V1.1 y Worker Bus V2.
- P4 Capture y su privacidad; Page Change Thread por workspace/page; Page Change Feed con unread y resultado; Context Foundry; AI Design Session save y su fallback de un enlace.
- Nada de otra cola, runtime, global memory, Current o shell. No usar GitHub público para transcripts/tokens.
- Código de skills en `.agents/skills/` es disponible para agentes capaces de leer GitHub; **NO significa que ChatGPT lo descubra de forma automática**. Integrar lectura de skills en el lanzador/packet existente y probarlo.

## Operación exacta para otra IA, sin iteraciones humanas
- **G0 [SOURCE]**: validar frontmatter SKILL.md, catálogo, JSON contract y enlaces; commit de fuente y luego fetch por SHA.
- **G1 [RUNTIME DISCOVERY]**: inspeccionar dueño auténtico de Capture/Page Host y storage PRIVADO; verificar que existe endpoint de escritura autorizado y habilitado. No inferir de documentación. Definir preservación y write scope.
- **G2 [INPUT ACK]**: desde página, guardar un mensaje de prueba inocuo en P4 Capture y demostrar receipt, revisión, privacidad, recarga y dedupe. ACK ANTES de lanzar chat/trabajo. Sin receipt => persistencia bloqueada.
- **G3 [LAUNCH]**: lanzar 1 packet desde hilo de página con identidad/contexto/permiso/capability, cargando skills necesarias y un solo input humano. No inventar creación automática de chat ChatGPT: probar la integración host real.
- **G4 [OUTPUT SAVE]**: producir una AI-derived note o RETURN autorizados; guardarlos en propietario existente; reabrir con API privada y comprobar digest/revisión. Si chat muere entre G3 y G4, el INPUT ya persistió.
- **G5 [FEED]**: mostrar resultado en Page Change Feed, unread hasta apertura explícita. No se trata de un dashboard nuevo.
- **G6 [FRESH AGENT]**: crear una sesión NUEVA sin transcript; rehidratar de la página y ejecutar continuación sin segunda solicitud humana, ni copiar textos.
- **G7 [FAILURE/PRIVACY]**: forzar fallo antes/después de ACK, antes/después del RETURN, duplicados, desconexión, expiración, publicación, móvil; idempotencia y seguridad.
- **G8 [PROMOTION]**: el integrador y dueño Current verifica pruebas/browser/served bytes y promueve únicamente con autoridad; rollback a la versión aceptada si falla.

## Reglas de final de cada turno
Escribir `input_receipt` (si existió), `context_revision`, `work/result_receipt`, `verification`, `page_feed`, `unsaved`, `exact_next`. Al no disponer de guardado en el dueño privado, persistir solo decisiones públicas de diseño si hay autorización, y **no declarar que el mensaje quedó guardado en la web**.

## Métricas de aceptación
1 mensaje humano por tarea; 0 transporte manual; input y RETURN recuperables tras muerte de chat; ningún duplicado aceptado; no exposición de privados; rollback; fuente de verdad única; status y liveness honestos.

**Gate actual siguiente:** G1, comprobar implementación del Page Host y el store privado. G0 fuente implementada y requiere ejecutar verificaciones; G1–G8 NO IMPLEMENTADOS NI PROBADOS por este commit.
