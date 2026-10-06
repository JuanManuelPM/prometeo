# PROMETEO · INVESTIGACIÓN HISTÓRICA DE WORKERS Y EVOLUCIÓN DE PROMPTS

**Fecha de compilación:** 2026-10-06  
**Estado:** documento local de investigación, no contrato CURRENT y no prompt operativo todavía.  
**Objetivo:** reconstruir cómo evolucionó el sistema de workers de Prometeo, qué prompts y campañas fueron importantes, qué fallos desviaron el proyecto y qué patrones deberían heredarse si ahora se crean workers especializados en la página/UI local de Prometeo.

---

## 0. Alcance y criterio de evidencia

Esta investigación usa tres clases de material recuperado:

1. **Historial de chats recuperado por fecha y contenido**, especialmente entre el 22 de septiembre y el 5 de octubre de 2026.
2. **Archivos de texto locales recuperados de conversaciones anteriores**, entre ellos `Pasted text (2)(51).txt`, que conserva una etapa temprana de la arquitectura de workers externos y Root Dispatcher.
3. **Estado y decisiones de continuidad que quedaron repetidas en conversaciones posteriores**, por ejemplo la versión universal `/wc/` v3.30, la residencia `checkpoint=3 → target=6 → hard cap=8`, la obligación `RETURN → E8/SUBMIT_NEXT`, el allocator canónico y la prohibición de crear schedulers, queues o CURRENT paralelos.

Cuando una afirmación corresponde a un resultado reportado por un chat anterior y no a bytes de un log verificado en este documento, se la marca como **“reportado en chat”**. La intención es evitar el error histórico de convertir una narración previa en evidencia de ejecución real.

---

# 1. Antes de `/wc/`: Root Dispatcher y workers externos descartables

Una etapa temprana importante separaba dos sistemas.

El primero era un **sistema de aceleración externa**. El humano, este chat principal y otros chats limpios trabajaban juntos para conseguir investigación, especificaciones, returns extensos y piezas de implementación. El chat principal actuaba como **dispatcher / diseñador de prompts / fusionador**; el humano funcionaba como **puente temporal**; y las otras IAs eran **workers externos descartables**.

El archivo local `Pasted text (2)(51).txt` conserva esta formulación con bastante claridad. Allí se define que el Root Dispatcher debía detectar qué faltaba, escribir prompts, limitar el alcance, exigir un formato de retorno, recibir los returns, fusionarlos, convertirlos en build o en la siguiente ronda y actualizar la estrategia. También queda explícito que el humano debía reducirse a “copiar prompt, traer return” y que incluso esa función debía desaparecer después.

La idea conceptual era buena: **“usar el enjambre externo para construir el enjambre interno”**. El problema era que todavía dependía del humano como message bus.

El segundo sistema era el **Prometeo interno**. En ese diseño inicial aparecía un pipeline conceptual:

`BIBLIA_PACKET → CUTTER → ROUTER → WORKER_QUEUE → API/MODEL CALLS → RETURN_VALIDATOR → FUSION_ENGINE → STATE/PANEL`

En esa etapa se insistía en que la arquitectura mínima no era “Telegram / scheduler / dashboard”, sino:

- Biblia Packet / compresión;
- Cutter + Router interno;
- Return Fusion / compilador de vuelta.

Esta separación es importante para el presente porque muestra una constante histórica: **los workers útiles nunca fueron pensados como chats genéricos que “entienden Prometeo” por intuición**. Siempre funcionaron mejor cuando recibieron un paquete explícito, una misión estrecha, constraints, ownership, tests y un ABI de retorno.

### Referencia recuperada
- Archivo local `Pasted text (2)(51).txt`: etapa “Sistema de aceleración externa / Root Dispatcher”, con Root Dispatcher, workers descartables y pipeline interno.
- Historial recuperado de fines de septiembre: la etapa también aparece asociada a workers externos de Telegram Control, Always-On y Mission Panel.

---

# 2. De workers especializados a capacidad fungible

Prometeo fue cambiando desde workers con roles bastante definidos hacia workers **fungibles**, es decir: el worker no elige proyecto, rol, familia ni prioridad. El sistema canónico decide qué trabajo READY compatible recibe.

Ese cambio aparece con fuerza alrededor del 29 y 30 de septiembre.

