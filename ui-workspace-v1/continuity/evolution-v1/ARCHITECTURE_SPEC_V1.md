# PROMETEO · EVOLUCIÓN CONTINUA / CARTUCHOS
## Especificación de arquitectura · v1 · propuesta documentada, no implementación

**Intención humana (2026-10-08).** Capturar absolutamente todas las ideas de este diálogo para que un agente nuevo, incluso con comprensión limitada, pueda mejorar la página por piezas con el menor contexto posible. No solicitar recap humano ni iniciar desde memoria conversacional. Cambios compatibles deben propagarse al conjunto de widgets; instalar/desenchufar/actualizar no debe exigir migraciones manuales. Cuando haya cambios incompatibles, compatibilidad versionada + transformaciones seguras, no promesas mágicas.

**Autoridad.** Este texto es una extensión de diseño, NO un reemplazo de `coordination/design-dna/INDEX.json`, `coordination/GLOBAL_AGENT_CONSTITUTION_V1.md`, Work Graph V1.1, Current/Catalog/Lineage, Page Change ni Worker Bus. No crea otro scheduler, Current, dealer, núcleo global o autoridad de publicación. Estado: **DESIGNED_NOT_IMPLEMENTED**. Todos los IDs EVO viven en `IDEA_INDEX_V1.json`.

### 0. Baseline / riesgo probado
- En 2026-10-08, `main:ui-workspace-v1/current.json` decía `page_version 7`; `gh-pages:ui-workspace-v1/current.json` decía `page_version 15`. No sincronizar por número ni reemplazar V15 con bytes V7. Refetch al ejecutar; esta observación se vuelve histórica.
- La V15 servida estaba compuesta por `residency-trio@1`, `art-smile@1`, `art-feast@1`. Los módulos empleaban `Prometeo.registerWidget` y una lista explícita de scripts embebida en `index.html`. El kernel manipulaba layout, DOM, timers y guardaba layout mediante clave localStorage derivada de page_version.
- `residency-trio` leía información de ramas GitHub, sin interfaz de transporte. El primer claim quedaba tratado como activo; existía estado fantasma WAITING para el tercer slot y contadores de estado incompatibles. EXP-009 RETURNS observados históricamente 100+25, tercero no adquirido. No usar UI como prueba de estado runtime actual.
- La documentación `ui-workspace-v1/continuity/persistence-v1/` rige continuidad del experimento mecánico; `evolution-v1` es un registro complementario, no lo reemplaza.
- El "laboratorio local de cartuchos" mencionado en el chat no es una fuente canónica ni prueba de publicación; cualquier archivo local debe revalidarse antes de integrarse.

### 1. Idea central: microkernel extensible
Un solo **shell universal** y un **kernel mínimo** ya propietario del layout, focus/selection, tabs, swipe, minimize/restore, fullscreen, close/unmount, above/right move, bottom-only resize, viewport y persistencia de composición. Reutilizar el owner existente, sin crear un segundo shell. "Inmutable" significa interfaz contractual estable con evolución compatible, NO archivo físicamente intocable.

Los cartuchos son **plugins/componentes** que implementan exclusivamente su dominio y declaran capacidades consumidas, contribuciones aportadas, nivel de confianza, API esperada, versión de estado y eventos tipados. Nada de módulos modificando globals/CSS/kernel o leyendo rutas arbitrarias. "Herencia" significa **composición de capacidades compartidas**, no jerarquías extensas de clases. Ej.: al mejorar `ui.layout.move@1`, todo plugin que consuma `ui.layout.move@^1` usa la mejora tras pasar contract tests.

### 2. Descubrimiento sin reescribir la página
El **compilador** descubre manifests bajo una raíz permitida al compilar, valida un registro generado y ordena dependencias. No mantener tres listas manuales `index.html` / `current.json` / JS. GitHub Pages estático no puede explorar por sí solo el filesystem del repositorio: debe generarse catálogo/manifest en CI o servirse un índice explícito. Separar dos actos:
A) **instalación / disponibilidad**: plugin válido incorporado a catálogo de candidatos;
B) **activación/promoción**: owner canónico decide qué versión se monta en la composición vigente. Que un archivo aparezca no autoriza ejecutarlo como código ni lo convierte en CURRENT. El registro no es una autoridad paralela.

