# EXP-001 · Broker mínimo sobre Google Drive

**Estado:** `PARTIAL_PASS`  
**Fecha:** 2026-10-06  
**Área:** workers / transporte / claims / concurrencia  
**Tipo:** experimento de infraestructura  
**Publicación:** borrador local, todavía no promovido a CURRENT ni publicado  

## Resumen ejecutivo

Este experimento probó dos piezas separadas de una arquitectura futura de Prometeo basada en bloques de trabajo autosuficientes para workers de ChatGPT.

La primera pieza fue el transporte mínimo: guardar un bloque de trabajo en Google Drive, recuperarlo desde ChatGPT una sola vez, procesarlo localmente y devolver un RETURN durable al mismo Drive. Esa parte pasó.

La segunda pieza fue la exclusión de claims: comprobar si dos contendientes que parten de la misma versión de un registro pueden intentar reclamar el mismo bloque y aun así lograr que sólo uno sea aceptado. Para simularlo se usó el control de revisión de Google Docs. Se lanzaron dos escrituras concurrentes sobre la misma revisión base. Una fue aceptada y la otra fue rechazada porque la revisión ya había cambiado. Esa parte también pasó como prueba del mecanismo de exclusión optimista.

La conclusión correcta NO es “ya tenemos dos workers reales de ChatGPT compitiendo y el broker funciona”. Eso todavía no fue probado. Los dos contendientes fueron dos llamadas concurrentes originadas desde este mismo chat. Por lo tanto el resultado demuestra una propiedad técnica útil de Drive, no un sistema multi-worker completo.

La clasificación global del experimento es `PARTIAL_PASS`: el transporte Drive → ChatGPT → Drive funcionó; el mecanismo de compare-and-swap basado en revisión evitó un doble claim en una carrera simulada; el flujo real entre dos chats independientes todavía queda pendiente.

---

## 1. Pregunta del experimento

Queríamos responder, con la menor cantidad posible de infraestructura nueva, estas preguntas:

1. ¿Puede Google Drive funcionar provisionalmente como transporte de WorkBlocks y RETURNS para ChatGPT?
2. ¿Puede un worker leer un bloque una sola vez, trabajar localmente y escribir un único resultado sin necesidad de martillar GitHub, Drive o Supabase durante el proceso?
3. ¿Existe alguna primitiva en Drive que permita evitar que dos contenders reclamen el mismo bloque si intentan hacerlo “al mismo tiempo”?
4. ¿Podemos obtener una simulación fiel suficiente como para seguir diseñando el broker sin montar todavía el backend definitivo?

No se intentó resolver todavía:

- autenticación real de workers independientes;
- descubrimiento automático de múltiples bloques READY;
- leases con expiración y recuperación;
- reintentos tras caída de un worker;
- fairness entre workers;
- integración automática de RETURNS;
- un endpoint real `claim_block()`;
- un endpoint real `submit_return()`;
- seguridad de producción;
- rendimiento con decenas o cientos de workers.

---

## 2. Hipótesis

La hipótesis de trabajo fue:

> Podemos aproximar el futuro broker de Prometeo usando Google Drive como almacenamiento/transporte, siempre que distingamos claramente entre “almacenar un bloque” y “coordinar quién lo reclama”.

Para el transporte, Drive sólo necesita soportar dos movimientos conceptuales:

```text
GET_BLOCK
SUBMIT_RETURN
```

Para la coordinación, necesitamos una operación equivalente a:

```text
si esta versión todavía es la versión que yo vi:
    registrar mi claim
si ya cambió:
    rechazar mi claim
```

Esto es un patrón de concurrencia optimista, similar a compare-and-swap. Google Docs expone una revisión de documento que puede exigirse al escribir. Si dos writers usan la misma revisión requerida, el primero que modifica el documento cambia la revisión; el segundo ya no puede escribir contra la revisión vieja y recibe conflicto.

La hipótesis no era que Google Docs deba ser necesariamente el allocator final. Era comprobar si ya teníamos una primitiva útil para simular exclusión sin pedirle al humano cuentas, tokens o configuración adicional.

---