## 2.1. PROMETEO-MP10-01 y transición a POOL

En un chat del **29 de septiembre de 2026**, `PROMETEO-MP10-01` se trató como un RUN finito. La regla posterior era pasar a un modo POOL sobre el allocator CURRENT, sin revivir sistemas anteriores como `GHNATIVE-C0-10` y, sobre todo, **sin crear otra queue, scheduler o CURRENT**.

El estado reportado entonces fue:

- 10/10 RETURNS;
- integrator DONE;
- transición a `PROMETEO-CURRENT-01`;
- cinco workers con 5/5/4/4/4 unidades;
- checkpoint de 3 atravesado;
- frontier de 12;
- sin acción humana requerida.

Lo importante no es tomar esas cifras como CURRENT hoy. Lo importante es la lección arquitectónica: **un worker deja de estar atado a una sola tarea y puede continuar tomando trabajo compatible dentro de una sesión residente**.

## 2.2. Residencia: de una tarea a una vida útil útil

El 30 de septiembre aparece la forma que luego se vuelve una constante:

- worker nuevo;
- `worker_id` nuevo;
- `launch_nonce` nuevo;
- beacon v3.30 fresco como primera acción durable;
- checkpoint `3`;
- objetivo `6`;
- hard cap `8`;
- continuar salvo boundary real.

El propósito era combatir un problema anterior: workers que hacían una única unidad, devolvían un resultado y morían, generando overhead de contexto y demasiada coordinación.

El mejor baseline histórico reportado en los chats fue un worker `wc-20260929T110500Z-52adba732e41` que alcanzó aproximadamente **34 minutos, 6 unidades, 4 proyectos, 0 colisiones**, con cierre `RESIDENT_TARGET_REACHED`. Otro worker del 3 de octubre llegó a aproximadamente 28 minutos y cerró por `FRONTIER_EXHAUSTED` después de 3 unidades.

Esto cambió la lectura del problema: el límite ya no parecía ser “la IA se muere después de una tarea”, sino **frontier starvation, incompatibilidad de capabilities, falta de successors o falta de trabajo ya compilado**.

---

# 3. El prompt universal `/wc/` v3.30

Entre el 30 de septiembre y el 1 de octubre se consolida lo más parecido a un **prompt universal de worker**.

No era sólo texto de personalidad. Era un contrato de ejecución.

La estructura recuperada, resumida sin inventar campos que no están confirmados, era:

1. **Primera acción durable:** crear un beacon fresco v3.30 con `worker_id` y `launch_nonce` nuevos.
2. **No reutilizar identidad, slot, resultados o claims anteriores.**
3. **Entrar exclusivamente por el allocator canónico CURRENT `/wc/`.**
4. Hacer un único claim atómico de trabajo READY compatible.
5. Ejecutar trabajo material.
6. Emitir RETURN durable y verificable.
7. Si el RETURN no es terminal: **E8 / SUBMIT_NEXT inmediatamente**.
8. Repetir hasta:
   - checkpoint 3;
   - target 6;
   - hard cap 8;
   - o boundary terminal real.
9. No inventar:
   - scheduler;
   - dealer;
   - queue;
   - CURRENT;
   - routing paralelo;
   - autoridad nueva.
10. No simular `ACTIVE`, `queued=true`, PASS ni liveness si no hay evidencia.
11. Si existe una denegación explícita de connector/transport/safety, tratarla como **boundary terminal**, no saltarla, no reintentar a ciegas y no “buscar otra tarea” para ocultar el fallo.

En un chat del **1 de octubre de 2026** esta secuencia se expresa claramente como:

`WORK → RETURN → E8/SUBMIT_NEXT → WORK`

y aparecen terminales como:

- `CLAIM_TRANSPORT_BLOCKED`
- `SLOT_CLAIM_TRANSPORT_BLOCKED`
- `EXHAUSTED_COMPATIBLE_FRONTIER`
- `TRANSPORT_BOUNDARY`

La mejora fundamental fue que el prompt dejó de intentar decirle al worker **qué proyecto hacer** y pasó a decirle **cómo comportarse como unidad fungible confiable**.

---

# 4. Qué fallaba y por qué los prompts se volvieron más estrictos

La evolución de los prompts no fue estética. Cada regla nueva apareció porque antes algo había fallado.

