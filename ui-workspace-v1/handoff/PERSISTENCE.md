# PERSISTENCE / TRANSPORT

## Estado
La ChatGPT Library alcanzó su límite de almacenamiento durante el bootstrap.
No se borró contenido previo.

## Transporte persistente vigente
Google Drive folder:
- name: PROMETEO_UI_WORKSPACE_V1
- id: 1HTVDa0mY6o2OV7wIIDPQ2nnzDo6E96ns
- url: https://drive.google.com/drive/folders/1HTVDa0mY6o2OV7wIIDPQ2nnzDo6E96ns

## Estrategia V1
- El ZIP `PROMETEO_UI_WORKSPACE_V1.zip` contiene la estructura lógica completa.
- Los archivos CURRENT/TASK/PROTOCOL principales se publican también individualmente para navegación rápida.
- Los workers externos descargan el ZIP, trabajan localmente y suben resultados como archivos nuevos namespaced.
- Ningún worker externo reemplaza CURRENT.
- Esta estrategia evita last-write-wins sobre un único archivo y permite varios candidatos concurrentes.

## Escala
Para 10/50 workers, cada resultado/receipt usa nombres únicos por worker_id y task_id.
El allocator canónico podrá reemplazar esta capa de transporte después sin cambiar Task/Return semantics.
