# CHAT-001 · 2026-10-06 · Continuidad completa Prometeo UI / Workers / Broker

## 0. Propósito

Este archivo conserva el contexto operativo de la conversación que consolidó la nueva arquitectura de Prometeo UI. Está hecho para que otro chat pueda continuar sin reconstruir decisiones desde memoria, sin recorrer todo el repositorio por curiosidad y sin repetir errores ya observados.

No es una nueva autoridad paralela. `CURRENT/CURRENT.json` define la composición CURRENT de esta workspace. Este documento explica por qué existe esa composición, qué contratos gobiernan el trabajo y qué falta demostrar.

## 1. Objetivo humano

La UI debe convertirse en una página online durable, modificable y modular. El usuario quiere poder abrirla desde el teléfono, crear widgets, moverlos, versionarlos, trabajar con muchos chats/workers en paralelo y recuperar continuidad sin depender de un único chat gigantesco.

La ambición de largo plazo es que:
- los widgets sean módulos versionados e independientes;
- distintos workers puedan editar módulos disjuntos sin pisarse;
- cada widget tenga historia, notas, referencias y versiones;
- la página global sea una composición de versiones de módulos;
- los workers sean fungibles y la especialización viva en el contrato de la TASK/WorkBlock;
- el sistema mida trabajo integrado, no cantidad de chats lanzados;
- la infraestructura pueda cambiar de almacenamiento sin reescribir Prometeo.

## 2. Base visual actual

La base visual se consolidó en `PROMETEO_MINIMAL_WIDGETS_V8_VIEWPORT_SAFE.html` y luego se modularizó como workspace V1.

Reglas CURRENT:
- fondo negro;
- widgets/paneles claros tipo papel;
- topbar compacta flotante;
- menú hamburguesa real;
- layout tipo tiling, no floating dashboard;
- separación visible entre widgets;
- title tab negro arriba a la izquierda;
- menú del widget visible sólo cuando está seleccionado;
- páginas internas mediante dots y swipe horizontal del header;
- minimizar, fullscreen, editar y cerrar son funciones universales del kernel;
- editar habilita movimiento y resize vertical;
- movimiento permitido ABOVE/RIGHT;
- resize sólo desde abajo;
- RIGHT/LEFT explícito debe seguir horizontal aun en ancho móvil;
- responsive modifica el contenido interno, no reinterpreta la estructura;
- ningún widget lateral debe ensanchar el viewport;
- widget minimizado no muestra pagers; abrir menú desde minimizado primero restaura.

## 3. Arquitectura modular acordada

La workspace separa:

`KERNEL/`
Funciones universales y shell.

`WIDGETS/<id>/versions/vN/`
Implementación versionada del widget.

`WIDGETS/<id>/messages/`
Historia/notas durables del widget.

`WIDGETS/<id>/references/`
Referencias y assets declarados.

`CURRENT/CURRENT.json`
Composición CURRENT: kernel, versiones de widgets y layout.

`VERSIONS/page/`
Snapshots de composición global.

`TASKS/`
Trabajo pendiente/candidato.

`PROTOCOLS/`
Contratos de workers, tasks, returns, continuidad y broker.

`CONTINUITY/`
Handoffs entre chats.

Principios:
- `CANDIDATE != CURRENT`.
- Cerrar un widget significa unmount, no borrar su historia.
- Los módulos declaran compatibilidad con Widget API.
- El kernel debe permanecer pequeño.
- Comunicación entre módulos preferentemente mediante contratos/eventos, no dependencias directas.
- Concurrent edits usan `base_version`/hash y scopes.
- Los workers externos no pueden promover CURRENT.

## 4. Investigación histórica de workers

Se realizó una investigación larga:
`HISTORY/PROMETEO_WORKER_PROMPT_EVOLUTION_RESEARCH_2026-10-06.md`.

Conclusiones centrales:
- La arquitectura evolucionó de prompts especializados y routing manual hacia workers fungibles.
- El patrón útil fue: allocator canónico -> claim -> trabajo -> RETURN -> E8/SUBMIT_NEXT.
- La especialización pertenece a la TASK/WorkBlock, no al nombre permanente del worker.
- No se debe medir “chats abiertos”, sino cambios consumidos, verificados e integrados.
- Un chat externo no debe fingir que tiene allocator, beacon, lease o permisos que realmente no posee.
- Observabilidad no debe transformarse en un scheduler alternativo.
- La continuidad debe ser durable y explícita.

## 5. Primer experimento modular: VIDEO_LOOP