Modelo sugerido de `plugin.manifest.json` (contrato, NO ABI aprobada):
~~~json
{
  "schema":"prometeo.widget-cartridge/v1",
  "id":"residency-trio",
  "version":"1.1.0",
  "widgetApi":"^1.0.0",
  "entry":"./module.js",
  "contributes":{"panels":["residency-trio"]},
  "requires":{"services":{"ui.layout":"^1","data.read":"^1"},"plugins":[]},
  "permissions":{"network":["approved-github-read-projection"],"storage":["widget:residency-trio"]},
  "state":{"schema":"state.schema.json","currentVersion":1,"readableVersions":[1]},
  "lifecycle":["mount","update","suspend","unmount","dispose"],
  "continuity":{"context":"CONTEXT.md","history":"messages/","references":"references/","takeover":"CONTINUITY_PROMPT.txt"},
  "checks":["contract","isolation","state-compat","served-smoke"]
}
~~~
Schema real debe definirse con JSON Schema y contratos de validación, no adoptar este ejemplo ciegamente.

### 3. Límites de aislamiento
- Un widget local/fiable puede usar **Web Components + Shadow DOM** para encapsular CSS/DOM; Shadow DOM **no es un límite de seguridad**. Si el módulo ejecuta JS arbitrario en la misma ventana, puede tocar el resto de la página.
- Código externo o de menor confianza: **sandboxed iframe** con origin/capabilities restringidos y mensajes tipados via MessageChannel/postMessage con allowlist estricta, CSP y validación de esquema/origen. Permisos de escritura nunca se deducen del manifest autodeclarado: owner/host los otorga por intersección explícita.
- No usar iframes para todo por dogma: benchmark memoria, render y accesibilidad antes de imponer aislamiento pesado a módulos visuales propios.
- No exponer credenciales ni claves privilegiadas en GitHub Pages; el conector/backend privado guarda secretos.

### 4. Puertos y adaptadores
Definir interfaces de servicios compartidas: `StorageAdapter.read/write/list`, `EventPort.publish/subscribe`, `PageState.read/patch`, `EvidencePort.query`, `NavigationPort.go`, `PermissionsPort.require` y `PluginRegistry.resolve`, siempre bajo contrato/versionado. **Solo adaptadores del owner correcto** conocen GitHub, Drive, backend privado o dispositivo local. La UI no importa rutas crudas de branches como autoridad y no puede reclamar/ejecutar work por emitir un evento. Event Bus ≠ scheduler.

### 5. Estado durable y convivencia de versiones
Identidades estables para page, widget, instance, widget state, thread y asset; nunca anclar la identidad durable exclusivamente a `page_version` o a nombre de archivo HTML. Preservar estado de layout, datos, mensajes, referencias, historial append-only y evidence receipts por namespace. Desenchufar significa **unmount**, nunca DELETE.

**Schema evolution**: lectores pueden normalizar versiones legadas en lectura (read adapters) y escritores emiten formato vigente cuando existe compatibilidad garantizada. Mantener originales recuperables y testear idempotencia. Versionar wire/storage formats. **Branch by Abstraction** mantiene camino legado y nuevo detrás de una sola API. Compatibilidad no es automática para cambios que pierden información: si hace falta un upgrade duradero, usar rutina versionada, backup/rollback, lock y pruebas; jamás transformar silenciosamente irreversiblemente.

Offline/local-first: cache confiable con fuente, timestamp, vigencia y reconciliación CAS/ETag/generation cuando aplique. Separar lectura pública de escritura privada. Evitar sondeos brutales, growth de WAL, dependencia de Supabase para completitud y "live" inventado.

### 6. Ciclo de vida y errores
`discover -> validate -> resolve -> load -> mount -> update -> suspend -> unmount -> dispose`. Cada plugin posee AbortController/subs/timers/DOM y debe liberar recursos en dispose. Errores se aislan al límite de plugin y muestran estado honesto; no se cae la página entera. Deshabilitar plugin preserva estado/lineage. Reiniciar sin duplicar listeners. Dependencias versionadas; resolver ciclos/ausencias antes de mount.

