# BROKER_V1 · Contrato conceptual

Superficie ideal para ChatGPT:

## claim_block()
Hace selección + claim atómico como una sola operación.
Devuelve block_id, paquete/URL temporal, lease y token scoped.

## submit_return()
Acepta sólo el RETURN del owner válido y sólo en su namespace.
Valida block_id, worker_id, lease y base.
No concede acceso a CURRENT.

El backend físico puede cambiar sin cambiar a los workers.