## 4.1. Identidad stale y reutilización accidental

De allí salen:

- beacon fresco;
- `worker_id` nuevo;
- `launch_nonce` nuevo;
- prohibición explícita de reutilizar identidades, slots o resultados.

Sin eso, una nueva sesión podía parecer continuidad de otra y contaminar claims, leases o receipts.

## 4.2. Workers “activos” sin trabajo real

Se detectó repetidamente el problema de llamar activo a un worker sólo porque existía una tarjeta, un slot o un heartbeat.

La regla terminó siendo: **no hay actividad material sin task/claim/timestamp y trabajo verificable**.

Esto conecta con una preferencia humana que se repitió muchas veces: no optimizar occupancy, PINs, claims o cantidad de workers como si fueran productividad. La métrica deseada pasó a ser **valor útil consumido, verificado e integrado por wall-clock**.

## 4.3. CREATE_EXISTS

En varias corridas, especialmente hacia el 4 de octubre, workers terminaron en `CREATE_EXISTS`. Un chat reportó cuatro `CREATE_EXISTS` que agotaron el frontier de `PROMETEO-10WC-PRE-RUN-V1`.

La lectura correcta no era “el worker falló intelectualmente”. Era que el frontier, la cápsula o la operación de CREATE ya no correspondían al estado actual. El aprendizaje fue:

- evitar trabajo stale;
- no repetir CREATE como si fuera idempotente cuando no lo es;
- revalidar CURRENT antes de actuar;
- convertir el fallo repetible en detector/regression test.

## 4.4. CLAIM_TRANSPORT_BLOCKED y safety boundaries

Algunas corridas llegaron a un claim o CREATE correcto y chocaron con una denegación del connector o del transporte. Hubo una etapa en la que el impulso natural era reintentar o saltar a otra tarea.

La regla posterior fue más sana: **denegación explícita = boundary terminal**.

Ejemplo recuperado: `EXP-3WC-REAL-V1` tuvo un worker que reclamó atómicamente una TASK pero encontró una cápsula stale y luego un CREATE bloqueado por safety checks. El cierre reportado fue `EXPLICIT_SAFETY_CONNECTOR_DENIAL_NO_RETRY`, con 0 unidades productivas y sin ejecutar E8.

La lección no es “nunca reintentar nada”. Es más precisa: **no disfrazar un límite externo explícito como starvation o como permiso para rutear alrededor del sistema**.

## 4.5. PIN expirado / falta de terminalización

En `EXP-3WC-REAL-V1`, un análisis posterior marcó que un worker había dejado un PIN expirado sin cierre terminal. El experimento fue útil porque separó dos preguntas:

- ¿el worker sabe reclamar y producir trabajo?
- ¿el worker sabe cerrar durablemente su vida cuando termina o queda bloqueado?

Eso llevó al foco G8 de **residencia/terminalización**, cuyo PASS reportado posterior fue 6/6, 5 E8, 0 collisions, 0 `NO_ALLOCATION`, 0 `EXPIRED_NONTERMINAL_PIN`, con cierre `RESIDENT_TARGET_REACHED`.

## 4.6. FRONTIER_EXHAUSTED / starvation

Algunos workers sanos simplemente no tenían siguiente trabajo compatible. Esto expuso que escalar workers sin compilar suficiente frontier no aumenta valor.

Por eso, en chats del 3 de octubre se insistió en:

- consumer;
- fan-in;
- successors;
- DoD;
- tests;
- capability;
- unlocks.

También aparece una regla contundente: **no lanzar `/wc/` genéricos si el frontier tiene 0 tareas compatibles**.

## 4.7. BOUNDARY_FRONTIER_UNPUBLISHABLE

En el PRE-RUN del 4 de octubre, se reportó que un worker consumió múltiples RETURNS y llegó a una frontera que no podía publicarse por faltantes como `site/live/mobile.js` y `.css`. El cierre `BOUNDARY_FRONTIER_UNPUBLISHABLE` fue útil porque mostró que **tener trabajo producido no equivale a tener un resultado publicable**.

Esto reforzó la necesidad de consumer/fan-in y de que las tareas se compilen con su downstream real.

---

# 5. Experimentos que cambiaron el sistema