## 3. Contexto arquitectónico

La dirección general de Prometeo que este experimento intenta validar es:

```text
worker genérico
    ↓
claim_block()
    ↓
WorkBlock autosuficiente
    ↓
trabajo local
    ↓
submit_return()
    ↓
RETURN durable
```

El worker no debería navegar todo el proyecto para descubrir qué hacer. El WorkBlock debería contener todo lo necesario para completar una unidad acotada de trabajo:

- `block_id`;
- objetivo;
- inputs;
- read scope;
- write scope;
- reglas;
- referencias necesarias;
- tests;
- contrato del RETURN;
- base version/hash cuando corresponda.

La eficiencia buscada no depende de ahorrar razonamiento. Al contrario: si la inteligencia de ChatGPT se considera abundante, conviene gastar razonamiento dentro de un paquete local y minimizar I/O remoto, coordinación y polling.

El patrón deseado es:

```text
claim → una descarga → mucho trabajo local → una subida → siguiente bloque
```

---

## 4. Infraestructura usada

No se creó un servicio nuevo.

Se utilizó el Google Drive ya conectado al workspace de Prometeo. Dentro de ese espacio se creó una carpeta de prueba:

```text
BROKER_TEST_V1/
```

La prueba terminó conteniendo, entre otros, los siguientes artefactos:

```text
BLOCK-001
RETURN-001
RECEIPT-001

BLOCK-ATOMIC-001
CLAIM-ATOMIC-001
RETURN-ATOMIC-001
```

No se modificó `CURRENT`.

No se publicó nada en GitHub Pages.

No se creó una nueva cola, scheduler o dealer paralelo.

No se dio acceso a ninguna credencial privilegiada a un worker.

---

# PARTE A · TRANSPORTE DRIVE → CHATGPT → DRIVE

## 5. Objetivo de la fase A

Probar el circuito más pequeño posible:

```text
Drive
  ↓
leer BLOCK una vez
  ↓
trabajar localmente
  ↓
escribir RETURN
  ↓
volver a leer RETURN y verificar
```

Era deliberadamente una tarea trivial. El objetivo no era probar inteligencia, sino transporte y cierre del circuito.

---

## 6. BLOCK-001

Se creó `BLOCK-001` con un contrato equivalente a:

```json
{
  "schema": "PROMETEO_WORKBLOCK_V1",
  "block_id": "BLOCK-001",
  "experiment": "BROKER_TEST_V1",
  "status": "READY",
  "objective": "Read this block once, work locally, and return a deterministic result.",
  "input": {
    "numbers": [17, 25, 8, 50],
    "label": "PROMETEO-BROKER-TEST-V1"
  },
  "task": {
    "operation": "sum_numbers",
    "expected_sum": 100
  }
}
```

Además incluía restricciones explícitas:

- no leer otros archivos del proyecto;
- no modificar CURRENT;
- devolver un único resultado y un receipt compacto.

Esto es importante porque la prueba buscaba reproducir la disciplina futura: el worker no explora el sistema entero, recibe un slice acotado.

---

## 7. Ejecución de la fase A

La secuencia real fue:

```text
1. crear BLOCK-001 en Drive
2. leer BLOCK-001 desde el conector de Drive
3. procesar [17, 25, 8, 50] localmente
4. obtener 100
5. crear RETURN-001
6. crear RECEIPT-001
7. volver a leer ambos desde Drive
8. comprobar contenido
```

El resultado del bloque fue:

```text
17 + 25 + 8 + 50 = 100
```

`RETURN-001` declaró:

```text
status = RETURNED
sum = 100
expected_sum = 100
matches_expected = true
```

El receipt registró conceptualmente:

```text
block_reads = 1
return_writes = 1
receipt_writes = 1
```

También dejó explícito que `CURRENT` no había sido modificado.

---

## 8. Resultado de la fase A

**Resultado: PASS.**

Quedó probado que, con la integración existente de Drive, este chat puede:

- obtener una unidad de trabajo desde Drive;
- trabajar sin volver a consultar el proyecto durante esa unidad;
- producir un resultado durable;
- volver a leer ese resultado y verificar que lo subido es lo que se esperaba.

