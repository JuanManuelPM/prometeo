# EXP-002 · Dos chats reales compiten por un claim en Drive

**Estado:** `READY_TO_RUN`
**Fecha preparada:** 2026-10-06
**Área:** workers / broker / concurrencia real
**Dependencia:** EXP-001

## Pregunta

¿Dos chats independientes de ChatGPT, usando el mismo Drive y el mismo registro de claim, pueden evitar un doble owner sin intervención humana de routing?

## Qué cambia respecto de EXP-001

EXP-001 simuló dos contenders desde un único supervisor.
EXP-002 exige dos conversaciones independientes de ChatGPT.

## Infraestructura

Drive folder:
`BROKER_TEST_V1`
folder_id: `15deUOXp_9mZzZ_m04nDWqsHwfwzs4AvX`

Archivos preparados:
- `BLOCK-REALCHAT-002` · file_id `13GIOKgCXna48KVVyFOU9ggUxYnLDsBxZTHVqnyxD6R8`
- `CLAIM-REALCHAT-002` · file_id `1iwfQE1SsrFHb9bZs11Cy8E89MYve4mKCVTO1FAHXfd8`

El claim empieza READY.

## Protocolo para cada chat

1. Generar `worker_id` único.
2. Abrir `CLAIM-REALCHAT-002` con una lectura que devuelva la revisión actual.
3. Si el documento ya contiene un owner/CLAIM distinto de READY:
   - no intentar tomarlo;
   - resultado `LOSE_ALREADY_CLAIMED`.
4. Si está READY:
   - intentar una única escritura del claim usando `requiredRevisionId` igual a la revisión leída.
5. Si la escritura falla por revision mismatch:
   - resultado `LOSE_REVISION_CONFLICT`;
   - no reintentar el mismo bloque.
6. Si la escritura pasa:
   - resultado `WIN`;
   - leer `BLOCK-REALCHAT-002` una vez;
   - ejecutar la tarea localmente;
   - crear `RETURN-REALCHAT-002__<worker_id>`;
   - releer el RETURN y comprobarlo.

## Restricciones

- Sólo un ganador puede publicar RETURN de owner.
- No modificar CURRENT.
- No recorrer todo Prometeo.
- No reclamar otro bloque dentro de este experimento.
- No llamar “atómico” al sistema completo; sólo registrar la propiedad observada.
- Si los chats no corrieron de forma suficientemente solapada, registrarlo.

## Criterio PASS

- exactamente un claim owner durable;
- cero doble owner;
- exactamente un RETURN válido del owner;
- segundo chat registra pérdida o ausencia de READY;
- evidencia durable en Drive.

## Criterio PARTIAL_PASS

No hubo solapamiento real, pero el segundo chat observó correctamente que ya estaba reclamado y no duplicó el owner.

## Criterio FAIL

- doble owner;
- dos RETURNS como owners;
- loser reescribe el claim;
- falta evidencia durable;
- intervención humana necesaria para decidir ownership.

## Después

Registrar resultados como `EXP-002_RESULT.md`, actualizar índice y decidir si Drive sirve sólo para simulación o si hace falta un broker server-side real.