## 5.1. RESIDENCY-MACROBATCH-01 — 30 de septiembre

Se lanzó una corrida con 15 slots. El canary llegó a claim S002, midpoint y produjo trabajo primario/reallocation. El reporte posterior hablaba de 15/15 slots, 14/15 primary/reallocations y 12/15 cierres.

También aparecieron casos `E2_ASSIGN: NOT_REACHED_NO_CLAIM_EVIDENCE`.

Lo importante fue entender que **abrir un slot no significa que exista un worker productivo**. Se probaron variantes como:

- `V1_EXPLICIT_ZERO_LEDGER`
- `V2_BLOCK_REVIEW`
- `V3_CONTINUATION_PRIMING`

La arquitectura se fue alejando de “más slots = más progreso”.

## 5.2. PROD-01

PROD-01 mostró varios perfiles:

- 6/6 con `RESIDENT_TARGET_REACHED`;
- 5/6 por inestabilidad de claim/transport;
- terminales por boundary;
- casos de frontier exhausto.

Se reportó que macrobatch, Launch Packet, PRE-GUIDE, churn handling y allocator corregido mejoraban la residencia.

## 5.3. EXP-3WC-REAL-V1 — 4/5 de octubre

Este experimento fue importante porque intentó medir tres workers reales y no una simulación.

Reglas:

- beacon fresco v3.30;
- allocator `/wc/`;
- claim atómico;
- sin dealer/scheduler/queue/CURRENT/routing paralelo;
- RETURN verificable;
- E8/SUBMIT_NEXT;
- checkpoint 3, target 6, cap 8;
- movilidad entre bloques/proyectos.

Resultado reportado:

- un worker alcanzó 6/6 y realizó 5 ciclos RETURN→SUBMIT_NEXT con 0 colisiones;
- otro cerró por safety boundary;
- otro tuvo problema de terminalización/PIN.

Conclusión: **el ciclo básico funcionaba, pero la robustez terminal todavía no**.

## 5.4. G8

G8 se enfocó justamente en terminalización/residencia.

El resultado reportado en chat fue:

- 6/6;
- checkpoint atravesado;
- 5 E8;
- 0 collisions;
- 0 `NO_ALLOCATION`;
- 0 `EXPIRED_NONTERMINAL_PIN`;
- cierre `RESIDENT_TARGET_REACHED`.

Después de eso se consideró razonable escalar a 10 workers.

## 5.5. PROMETEO-LIVE10-V1 — 5 de octubre

Este es el cambio conceptual más importante antes del trabajo de UI actual.

El objetivo humano dejó de ser “demostrar que los workers pueden trabajar” y pasó a ser:

`HUMANO → PRIMARY CHAT → WORK GRAPH → /wc/ → RESULTADOS → PRIMARY CHAT DESPIERTA → INTEGRA → RESPONDE → GENERA SIGUIENTE TRABAJO`

Los WC ya no debían elegir proyecto ni rol. Eran **capacidad fungible**.

El prompt conocido comenzaba aproximadamente con:

`🟠 PROMETEO /wc · PROMETEO-LIVE10-V1 · NUEVO_WORKER=1 · WORKER_FUNGIBLE=1`

y exigía como primera acción durable un beacon v3.30 fresco con identidad/nonce nuevos, entrada exclusiva por allocator canónico, residencia 3→6→8 y E8/SUBMIT_NEXT después de cada RETURN no terminal.

Las ramas del objetivo incluían:

- **CHAT VIVO:** RETURN → Primary Chat wake → continuidad → integración → respuesta visible → siguiente trabajo durable.
- **MÉTRICAS VIVAS:** observabilidad real, no tarjetas falsas.
- **CRECIMIENTO / trabajo real:** mantener frontier útil sin convertir todo en laboratorio.

Esto importa ahora porque el worker especializado en la página no debería revivir el viejo modelo de “worker con rol manual”. Debería heredar la disciplina universal del shell, pero reclamar tareas compiladas para el **dominio UI actual**.

---

# 6. Las veces que Prometeo “pinchó” o se desvió

No hubo un único fallo. Hubo patrones repetidos.

## 6.1. Laboratorio convertido en objetivo

Varias veces el sistema siguió creando experimentos, dashboards, métricas o variantes cuando el objetivo humano ya era otro.

