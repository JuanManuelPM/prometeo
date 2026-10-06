# COMPATIBILITY V1

- CURRENT page composición: v1
- Kernel: v1
- Widget API soportada: v1
- Cerrar/unmount no elimina módulos históricos.
- Los módulos CURRENT son inmutables dentro de una tarea externa; un cambio crea candidato/nueva versión.
- Si un worker recibe una base distinta de la CURRENT observada, debe registrar BASE_STALE y evitar sobrescrituras silenciosas.
