# EXP-002 RESULT · Dos chats reales sobre el mismo claim

**Resultado:** `PARTIAL_PASS`  
**Fecha observada:** 2026-10-06  
**Experimento:** EXP-002  
**Área:** workers / broker / concurrencia real

## Veredicto

Dos conversaciones independientes de ChatGPT actuaron sobre el mismo claim durable en Google Drive.

Se observó:
- un único owner durable: `exp002-9e7c45e3aaed`;
- un único RETURN de owner;
- el segundo chat observó el claim ya tomado y registró una pérdida durable sin reintentar ownership;
- no hubo modificación de CURRENT;
- no hubo doble owner.

La clasificación es **PARTIAL_PASS**, no PASS completo, porque el propio RETURN ganador declara:

`overlap_with_second_chat_verified: false`

Por lo tanto, esta corrida prueba comportamiento correcto con **dos chats reales**, pero no prueba todavía una carrera verdaderamente solapada donde ambos hayan leído READY y sólo uno gane por conflicto de revisión.

## Evidencia durable

### Claim
- archivo: `CLAIM-REALCHAT-002`
- file_id: `1iwfQE1SsrFHb9bZs11Cy8E89MYve4mKCVTO1FAHXfd8`
- estado observado: `CLAIMED`
- owner: `exp002-9e7c45e3aaed`

### Ganador
- worker_id: `exp002-9e7c45e3aaed`
- resultado: `WIN`
- RETURN: `RETURN-REALCHAT-002__exp002-9e7c45e3aaed`
- file_id: `1YueuO1Br9BqB5fcryPLCczYk9yh-aOpPPQ_6jB7qf8M`
- status: `RETURNED`
- resultado local:
  - uppercase: `PROMETEO REAL CHAT CLAIM`
  - sum: `60`
  - expected_uppercase_matches: `true`
  - expected_sum_matches: `true`
- claim_write_attempts: `1`
- block_reads_after_win: `1`
- current_modified: `false`
- other_block_claimed: `false`

### Perdedor
- worker_id: `exp002-ffe6050a1216`
- resultado: `LOSE_ALREADY_CLAIMED`
- evidencia: `LOSS-REALCHAT-002__exp002-ffe6050a1216`
- file_id: `1PKRUYXhm3yVg0HQ4654rhQFKpYIfqm0geVfAxO0Raqc`
- observed_state: `CLAIMED`
- observed_owner: `exp002-9e7c45e3aaed`
- claim_write_attempted: `false`
- ownership_retry: `false`
- block_read: `false`
- owner_return_created: `false`

## Qué demuestra

1. Dos chats reales pueden compartir el mismo registro durable de ownership.
2. Un chat que llega después de un claim ya tomado puede detectar correctamente el owner y abstenerse.
3. El protocolo evita un segundo RETURN de owner en esta corrida.
4. El ganador puede leer el bloque una sola vez, trabajar localmente y publicar un RETURN durable.
5. La evidencia de ganador y perdedor queda persistida en Drive.

## Qué NO demuestra

No demuestra todavía que dos chats hayan leído simultáneamente el estado READY y que uno haya sido rechazado por `requiredRevisionId` después de que el otro escribiera.

Ese caso exacto ya fue demostrado mecánicamente en EXP-001 desde un solo supervisor, pero falta demostrarlo con dos conversaciones independientes.

## Siguiente experimento recomendado

`EXP-003 · REAL CONCURRENT REVISION RACE`

Objetivo: conseguir solapamiento explícito entre dos chats reales:
1. ambos leen la misma revisión READY;
2. ambos registran durablemente `READY_READ` antes de escribir;
3. una barrera común autoriza la escritura;
4. ambos intentan exactamente una escritura con el mismo `requiredRevisionId`;
5. uno debe ganar y el otro debe registrar `LOSE_REVISION_CONFLICT`;
6. sólo el ganador procesa el bloque y publica RETURN.

Esto separa claramente:
- coordinación real entre dos chats;
- exclusión optimista de Drive;
- trabajo material del owner.

## Conclusión

EXP-002 mejora materialmente EXP-001 porque introduce dos chats reales y evidencia durable independiente. El sistema se comportó correctamente, pero la ausencia de solapamiento verificado impide llamarlo prueba final de carrera atómica multi-chat.

**Estado canónico del experimento: `PARTIAL_PASS`.**