En octubre el usuario lo hizo explícito: **terminar el circuito vivo y construir trabajo real; no seguir haciendo laboratorio salvo que aparezca un fallo nuevo durable**.

Lección para la página actual: un worker de UI no debe “mejorar la arquitectura” por curiosidad. Debe trabajar una TASK READY específica y verificable.

## 6.2. Confundir infraestructura con progreso

Claims, PINs, workers launched, slots y heartbeats fueron útiles para diagnosticar, pero a veces reemplazaron la medida importante.

La regla corregida: productividad = **valor consumido/verificado/integrado**, no occupancy.

Para workers de UI eso significa que “generé CSS” no alcanza. Debe existir una salida consumible:

- archivo modificado;
- interacción concreta corregida;
- test o evidencia;
- return con qué cambió;
- qué regla preservó;
- qué falta.

## 6.3. Humano usado como router

El diseño temprano aceptaba al humano como puente temporal. El error fue dejar esa etapa durar demasiado.

El objetivo posterior fue que el humano no copiara RETURNS, métricas ni resultados entre workers.

Para el nuevo sistema de página, si se usan otros chats como workers externos, el transporte manual puede volver temporalmente, pero debe estar diseñado como **bootstrap**, no como arquitectura final.

## 6.4. Stale CURRENT / asumir HEAD viejo

Se repitió muchas veces la necesidad de refetchear o revalidar CURRENT antes de actuar. Un nombre de archivo, un commit conocido o una referencia de chat no es autoridad automática.

En la nueva etapa local esto se traduce a:

- el worker debe recibir el **HTML CURRENT exacto**;
- el contrato de UI CURRENT;
- el estado/handoff CURRENT;
- no debe reconstruir desde una versión recordada.

## 6.5. Crear sistemas paralelos

Cada vez que un worker encontraba un bloqueo, existía el riesgo de inventar un scheduler, queue, router o estado CURRENT alternativo.

Por eso los prompts terminaron repitiendo obsesivamente:

**NO scheduler, dealer, queue, CURRENT, routing paralelo ni autoridad nueva.**

Para la página actual, la versión equivalente será:

- no crear un segundo layout engine;
- no crear otro sistema de widgets;
- no reemplazar la persistencia por una nueva;
- no rehacer el HTML desde cero;
- modificar CURRENT.

## 6.6. Returns no integrados

Una de las reglas tempranas de aprendizaje de fallos decía que “worker recibido pero no integrado” es un fallo real.

Eso sigue siendo central. Un worker puede producir una solución técnicamente buena que nunca llega al artefacto CURRENT.

Por eso el nuevo prompt especializado debe obligar a distinguir:

- candidato;
- cambio aplicado;
- verificación;
- promoción a CURRENT.

---

# 7. Qué debe heredarse para workers especializados en esta página

No conviene copiar literalmente `PROMETEO-LIVE10-V1` y esperar que un chat nuevo se vuelva mágicamente editor de UI.

Hay que separar dos capas.

## Capa A — shell universal heredado

Debe conservar:

- identidad de sesión clara;
- artefacto CURRENT explícito;
- no reconstruir desde cero;
- una TASK concreta;
- ownership acotado;
- no crear autoridad paralela;
- output/RETURN estructurado;
- evidencia;
- siguiente trabajo sólo si está autorizado;
- terminal reason explícita si no puede continuar.

Para workers internos reales de Prometeo, además:

- beacon;
- allocator;
- claim;
- RETURN;
- E8/SUBMIT_NEXT;
- residencia.

Para un chat externo manual especializado en la UI local, beacon/allocator no pueden fingirse si no existen realmente en ese chat. En ese caso hay que usar el equivalente honesto:

- `SESSION_ID`;
- `ARTIFACT_CURRENT`;
- `TASK_ID`;
- `INPUT_HASH` o nombre exacto del archivo;
- `RETURN`.

El gran aprendizaje histórico es **no simular infraestructura que el worker no tiene**.

## Capa B — contrato especializado de la página

Cada worker de UI debería recibir:

1. archivo CURRENT;
2. `UI_RULES_CURRENT.md`;
3. `UI_STATE_CURRENT.json`;
4. contrato universal de widgets;
5. task exacta;
6. archivos que puede tocar;
7. cosas prohibidas;
8. criterio de terminado;
9. pruebas mínimas;
10. formato de RETURN.