### 7. Chat y agentes por widget
Cada plugin lleva `CONTEXT.md`, `CONTINUITY_PROMPT.txt`, `READINESS_EXAM.json`, versiones, historia, referencias y receipts de trabajo. No confundir "tiene prompt para retomar" con "tiene chat autónomo funcionando". Chats son shells descartables; la intención/historial están en owner durable ya existente. Un agente fresco recibe **solo el contrato del widget y la TASK permitida**; el kernel le entrega interfaces tipadas. Readiness FAIL si no puede determinar baseline, owner, write_scope, tests o autoridad. Salida candidate + test + RETURN + history append-only; promoción sólo por integrador/verificador permitido, nunca por el productor.

### 8. Evolución y release
Secuencia canónica: `DELTA -> preservation contract -> candidate -> static checks -> contract tests -> regression -> browser/mobile -> independent verification -> authorized promotion -> served-byte smoke -> receipt -> lineage update`.
- Cambios de capacidad compartida: tests de consumidores existentes + semver compatibility + smoke de la UI anterior; downgrade siempre previsto.
- Cambios plugin-local: permiten despliegue aislado con minimización de blast radius.
- Cada preview debe llevar asset closure (video/fuentes/imagenes/manifest), no HTML suelto con rutas relativas rotas.
- Hacer explícito el status implementado/tested/verified/promoted/served, con hashes y hora de evidencia.
- La adopción automática se limita a cambios **compatibles y aceptados**. Nunca "autoupdate de código candidato" de forma pública sin gates.

### 9. Invariantes visuales que heredar
Preservar negro/papel, topbar compacta, tiling y gaps, menu solo al seleccionar, pagers/swipe header, minimizar, fullscreen, edit, ABOVE/RIGHT (RIGHT sigue RIGHT en móvil), resize vertical desde abajo, viewport sin overflow lateral, favoritos/notas/grabación a través de un solo shell. Tests en móvil y desktop; ningún plugin redefine selectores globales del kernel.

### 10. Observabilidad honesta
`RETURN durable > claim/lease > state/UI` para la campaña EXP-009. Labels `NO_ADQUIRIDO`, `STALE`, `INTERRUPCIÓN` no se sustituyen por `WAITING` o destellos verdes. first_claim histórico no es heartbeat. Refresh rate es de lectura/proyección y puede tener retraso. Contar RETURNS desde evidencias durables y nunca desde campos asumidos. Separar fuente/event_time/observed_at/canonicality. La TV/página no modifica autoridad del dealer/work graph.

### 11. Restricciones antirrueda
Patrones ya estudiados: Microkernel, Plugin Architecture, Component-Based Architecture, Extension Points/Service Registry, Ports & Adapters/Hexagonal, Evolutionary Architecture/Fitness Functions, Backward Compatibility/Schema Evolution, Capability Security, Contract Testing, Micro Frontends, Event Logs (sin asumir full Event Sourcing), Branch by Abstraction, Web Components, sandbox iframe. Referencias conceptuales: *Building Evolutionary Architectures* (Ford et al.), *Pattern-Oriented Software Architecture Vol 1* (Buschmann et al.), *Micro Frontends in Action* (Geers), *Designing Data-Intensive Applications* (Kleppmann/Riccomini), modelo de extensiones de VS Code y OSGi (solo inspiración, no portarlo entero).

### 12. Objetivo de aceptación global
Agente totalmente nuevo recibe un único widget/Task; sin preguntar ni leer todo Prometeo: resuelve dependencias, agrega o mejora cartucho, prueba scope, da RETURN, no toca kernel, deja continuidad; el sistema lo descubre, verifica, integra cuando corresponde y sirve con evidencia, preservando baseline. Adopción de mejoras compatibles **sin traslado manual ni migración masiva**. Borrar/disconnect/reinstall/rollback no borra datos ni historia. Deshabilitar todos los cartuchos no rompe el shell. Comparar siempre con V15 legada real antes de declarar éxito.

La cantidad de ideas, sus IDs y verificaciones están en `IDEA_INDEX_V1.json`. El plan ejecutable está en `EXECUTION_PLAYBOOK_V1.md`.
