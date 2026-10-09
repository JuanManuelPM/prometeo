# FIRE TWO-PHASE · PREPARAR Y EJECUTAR CON PUNTO · V1
**Status: CANDIDATE SOURCE.** Esta especificación cambia la UX de `🔥prometeo` y `.`, NO otorga capacidades a ChatGPT por estar publicada. El objetivo de producción sigue siendo una sola intención humana desde la página.

## Comandos inequívocos
- `🔥` / `🔥p`: RESYNC_AND_CONTINUE, una sola tarea autorizada.
- `🔥prometeo [asunto]` y `🔥proneteo [asunto]` (error frecuente de dictado): INVENTORY_AND_PREPARE, sin mutaciones materiales del asunto. *No basta con enumerar skills.*
- `.` solo (espacios alrededor permitidos) como mensaje HUMANO: EXECUTE_PREPARED_PLAN, sólo si existe preparación no vencida, verificada y autorizada. Los puntos al final de otras frases, en citas o como texto de herramientas NO disparan nada.
- `🔥personal`, `🔥libros`, `🔥examen`, `🔥web` y demás son comandos directos ONE_TURN, nunca requieren `.` por defecto.

## PREPARE (sin actos materiales)
1. Identificar caso exacto; leer el contexto autorizado mínimo. Si hay fotos de referencia pendientes, marcarlas `MISSING_DESIGN_INPUT`; no inventar la dirección estética.
2. Enumerar TODOS los metadatos de skills accesibles del runtime (listing real) y repo (catálogo verificado). Si no está disponible una fuente, escribir `CATALOG_UNAVAILABLE` con motivo; NO declararla revisada.
3. Tabla/ledger de skills con estados distintos: `DISCOVERED`, `SELECTED`, `LOADED` (texto de skill efectivamente leído), `PLANNED`, `INVOKED` (acciones hechas siguiendo esa skill), `VERIFIED` (evidencia), `SKIPPED` o `UNAVAILABLE`. No llamar `USED` a una mención. Registrar ID/version/ref/herramientas relevantes cuando se pueda.
4. Seleccionar TODAS las pertinentes (sin top-N fijo, permitir recurrencia) y **cargar instrucciones completas de las seleccionadas que estén disponibles antes de mostrar el plan**. Si la skill no pudo leerse, no simular `LOADED`.
5. Formular plan **ejecutable**: objetivo, baseline/Current/owner, pasos concretos, archivos/servicios target y write_scope, permisos, entradas requeridas, dependencias, tests y criterios de aceptación, riesgos, negativa deliberada a caminos prohibidos, rollback, métricas/tiempos y resultado esperado. Dividir por etapas sólo si necesario; no generar pasos vacíos.
6. Efectuar crítica pre-mortem: fallas plausibles, errores históricos, contrapruebas y decisión de exclusión/mitigación. No inventar que el producto es mediocre ni defectos imposibles de verificar.
7. Congelar `plan_id`, `plan_version`, `context_revision`, `source_refs`, `required_skill_refs`, `write_scope`, `acceptance`, `created_at` y `expiration_policy`. Persistir **sólo en el dueño autorizado** (Page Change privado para objetivos personales; repositorio público únicamente para planes no sensibles y con autorización de source write); verificar read-after-write con ID/hash. Si no se puede confirmar, estado `PREPARED_UNSAVED` y decir que `.` en otro chat NO podrá recuperarlo. El contenido de plan no concede leases, claims, tokens o permisos.
8. Responder un plan visible concreto y listo para ejecutar, con skills y estado honesto. No ejecutar cambios antes de `.` salvo análisis/inventario/persistencia permitida.