Ejemplo de task especializada futura:

- “Implementar resize vertical inferior estable en móvil.”
- Scope: sólo interacción del handle inferior.
- No tocar: topbar, drawer, navegación interna.
- DoD:
  - drag abajo aumenta altura;
  - drag arriba reduce;
  - mínimo 120 px;
  - no salta el scroll;
  - pointercancel restaura;
  - no hay resize lateral.
- RETURN:
  - archivo;
  - diff conceptual;
  - tests;
  - limitaciones;
  - receipt.

Eso es exactamente la filosofía que fue emergiendo en Prometeo: **worker fungible, trabajo no fungible**. El worker no elige qué hacer; la TASK sí contiene especialización.

---

# 8. Qué NO copiar del pasado

Hay cosas históricas que no deben revivirse sólo porque funcionaron en algún momento.

No copiar:

- roles manuales permanentes tipo “vos sos el worker de X” si existe allocator;
- schedulers paralelos;
- queues paralelas;
- dashboards que simulan liveness;
- prompts larguísimos con poca información material;
- instrucciones de “investigá Prometeo” sin packet;
- resultados externos tratados como CURRENT por venir de una IA;
- reintentos ciegos ante boundaries explícitos;
- claims sobre ejecución no verificada;
- experimentos nuevos cuando el problema ya está bien identificado.

Sí copiar:

- misión angosta;
- ownership;
- DoD;
- negative constraints;
- ejemplos y contraejemplos cuando ayuden;
- RETURN ABI;
- receipts;
- evidence;
- terminal reason;
- continuidad sin humano como router cuando la infraestructura lo permite.

---

# 9. Forma recomendada para la nueva familia de workers UI

La mejor evolución no es crear “UI Worker A”, “UI Worker B” y “UI Worker C” como castas permanentes.

La forma coherente con Prometeo sería:

**Worker fungible + Task Capsule especializada en Prometeo UI.**

Una cápsula debería poder expresar, por ejemplo:

- dominio: `PROMETEO_UI`;
- artefacto: `PROMETEO_MINIMAL_WIDGETS_V7_FUNCTIONAL.html`;
- contrato: `UI_RULES_CURRENT`;
- objetivo: “drawer interno debe cubrir full-height del widget y cerrar con flecha”;
- write scope: CSS/JS del drawer;
- read scope: HTML actual + reglas;
- prohibiciones: no alterar topbar, no crear nuevo layout engine;
- tests: móvil, scroll, selección, cierre;
- consumer: integrador del HTML CURRENT;
- unlocks: siguiente task;
- return ABI.

Después, cualquier worker compatible puede reclamarla.

Esto conserva la lección más fuerte de todo el proyecto: **la especialización vive en el paquete de trabajo, no en la identidad del worker**.

---

# 10. Cronología compacta recuperada

### 22–25 septiembre
- Rich Cell / Worker Lab y experimentos con múltiples estrategias.
- Mucha exploración de roles, grids, providers y laboratorios.
- Aún había fuerte separación entre workers/experimentos.

### 28–29 septiembre
- Swarms y speculative work.
- Root Dispatcher / workers externos.
- `PROMETEO-MP10-01` → transición a POOL/CURRENT.
- Se consolida la idea de continuidad sin intervención humana entre tareas.

### 30 septiembre
- `/wc/` v3.30.
- Beacon fresco, identidad nueva.
- Residencia 3→6→8.
- `RESIDENCY-MACROBATCH-01`.
- `PROD-01`.
- Se observa que slots/claims no equivalen a productividad.

### 1 octubre
- WORK→RETURN→E8/SUBMIT_NEXT se vuelve regla central.
- Se formalizan boundaries de transport/claim.
- Kernel elástico, fan-in, judge, closer, successors.
- Se insiste en valor integrado y no occupancy.

### 2–3 octubre
- Fallos `CREATE_EXISTS`, transport blocked, stale allocator, leases, paquetes no armados.
- Foco en compile gates, consumers, fan-in y frontier compatible.
- Se refuerza “no scheduler/queue/CURRENT paralelo”.
- Se mide residencia real y frontier starvation.

