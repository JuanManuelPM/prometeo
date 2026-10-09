# PROMETEO · PLAN EJECUTABLE SIN ITERACIONES HUMANAS
## Evolución Continua / Cartuchos · runbook para agentes nuevos · v1

**Estado: PLAN_DOCUMENTADO_NO_EJECUTADO.** Es una secuencia de trabajo verificable, no un reporte de código desplegado. Este archivo no crea una cola, scheduler, RUN ni CURRENT alternativos. Consumir mediante Work Graph/Work Packet/Worker Bus/Guide existentes. No ejecutar toda la lista desde un chat sin autoridad o permisos: cada paso corresponde a un delta acotado y a su dueño.

## Principios operativos innegociables
1. Empezar con `ui-workspace-v1/continuity/evolution-v1/IDEA_INDEX_V1.json`, este runbook y `ARCHITECTURE_SPEC_V1.md`. Luego cargar solo los owners y archivos exactos del paso elegido, Design DNA y contratos obligatorios. NO recorrer todo Prometeo por curiosidad.
2. Refetch estado canónico, versión servida y EPOCH. La antigua divergencia `main V7` / `gh-pages V15` es evidencia histórica, no permiso para sincronizar. 
3. Cada modificación: `base/ref + preservation contract + write_scope + do_not_touch + tests + expected_receipt + rollback`. No editar fuera de alcance.
4. Estado de una fase: `PLANNED -> CLAIMED -> CANDIDATE -> TESTED -> INDEPENDENT_VERIFIED -> PROMOTED -> SERVED`; cuando falten pruebas dejar `UNVERIFIED` y un residual causal concreto. No autoproclamarse PASS.
5. Cada cambio debe dejar documentación de continuidad que otro agente pueda leer sin chat ni humano. Los resultados parciales son útiles si su status es explícito.
6. Reutilizar `coordination/workers/CURRENT_WORKER_REUSE_CONTRACT_V1.json`. No crear otra fila de dealer, RUN, router, polling permanente ni guía por cada cartucho.
7. Registro de cartuchos y build son **proyecciones/artefactos derivados**, no fuentes de autoridad. Canonical Current y métodos de promoción siguen donde ya pertenecen.

## Modelo de paso ejecutable
**Input:** `step_id`, referencias CURRENT validadas, target exacto, scope, modelo de referencia. **Salida:** candidate pequeño, diff, tests/resultados y RETURN durable. **Gate:** verificador independiente decide y owner promovente integra. **Ante error:** persistir causa y replay seguro; el próximo agente retoma sin extrapolar estado. **Plan de rollback:** volver al último ref aceptado sin perder estado/datos.

## Dependencias
- P00–P03 son prerequisitos de cualquier cambio material.
- P04–P14 construyen infraestructura aislada; P15–P16 prueban primera integración sin quemar legado.
- P17–P19 atacan el widget/problemática real una vez que el puente funciona.
- P20–P30 son pruebas de autonomía, compatibilidad y mantenimiento, ejecutables en paralelo cuando scopes son disjuntos.
- P31 requiere evidencia positiva y autoridad de promoción. P32/P33 corren al final de CADA paso/material return, no sólo al concluir la campaña.

## Work graph paso por paso
### P00 · Recuperación de autoridad sin arqueología
- Acción mecánica: Refs: AGENTS.md, Constitution, DNA index/stack, EPOCH, CURRENT owners, Work Graph; confirmar estado served y permisos. Refetch main/gh-pages.
- Entregable/evidencia: Receipt de HEAD/epoch, owners, evidencia, write_scope; si falta -> BLOCKED_AUTHORITY
- Gate de aceptación: No escribir código ni Current sin owner/lease autorizado.

### P01 · Congelar baseline verificable
- Acción mecánica: Capturar hashes/composición de V15, V7, UI HTML/JS/CSS/assets, snapshots visuales desktop/móvil y lista de funciones; usar publicación exacta.
- Entregable/evidencia: BASELINE_CAPABILITIES + ASSET_CLOSURE + baseline test receipt
- Gate de aceptación: Control comparable preservado sin tocarlo.