Se creó `UI-VIDEO-LOOP-001` para que un worker externo recibiera un video adjunto, leyera el workspace y agregara un widget `video_loop` sin reconstruir la página.

El worker:
- se registró;
- declaró plan;
- reclamó la task;
- escribió sólo dentro de su scope;
- creó módulo, manifest, referencia al video y candidato;
- ejecutó pruebas Chromium locales;
- produjo RETURN;
- preservó CURRENT byte-for-byte.

El worker reportó que el video reproducía localmente y que el shell universal seguía funcionando.

### Falla descubierta

El candidato publicado individualmente contenía:

`src="./assets/user-video-001.mp4"`

La prueba local pasó porque el HTML vivía junto a su carpeta `assets/`. Pero al usuario se le entregó un HTML suelto desde Drive, sin su árbol relativo. Por eso el video no apareció.

Diagnóstico correcto:
- disciplina del worker: buena;
- arquitectura modular local: probablemente buena;
- contrato de entrega humana: insuficiente;
- aceptación: incompleta.

Lección:
cada task visual debería producir dos artefactos:
1. build modular real;
2. preview humano autocontenido o servido exactamente con su árbol de assets.

La verificación de video debería comprobar `readyState`, dimensiones, avance de `currentTime` y, cuando sea posible, evidencia visual del artefacto exacto entregado.

## 6. Widget EXPERIMENTOS

Se decidió crear `EXPERIMENTOS` como cuaderno de laboratorio durable.

No es un dashboard de luces verdes. Cada experimento debe registrar:
- pregunta;
- hipótesis;
- método;
- infraestructura real;
- qué fue simulado;
- mediciones;
- evidencia;
- resultado;
- qué demuestra;
- qué NO demuestra;
- limitaciones;
- decisión;
- próximo experimento.

Estados:
`DRAFT | RUNNING | PASS | FAIL | PARTIAL_PASS | INCONCLUSIVE | SUPERSEDED`.

El primer experimento es `EXP-001`.

## 7. EXP-001 · Drive Broker / exclusión optimista

Objetivo: comprobar dos piezas mínimas.

A. Transporte:
Drive -> leer bloque una vez -> trabajar localmente -> escribir RETURN -> releer y verificar.

B. Exclusión:
dos contenders parten de la misma revisión de un documento de claim y compiten por escribir usando `requiredRevisionId`.

### Fase A observada
Se creó:
- `BLOCK-001`
- `RETURN-001`
- `RECEIPT-001`

El bloque pedía sumar `[17,25,8,50]`.
Resultado: `100`.
El RETURN fue releído desde Drive y coincidió.

### Fase B observada
Se creó:
- `BLOCK-ATOMIC-001`
- `CLAIM-ATOMIC-001`
- `RETURN-ATOMIC-001`

Desde este mismo chat se lanzaron dos escrituras concurrentes lógicas, etiquetadas `worker-A` y `worker-B`, contra la misma revisión base.

Resultado:
- worker-A: escritura aceptada;
- worker-B: escritura rechazada porque la revisión requerida ya no era la latest revision.

Importante:
NO fueron dos chats reales de ChatGPT.
Fueron dos llamadas concurrentes originadas desde el mismo supervisor.

Conclusión correcta:
- PASS de la primitiva de exclusión optimista por revisión;
- PASS del transporte básico Drive -> ChatGPT -> Drive;
- NO PASS todavía del flujo multi-chat real.

Estado global EXP-001: `PARTIAL_PASS`.

## 8. Intento de Supabase durante EXP-001

Se intentó crear una tabla/esquema de prueba y una función Postgres con `FOR UPDATE SKIP LOCKED` para modelar un claim atómico más convencional.

El conector de Supabase devolvió un error de conexión a Postgres (`ECONNREFUSED`), por lo que no se afirmó que Supabase hubiera sido configurado.

Decisión:
no bloquear el experimento. Se siguió con Drive para probar la propiedad de exclusión.

Supabase sigue siendo candidato a control plane liviano, no a almacenamiento pesado.

## 9. Discusión de almacenamiento

Supabase Storage ya había resultado pequeño para el uso intensivo previsto.

Dirección acordada:
- GitHub: código, historia, manifests, tasks, returns textuales y proyección pública;
- storage pesado: reemplazable mediante `StorageAdapter`;
- Drive: buen inbox/transporte provisional, no necesariamente runtime final;
- Backblaze B2: candidato remoto futuro;
- laptop vieja + disco: posible nodo privado/local futuro;
- nunca acoplar widgets al proveedor.