### 4 octubre
- `PROMETEO-10WC-PRE-RUN-V1`.
- `EXP-3WC-REAL-V1`.
- Se prueba claim → trabajo → RETURN → SUBMIT_NEXT.
- Aparece problema focal de terminalización/PIN.
- Safety connector denial pasa a boundary explícito.

### 5 octubre
- G8 reportado PASS para residencia/terminalización.
- `PROMETEO-LIVE10-V1`.
- Objetivo cambia a Primary Chat vivo y autonomía real:
  humano escribe una vez → trabajo → RETURN → wake → integración → respuesta visible.
- Workers tratados definitivamente como capacidad fungible.

### 6 octubre
- La nueva necesidad es llevar esas lecciones al sistema de UI local:
  continuidad portable, reglas de diseño durables, handoff y workers que puedan cambiar la página sin depender de un chat único.

---

# 11. Conclusión para el siguiente prompt genérico

La historia muestra que el prompt de worker mejoró cuando dejó de ser una descripción del proyecto y se convirtió en un **contrato operativo verificable**.

La próxima versión para la página debería conservar este principio:

> El worker no necesita “conocer Prometeo entero”. Necesita recibir CURRENT suficiente, una TASK estrecha, autoridad acotada, reglas que no puede romper, evidencia requerida y un formato de RETURN que el siguiente actor pueda consumir.

El prompt genérico que se escriba después de esta investigación debería tener dos modos explícitos:

1. **External Chat Worker / UI Specialist:** para copiar y pegar en otro chat. No debe fingir allocator, beacon ni capacidad de escribir repo si no la tiene. Trabaja sobre artefactos adjuntos y devuelve un archivo/patch/RETURN.
2. **Internal `/wc/` Worker:** cuando vuelva a existir ejecución material por allocator canónico. Hereda v3.30, identidad fresca, claim atómico, residencia, RETURN→E8/SUBMIT_NEXT y terminal boundaries.

Mezclar ambos modos fue históricamente una fuente de confusión. Separarlos permite aprovechar todo lo aprendido sin inventar infraestructura.

La regla final más importante para la etapa actual es:

**No especializar workers por nombre; especializar TASKS por contrato. No medir chats lanzados; medir cambios consumidos e integrados. No reconstruir la página; modificar CURRENT. No convertir un resultado externo en verdad hasta verificarlo.**

---

# 12. Referencias internas recuperadas

## Archivos locales
- `Pasted text (2)(51).txt`: Root Dispatcher, workers externos descartables, humano como puente temporal, pipeline `BIBLIA_PACKET → CUTTER → ROUTER → WORKER_QUEUE → API/MODEL CALLS → RETURN_VALIDATOR → FUSION_ENGINE → STATE/PANEL`.
- Otros `Pasted text...` recuperados contienen copias/variantes del mismo bloque histórico; se usó el resultado con mayor relevancia para evitar contar duplicados como evidencia independiente.

## Chats recuperados por fecha
- **2026-09-29:** `PROMETEO-MP10-01`, transición RUN finito → POOL CURRENT; continuidad y workers residentes.
- **2026-09-30:** `/wc/ v3.30`, beacon fresco, residencia; `RESIDENCY-MACROBATCH-01`; `PROD-01`.
- **2026-10-01:** ciclo `WORK → RETURN → E8/SUBMIT_NEXT → WORK`, terminal boundaries, kernel elástico y foco en integrated value.
- **2026-10-02:** compile gate E1–E10; CREATE/claim/transport failures; necesidad de frontier autosuficiente.
- **2026-10-03:** residencia real, `FRONTIER_EXHAUSTED`, run packet no armado, prohibición reforzada de autoridad paralela.
- **2026-10-04 / 2026-10-05:** `PROMETEO-10WC-PRE-RUN-V1`, `EXP-3WC-REAL-V1`, G8, safety boundary, terminalización.
- **2026-10-05:** `PROMETEO-LIVE10-V1`, objetivo Primary Chat vivo y WC fungibles.
- **2026-10-06:** continuidad local de UI, contratos de widget, handoff y preparación para workers especializados en la página.

---

## Nota de uso

Este documento es una **investigación histórica**, no debe sobrescribir automáticamente contratos CURRENT. Sirve como base para escribir el próximo prompt genérico y para evitar repetir decisiones ya probadas o fallos ya conocidos.