### P02 · Inventario mínimo de contratos
- Acción mecánica: Inspeccionar sólo kernel/UI rules, widget API, continuidad, persistencia y módulos CURRENT; detectar configuración duplicada.
- Entregable/evidencia: SURFACE_MAP dueño/rutas/estados/dependencias y anti-pattern list
- Gate de aceptación: Demuestra ausencia de owner alternativo.

### P03 · Preservation Contract
- Acción mecánica: Instanciar plantilla Design DNA con touched DNA/FV/Goldens; delta, métricas, prohibiciones, rollback y candidates.
- Entregable/evidencia: PRESERVATION_CONTRACT candidato validado
- Gate de aceptación: No se promueve sin aceptación por owner correcto.

### P04 · Definir kernel ABI mínimo
- Acción mecánica: Conservar shell y layout actuales como port; especificar lifecycle, slots, capabilities y errores.
- Entregable/evidencia: ABI v1 candidate + compile-time validation
- Gate de aceptación: Tests de invariantes globales; sin nueva shell.

### P05 · Definir manifest JSON Schema
- Acción mecánica: Especificar id/version/compat/deps/contributes/capabilities/state/continuity/assets/tests; validación offline.
- Entregable/evidencia: Plugin schema, fixtures aceptados/rechazados
- Gate de aceptación: No permite ejecutar código por solo aparecer en carpeta.

### P06 · Generar registry en build
- Acción mecánica: Script inspecciona manifests allowlisted, ordena dependencias y publica catálogo reproducible; código fuente de UI no lista widgets a mano.
- Entregable/evidencia: Registry derivado + lockfile/hash + test add/remove
- Gate de aceptación: Mismo input mismo output; ciclos/duplicados fallan.

### P07 · Resolver compatibilidad y permisos
- Acción mecánica: Capability negotiation con versiones y permisos aprobados por host; reject incompatible.
- Entregable/evidencia: Compatibility resolver + negative permission tests
- Gate de aceptación: No auto-escalación vía manifest.

### P08 · Runtime plugin lifecycle
- Acción mecánica: Conectar load/mount/update/unmount/dispose a owner shell existente, con abort y error boundary.
- Entregable/evidencia: Lifecycle harness y leak tests
- Gate de aceptación: Instalar/retirar/repetir no duplica listeners.

### P09 · Aislar DOM y CSS
- Acción mecánica: Default encapsulación Web Component/Shadow DOM para first-party; sandbox iframe aislado para third-party donde haga falta.
- Entregable/evidencia: Visual isolation suite desktop/móvil
- Gate de aceptación: Mutar CSS de plugin A no cambia B; no iframe=seguridad falsa.

### P10 · Extraer capacidades compartidas
- Acción mecánica: Mover navegación, layout, persistencia y menús de alcance universal al kernel sin doble implementación.
- Entregable/evidencia: Capability adapters con consumo por interfaz
- Gate de aceptación: Mover/resize/pager intactos en todas las versiones.

### P11 · Ports & Adapters
- Acción mecánica: Introducir adaptadores de lectura/almacenamiento/eventos existentes; prohibir referencias directas a GitHub/Drive en UI.
- Entregable/evidencia: Port contracts + mock adapters; no nuevo backend dueño
- Gate de aceptación: Cambio de proveedor en test sin editar widget.

### P12 · Identidad/estado por namespace
- Acción mecánica: Separar widget data/layout/continuity/assets de page_version, preservar closed widgets.
- Entregable/evidencia: State key registry and versioned schema
- Gate de aceptación: Cambiar page version no resetea usuario.