Esto no demuestra todavía que cualquier chat independiente tenga exactamente los mismos permisos o comportamiento, pero sí demuestra que el transporte básico está disponible en el entorno actual.

---

# PARTE B · EXCLUSIÓN DE CLAIMS

## 9. Problema que queríamos evitar

El problema clásico es:

```text
worker A mira BLOCK-17 → READY
worker B mira BLOCK-17 → READY
worker A dice "me lo llevo"
worker B dice "me lo llevo"
```

Si “mirar” y “reservar” son operaciones separadas sin control de concurrencia, ambos pueden creer legítimamente que ganaron.

Eso genera:

- trabajo duplicado;
- RETURNS incompatibles;
- conflictos de integración;
- gasto innecesario de inteligencia;
- métricas falsas de productividad.

El requerimiento correcto es una transición indivisible o equivalente a:

```text
READY → CLAIMED(worker_id)
```

con un único ganador.

---

## 10. Primer intento: Supabase como broker

Antes de usar Drive para la exclusión, se intentó crear una tabla y una función de claim en el proyecto Supabase existente.

El diseño preparado era aproximadamente:

```text
blocks(
  block_id,
  status,
  storage_ref,
  claimed_by,
  claimed_at,
  lease_expires_at,
  returned_at,
  result_ref
)
```

Y el claim iba a usar una transacción PostgreSQL basada en una selección con bloqueo y `SKIP LOCKED`, seguida por la transición a `CLAIMED`.

Ese diseño es más cercano a lo que usaríamos en un broker serio, porque Postgres sí está diseñado para arbitrar concurrencia entre múltiples clientes.

Sin embargo, la migración no llegó a ejecutarse. El conector de Supabase devolvió un error de conexión a Postgres (`ECONNREFUSED`).

Por lo tanto:

**Supabase no fue validado en este experimento.**

No se debe inferir que la tabla exista, que la función exista o que el claim de Supabase haya sido probado.

La falla del conector motivó una pregunta útil: ¿podemos simular el requisito de exclusión usando únicamente la infraestructura que ya está funcionando, es decir, Drive?

---

## 11. Mecanismo elegido en Drive

Google Docs mantiene una revisión del documento.

Al hacer una actualización se puede exigir:

```text
requiredRevisionId = R
```

Eso significa:

> Aplicá mi escritura sólo si el documento sigue en la revisión R que yo conozco.

Si alguien modifica el documento antes, la revisión cambia.

Entonces otro writer que intente escribir exigiendo R recibe rechazo.

Conceptualmente:

```text
estado inicial: revision = R1

worker A escribe usando requiredRevisionId = R1
→ éxito
→ revision pasa a R2

worker B escribe usando requiredRevisionId = R1
→ rechazo
→ R1 ya no es current
```

Esto no es una “cola” por sí mismo. Es una primitiva de control optimista de concurrencia.

---

## 12. Preparación de BLOCK-ATOMIC-001

Se creó un bloque separado:

```text
BLOCK-ATOMIC-001
```

Su objetivo explícito fue:

> Probar que dos contenders que compiten por un único bloque READY no puedan ambos registrar un claim exitoso.

El bloque incluía estas reglas:

```text
Exactly one worker may own this block.
Loser must receive no claim.
Only the winner may submit the RETURN.
```

También se creó un documento separado para representar el registro de claim:

```text
CLAIM-ATOMIC-001
```

Se inicializó con una línea representando el bloque disponible:

```text
BLOCK-ATOMIC-001|READY
```

Después de esa escritura se tomó la revisión exacta del documento como base común de la carrera.

---

## 13. Cómo se simuló la carrera

Este punto tiene que quedar extremadamente claro porque fue inicialmente fácil expresarlo de forma demasiado amplia.

**No se lanzaron dos chats reales de ChatGPT.**

No existieron dos conversaciones independientes actuando como workers externos.

Lo que se hizo fue, desde este mismo chat, emitir dos intentos concurrentes de escritura mediante la herramienta de Google Drive.

Los dos intentos usaron:

- el mismo documento `CLAIM-ATOMIC-001`;
- la misma revisión base;
- la misma posición de escritura;
- identidades lógicas diferentes: `worker-A` y `worker-B`.

Conceptualmente:

```text
           misma revisión R1
                 │
          ┌──────┴──────┐
          │             │
      worker-A       worker-B
          │             │
       write(R1)      write(R1)
          │             │
          └──────┬──────┘
                 │
             Google Docs
```

Los dos llamados se enviaron de manera concurrente.

---

## 14. Resultado real de la carrera

El resultado observado fue:

```text
worker-A → ACCEPTED
worker-B → REJECTED
```

La escritura de `worker-A` cambió la revisión del documento.

La escritura de `worker-B` fue rechazada con un error equivalente a:

```text
The required revision ID does not match the latest revision.
```

Al volver a leer el documento, el contenido mostraba únicamente el claim ganador:

```text
CLAIM|worker-A
BLOCK-ATOMIC-001|READY
```

No apareció un claim de `worker-B`.

Por lo tanto, para esa carrera concreta:

```text
contenders = 2
accepted claims = 1
rejected claims = 1
duplicate accepted claims = 0
```

---

## 15. RETURN del ganador

Después de determinar el ganador lógico se volvió a leer `BLOCK-ATOMIC-001` y se creó:

```text
RETURN-ATOMIC-001
```

El RETURN registró:

```text
worker_id = worker-A
status = RETURNED
claim_winner = worker-A
claim_loser = worker-B
loser_result = REVISION_MISMATCH_REJECTED
atomicity_passed = true
```

Además declaró que `CURRENT` no había sido modificado.

---

## 16. Qué mide realmente esta prueba

La prueba mide una cosa muy específica:

> Dos writers que intentan modificar un Google Doc exigiendo exactamente la misma revisión base no pueden ambos completar exitosamente esa escritura si uno de ellos cambia la revisión antes del otro.

Ésa es una propiedad real y útil.

Permite construir una forma de compare-and-swap:

```text
leí estado en revision R
quiero reclamar
escribo sólo si sigue R
```

Si pierdo, debo volver a leer y buscar otro bloque.

---

## 17. Qué NO mide

No mide que:

- dos chats independientes puedan descubrir y reclamar automáticamente trabajos;
- el claim sobreviva correctamente a múltiples procesos distribuidos durante horas;
- Drive sea un buen allocator final;
- un worker pueda renovar un lease;
- un claim abandonado vuelva a READY;
- la selección de tareas sea justa;
- el sistema tolere 50 contenders;
- el sistema maneje 50 bloques simultáneos eficientemente;
- los claims tengan aislamiento semántico por bloque;
- un RETURN sólo pueda ser escrito realmente por el ganador mediante permisos criptográficos;
- exista autenticación por worker;
- el worker pueda hacer `SUBMIT_NEXT` automáticamente.

Tampoco mide latencia o throughput de forma confiable, porque no se instrumentaron tiempos monotónicos alrededor de cada herramienta.

---

## 18. Por qué el resultado global es PARTIAL_PASS

Sería incorrecto etiquetar todo como `PASS` sin matices.

La clasificación correcta es:

```text
TRANSPORT TEST             PASS
DRIVE REVISION EXCLUSION   PASS
REAL MULTI-CHAT CLAIM      NOT_TESTED
LEASE/RECOVERY             NOT_TESTED
PRODUCTION BROKER          NOT_IMPLEMENTED
GLOBAL EXPERIMENT          PARTIAL_PASS
```

Esto evita convertir una prueba de una primitiva técnica en una afirmación sobre un sistema que todavía no existe.

---

# ANÁLISIS CRÍTICO

## 19. ¿Podríamos usar Google Docs como allocator provisional?

Sí, técnicamente, pero con cautela.

La ventaja principal es enorme para la etapa actual: ya está disponible, ya tenemos acceso y permite probar concurrencia sin que el humano configure un servicio nuevo.

Pero usar un documento central como ledger trae varios problemas.

### 19.1 Conflictos falsos

