# EXP-002 · Dos chats reales compiten por un claim en Drive

**Estado:** `PARTIAL_PASS`  
**Fecha preparada:** 2026-10-06  
**Fecha ejecutada:** 2026-10-06  
**Área:** workers / broker / concurrencia real  
**Dependencia:** EXP-001  
**Resultado detallado:** `EXP-002_RESULT.md`

## Pregunta

¿Dos chats independientes de ChatGPT, usando el mismo Drive y el mismo registro de claim, pueden evitar un doble owner sin intervención humana de routing?

## Resultado observado

Sí, en esta corrida hubo:
- un único owner durable: `exp002-9e7c45e3aaed`;
- un único RETURN válido del owner;
- un segundo chat: `exp002-ffe6050a1216`, que observó el claim ya tomado y no reintentó ownership;
- cero modificación de CURRENT.

Sin embargo, el RETURN ganador registra `overlap_with_second_chat_verified: false`.

Por el criterio definido antes de ejecutar, el resultado correcto es `PARTIAL_PASS`, no PASS completo.

## Qué cambia respecto de EXP-001

EXP-001 simuló dos contenders desde un único supervisor.
EXP-002 usó dos conversaciones independientes de ChatGPT.

## Infraestructura

Drive folder:
`BROKER_TEST_V1`
folder_id: `15deUOXp_9mZzZ_m04nDWqsHwfwzs4AvX`

Archivos base:
- `BLOCK-REALCHAT-002` · file_id `13GIOKgCXna48KVVyFOU9ggUxYnLDsBxZTHVqnyxD6R8`
- `CLAIM-REALCHAT-002` · file_id `1iwfQE1SsrFHb9bZs11Cy8E89MYve4mKCVTO1FAHXfd8`

Evidencia de corrida:
- `RETURN-REALCHAT-002__exp002-9e7c45e3aaed` · `1YueuO1Br9BqB5fcryPLCczYk9yh-aOpPPQ_6jB7qf8M`
- `LOSS-REALCHAT-002__exp002-ffe6050a1216` · `1PKRUYXhm3yVg0HQ4654rhQFKpYIfqm0geVfAxO0Raqc`

## Protocolo aplicado

1. Cada chat generó un `worker_id` único.
2. El ganador reclamó el bloque una sola vez.
3. El perdedor observó `CLAIMED` y no intentó tomar ownership.
4. Sólo el ganador leyó y procesó el bloque.
5. Sólo el ganador creó RETURN.
6. Ambos resultados dejaron evidencia durable.

## Criterio de clasificación

### PASS
Requiere además solapamiento suficiente para demostrar que ambos contendieron realmente sobre READY o que el perdedor recibió conflicto de revisión.

### PARTIAL_PASS
Dos chats reales participan, hay exactamente un owner y un RETURN, pero no hubo solapamiento real verificado.

### FAIL
Doble owner, dos RETURNS como owners, reintento indebido, evidencia insuficiente o intervención humana para decidir ownership.

## Próximo paso

Preparar `EXP-003 · REAL CONCURRENT REVISION RACE` con una barrera explícita que obligue a ambos chats a leer la misma revisión READY antes de intentar la escritura.
