# Prometeo · Conversación directora · punto de reentrada público y sanitario

**Tipo:** `CONVERSATION_CHECKPOINT`, no chat completo ni reemplazo de ChatGPT.
**Identificador lógico:** `prometeo-conversacion-directora`.
**Marcado:** `DIALOGUE` y `LATEST_KNOWN_DIALOGUE` para el alcance de este checkpoint, NO último chat de toda la cuenta.
**Estado:** contexto de conversación interpretado y conservado; transferencia a un chat nuevo todavía requiere prueba humana independiente.
**Fuente:** conversación del Proyecto persistencia sobre autonomía, encargos y continuidad; solo se registran criterios públicos relativos a Prometeo. Sin transcripciones ni datos privados.
**Procedencia temporal:** la fecha de creación/publicación es la de los commits GitHub; no inferir la hora de envío del último mensaje ni un identificador de chat no expuesto.

## La distinción que quiere el humano

Hay dos roles con vidas distintas:

- `EXECUTOR`: chats a los que se entrega un prompt para construir un producto, verificar algo o realizar un encargo. Pueden generar PR, pruebas, archivos y resultados; **jamás ocupan automáticamente la posición «última charla»**, aunque hayan terminado hace un segundo.
- `DIALOGUE`: conversación prolongada de dirección, creación, crítica, ideas y decisiones entre humano y asistente. Es la conversación de referencia que se quiere **reencarnar** al iniciar otra instancia cuando se agotan mensajes o se decide cambiar de chat. Conserva preguntas abiertas, cambios de postura, límites y vínculos a resultados materiales.
- `STATUS`: consulta puntual sobre un estado. No reemplaza `DIALOGUE` ni escribe un nuevo hilo por consultar un PR.

«Continuar última charla» significa **continuar el hilo `DIALOGUE` vigente**, no abrir el último ejecutor ni ejecutar pendientes porque aparecieron en su historial. Una tarea nueva dentro del diálogo no convierte automáticamente la charla de dirección en chat ejecutor; atender la intención local preservando su identidad.

## De qué veníamos hablando al registrar este checkpoint

1. Prometeo debe permitir **un mensaje natural por encargo** en chats descartables, registrar pronto un ACK duradero, mostrar progreso y resultados comprobados en la misma página pública y conservar los artefactos y la continuidad entre otros chats.
2. La persona sostuvo una **conversación directora** separada, evaluando prioridades, calidad, interfaces móviles, arte no geométrico, briefs recuperables y consolidación de grandes tareas. La preferencia es hablar naturalmente, sin un protocolo ni pedir cada vez nuevos prompts largos.
3. Se creó una biblioteca de **12 briefs J01–J12**, y M01 integró J02–J05 en un solo trabajo ambicioso. Se enviaron J01, J06, J07 y M01 a chats de ejecución. Las entregas se inspeccionan en GitHub; un trabajo abierto no implica que ese chat siga corriendo.
4. En la revisión anterior a este checkpoint: M01 **PR #98 draft/candidato**, auditoría independiente **PR #96 draft/candidato** con déficit de ACK temprano; diseño oscuro y PULSO tenían PRs fusionados, pero la integración de captura inicial + dashboard + prueba multi-chat verdadera estaba pendiente. Es un **snapshot**, nunca un estado actual: consultar HEAD y fuentes frescas solo cuando la pregunta lo demande.
5. **Idea recién surgida y prioridad de esta conversación:** distinguir explícitamente `DIALOGUE` de `EXECUTOR`. Al escribir «continuar última charla» en un chat nuevo, la persona quiere recuperar *este diálogo intelectual y su criterio* sin pegar transcripciones, sin que el último ejecutor se haga pasar por «la charla anterior» y sin quedarse atada al límite de mensajes del hilo viejo.
6. El próximo paso de esta charla es **conversar sobre cómo hacer verdaderamente continuo ese relevo** y comprobar la recuperación fría con la frase simple. Evitar disparar nuevas tareas, cambiar la misión global o inundar de referencias técnicas una reentrada informal.