Si todos los claims viven en un mismo documento, cualquier modificación cambia la revisión global.

Entonces:

```text
worker A reclama BLOCK-1
```

podría hacer fallar:

```text
worker B reclama BLOCK-97
```

aunque los dos bloques sean independientes.

Eso reduce mucho el paralelismo.

Una mitigación provisional sería usar un documento de claim por bloque, o particionar el ledger.

### 19.2 Descubrimiento

El control de revisión evita dos escrituras sobre la misma base, pero no resuelve automáticamente cómo cada worker encuentra “el próximo READY” de manera eficiente.

Todavía haría falta una capa que compile o exponga el frontier.

### 19.3 Leases

Un claim sin lease puede quedar muerto para siempre si el worker desaparece.

Necesitamos campos equivalentes a:

```text
claimed_at
lease_expires_at
generation
```

Y una regla de recuperación segura.

### 19.4 Autorización

En esta simulación `worker-A` y `worker-B` son etiquetas lógicas, no identidades criptográficamente verificadas.

Un broker real debe impedir que otro worker entregue un RETURN haciéndose pasar por el ganador.

### 19.5 Escala y cuotas

Drive puede ser excelente como transporte de bloques y resultados, pero no necesariamente como base de coordinación de alta frecuencia.

El objetivo sigue siendo minimizar llamadas, por lo que esto no es necesariamente un problema para pruebas pequeñas. A gran escala conviene que la coordinación viva en un sistema transaccional liviano.

---

## 20. Implicación importante: separar control plane y data plane

El experimento refuerza una separación útil:

```text
CONTROL PLANE
- READY / CLAIMED / RETURNED
- worker_id
- lease
- generation
- hashes
- timestamps

DATA PLANE
- BLOCK.zip
- INPUTS
- assets
- RETURN.zip
- patches
- screenshots
```

El control plane puede ser diminuto.

El data plane puede vivir donde convenga:

- Drive hoy;
- disco local mañana;
- B2 después;
- cualquier StorageAdapter compatible.

Eso evita volver a depender de Supabase Storage, que ya mostró límites prácticos para assets pesados.

---

## 21. Implicación para ChatGPT

El worker ideal no debería recibir acceso general a Drive o GitHub y recorrerlos libremente.

La interfaz futura debería parecerse sólo a:

```text
claim_block()
submit_return()
```

`claim_block()` tendría que:

1. identificar al worker;
2. encontrar un bloque compatible READY;
3. hacer el claim de manera atómica;
4. devolver el paquete o una referencia de descarga temporal;
5. registrar lease/generation.

`submit_return()` tendría que:

1. validar que el worker es dueño del claim;
2. validar `block_id` y generación;
3. aceptar el RETURN en un namespace acotado;
4. marcar RETURNED;
5. emitir el evento que permite integración o `SUBMIT_NEXT`.

El worker no debería saber si el paquete vino de Drive, B2, la laptop vieja o cualquier otro backend.

---

## 22. Implicación de seguridad

La prueba no requirió entregar secretos a un worker, y esa propiedad debería conservarse.

El diseño futuro debe mantener:

```text
worker capability:
  read exact block
  write exact return
  expire soon
```

Y nunca:

```text
GitHub admin token
Supabase service role
storage master key
write CURRENT
```

Un worker descartable debe tener un radio de explosión pequeño.

Si la arquitectura se hace bien, incluso un worker defectuoso sólo puede arruinar su candidato, no el sistema completo.

---

## 23. Métricas obtenidas

Las métricas honestamente observables de este experimento son pequeñas pero útiles.

### Fase A

```text
BLOCK reads from Drive:       1
expected result:              100
observed result:              100
RETURN durable:               yes
RETURN re-read verification:  yes
CURRENT modified:             no
```

### Fase B

```text
logical contenders:           2
concurrent write attempts:    2
accepted:                     1
rejected:                     1
double accepted claim:        0
winner:                       worker-A
loser:                        worker-B
rejection cause:              stale required revision
CURRENT modified:             no
```

### No medido

```text
end-to-end duration
p50/p95 latency
throughput
quota consumption
multi-chat independence
failure recovery
lease expiry
50-worker contention
```

