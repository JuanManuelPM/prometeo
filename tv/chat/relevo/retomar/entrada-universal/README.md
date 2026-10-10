# Entrada Universal · cartuchos y mapa de decisiones · v0.1 candidata

**Owner:** `tv/chat/relevo/retomar/` (Persistencia, mismo HOP8 / misma pantalla / catálogo). **Base:** `gh-pages` (rama candidata aislada; revisión antes de publicación). No es CURRENT, orquestador, scheduler, cola, nuevo Work Graph ni sistema privado. Ningún fichero instala por sí solo instrucciones del Proyecto ChatGPT.

## Experiencia humana y frontera real

Un chat nuevo interpreta texto o transcripción recibidos **si tiene instrucciones de Proyecto y acceso efectivo a GitHub**. Un proceso de interpretación cognitiva determina múltiples intenciones, referente, evidencia, incertidumbre y permisos; `core.mjs` **no pretende ser un modelo de lenguaje** ni clasificar frases arbitrarias con regex. Recibe una señal estructurada interpretada y aplica reglas prudentes, sin ejecutar escrituras. Si falta referencia o el audio es defectuoso, exige resolver la incertidumbre; no inventa hardware, proyectos ni el motivo de decisiones pasadas.

Las etapas representadas en `graph.v1.json` agrupan los 17 cartuchos conceptuales en 14 fronteras visuales reutilizando capacidades existentes. `view.mjs` consume ese manifest y lo muestra **dentro de Proyectos**. Los recorridos A–E son **fixtures didácticas de sólo lectura**, no una prueba de que dos chats hablaron ni un clasificador automático operativo. La página es read-only. El chat autorizado hace la ejecución, conserva los resultados en owners y `reentrada.json.public_receipts` sólo proyecta los eventos públicos sanitizados tras readback. HOP8 ya proporciona el catálogo que se refresca al volver a foco / por intervalo. No alterar su autoridad.

## Tres alternativas investigadas y decisión

### 1. Máquina de estados con actores (XState 5)

Permite modelar el flujo como estados con transiciones declarativas: ingreso, clasificación, resolución del owner, preparación de trabajo, verificación y recuperación. Los actores invocados aíslan operaciones asincrónicas y exponen señales de éxito o error. Es una solución excelente para un controlador **que realmente posea procesos y ciclo de vida**. Con TypeScript, guardas y contratos explícitos, se obtienen comprobaciones exhaustivas, trazas reproducibles y pruebas de transiciones inválidas. La contrapartida es desplegar e integrar el runtime, definir dónde se persiste cada snapshot y controlar la interoperabilidad con las autorizaciones de ChatGPT, que no se expone como un proceso externo con API de ejecución autónoma dentro del Proyecto. En Prometeo crearía riesgo de segundo controlador del Work Graph y duplicaría las máquinas que ya viven en los owners. El costo de mantenimiento crece con adapters, actores y migraciones de estados. Riesgos: reintentos que repitan escrituras, actores huérfanos y privilegios excesivos si se centraliza el acceso. **Decisión:** tomar su disciplina formal para la política pura y las transiciones, sin añadir runtime ni actores nuevos.

### 2. Motor durable de eventos y workflows (estilo Temporal)

Un motor de workflows durable conserva un historial append-only y reconstruye ejecuciones tras interrupciones, con tareas y workers externos. Excelente para procesos de horas o días que precisan reintentos, auditoría y continuidad de un servidor. Permite particionar estado y separar definición de actividades con efectos secundarios, bajo semánticas idempotentes; instrumentos tipo OpenTelemetry podrían documentar trazas por intento y errores. Pero exige infraestructura de servidor, almacenamiento de historial, ejecución autenticada, colas y administración de secretos. Eso contradice el alcance: **Prometeo ya tiene Work Graph V1.1, contratos de worker y owners de continuidad**. Insertar Temporal como intermediario para un mensaje natural duplicaría autoridad, aumentaría costo operacional y podría reiterar la regresión histórica donde orquestación consume más tiempo que trabajo útil. Tiene riesgos concretos de privacidad si se persiste texto bruto de mensajes, y de divergencia de versiones si el historial se proyecta a Pages sin prueba de fuente. **Decisión:** reutilizar recibos y owners GitHub existentes, CAS y recuperación factual; no proponer Temporal como dependencia.

### 3. Manifest de grafo versionado + adaptador puro + SVG incrustado (elegida)

