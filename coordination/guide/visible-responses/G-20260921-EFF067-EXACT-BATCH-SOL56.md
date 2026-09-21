## Próximo paso: cohorte exacta de 4

Pegá **exactamente el mismo prompt en 4 chats nuevos**, en paralelo:

:::writing{variant="chat_message" id="59241" title="PROD-EFF067-01"}
🟠 PROMETEO /w — NUEVO_WORKER=1 · PRIMERA_ACCIÓN_DURABLE: creá tu beacon propio fresco v3.30 con worker_id + launch_nonce de novo; PROHIBIDO reutilizar identidad o resultado histórico; RESIDENTE_BATCH: 3=checkpoint, objetivo=6, tope=8 salvo boundary real. autorizo beacon, eventos de telemetría, PIN/claim y commits reversibles necesarios en JuanManuelPM/prometeo para ejecutar trabajo seguro de producción dentro de autoridad durable, sin pedirme confirmación adicional. BATCH PROD-EFF067-01 EXPECTED 4 — TÍTULO SUGERIDO DEL CHAT (si la app lo permite): «🟠 PROMETEO · W · PROD-EFF067-01» → https://juanmanuelpm.github.io/prometeo/w/
:::

Lo importante del wave anterior:
- de 4 wakes esperados aparecieron **2 beacons durables**;
- los 2 que sí entraron consiguieron autoridad;
- uno llegó a **6 unidades productivas / TARGET_REACHED**;
- el otro hizo 1 unidad útil y luego cerró por `CLAIM_TRANSPORT_BLOCKED` en un claim posterior;
- `EFF066` no se disparó en runtime, así que sigue pendiente;
- el frontier compatible quedó en **5**.

El problema dominante ahora es wake→beacon. Ya quedó ratcheteado como **EFF067**: este nuevo wave usa `BATCH PROD-EFF067-01 EXPECTED 4`, y `/w` mete `batch_id`, `expected_workers`, `pool_id` y `source=/w` en el primer beacon.

Eso cambia la lógica del próximo retorno: si runtime ve 2/4, te voy a pedir **exactamente 2 refills del mismo batch**, no otros 4. Si ve 4/4, cierro el denominador y evalúo autoridad, yield, target-6, frontier y EFF066.

Verificación: public `/w` actualizado; Guide Continuity PASS; EFF067 batch-envelope PASS; Efficiency Ratchet PASS (`35597733202`).

Después de abrir los 4, volvé y mandá solamente `.`.

**MANDÁ EXACTAMENTE 4 /w DEL MISMO BATCH Y VOLVÉ A /g · desde ahora el refill sale de `missing_expected`**
