# WIDGET_CONTINUITY_PROTOCOL_V1

Cada widget debe poder ser retomado por un chat nuevo sin depender de memoria implícita.

## Archivos obligatorios por widget
- `CONTEXT.md`: propósito, versión CURRENT, límites y known issues.
- `CONTINUITY_PROMPT.txt`: prompt listo para copiar.
- `READINESS_EXAM.json`: preguntas cuya respuesta demuestra que el chat entendió el widget.
- `versions/vN/`: código/version manifest.
- `messages/`: notas/historia append-only.
- `references/`: referencias declaradas.

## Inicio de sesión de trabajo
El chat:
1. lee CURRENT y handoff global;
2. lee contexto del widget;
3. lee reglas de kernel;
4. contesta Readiness Gate;
5. declara `READINESS: PASS` o `FAIL`;
6. recién entonces acepta cambios.

## Fin de sesión
Debe dejar:
- candidate o cambios en scope;
- tests;
- RETURN;
- history message;
- actualización de continuidad si aprendió algo durable.

No puede borrar historia para “limpiar”.