### P13 · Compatibilidad en lectura
- Acción mecánica: Adaptadores a esquemas antiguos, fixtures con todos los formatos conocidos, idempotencia; backup para cambios perdedores.
- Entregable/evidencia: Read-adapter tests + upgrade/downgrade receipts
- Gate de aceptación: No transformaciones destructivas implícitas.

### P14 · Puente legado
- Acción mecánica: Cargar v7/v15 existentes mediante adapter bajo interfaz nueva; conservar módulos/estilos y continuidad.
- Entregable/evidencia: Legacy adapter candidate y equivalence map por widget
- Gate de aceptación: V15 baseline misma funcionalidad, no sync main V7 a gh-pages V15.

### P15 · Primer canario simple
- Acción mecánica: Elegir un widget visual de baja dependencia; empaquetar manifest+state+tests+continuity sin alterar kernel global.
- Entregable/evidencia: Candidato simple instalado/retirado/reinstalado
- Gate de aceptación: No pérdida de assets/layout/otros módulos.

### P16 · Promoción de canario
- Acción mecánica: Test de comportamiento servido y receipts; usar integrador existente para adopción, no worker externo autopromotor.
- Entregable/evidencia: Verified candidate + owner promotion receipt cuando autorizado
- Gate de aceptación: Rollback a baseline probado.

### P17 · Cartucho EXP-009
- Acción mecánica: Reparar lectura de campos top-level y clasificación del tercer slot; usar evidencia GitHub durable y timestamps; sin inventar liveness.
- Entregable/evidencia: EXP-009 adapter/renderer/test fixtures
- Gate de aceptación: 125 RETURNS observados históricamente, W003 no adquirido; Live no promueve estados.

### P18 · Compatibilidad con experimentos históricos
- Acción mecánica: Distinguir EXP-004/006/009, no reinterpretar manifest CURRENT_RUN antiguo como run más reciente.
- Entregable/evidencia: Run discovery semantics + stale warning
- Gate de aceptación: Nada de métricas falsas por pin de versión.

### P19 · Continuidad/threads por cartucho
- Acción mecánica: Registrar contexto, historial append-only, referencias, readiness, last verified state, next job. Reusar P4/Page Change y Work Graph.
- Entregable/evidencia: Fresh agent test con sólo takeover+exact scope
- Gate de aceptación: Sin petición de resumen humano ni chat falso.

### P20 · Extensibilidad real
- Acción mecánica: Probar agregar plugin externo CANDIDATE sin editar índice HTML ni kernel; comprobar catálogo generado y aislamiento.
- Entregable/evidencia: Plug/unplug self-discovery E2E
- Gate de aceptación: Sólo plugin aprobado entra CURRENT.

### P21 · Contratos de seguridad
- Acción mecánica: CSP/sandbox origin, message schema, capability ACL, no secrets frontend, pruebas de inyección y scope.
- Entregable/evidencia: Security test suite/receipt
- Gate de aceptación: Malicia/falla local no cruza frontera.

### P22 · Contratos de release automático
- Acción mecánica: Build-test-verify-promote gates reutilizando workflow actual; no workflow/public publisher paralelo. Inmutabilidad de release + rollback.
- Entregable/evidencia: CI stage receipt source->served
- Gate de aceptación: Un source commit no basta para SERVED.

### P23 · Tests de fitness arquitectónicos
- Acción mecánica: Agregar reglas automáticas anti-global CSS, imports remotos, writes fuera de scope, timers sin cleanup, config duplicada, state keyed por page_version.
- Entregable/evidencia: Fitness harness con fallas inyectadas
- Gate de aceptación: Regresiones bloqueadas mecánicamente, no checklist humana.

### P24 · Regresión navegador/viewport
- Acción mecánica: Probar móvil, angosto, offline, restore, drag RIGHT/ABOVE, resize bottom, swipe, menu, iframe host y assets.
- Entregable/evidencia: Browser video/screenshot/log receipts, sin simular como probado
- Gate de aceptación: Baseline + candidate comparados sobre bytes publicados.