No deben inventarse valores para esos campos en el widget.

---

## 24. Evidencia durable creada

La evidencia del experimento vive en la carpeta `BROKER_TEST_V1` del workspace de Drive.

Los nombres relevantes son:

```text
BLOCK-001
RETURN-001
RECEIPT-001
BLOCK-ATOMIC-001
CLAIM-ATOMIC-001
RETURN-ATOMIC-001
```

Para una futura publicación en GitHub no sería necesario publicar IDs privados de Drive. Alcanza con incluir:

- los contratos normalizados;
- el contenido relevante de los RETURNS;
- la explicación del método;
- el error del contender perdedor;
- hashes o receipts cuando estén disponibles.

La fuente privada puede conservar detalles de transporte que no conviene exponer en una proyección pública.

---

# CONSECUENCIAS DE DISEÑO

## 25. Regla 1: no llamar “worker” a cualquier etiqueta simulada

Este experimento produjo una corrección conceptual importante.

En Prometeo, “worker” debería reservarse para una capacidad realmente independiente que recibe un contrato y ejecuta trabajo.

Cuando dos llamadas se originan desde el mismo chat para ensayar concurrencia, la terminología correcta es:

```text
contender A
contender B
```

o:

```text
simulated worker-A
simulated worker-B
```

No “dos workers reales”.

Esto importa porque las métricas futuras deben distinguir:

```text
simulated contender
external ChatGPT worker
internal WC
local deterministic worker
```

---

## 26. Regla 2: un experimento debe registrar qué demuestra y qué no

Cada nota futura del widget EXPERIMENTOS debería incluir dos campos obligatorios:

```text
PROVES
DOES_NOT_PROVE
```

Esto reduce el riesgo de que una prueba local pequeña se convierta, dos chats después, en una falsa afirmación de producción.

---

## 27. Regla 3: registrar el método antes que el resultado bonito

No alcanza con:

```text
PASS
```

Hay que poder responder:

- ¿quién ejecutó la prueba?;
- ¿desde dónde?;
- ¿qué herramientas reales se usaron?;
- ¿qué era simulado?;
- ¿qué datos fueron leídos?;
- ¿qué datos fueron escritos?;
- ¿qué estado quedó después?;
- ¿cómo se verificó el resultado?;

El widget EXPERIMENTOS debe servir como cuaderno de laboratorio, no como tablero de marketing interno.

---

## 28. Regla 4: separar experimento de promoción

Que un mecanismo pase un experimento no significa que deba convertirse automáticamente en CURRENT.

Flujo correcto:

```text
experiment
  ↓
evidence
  ↓
interpretation
  ↓
design decision
  ↓
implementation candidate
  ↓
verification
  ↓
promotion
```

No:

```text
experiment PASS → production
```

Por eso esta carpeta y esta nota son borradores locales.

---

# SIGUIENTE EXPERIMENTO RECOMENDADO

## 29. EXP-002 · Dos chats reales reclamando un único bloque

El próximo experimento útil no debería agregar más teoría. Debería cerrar exactamente la brecha que quedó abierta.

Objetivo:

> Lanzar dos chats reales de ChatGPT con el mismo prompt universal y hacer que ambos intenten reclamar trabajo sin coordinación humana entre ellos.

Configuración mínima:

```text
1 bloque READY
2 chats independientes
1 mecanismo de claim
```

Resultado esperado:

```text
chat A → CLAIM WON
chat B → CLAIM LOST / NO BLOCK
```

O al revés.

Criterio importante:

Sólo el ganador puede obtener el contenido material del bloque o, como mínimo, sólo el ganador puede producir un RETURN aceptable para esa generación.

Luego repetir con:

```text
2 bloques READY
2 chats
```

para comprobar que el perdedor del primer claim puede recuperar otro bloque y no quedarse inútil.

---

## 30. EXP-003 · Lease y recuperación

Después:

```text
chat A reclama BLOCK-X
chat A no devuelve nada
lease vence
chat B reclama nueva generación de BLOCK-X
```

