# STORAGE_ADAPTER_V1

Widgets y workers referencian assets por ID lógico, no por proveedor.

API conceptual:
- get(asset_id)
- put(asset_id, bytes, metadata)
- exists(asset_id)
- signed_read(asset_id, ttl)
- signed_write(scope, ttl)

Backends previstos:
- Drive (provisional)
- GitHub (texto/código, no media pesada)
- B2/object storage
- LocalDisk/laptop

No guardar credenciales maestras en prompts ni Git.
