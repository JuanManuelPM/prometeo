# EXP-004 · Plan ejecutado

1. Mantener fijo el benchmark: 2 workers / 10 bloques idénticos a EXP-003.
2. No tocar todavía lease/requeue.
3. Hacer REGISTER como primera operación externa.
4. Publicar primer ping inmediatamente después de obtener slot.
5. Registrar horas absolutas ISO en cada transición.
6. Normalizar mensajes de commits de telemetría para auditoría con hora servidor.
7. Separar logical ops, external work calls y telemetry writes.
8. Prohibir list/search/rereads/movimientos/exploración y cualquier I/O durante redacción.
9. Crear RETURN completo de una vez y verificar exactamente una vez.
10. Mejorar WORKERS con lanes, progreso, gráfico de tiempo, timeline y RETURNS.
11. Hacer EXPERIMENTOS abrir en CURRENT.
12. Separar las dos imágenes en widgets autónomos sin crop, preservando aspecto.
13. Después del run, auditar commits y comparar EXP-004 contra baseline EXP-003.
