# Prometeo · Continuar última charla sin transportar mensajes · V1

**Tipo:** regla de recuperación para un chat nuevo. **Estado:** fuente durable CANDIDATE, no hook automático de ChatGPT ni reinstalación de una instancia. **Owner intelectual:** \`tv/chat/relevo/CONTINUIDAD_INTELECTUAL_V2.md\`. No crea backend, scheduler, cola, proyecto, chat ni registro paralelo de encargos.

## Intención humana y regla de uso

Un nuevo chat del **Proyecto persistencia** recibe un mensaje como «continuar última charla», «sigamos donde estábamos», «seguí nuestra conversación» o «retomá el hilo». Debe recuperar y reanudar una conversación de **intercambio sostenido de ideas y dirección**. No debe confundirla con «qué pasó con J01» ni con el último chat de prompt único que programó un juego o PR.

### Tipos de chat
- **CONVERSACION_CONTINUA (diálogo/director):** sucesivos turnos humanos que discuten decisiones, hipótesis, desacuerdos, prioridades y preguntas abiertas. La respuesta siguiente debe intervenir en ese mismo razonamiento y no limitarse a narrar un estado.
- **EJECUTOR_PUNTUAL (encargo):** un mensaje humano contiene una tarea de implementación/investigación/diseño con objetivo y fin verificable; el resultado queda en owner/PR y puede continuar otro ejecutor, pero no desplaza la última charla del director.
- **CONSULTA_DE_ESTADO:** responde con datos actuales sin registrar automáticamente un nuevo encargo ni cambiar el hilo de conversación.
- **AMBIGUA:** el texto de un mensaje por sí solo no prueba el tipo; usar contexto de conversación y señales de intención. La frase explícita «continuar última charla» inclina a diálogo; «continuar el PR #98» inclina al owner del PR; el usuario manda.

## Algoritmo de reingreso (aplicar en el nuevo chat, no simular en tests)

1. **Responder a la intención real antes que los protocolos.** Ante «continuar última charla» intentar recuperar las conversaciones previas del Proyecto usando capacidades de contexto/historial de ChatGPT disponibles en esa sesión. Si existe acceso a búsqueda de contexto personal, buscar *última conversación sostenida de dirección/reflexión*, sus mensajes recientes, pregunta abierta y fecha comprobable. No inventar una orden temporal que la herramienta no devolvió. Ordenar por mensajes reales cuando los datos lo permiten; **no** elegir el PR más reciente como última conversación.
2. **Recuperar memoria pública intelectual sin transcripciones privadas:** leer \`gh-pages:tv/chat/AGENT_ENTRY_V1.md\`, \`tv/chat/relevo/CONTINUIDAD_INTELECTUAL_V2.md\` y \`tv/chat/relevo/conversaciones/LATEST_PUBLIC_V1.json\`; recuperar solamente el checkpoint referenciado y fuentes dinámicas pertinentes. Esta proyección es un **fallback técnico** si el historial nativo no alcanza, nunca prueba que su episodio es el más reciente de todos los chats privados.
3. **Resolver identidad y actualidad:** elegir conversación explícitamente nombrada por el humano si la hay; en su defecto la última conversación personal *recuperable* con hilo de diálogo significativo; en ausencia de esa prueba usar el checkpoint público y **decir que es el último checkpoint disponible**, no «tu última charla literal». Si hay ambigüedad real entre dos hilos igualmente plausibles, hacer UNA pregunta de desambiguación breve, no un formulario ni exigir copiar mensajes.
4. **Continuación sustantiva, no ceremonia:** recordar el argumento/pregunta abierto en una frase como máximo, y avanzar con una idea, decisión crítica, respuesta o siguiente discusión concreta. Evitar el discurso «soy el mismo chat» y los resúmenes kilométricos de Prometeo no solicitados. Conservar el modo coloquial rioplatense y el criterio técnico; el parecido de estilo no certifica identidad.
5. **Cuando se tomen decisiones operativas públicas relevantes**, registrar nuevo episodio sintético en el owner conversacional ya existente con procedencia y readback, y actualizar \`LATEST_PUBLIC_V1.json\` con SHA/CAS sin perder checkpoints ajenos. **No** guardar por defecto cada mensaje, audio, notas personales, datos íntimos ni conversaciones íntegras en GitHub público. Un mensaje inocente que solo conversa no obliga a un commit, salvo pedido explícito de continuidad durable.
6. **No incrementar automáticamente** \`STATE_V1.json.last_hop\`: ese contador es de una prueba histórica de relevos con contrato propio, no de cada nueva conversación ni cada acuse. Tampoco crear un \`REQUEST_CAPTURED\` de tarea al interpretar «continuar última charla»: la intención es conversar.
7. **Límites honestos:** un chat nuevo es una nueva instancia y no hereda todos los tokens ni razonamiento oculto. La memoria/historial recuperable puede resumir u omitir; sin hook de ChatGPT para exportar automáticamente la conversación, no prometer continuidad exacta, cronología exhaustiva ni «retomar el último mensaje privado» por mera existencia de este archivo.

## Qué conservar para que la experiencia se parezca a continuar una conversación
- Prioridad real y por qué se eligió; **la tarea reciente no reemplaza un objetivo estratégico**.
- Pregunta abierta y última respuesta intelectual relevante (en paráfrasis pública, no transcripción).
- Opciones comparadas y por qué se descartan; desacuerdos/correcciones humanas.
- Quién está trabajando en paralelo, pero solo desde PR/receipts *frescos* cuando sea necesario.
- Próxima idea a explorar y límites epistemológicos, no una lista de prompts por defecto.
- Contexto privado: usar solo conectores autorizados o contexto que ChatGPT ya pueda consultar, nunca GitHub público.

## Comportamientos observables / falsadores

**Prueba A:** otro chat recibe solo «continuar última charla». Reconoce diálogo frente a ejecutores y responde a la pregunta abierta del hilo correcto sin que el humano copie contexto. Fuente: historial conversacional real si accesible, o checkpoint público explícitamente marcado como tal.

**Prueba B:** se abren cinco chats ejecutores con commits posteriores a la última charla; el selector NO cambia el hilo del director por recencia de PRs.

**Prueba C:** el último hilo recuperable es privado/no accesible; no inventa sus detalles, usa checkpoint público o solicita identificar tema si imprescindible.

**Prueba D:** una nueva decisión de la conversación cambia el objetivo principal temporal o permanente; el nuevo chat aplica la corrección, no queda preso de un resumen viejo.

**Prueba E:** pregunta «¿cómo va M01?» no se convierte en relevo de charla ni crea pedido de ejecución.

**Gates reales pendientes:** un segundo chat real abre sin copiar nada y recupera hilo correcto; comparación entre lo que respondió y el punto abierto original; actualización de checkpoint y un tercer chat; pruebas longitudinales de varios relevos. El texto y tests de esquema NO constituyen esos gates.

## Relación con tareas actuales
J01 + M01 (PR #100 y #98) tratan captura, trabajo y visualización de **encargos**. Este contrato trata reanudación de **conversaciones**; no interferir con su \`index.html\`, \`reentrada.json\`, máquina de estados ni AGENT_ENTRY durante la integración. J06 debe poder reutilizar esta distinción para archivo intelectual sin mezclarlos como chats individuales.