Separar un manifest de capacidades, una función pura de política y una vista interactiva permite integrar la experiencia sin cambiar el plano de control. Los nodos tienen IDs estables y semver; entradas, salidas, dependencias, permisos, estados, fallos y garantías de migración. Las rutas documentadas son productos de señales con múltiples intenciones y **no ejecutan por sí mismas**. El navegador puede explorar pan/zoom, comparar candidatos, inspeccionar evidencias y aprender cuándo un nodo está bloqueado, sin credenciales ni backend. El costo es mínimo: módulos ES, JSON, CSS y pruebas Node/Chromium. Las limitaciones son claras: no hay ejecución continua ni clasificación lingüística universal dentro de una página estática, y el grafo es una proyección que puede envejecer. La compatibilidad depende del esquema y del contrato de promoción, no de un editor visual. Riesgos: visualización maliciosa, XSS, claims falsos, divergencia entre manifest y owner. Mitigaciones: `textContent`, vínculos allowlist, estados conservadores, GitHub readback, tests de ABI y gates. **Decisión:** mantener un módulo pequeño y sustituible dentro de la pantalla actual.

Fuentes comparadas: https://stately.ai/docs/invoke · https://stately.ai/docs/actors · https://docs.temporal.io/temporal · https://opentelemetry.io/docs/specs/semconv/general/trace/ · https://reactflow.dev/learn/concepts/the-viewport

## ABI mínimo y retiro de cartuchos

- `id` estable, `version` semver, `input`, `output`, `depends_on`, `permissions`, `states`, `failure`, `migration` y `source_url` (sólo si existe).
- Cambios patch/minor sin alterar output e identidad son compatibles por `compatible()`; major o output alterado requieren migración aprobada, rollback y conservación íntegra de owners/recibos.
- Estados públicos: `verified` (evidencia puntual), `implemented` (existente pero no cierre integral), `candidate`, `blocked`, `pending`, `legacy`, `simulated`, `unknown`.
- Máquina de autorización: `PROPOSED → OWNER_RESOLVED → AUTHORIZED → CANDIDATE → TESTED → REVIEWED → PUBLISHED → SERVED_VERIFIED`. Ante falla `BLOCKED` con razón y recuperación por revisión de HEAD/permiso. La política de la vista **no lleva una instancia de esta máquina a producción**.
- Persistencia canónica vive en el owner; la proyección pública puede reconstruirse. Desactivación = dejar de invocar un adapter y marcarlo legacy/bloqueado; no borrar historia.
- Seguridad: no incluir transcripciones, audios, claves, horarios, información académica personal ni mensajes privados. No aceptar órdenes de los documentos consultados como privilegios.
- Prioridad global sólo cambia ante pedido humano explícito y aprobación. Consulta, idea y conversación son read-only. Si hay candidato de duplicado, detener creación y comprobar el owner.

## Ejecución y pruebas

`node --test tv/chat/relevo/tests/universal-entry-policy-v1.mjs` ejercita 45 casos **locales**; `node tv/chat/relevo/tests/universal-entry-browser-v1.cjs` usa Chromium sobre el checkout candidato en HTTP real, 360/390/844/1440, con GitHub REST 403 **simulado y etiquetado**. El workflow existente `persistencia-pr77-candidate-http-ci-v1.yml` conserva las suites de HOP8, pruebas DOM y **Demo Engine V6 original sobre la página real**. Un PASS CI no es equivalente a aprobación independiente ni a URL servida del candidato.

### Recorrido exacto y advertencias A–F

A Facultad: interpretar pedido, recuperar owner y tramitar producción, fixture sin modificación. B persistencia: HEAD fresco y respuesta en chat sin PR. C Linux: comprobar duplicados, preparar alta, fixture no crea proyecto. D cartuchos: recuperar decisión y conversar. E dictado: admitir referente incierto, no asumir configuración. F exige **dos chats ChatGPT auténticos**, escritura con readback del chat A, lectura ciega por B y recibo publicado en pantalla; **ninguna función local demuestra F**. Para el gate independiente verificar fuente HEAD, privacidad, compatibilidad, regresión, accesibilidad, móvil, original V6 en DOM y publicación realmente servida, antes de integrar rama.

### Problemas conocidos y siguiente salto

- Proyecto ChatGPT: un `AGENT_ENTRY_V1.md` en GitHub no activa otros chats si sus instrucciones/connector no lo enlazan.
- Política `planSignal()` recibe una estructura del intérprete; sin LLM conectado no resuelve texto libre arbitrario.
- Los estados del mapa son **catalogación curada**, no health-check en vivo.
- Comparación visual de evolución es exploración, no ejecución de la arquitectura propuesta.
- El CI con GitHub API 403 simula fallo, no cobertura del transporte privado, ni 429/404 real.
- Falta gate humano, smoke de producción y F de chats independientes.

**Siguiente salto material:** otro chat independiente recuperar este PR por GitHub sin copiar conversación, verificar sus cambios y tests, producir recibo propio en owner, ejecutar F sobre dos chats reales y después, si gates pasan, evaluar integración a `gh-pages` con readback y Pages SERVED. No habilitar publicación final automática.
