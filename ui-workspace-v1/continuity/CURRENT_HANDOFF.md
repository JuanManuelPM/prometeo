# CURRENT HANDOFF · Prometeo UI V5

Fecha: 2026-10-07

## CURRENT
- page_version 5
- experiments@v4
- workers@v4
- art-smile@v1
- art-feast@v1
- chat@v1

## UI
Las dos imágenes son widgets separados.
No usan object-fit: cover: se muestran completas, preservando aspecto.
En pantallas anchas la imagen se limita a su ancho de referencia y puede quedar espacio libre a los costados.

EXPERIMENTOS abre siempre en el experimento CURRENT.
WORKERS tiene lanes visuales, progreso, TIEMPO, TIMELINE y RETURNS.

## EXP-004
Benchmark nuevo: 2 workers / 10 bloques, misma carga que EXP-003.

Cambios:
- REGISTER y ping público primero;
- timestamps absolutos;
- commit messages normalizados;
- una tarea activa;
- bloque leído una vez;
- trabajo completamente local;
- RETURN completo en una sola creación;
- verificación una vez;
- prohibidos list/search/exploración/mover archivos/rereads preventivos;
- se cuentan logical ops, external work calls y telemetry writes por separado.

Drive:
- registry 1eJUVqmVzJwRvIuPLBIkiHtoFvJ2L130tXstOOwEs7Ug
- allocator 1UTLjGbt5Wsa2qbZze4H0PJVD89RVhKiqw4fDefx-AZI

Exact next: ejecutar EXP-004 con dos chats simultáneos usando el mismo launch prompt. Después auditar commit timestamps y comparar con EXP-003 antes de tocar lease/requeue.
