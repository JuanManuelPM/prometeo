# Prometeo · Kit de tareas para IA (Jarvis, Cloud, Android, Work)

**Contrato:** una instrucción humana, lotes grandes, pocos permisos, resultados verificables. Este documento genera encargos; **no** acredita que Work, Claude o Android estén bajo control remoto.

## Fuentes que el agente debe consultar, en orden
1. `JuanManuelPM/prometeo/AGENTS.md`, `coordination/GLOBAL_AGENT_CONSTITUTION_V1.md`, estado servido/EPOCH y owner del componente.
2. `tooling/chatgpt-readiness/README.md`, `.agents/skills/prometeo-chatgpt-tool-readiness/SKILL.md`, capacidades e intents actuales.
3. Código **actual del dueño**, pruebas, PRs #122 (app events), #123 (Work transport), #125 (boot) y #126 (private handoff/snapshot). PR != Served.
4. Resultado privado real del Tank cuando haya autorización: `relay/tank-mini-1/results/REQ-bootstrap-diag-20261020.json`. Nunca publicar identificadores personales, tokens, mensajes ni datos sin filtrar.
5. Vercel conectado: `worker-lab`, `prometeo-bridge`, `prometeo-live-hub` están en estado READY; eso **no** implica conexión con el teléfono. Supabase `catnohyouxqjjtseaueb`: proyecto ACTIVE_HEALTHY, pero acceso SQL falló; no modificar estructura por especulación.

## Prompt «IMPLEMENTAR»
> Misión: [OBJETIVO]. Avanzá todo lo posible en la misma sesión. Identificá dueño, contratos y pruebas que ya existen antes de codificar. Preservá Riel, Current, accepted, proyectos y secretos. Trabajá por lotes: inspección mínima → implementación aislada → pruebas positivas/negativas → corrección → PR/retorno durable. No crees otro shell/coordinador ni simules permisos. Clasificá cada logro: ACTIVO REAL / CI AISLADA / CANDIDATO / NO VERIFICADO. Si una acción humana es inevitable, prepará todas las demás y pedí solo un gesto concreto. Un trabajo terminado es un enlace a evidencia, no una lista de tareas.

## Prompt «DISEÑO EN LA NUBE»
> Misión de diseño: [PANTALLA Y OBJETIVO]. Inspeccioná las reglas visuales y el Riel servido. No sustituyas su escritorio. Prepará un **preview aislado** en Cloud cuando esté autorizado y verificado el proyecto. Dos colores, mobile vertical, controles táctiles amplios, detalle técnico oculto, sin scroll lateral, estados del servidor con hora. Una pantalla debe permitir percibir qué es REAL, CANDIDATO, NO CONECTADO. Probar en 320–430 px y escritorio, teclado y gestos; guardar capturas, fallos y correcciones. La vista previa no se promueve a producción sin validación real de diseño.

## Prompt «INTEGRAR UNA APP DEL TELÉFONO»
> App: [APP]. Objetivo: [EVENTO/ACCIÓN]. Primero comprobá cuál es el proveedor autorizado (API oficial, listener opt-in, Termux:API, AccessibilityService aprobado, ADB aprobado), y qué eventos/acciones reales soporta. No confundas la presencia del icono con acceso a datos. Reutilizá `lab/personal-app-hub-v1` como receptor aislado, no crees otro inbox. Para probar, entregá una matriz: detección de app, permiso necesario, evento leído en vivo, escritura aprobada, mecanismo de revocación. No registres cuerpos de notificaciones ni chats por defecto. WhatsApp personal ≠ WhatsApp Business API; Mercado Pago y transferencias requieren aprobación humana.

## Prompt «ENSAYO DE CONTROL»
> Dispositivo: Tank Mini 1 Android 13. Hacé primero un inventario local **de sólo lectura**, redactado, de Termux:API, comandos, accesibilidad, adb/Shizuku, notificaciones y sesiones; sin solicitar permisos a ciegas. Elegí el test más pequeño que pruebe una capacidad nueva y reversible (ej. abrir app o mostrar notificación propia), pedí consentimiento una vez, comprobá el recibo real de Android, guardá evidencia privada y probá reversión. No rootear, no desbloquear bootloader, no cambiar privilegios ni ejecutar desde cola remota shell arbitrario.

## Formato de entrega de cualquier IA
```json
{
  "schema":"prometeo.task-return/v1",
  "objective":"...",
  "implemented":["..."],
  "verified_real":["..."],
  "verified_ci_only":["..."],
  "not_connected":["..."],
  "files_changed":["..."],
  "receipts":["..."],
  "risk_and_rollback":"...",
  "human_action":{"required":false,"purpose":null,"one_gesture":null}
}
```
