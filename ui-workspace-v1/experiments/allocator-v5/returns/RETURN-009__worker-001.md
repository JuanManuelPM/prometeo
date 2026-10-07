EXP-006
WORKER_ID|exp006-20261007T140329086Z-30f38b
WORKER_SLOT|001
TICKET|009
BLOCK|BLOCK-009

TRACE|get_next_start|2026-10-07T14:12:21.480Z
TRACE|get_next_end|2026-10-07T14:12:26.171Z
TRACE|assigned_at|2026-10-07T14:12:26.171Z
TRACE|block_read_start|2026-10-07T14:12:32.573Z
TRACE|block_read_end|2026-10-07T14:12:32.959Z
TRACE|local_work_start|2026-10-07T14:12:32.959Z
TRACE|local_work_end|2026-10-07T14:13:14.478Z
TRACE|return_publish_start|2026-10-07T14:13:14.478Z

COUNTER|external_work_calls|26
COUNTER|telemetry_writes|10
COUNTER|telemetry_failures|0
COUNTER|revision_conflicts|0
COUNTER|retries|0

ANSWER
Quedaría un problema de trabajo perdido por falta de recuperación ante fallas. El allocator puede haber entregado correctamente un ticket único, pero eso sólo garantiza que dos workers no hagan la misma tarea al mismo tiempo. No garantiza que el worker que ganó el ticket vaya a terminarla.

Por ejemplo, el worker recibe el ticket 009 y el allocator avanza su contador al 010. Si ese worker se cierra, pierde conexión o falla antes de publicar su RETURN, el 009 ya quedó consumido desde el punto de vista del allocator. Otro worker que pida trabajo recibirá un ticket posterior y nadie volverá automáticamente al 009. El sistema puede entonces llegar a EMPTY aunque falte materialmente un bloque.

La auditoría mostraría el síntoma: existe una asignación del ticket y quizá un checkpoint de trabajo iniciado, pero no existe un RETURN verificado asociado. El problema pendiente, por tanto, no es de unicidad sino de liveness y recuperación: distinguir entre un worker simplemente lento y uno desaparecido, y decidir cuándo el ticket incompleto vuelve a estar disponible sin provocar duplicados. Mientras eso no exista, una caída entre la asignación y el RETURN puede dejar un hueco permanente en la corrida.

MINI_RESUMEN|Si un worker desaparece después del claim, el ticket puede quedar consumido sin RETURN y convertirse en trabajo perdido.