## Qué debe reconocer un sucesor

- **Norte:** memoria durable + autonomía de chats descartables + productos materiales verdaderos, sin copiar respuestas, con misión estratégica de persistencia.
- **Juicio:** ambición alta, preferencia por encargos integrales bien verificados en lugar de repartir mini piezas, diseño excepcional con prioridad a celular, arte auténtico, estados honestos, fallos y conocimientos archivados.
- **Puntos abiertos:** acuse inicial temprano, último chat conversacional vs últimos ejecutores, contexto privado no expuesto a GitHub, reentrada sin comandos, pruebas reales A→B→C, integración M01 cuando J01 sea verificable.
- **No suplantación:** nuevo modelo, misma orientación recuperable, no identidad o memoria literal transferida. Si hay memoria personal de conversaciones disponible, consultar contexto privado pertinente para enriquecer; distinguirlo de este checkpoint técnico público y no publicarlo sin autorización.
- **Respuesta correcta al «continuar» puro:** prosa humana breve del estilo «Veníamos separando los chats de trabajo de nuestra charla principal. Lo último que querías era poder continuar esta conversación desde otro chat sin perder nuestras decisiones, aunque abrieras diez chats ejecutores entre medio. El relevo está documentado, pero falta probarlo desde una conversación nueva». Después seguir la conversación del usuario. No contestar con una lista de PRs a menos que el usuario pregunte por el estado.

## Límites y actualización responsable

- Este documento **no recibe eventos automáticamente desde la app ChatGPT** y no sabe cuál fue literalmente el último chat abierto. Por eso «última charla» significa **última charla directora conservada en el checkpoint**, que puede estar atrasado si una nueva conversación no actualizó su estado. Nunca ocultar esa diferencia.
- **No guardar transcripción íntegra, asuntos privados ni identidad/chat ID inventados en un repo público.** Un resumen más íntimo necesita un owner privado y acceso autenticado reales.
- Un chat `EXECUTOR` que lee este archivo para orientar su labor no se convierte en dueño de la conversación. Sólo una conversación `DIALOGUE` actualiza este checkpoint por decisión humana explícita o una nueva decisión estratégica material relevante, con commit/readback que preserve lo anterior.
- Si hay dos conversaciones de dirección concurrentes, **no seleccionar por último commit ni sobrescribir**: exponer ambigüedad y pedir una selección sencilla si de verdad no se puede determinar cuál continuar.
- Si el resumen se desactualiza o discrepa de una decisión humana posterior, prevalece la decisión más reciente corroborable; conservar las razones del cambio en el owner correspondiente, no borrar el contexto anterior.

## Contexto propietario, sin duplicar autoridad

- `gh-pages:tv/chat/AGENT_ENTRY_V1.md`: entrada de intención.
- `gh-pages:tv/chat/RELEVO_ENTRE_CHATS_V1.md` y `tv/chat/relevo/CONTINUIDAD_INTELECTUAL_V2.md`: criterio y continuidad del rol conversacional.
- `gh-pages:tv/chat/relevo/STATE_V1.json`: episodios de relevo, **no** puntero a último chat abierto.
- `gh-pages:tv/chat/relevo/RETOMAR_V1.md`: misión general y estado de productos.
- `gh-pages:tv/chat/relevo/retomar/IDEAS_ENCARGOS_DE_ALTA_CALIDAD_V1.md` y `MISION_M01_TABLERO_VIVO_DE_ENCARGOS_V1.md`: trabajos y briefs, **no** conversaciones para retomar.

**Criterio de aceptación pendiente:** un chat nuevo recibe únicamente «continuar última charla», sin prompt de relevo, lee esta fuente y su continuidad intelectual, responde correctamente sobre el diálogo anterior, mantiene el tono natural, no hace un nuevo PR ni confunde a J12/M01 con el chat principal. Un segundo ciclo de conversación vuelve a guardar una decisión y un tercer chat la recupera sin copy-paste.