## EXECUTE (tras `.`)
1. Resolver el **último plan elegible no consumido** de este hilo o el ID exacto guardado durably en el owner autorizado. No permitir planes arbitrarios del registro público ni seleccionar un plan por parecido de texto. En nuevo chat se exige read-after-write autorizada; ausencia => `PLAN_NOT_FOUND`, no acción material.
2. Revalidar plan_id/hash/revisión/expiración, identidad/autoridad humana, CURRENT/EPOCH/owner, fuente HEAD y write_scope. Si hubo cambio concurrente, rehacer preflight de forma limitada y detener la parte conflictiva; no ejecutar código stale ni hacer merge forzado.
3. Convertir los pasos marcados `PLANNED` en invocaciones REALES de las skills seleccionadas; registrar operaciones concretas y referencias. Las skills describen PROCEDIMIENTOS, no se ejecutan por magia: usar herramientas verdaderamente conectadas; si están ausentes `UNAVAILABLE`.
4. Producir trabajo hasta definición de terminado dentro del alcance autorizado; verificar feature evidence map, tests reales (fuente/brower/privacy/rollback, según target), examen crítico, reparar defectos demostrados, repetir regresiones.
5. Persistir resultados y RETURN en el owner existente y generar verificación / Feed cuando corresponda; nunca llamar `DONE` a E7 transport denied ni afirmar que el chat sigue vivo.
6. Marcar plan `CONSUMED` / terminal receipt con dedupe y evidencia. Un segundo `.` no repite writes; requiere nueva intención o nuevo plan. Si no hay store confirmado entre chats, sólo continúa en el mismo hilo conservado.
7. Resumen: `skills_discovered/selected/loaded/invoked/verified/unavailable`, resultados, links, métricas relevantes, fallas, rollback, `exact_next`.

## GATES de seguridad
- El punto confirma ejecutar UN plan de alcance acotado, no autoriza sobrescribir main/gh-pages o publicar/desplegar sin gate real, ni escribir datos privados en GitHub.
- No desbloquea OBEY-v2, Worker Bus, claim de Work Graph, acceso a claves, rutas no autorizadas, acciones destructivas ni compras. Solicitar confirmación adicional si una acción protegida la exige.
- Si un control de seguridad bloquea escritura, no saltar de backend/ruta para eludirlo.
- Un chat nuevo no tiene un hook para leer todo GitHub o todo el almacenamiento automáticamente: requiere bootstrap del Proyecto, plugin/skill compatible o web ingress real. Un archivo en GitHub NO instala la función universal.
- La pantalla normal de Prometeo no debe introducir `.` como paso obligatorio: allí persiste input aunque no haya worker, luego continúa cuando exista capacidad real.

## Evidencia y telemetría
Registración mínima por plan y skill: `stage`, `timestamp` observado vs authored, `elapsed_ms` si medido, `reads/writes/retries/errors`, `source_sha`, `receipt_ref`, `persisted`. No inventar tiempos, cuota, nafta ni actividad. Estas métricas deben existir aunque se oculten visualmente en el modo minimalista; consultar desde la página especializada con permisos.

## CRÍTICA AL PROTOCOLO ANTERIOR
- **Antes:** `🔥prometeo` sólo listaba skills y terminaba, lo cual no preparaba ejecución para `.`. **Ahora:** inventario + lectura real + plan concreto + ledger verificable.
- **Antes:** en una respuesta se mencionó `vercel/verification` y `supabase/supabase` como si hubieran participado, aunque no se las invocó. **Ahora:** distinción formal SELECTED/LOADED/INVOKED/VERIFIED con pruebas. Un nombre en una tabla no es uso.
- **Antes:** se confundió una maqueta local con progreso integral sobre Prometeo. **Ahora:** cierre de producto exige E2E page→private ACK→claim→return→feed→fresh recovery, y estética basada en fotos reales.
- **Antes:** la propuesta de 2 mensajes amenazaba 1-turn. **Ahora:** dual-stage es OPCIONAL sólo para el chat preparatorio; página productiva se mantiene de 1 mensaje.
- **Antes:** `.` podía interpretarse como ejecución en cualquier conversación sin plan. **Ahora:** requiere plan identificable, no consumido, no stale, owner validado.