API conceptual:
- `Storage.get(asset_id)`
- `Storage.put(asset_id, bytes)`
- `Storage.exists(asset_id)`

Backends futuros:
`GitHubStorage`, `DriveStorage`, `B2Storage`, `LocalDiskStorage`.

## 10. Privacidad y seguridad

Se distinguieron tres niveles:
- PUBLIC: código/UI/proyección que puede verse;
- LOCKED/PRIVATE: datos o aplicación entregados sólo tras autenticación;
- SECRET: API keys y credenciales privilegiadas, nunca publicadas.

Para una app privada estilo red social:
- GitHub puede seguir como source/versionado;
- un gate/login mínimo puede ser público;
- Auth valida identidad;
- backend/Storage privado entrega app/datos sólo después de auth;
- secretos permanecen server-side.

Nunca:
- contraseña hardcodeada en JS como “seguridad”;
- service-role/master token en frontend;
- claves privilegiadas dentro de prompts;
- repositorio privado usado como secret manager.

## 11. WorkBlocks y economía de IA

Si la inteligencia de ChatGPT se considera abundante, el recurso escaso pasa a ser:
- I/O;
- coordinación;
- conflictos;
- integración;
- atención humana;
- dependencias causales.

Por eso el worker ideal recibe un WorkBlock autosuficiente:

- BLOCK_ID
- BASE_HASH
- OBJECTIVE
- INPUTS
- READ_SCOPE
- WRITE_SCOPE
- DO_NOT_TOUCH
- DEPENDENCIES
- EXPECTED_OUTPUT
- TESTS
- RETURN_SCHEMA

Ciclo:
`claim -> descargar una vez -> trabajar local -> verify -> RETURN -> SUBMIT_NEXT`.

Evitar:
polling constante, exploración completa del repo, múltiples lecturas del mismo contexto, workers inventando tareas cuando no hay READY.

## 12. Broker ideal

La superficie futura debería reducirse a dos operaciones:

`claim_block()`
- selecciona un bloque READY compatible;
- hace claim atómico;
- entrega paquete/URL temporal;
- registra worker y lease.

`submit_return()`
- valida worker/block/lease/base;
- acepta sólo su namespace;
- guarda RETURN;
- cierra el claim;
- expone el resultado al verifier/integrator.

El worker no debe saber si atrás hay Drive, B2, laptop o GitHub.

Seguridad:
- token scoped al bloque;
- expiración;
- mínimo read/write scope;
- nunca admin token;
- sólo integrator puede promover CURRENT.

## 13. EXP-002 preparado

La siguiente prueba debe usar dos chats reales independientes de ChatGPT.

Objetivo:
dos chats reciben el mismo prompt de experimentos y apuntan al mismo claim READY.

Comportamiento esperado:
- cada chat genera un worker_id;
- lee el claim y su revision;
- si está READY intenta registrar claim exigiendo esa revision;
- sólo uno puede ganar;
- el perdedor no debe reintentar el mismo bloque como propietario;
- sólo el ganador procesa el BLOCK y publica RETURN;
- ambos dejan evidencia honesta de lo observado.

La prueba será exitosa si hay exactamente un owner durable y un RETURN del owner.

Infraestructura durable preparada en Google Drive, carpeta `BROKER_TEST_V1` (`15deUOXp_9mZzZ_m04nDWqsHwfwzs4AvX`):
- `BLOCK-REALCHAT-002` · `13GIOKgCXna48KVVyFOU9ggUxYnLDsBxZTHVqnyxD6R8`
- `CLAIM-REALCHAT-002` · `1iwfQE1SsrFHb9bZs11Cy8E89MYve4mKCVTO1FAHXfd8`

El claim fue preparado en estado READY. Esto no demuestra aún concurrencia real; EXP-002 sólo cambia de estado después de observar dos chats independientes.


## 14. Continuidad por widget

Desde V2, cada widget debe tener:
- `CONTEXT.md`
- `CONTINUITY_PROMPT.txt`
- `READINESS_EXAM.json`
- `versions/`
- `messages/`
- `references/`

Un chat que tome un widget debe leer esos documentos y aprobar Readiness Gate antes de aceptar cambios.

La prueba de readiness debe forzarlo a responder:
1. cuál es CURRENT page_version;
2. cuál es widget/version CURRENT;
3. qué paths puede escribir;
4. qué paths no puede tocar;
5. qué funciones pertenecen al kernel;
6. cómo distingue CANDIDATE de CURRENT;
7. cuáles son known issues relevantes;
8. cómo registrará cambios/historia;
9. qué verificaciones debe ejecutar;
10. qué afirmaciones no puede inventar.