### P25 · Independencia del backend/control
- Acción mecánica: Desactivar TV/monitoreo: el sistema debe seguir trabajando; simular pérdida de fuente de datos.
- Entregable/evidencia: Degradation + no-fake-liveness tests
- Gate de aceptación: Visual no altera task scheduling.

### P26 · Concurrencia/versions/rollback
- Acción mecánica: Dos agentes tocan plugins distintos; otro compite mismo plugin. Test CAS, branch isolation, base hash, release rollback sin borrar estado.
- Entregable/evidencia: Concurrent mutation receipts
- Gate de aceptación: Una escritura conflictiva no pisa a otra.

### P27 · Frescura/observabilidad
- Acción mecánica: Eventos con fuente, tiempo de evidencia, last seen, stale y verificación. Límite de polling, recuperación de cache.
- Entregable/evidencia: Projection tests y timestamps verificables
- Gate de aceptación: No GREEN/LIVE si sólo hay claim antiguo.

### P28 · Prueba de cero migración manual
- Acción mecánica: En un entorno limpio importar composición legacy, actualizar capacidad, añadir/retirar/reponer plugin y cambiar storage adapter sin ejecutar script de mudanza manual.
- Entregable/evidencia: NO_MANUAL_MIGRATION_CANARY con pasos, bytes y fallos
- Gate de aceptación: Si hubo upgrade real se documenta automatismo y límites.

### P29 · Prueba fresh agent
- Acción mecánica: Agente sin chat previo toma sólo alcance exacto desde índice, implementa modificación, emite RETURN; Guide integra con autoridad existente.
- Entregable/evidencia: Fresh agent/readiness receipt
- Gate de aceptación: Sin arqueología masiva, chat anterior ni mensajes del humano.

### P30 · Prueba de capacidad heredable
- Acción mecánica: Cambiar una capacidad kernel-compatible una vez; verificar todos los consumidores compatibles y los incompatibles rechazados.
- Entregable/evidencia: Inherited change matrix y rollback
- Gate de aceptación: No modificar archivos fuente de widgets consumidores.

### P31 · Promoción global gradual
- Acción mecánica: Solo tras P00-P30 PASS, promover composición compatible mediante Current owner y verificar bytes servidos; retener baseline golden.
- Entregable/evidencia: Independent verify + Current/Served receipts
- Gate de aceptación: No se elimina legado hasta equivalencia reproducida.

### P32 · Actualizar memoria durable
- Acción mecánica: Después de cada avance registrar lessons, negativas, evidence, scopes, archivos, next exact; actualizar este índice sin convertirlo en nueva verdad.
- Entregable/evidencia: Handoff reutilizable y Casebook/Design DNA si cambió regla validada
- Gate de aceptación: Un agente nuevo sabe primer gate incompleto.

### P33 · Cierre de ciclo, sin humano como bus
- Acción mecánica: RETURN->existing verifier/integrator->Next útil; solo gate humano para taste, autorización irreversible o seguridad. Declarar condición exacta si bloqueado.
- Entregable/evidencia: End-to-end autonomous execution evidence
- Gate de aceptación: No prometer conversaciones infinitas ni browser wake inexistente.

## Contrato de reversión, fallas y conflictos
- Si no hay permiso o Current legible, `BOUNDARY_NO_AUTHORITY`. No asumir escritura.
- Si colisiona con trabajo activo en mismos archivos, `HARD_WRITE_COLLISION`; rebase/reconciliar o acotar scope antes de editar. Histórico ≠ bloqueo permanente.
- Si falla solo UI/proyección, no tocar claims/worker allocation; reparar consumo/caché.
- Si el navegador no se puede ejecutar, dejar browser suite `UNVERIFIED`; no convertir tests sintácticos en éxito visual.
- Si publish falla, mantener candidato y served anterior; no decir que se publicó.
- Si datos no son compatibles, sostener read adapter legado. No destruir/reescribir archivos originales en automático.
- Si un chat se interrumpe, la fase y el retorno durable sobreviven; no esperar reanudación "mágica".
- Si una fase introduce complejidad adicional injustificada, comparar primero con eliminar/fusionar pasos existentes.