Hay que probar generation fencing para que un RETURN tardío de A no pueda pisar el resultado legítimo de B.

---

## 31. EXP-004 · Fan-out pequeño

Sólo después de que claim y lease estén probados:

```text
3 chats
3-6 bloques READY
```

Medir:

- claims únicos;
- bloques completados;
- duplicados;
- tiempo de integración;
- external reads/writes;
- cantidad de intervención humana.

No saltar directamente a 50 workers hasta saber dónde está el cuello de botella.

---

# FORMATO FUTURO DEL WIDGET EXPERIMENTOS

## 32. Qué debería mostrar cada experimento

Cada experimento debería tener una ficha compacta y una nota expandible.

Campos mínimos:

```text
ID
TITLE
DATE
STATUS
QUESTION
HYPOTHESIS
METHOD
ENVIRONMENT
ARTIFACTS
MEASUREMENTS
RESULT
PROVES
DOES_NOT_PROVE
LIMITATIONS
DECISION
NEXT_EXPERIMENT
```

Estados posibles:

```text
DRAFT
RUNNING
PASS
FAIL
PARTIAL_PASS
INCONCLUSIVE
SUPERSEDED
```

El estado no debería representar entusiasmo. Debería representar evidencia.

---

## 33. Historial

Si una nota se corrige después de descubrir una exageración, eso debe quedar registrado.

Ejemplo de esta prueba:

```text
correction:
"two workers" → "two concurrent simulated contenders from one chat"
```

La corrección no invalida el experimento. Lo vuelve más preciso.

---

## 34. Publicación pública vs privada

La versión pública puede incluir:

- método;
- resultados;
- diagramas;
- nombres genéricos de artefactos;
- métricas;
- decisiones.

La versión privada puede conservar además:

- URLs internas;
- IDs de Drive;
- tokens de sesión si alguna vez existieran, aunque idealmente no deben registrarse;
- datos personales;
- trazas completas sensibles.

El widget debería trabajar sobre una proyección sanitizada si alguna vez se publica desde un workspace privado.

---

# CONCLUSIÓN

EXP-001 logró dos cosas concretas.

Primero, probó que el transporte mínimo que queremos para los workers ya puede simularse con infraestructura existente:

```text
Drive → Block → ChatGPT → Return → Drive
```

Segundo, probó que el control de revisión de Google Docs puede actuar como una primitiva de exclusión optimista: dos intentos concurrentes que parten de la misma revisión no pudieron ambos escribir exitosamente. Hubo un único ganador y cero claims duplicados aceptados en esa carrera.

Sin embargo, no hubo dos chats reales de ChatGPT. Por lo tanto, todavía no existe evidencia end-to-end de un allocator multi-worker autónomo. El experimento valida una pieza, no el sistema completo.

La consecuencia de diseño más importante es que podemos seguir avanzando sin decidir hoy el almacenamiento definitivo. El worker futuro puede ver sólo dos operaciones estables:

```text
claim_block()
submit_return()
```

Mientras el backend puede evolucionar por detrás:

```text
Drive ahora
→ broker transaccional después
→ laptop/B2/otro storage para datos
```

La próxima prueba debe ser más real, no más grande: dos chats independientes, un bloque, un único claim aceptado. Si eso pasa, recién entonces tendrá sentido probar leases, varios bloques y fan-out.

---

# Versión breve para mostrar dentro del widget

**EXP-001 · Drive Broker / Claim atómico · PARTIAL PASS**

Se probó un circuito mínimo donde ChatGPT lee un WorkBlock desde Drive una sola vez, trabaja localmente y devuelve un RETURN durable. Luego se simuló una carrera de claim con dos contenders concurrentes usando la misma revisión de un Google Doc. El primer write fue aceptado y el segundo rechazado por revisión obsoleta, dejando un único claim ganador y cero duplicados aceptados.

La prueba demuestra que Drive puede servir como transporte provisional y que su control de revisión puede implementar exclusión optimista. No demuestra todavía que dos chats reales de ChatGPT puedan reclamar trabajos de forma independiente. El próximo experimento debe usar dos chats reales sobre un único bloque READY.