Sólo después declara `READINESS: PASS`.

## 15. Autoridad / no proliferación

No crear:
- dealer UI paralelo;
- scheduler nuevo;
- queue alternativa;
- CURRENT alternativo;
- router que compita con autoridad canónica.

La workspace de UI puede experimentar con contratos equivalentes, pero el futuro adapter interno debe conectarse a allocator/Work Graph canónicos cuando corresponda.

## 16. Estado observado del repo al publicar V2

Antes de publicación se verificó:
- `main`: `b5df91969ed03832fa54ea8d0e7f39bd1019ad78`
- `gh-pages`: `b48e50a9905046dfdd840b50f500accab8b8d7d8`

El trabajo V2 debe vivir en un namespace aislado `ui-workspace-v1/` para no alterar rutas históricas, Primary Chat, `/wc/` ni el Current Tree canónico.

## 17. Próxima acción correcta

Para continuar desde otro chat:
- usar `PROMPTS/EXPERIMENTS_CONTINUITY_PROMPT.txt`;
- aprobar readiness;
- ejecutar EXP-002 con dos chats reales;
- volver con los RETURNS/evidencia;
- registrar resultado como nuevo experimento;
- no promover arquitectura definitiva basándose sólo en EXP-001.



# APPENDIX · Readiness Gate
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



# APPENDIX · Continuity Protocol
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



# APPENDIX · WorkBlock
# WORKBLOCK_V1

Unidad autosuficiente de trabajo para workers fungibles.

Campos mínimos:
- block_id
- objective
- base_hash/base_version
- inputs
- read_scope
- write_scope
- do_not_touch
- dependencies
- expected_output
- tests
- return_contract

Objetivo económico:
`claim -> 1 fetch -> trabajo local -> 1 return`.

La inteligencia puede ser abundante; I/O, coordinación y conflictos son recursos a minimizar.



# APPENDIX · Broker
# BROKER_V1 · Contrato conceptual

Superficie ideal para ChatGPT:

## claim_block()
Hace selección + claim atómico como una sola operación.
Devuelve block_id, paquete/URL temporal, lease y token scoped.

## submit_return()
Acepta sólo el RETURN del owner válido y sólo en su namespace.
Valida block_id, worker_id, lease y base.
No concede acceso a CURRENT.

El backend físico puede cambiar sin cambiar a los workers.



# APPENDIX · Storage Adapter
# STORAGE_ADAPTER_V1

Widgets y workers referencian assets por ID lógico, no por proveedor.

API conceptual:
- get(asset_id)
- put(asset_id, bytes, metadata)
- exists(asset_id)
- signed_read(asset_id, ttl)
- signed_write(scope, ttl)

Backends previstos:
- Drive (provisional)
- GitHub (texto/código, no media pesada)
- B2/object storage
- LocalDisk/laptop

No guardar credenciales maestras en prompts ni Git.



# WIDGET CONTEXT · CHAT
# CHAT widget context

CURRENT: chat@v1.
Estado funcional: placeholder visual, NO es todavía Primary Chat real.
Páginas: CHAT / CONTEXT / FILES / HISTORY.

No afirmar que mensajes reales, memoria o backend están conectados.
Las funciones minimizar/fullscreen/edit/close son del kernel.
Write scope normal: `WIDGETS/chat/**` y candidate namespaced.
No tocar kernel ni otros widgets salvo task explícita.



# WIDGET CONTEXT · WORKERS
# WORKERS widget context

CURRENT: workers@v1.
Estado funcional: representación UI; NO debe fingir liveness real.
La versión V2 corrige etiquetas para dejar claro que no hay runtime adjunto.
Objetivo futuro: proyectar telemetría autoritativa, nunca inventada.

Funciones shell pertenecen al kernel.
Write scope normal: `WIDGETS/workers/**` y candidate namespaced.



# WIDGET CONTEXT · EXPERIMENTS
# EXPERIMENTS widget context

CURRENT: experiments@v1.
Función: cuaderno de laboratorio durable.

EXP-001 = PARTIAL_PASS.
Prueba transporte Drive->ChatGPT->Drive y exclusión optimista simulada.
NO probó dos chats reales.

EXP-002 = siguiente prueba.
Debe enfrentar dos chats reales al mismo claim READY y registrar exactamente un owner.

No convertir inferencias en PASS.
Cambios de experimentos son append-only/corregibles mediante history.