## Casos de aceptación end-to-end obligatorios
A. `ADD`: un nuevo manifest validado aparece en catálogo derivado sin editar index.html.
B. `REMOVE`: desenchufar cartucho no elimina datos/continuidad, no deja listeners, no cambia otros.
C. `REINSTALL`: restaurar cartucho devuelve datos intactos y layout previo.
D. `INHERIT`: cambiar capacidad compartida compatible actualiza consumidores sin tocar cada widget.
E. `LEGACY`: composición V15 y V7 antigua siguen accesibles, sin promoción automática por número.
F. `BREAKING`: schema incompatible genera error controlado/read adapter o upgrade reversible y probado.
G. `FRESH`: agente nuevo ejecuta un cambio en un solo widget sin conocer chat viejo.
H. `TRUTH`: EXP-009 W001 100/W002 25/tercero no adquirido en evidencia de referencia; ninguna señal LIVE sin actividad fresca.
I. `MOBILE`: RIGHT sigue derecha, swipe sigue funcionando, sin overflow horizontal.
J. `PRIVACY`: manifiesto público no expone secretos, chat privado ni credenciales.
K. `ROLLBACK`: último accepted/served restaurable con identidades y datos intactos.
L. `NO_HUMAN_BUS`: usuario no pega textos, no enruta workers y no aprueba cambios puramente mecánicos.

## Mapa de posibles dueños (resolver contra CURRENT en ejecución, no asumir)
- Kernel/Layout: el owner existente de `ui-workspace-v1` y shell universal, nunca otro top-level.
- Capabilities/transport: adapters que envuelven owners reales; no nueva autoridad de datos.
- Widget: namespace `widgets/<id>/**` con contrato/Readiness y per-task scope.
- Observabilidad: proyección derivada de evidencia/RETURN, sin cambiar allocator.
- Promotion: verifier/integrator/Current owner actuales.
- Durable work: Global Work Graph V1.1/Worker Bus V2 y contratos existentes.

## Plantilla de ticket para consumidor autónomo
~~~yaml
step_id: Pxx
objective: "Una mejora material específica"
base_head: "READ_FRESH"
target_owner: "RESOLVE_FROM_CANON"
read_scope: ["rutas exactas"]
write_scope: ["solo un plugin/capability/test"]
do_not_touch: ["gh-pages actual", "Current sin autorización", "otros plugins", "claims"]
must_preserve: ["baseline UI/estado/continuidad"]
tests: ["unit", "contract", "browser", "served si aplica"]
return: ["artifact", "diff", "test_receipt", "lineage", "exact_next"]
status: "CANDIDATE_UNTIL_INDEPENDENT_VERIFY"
~~~

## Próxima acción concreta
Primera tarea material: **P00, P01, P02 y P03** usando el mecanismo de asignación existente y baselines frescos. NO codificar un nuevo kernel sin contratos/candidatos verificados. Sólo después crear P04+ bajo owner autorizado. 
**Regla final:** una IA nueva debe leer el índice, saber qué está diseñado, qué es verdad del estado actual y cuál es el primer gate no verificado; nunca repetir la historia del chat ni inventar que los pasos ya se ejecutaron.

## Prioridad 2026-10-08: ONE TURN
Usuario quiere una sola entrada por chat, estado durable en la página, y skills para futuras modificaciones. Nuevas referencias: `coordination/one-turn/v1/ONE_TURN_CONTRACT_V1.json`, `coordination/one-turn/v1/EXECUTION_SPEC_V1.md`, `.agents/skills/prometeo-one-turn/SKILL.md`. **Fuente documentada, integración del runtime pendiente**. Reutilizar P4 Capture, Page Change, Context Foundry, Work Graph y Current. No copiar contenido privado a GitHub.
