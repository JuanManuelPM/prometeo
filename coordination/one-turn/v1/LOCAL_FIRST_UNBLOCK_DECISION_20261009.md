# DECISIÓN LOCAL-FIRST · DESTRABAR PROMETEO (2026-10-09)

**Origen:** el usuario rechazó que el desarrollo quedara parado por Supabase y autorizó explícitamente reducir el alcance online, comenzar local y después volver a conectar los módulos. Esto **no reemplaza** su objetivo ni concede autoridad para cambiar Current/Work Graph.

## Objetivo inalterable
Un mensaje humano enviado desde una sola página → guardado privado durable con ACK + lectura independiente ANTES de asignar trabajadores → contexto y decisiones recuperables → Global Work Graph V1.1 / Worker Bus V2 existentes asignan trabajo real (si la capacidad es 0, queda pendiente) → resultado verificado/RETURN → respuesta visible en la MISMA página → una sesión nueva puede recuperarlo todo sin repetir el mensaje. Prometeo es el dueño de continuidad; ChatGPT es descartable.

## Decisión
**LOCAL-FIRST AHORA; HÍBRIDO MÁS ADELANTE.** SQLite local y outbox del navegador sirven como capa de transporte reemplazable, nunca como segundo allocator/scheduler/CURRENT. Mantener la obra modular ya existente, preservar UI V15/45 EVO/Design DNA/Current Tree V2, trabajo Graph V1.1, cartuchos/skills, P4 Capture/Page Change/Feed, privacidad y dueños.

No insistir en reparar Supabase como prerrequisito para *todo*. Sigue siendo una integración online futura, con pooler oficial IPv4 o Private HOT ya diseñado solo si tiene sentido, seguridad y costo verificados. GitHub-native G09 conserva reconstrucción de coordinación pública, no historias privadas.

## Demostración local AISLADA creada en esta conversación
Paquete: `prometeo_local_funcional_20261009.zip`, SHA-256 `71e3c850f149795380b816aef613c823f1ee825c90d4d7bea3db83d6aa999214`; archivo de conversación, **NO** publicado en repositorio ni servido en GitHub Pages. La ruta sandbox de otro chat NO se debe inventar ni asumir accesible. El usuario puede guardar el ZIP y ejecutarlo localmente.

Con Python stdlib sin dependencias se incluyó:
- Página mínima, sólo chat y métricas ocultas hasta pedirlas; no diseñar nuevo aspecto hasta fotos de referencia.
- Outbox de navegador **IndexedDB programado** antes del envío a localhost; reintenta sin cambiar request_id.
- Servidor en 127.0.0.1 + SQLite (WAL, synchronous FULL), commit local y lectura independiente: `LOCAL_DURABLE_READBACK`.
- Worker embebido limitado que realmente ejecuta `nota:`, `notas`, `estado`, `ayuda`; los demás mensajes permanecen `WAITING_WORKER` sin fingir ejecución. Modelo Ollama **opcional solo si ya está instalado**: contesta `ANSWERED_ONLY`, no opera herramientas.
- Continuidad JSON privada exportable, dedupe y conflictos; telemetría al iniciar/finalizar, sin write-on-read ni heartbeat.
- **11/11 pruebas stdlib/HTTP** PASS, **prueba de cierre/reinicio de proceso real** PASS (persisten notas y resultados, rota token local), `node --check` de JS PASS. Prueba browser Chromium bloqueada por el entorno con `ERR_BLOCKED_BY_ADMINISTRATOR`; IndexedDB no validado con browser real. La automatización local no demuestra P4 remoto, worker universal, multi-dispositivo ni seguridad multiusuario.

### Límites y ruta de integración
Esto es una prueba de un SUBSISTEMA, no una release del Prometeo canónico. El contenido privado local no debe subirse a GitHub; SQLite está en claro y escucha solo loopback. No exponer el puerto a internet. Integrar luego como **adaptador** al P4 del PR #70, sin duplicar Work Graph ni inventar otro Current. Verificar outbox en navegador real del usuario, reinicio de SQLite, capturas/contratos privados; luego conectar herramientas y worker real, RETURN/Feed, métricas reales ocultas y recuperar desde un chat nuevo. Acceso móvil/sync exige autenticación y conflictos correctamente diseñados; posponer hasta establecer recorrido local.

## Historia esencial preservada
- Work recibió ZIP original con 12 T01–T12: PR #70 candidato (7 commits, 54 tests con doubles, CI PASS) sin ACK privado ni workers E2E, aún draft.
- PR #71 comandos `🔥` y `🔥prometeo` (prepara skill plan) y `.` (ejecuta solo plan elegible de ChatGPT); el chat web definitivo **NO pide el segundo punto**. Skills en GitHub no se autoinstalan en ChatGPT.
- Supabase management ACTIVE_HEALTHY, Edge v14, SQL directo IPv6 :5432 `ECONNREFUSED`. GitHub G09 PASS histórico no significa DB recuperada. Private HOT V1 está preparado, NO desplegado, transporte temporal de 72h y no memoria personal permanente.
- UX: pantalla cotidiana limpia y personalizable, motor/nafta opcional **solo con telemetría verificada**, observabilidad detallada en su página oculta por defecto, ningún worker vivo ficticio; fotos de usuario pendientes para estética.
- Mantener privacidad, RLS, cuotas de WAL y no hacer DELETE/VACUUM/migraciones arriesgadas o nueva infraestructura paga sin revisión y autoridad.

**Próxima intervención humana mínima:** en la computadora Ubuntu, descomprimir ZIP de conversación, ejecutar `python3 app.py` y verificar un mensaje `nota:...` y recarga; este ZIP no exige GitHub/Supabase ni descargar modelos. Después, trabajo técnico: reemplazar la conexión de transporte en P4 existente por un adapter local y conectar el worker y RETURN verdaderos bajo sus owners. Sin bloquear diseño/libros/skills mientras no haya Postgres.
