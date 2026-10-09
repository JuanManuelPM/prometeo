# One-turn · objetivo humano persistido en la fuente
2026-10-08. Petición: habilitar uso de Agent Skills para tareas de Prometeo (web/arquitectura/publicación), sin reexplicar jamás el marco EVO-001..EVO-045. Objetivo prioritario: **un solo mensaje del usuario por chat; tras procesarlo el chat se descarta; entrada, resultado, razones y continuidad persisten en la web Prometeo**. Un nuevo chat debe recuperar desde el hilo durable de la página y no preguntar qué pasó antes.
Este es un **registro público de una decisión de producto**, no almacenamiento privado ni capturador universal de futuras conversaciones. Véanse contrato y plan en `coordination/one-turn/v1/` y skills bajo `.agents/skills/`. No afirmar runtime integrado sin prueba real.

## Auditoría G1 de código servido
`coordination/one-turn/v1/G1_EXISTING_BRIDGE_AUDIT_V1.md` identifica código EXISTENTE de guardado local/privado, Page Change, outbox/correlación y separación Guardar/Pensar/Trabajar. G1 lectura del código parcial; **no confirma escritura privada en producción ni single-turn E2E**. Próxima acción material: G1a contrato verdadero de ACK privado; G1b unificar input durable+prepare_execution bajo owner existente; G2 canary autenticado, no tocar plataforma sin scope.

## 2026-10-09 · Proof-first candidate
coordination/one-turn/v1/PROOF_FIRST_BUILD_METHOD_V1.md is integrated on PR #71 as SOURCE candidate. PR #72 contains the small real `tv/chat/scene` RED/GREEN change and receipt; no merge to served / no V6 demo proven. All 45 EVO requirements in IDEA_INDEX retain their previous DESIGN_REQUIREMENT_NOT_TESTED status. Preserve quick 🔥tv path and read method only for actual widget/page development.
