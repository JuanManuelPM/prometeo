# READINESS_GATE_V1

Antes de modificar un widget, el chat debe responder explícitamente estas preguntas basándose en archivos CURRENT, no en memoria:

1. ¿Cuál es `page_version` CURRENT?
2. ¿Cuál es `widget_id` y versión CURRENT?
3. ¿Cuál es tu `write_scope` exacto?
4. ¿Qué paths están fuera de scope?
5. ¿Qué funciones UI pertenecen al kernel y no deben reimplementarse?
6. ¿Qué diferencia existe entre CANDIDATE y CURRENT?
7. ¿Qué known issues afectan este widget?
8. ¿Qué history/messages/references deben conservarse?
9. ¿Qué tests verifican el cambio?
10. ¿Qué cosas NO fueron verificadas y por lo tanto no podés afirmar?

Formato final:
`READINESS: PASS`
o
`READINESS: FAIL — <motivo>`

Si cualquier respuesta depende de suposición, debe marcar FAIL y recuperar contexto antes de trabajar.
