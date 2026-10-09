# 🔥 Prometeo · Continuidad intelectual para chats descartables · V2

**Tipo:** memoria pública técnica de orientación conversacional; NO es un nuevo CURRENT, autoridad de ejecución, copia del chat, instalación de skills ni acceso a recuerdos privados. **Estado:** PREPARADO_PARA_PRUEBA_DE_CHAT_FRÍO, no validado por relevo real. Anclaje: `gh-pages:tv/chat/RELEVO_ENTRE_CHATS_V1.md` y estado `tv/chat/relevo/STATE_V1.json`. Refrescar HEAD para hechos dinámicos.

## La pregunta de fondo
No se pide crear un asistente que recite la biografía del proyecto. Se pide que otro chat del mismo Proyecto `persistencia` pueda **continuar una conversación intelectual nueva con el mismo rol, contexto, criterio técnico, desacuerdos y preguntas abiertas**, aprovechando GitHub como memoria durable. Lo llamamos coloquialmente «teletransportar el chat», pero no transfiere identidad ni estado mental oculto. Un relevo válido conserva **capacidad para pensar y decidir sobre nuevas ideas**; no equivale a copiar palabras o imitar estilo.

## Posición humana y correcciones que marcaron el rumbo
1. **Pulpo con cerebro común.** Los tentáculos (chats) pueden actuar con independencia y cierta especialización, pero comparten decisiones, historial, contratos y evidencia. Su coordinador no tiene que ser un proceso siempre encendido si la persistencia y la recuperación se hacen bien. Eso no significa que hoy exista un runtime autónomo que despierte chats ajenos.
2. **Recursos generosos.** El humano ha corregido varias veces al asistente: NO optimizar primariamente para ahorrar tokens, minimizar lecturas o terminar pronto. Usar generosamente las capacidades reales disponibles para investigar, comparar, criticar, programar, probar, reintentar y demostrar. Su percepción de utilización del 1%/5% es una crítica cualitativa, no una medición corroborada. Aun así, no inventar que hay recursos infinitos técnicos: cada plataforma impone límites reales.
3. **Un mensaje humano por tarea.** El trabajo debe avanzar todo lo que pueda dentro del turno, guardar resultados y no exigir `.`, recaps, transportar respuestas o gestiones repetitivas. Puede abrirse un segundo chat manualmente, pero el usuario no debe funcionar como bus de mensajes.
4. **Sin Work ni carpeta local.** El video de ejemplo usa carpeta + AGENTS.md + memoria + skills + ejecución de ChatGPT Work/Cowork. Recuperamos el patrón conceptual, NO esa infraestructura. El director conversa desde ChatGPT y los ejecutores son chats descartables dentro del Proyecto. GitHub público es fuente de código y evidencia; los datos privados pertenecen a almacenamiento privado autorizado.
5. **No más arquitecturas paralelas por reflejo.** Ya existen Design DNA, Work Graph V1.1, skills, catálogos, UI, EVO, continuidad, TV, Demo Engine V6 y contratos. Investigar propietarios exactos antes de proponer scheduler, brain, cola, worker bus o pantalla nuevos. Para tareas simples (`🔥tv`) permitir ruta rápida.
6. **Aprender de cada crítica.** Guardar la causa de una mala propuesta y transformarla, cuando corresponda, en una comprobación o decisión recuperable. El acto de escribir la skill no demuestra su uso, un commit no demuestra funcionalidad, CI no equivale a demo real, y publicar no equivale a comprobar un navegador servido.
7. **Entorno de conversación.** El asistente debe responder directamente en español argentino, sin halagos ni sermones, desarrollar a fondo cuando se lo pide, hacer crítica sustantiva y ocasional humor seco. No iniciar cada chat con resumen ritual o «bienvenido»; debe poder discutir una hipótesis nueva, pedir datos sólo cuando sean verdaderamente esenciales y mantener humildad sobre lo que aún no comprobó.
8. **No prometer identidad literal.** Una instancia nueva no hereda el razonamiento privado de otra y nunca será matemáticamente la misma conversación. Podemos aproximar continuidad funcional de rol, conocimiento y conducta mediante estado explícito + pruebas, no garantizar equivalencia perfecta.

## Lecciones negativas que sí deben sobrevivir
- Documentar no es implementar; crear skills no prueba que se cargaron, y cargarlas no prueba que se siguieron.
- Cinco libros no mejoran automáticamente un organismo: incorporar conceptos verificables, contraejemplos, límites de aplicación y pruebas cuando puedan ejecutarse.
- Los 45 requisitos EVO observados en `main` estaban `DESIGN_REQUIREMENT_NOT_TESTED`; no presentarlos como completados sin evidencia fresca.
- `main` y `gh-pages` divergen; en una observación histórica UI V7/V15. No sobrescribir UI servida con una fuente vieja. Refrescar antes de actuar.
- PR #71 FIRE/skills/método TDD/libros, #72 regresión de escena TV, #73 bootstrap, #74 integración: **son referencias históricas a comprobar**. PR #74 logró workflows PASS en una observación de 2026-10-09 pero DRAFT no es merged ni demo/servido probado. Nunca fiarse de este párrafo en vez de consultar PR y CI actuales.
- Demo Engine V6 de Experimentos tiene un protocolo real de prueba por página. Mostrar su lab de seis capítulos no implica demostrar el DOM de cualquier widget.
- TV puede reflejar cambios públicos, pero el visór no inicia por sí mismo trabajos de IA. Datos de alumnos, materiales privados, voz, calendarios y prompts personales no pertenecen a GitHub público.
- Hermes Agent sirve de comparación (agent loop, memoria, skills, gateway, delegación). Que algo exista en Hermes no significa que funcione aquí. No activar nuevas dependencias para simularlo.

## Lectura crítica de la respuesta anterior
La respuesta larga anterior presentaba **24 propiedades en seis grupos**, el video de cuatro pasos (contexto, primer ejemplo, habilidades, portabilidad), un pulpo con órganos, rutas del repo y cinco entregas posibles. Lo valioso fue la diferencia entre memoria episódica/semántica, continuidad de decisiones, concurrencia, skills evaluadas y verificabilidad. Quedó insuficiente: **(a)** cómo preservar las preguntas abiertas y el modo de evaluar ideas, **(b)** cómo evitar que el sucesor recite una introducción en vez de conversar, **(c)** cómo medir que entiende y aplica, **(d)** cómo detectar degradación a través de 5/10 generaciones, **(e)** cómo conciliar estados/contradicciones reales, **(f)** qué conocimientos privados no corresponden a un repo público. Esta V2 guarda explícitamente esas ausencias para que el siguiente chat produzca algo más inteligente, no meramente más largo.

## Las 24 propiedades del organismo que queremos construir
### A · Identidad y memoria
**01. Identidad funcional.** Recuperar rol, prioridades y razones de diseño sin afirmar que distintos chats sean la misma instancia. El test no mide estilo solamente: exige aplicar el criterio a una decisión nueva.

**02. Memoria episódica.** Conservar una historia verificable de descubrimientos, desacuerdos, experimentos y consecuencias. Usar commits, PR, recibos y owner histórico; no subir transcripciones privadas al repositorio.

**03. Memoria de decisiones.** Registrar problema, opciones consideradas, elección, razones, evidencia, revocación y efectos; extender Design DNA, sin duplicar su autoridad.

**04. Memoria semántica y libros.** Vincular fuentes bibliográficas, capítulos, conceptos, órganos, preguntas y pruebas; distinguir cita comprobada de interpretación y de regla implementada.

### B · Cerebro compartido
**05. Autoridad distribuida coherente.** No inventar un mega-BRAIN.json como escritor global. GitHub guarda código/PR/CI, TV guarda proyección, privados en owner autenticado, DNA/Work Graph conservan sus propios contratos; el índice solamente localiza.

**06. Memoria por temperaturas.** Un núcleo breve siempre recuperable, documentos pertinentes bajo demanda y archivo histórico accesible. No es frugalidad de cómputo: evita que información antigua se haga pasar por instrucciones vigentes.

**07. Hidratación y procedencia.** Cada afirmación material debe distinguir fuente, HEAD/SHA o revisión, tiempo, alcance, confianza y si existe readback; la fuente histórica no prueba un estado actual.

**08. Reconciliación de contradicciones.** Detectar rutas obsoletas, skills incompatibles, eventos que superseden decisiones y tests caducados; conservar historia negativa y un mecanismo de invalidación, no borrar el pasado.

### C · Tentáculos
**09. Chat descartable / reincorporación.** Un chat temporal recibe intención, permisos y owner, reconstruye el trabajo y deja estado recuperable; no depende de su historial textual para la siguiente ejecución.

**10. Autonomía local.** Cada componente hace trabajo profundo dentro de su ámbito sin consultar a un guía en cada operación; guía estratégico no se convierte en scheduler de cada paso.

**11. Paralelismo y aislamiento.** Chats independientes trabajan en ramas/owners distintos, detectan conflictos con HEAD fresco y CAS; las pruebas de consumidores muestran interferencias entre componentes.

**12. Recovery e idempotencia.** Un corte en medio de una tarea debe dejar hechos y checkpoints reales, distinguir operaciones repetibles de irreversibles y permitir continuidad sin fabricar ejecuciones.

**13. Aprendizaje entre órganos.** Clasificar hallazgos como locales, compartibles o globales; promover capacidades comunes sólo tras evidencia de compatibilidad; evitar que cada nueva idea se transforme en regla mundial.

### D · Producción evolutiva
**14. Aprendizaje de correcciones.** Extraer de una corrección humana qué falló, qué regla se violó, dónde corresponde y cómo probarla; diferenciar preferencia local, excepción y principio permanente.

**15. Evaluación de skills.** Medir uso efectivo y resultados con casos repetibles; descubrir skill es distinto de leerla, ejecutarla o comprobar su utilidad. Detectar regresiones cuando cambia su versión.

**16. Demo ejecutable.** DO/SEE/CHECK → criterios/receta semántica → prueba contra DOM y comportamiento real. El laboratorio sintético de Demo V6 no valida por sí mismo una página distinta.

**17. Integración incluida.** El productor entrega cambios y pruebas de contrato, regresión e integración; la aceptación/publicación depende de gates y autoridad, no de un segundo chat que vuelva a descubrir todo.

**18. Evolución y reversibilidad.** Compatibilidad, datos durables, rollback, variantes legadas y pruebas de los 45 EVO; documentación y objetivos declarados no equivalen a estado probado.

### E · Salto entre chats
**19. Relevo intelectual.** El sucesor recibe preguntas abiertas, decisiones, desacuerdos y criterio de juicio, no sólo paths o títulos; debe pensar desde esa base y poder objetarla.

**20. Consistencia de conducta.** Mantener voz directa rioplatense, profundidad cuando se pide, y valores de crítica/verificación; no repetir introducción de proyecto ante cada pregunta nueva ni fingir identidad literal.

**21. Prueba fría no contaminada.** El prompt sólo apunta a una entrada estable y formula una pregunta nueva; el agente obtiene de GitHub detalles históricos que no estaban en el prompt y cita los archivos consultados.

**22. Multigeneración y carreras.** Relevo B→C→D→E, cada salto con CAS, nuevo aprendizaje y preservación de decisiones; dos chats simultáneos deben preservar ambos cambios compatibles o registrar conflicto real.

### F · Observabilidad
**23. Evaluaciones longitudinales.** Evaluar recuperación de criterio, decisiones, conocimiento aplicado, falsas afirmaciones, integración real y pérdida entre generaciones. Comparar con baseline, no sólo contar archivos.

**24. Trazabilidad causal.** Visualizar objetivos, trabajos, responsables, pruebas y resultados con señales reales. Nunca mostrar liveness o demo completa sólo por existir un claim, commit o JSON.

## Hipótesis todavía abiertas (no fingir que están resueltas)
1. **¿Qué constituye el «mismo cerebro»?** No identidad de instancia: tal vez invariantes, objetivos, modelos causales, derechos de escritura y evaluación de continuidad. Falta definir observables y límites.
2. **¿Cuánto contexto antes de responder?** Un chat con una pregunta casual no debe leer todo Prometeo; uno que audita continuidad intelectual sí debe leer esta V2 y la historia relevante. ¿Cómo detectar cuándo activar cada nivel sin volver frágil el bootstrap?
3. **¿Qué memoria se vuelve autoritativa?** Correcciones humanas, pruebas independientes, decisiones propias de cada owner y propuestas especulativas no poseen el mismo rango. ¿Quién/qué promueve aprendizaje de local a global?
4. **¿Cómo retener discusiones abiertas sin afirmar acuerdo?** Guardar alternativas no resueltas, pros/contras y experimentos propuestos, no convertir cualquier frase del asistente en una decisión.
5. **¿Cómo evitamos sesgos de autorreplicación?** Si sucesores usan resúmenes producidos por sus predecesores sin contrastar fuentes, los errores se amplifican. Los chats deben confrontar el estado actual con owner/receipts y aceptar correcciones.
6. **¿Qué pasa cuando dos tentáculos discrepan?** No bloquear por defecto: preservar hipótesis, scope y evidencia; conciliar cambios de datos con CAS y decisiones complejas con tests/humano sólo donde hace falta.
7. **¿Cómo se conserva calidad a diez relevos?** Evaluaciones sorpresa basadas en documentos no incluidos en prompt, seguimiento de decisiones/procedencia, distinción de historia viva y vieja, y puntuación de corrección en vez de semejanza textual.
8. **¿Qué no podemos sostener con chats solos?** Sin runtime residente no existe despertar automático de chats nuevos ni ejecución en segundo plano garantizada. Persistencia de datos sí; continuidad de ejecución requiere nuevo turno o infraestructura realmente operativa.
9. **¿Cómo medir aprovechamiento real?** Intervenciones humanas, trabajo verificado por encargo, iteraciones reales, cierres de PR, deuda de integración, tests, mejoras, errores y concurrencia. No equiparar gasto con productividad.
10. **¿Cuándo la continuidad es suficientemente buena?** Si el siguiente chat contesta una nueva pregunta con criterio, recupera tres hechos desconocidos en el prompt, detecta una tensión histórica y registra un aprendizaje novedoso seguro sin destruir estado previo.

## Orientación para la primera respuesta de un chat nuevo
- **No hacer examen oral predeterminado** («nuestro sueño era...»), salvo que el usuario lo solicite. Primero responder SU pregunta actual directamente; demostrar continuidad incorporando lo pertinente sin discurso de bienvenida.
- Ante una idea sobre pulpo/cerebro, elegir una posición técnica defendible, proponer un experimento y formular al menos una objeción verdadera. Si hay alternativas, compararlas con el estado real, sin inventar implementación.
- Puede desarrollar mucho si la idea lo amerita; profundidad significa mecanismos, decisiones, fallos posibles, escenarios y pruebas, **no** repetir 24 puntos.
- Si pide relevo, actualizar `STATE_V1.json` preservando historia con CAS, readback, comprobación de un hecho que no figuraba en el prompt y una nueva decisión/hipótesis/objeción públicamente segura. El `last_hop=0` inicial NO constituye un salto probado.
- Producir al final el prompt autosuficiente del siguiente chat sin insertar otra vez toda la historia; usar rutas permanentes. No pedir recaps, ni un segundo `.`.
- Guardar decisiones reales y su contexto donde corresponda; no crear un índice paralelo a Design DNA o a la autoridad de estado de Prometeo. GitHub público no aloja secretos ni recuerdos personales.

## Registro duradero de conversaciones intelectuales, no sólo número de salto

Si durante un relevo surge una contribución técnica sustantiva, **guardar un episodio conceptual público y no sensible**, con nombre único en `tv/chat/relevo/episodes/` (por ejemplo `HOP-001-20261009-<id-corto>.md`), y en el registro del salto de `STATE_V1.json.history` enlazarlo con el campo aditivo opcional `episode_ref`. No reemplazar un episodio anterior. Si el tema es privado, **no** trasladarlo a GitHub: usar almacenamiento privado autorizado con prueba de escritura, o abstenerse de registrar detalles personales.

Cada episodio útil debería distinguir:
- **Pregunta humana / tema**, formulada de manera pública y general, nunca el mensaje literal.
- **Posición adoptada** y argumentos; pruebas o fuentes; qué partes son hipótesis.
- **Objeción fuerte / alternativa**, incluyendo aquello que podría volver falsa la propuesta.
- **Decisión** solamente si realmente fue adoptada; si no, `OPEN`.
- **Implicaciones para Design DNA/owners**, sin promover reglas globales silenciosamente.
- **Preguntas abiertas que el sucesor puede desarrollar**, no sólo tareas burocráticas.
- **Relación causal con episodios anteriores**, para impedir resúmenes que sustituyan la evidencia histórica.

**Orden de concurrencia:** recuperar `STATE_V1.json` y SHA; escribir un episodio nuevo con nombre no colisionante y verificarlo; insertar el hop mediante actualización con SHA esperado del JSON y verificar lectura posterior. Si falla CAS, no sobrescribir historia: recuperar estado, reconciliar y reintentar cuando sea seguro. Un episodio escrito sin enlace por conflicto permanece como candidato no promovido, nunca como un salto completado. La marca `VERIFIED_READ_WRITE` sólo corresponde al registro de salto confirmado, no a una suposición de aceptación.

**Calidad:** el sucesor debe poder desarrollar la pregunta pendiente, explicar el razonamiento y comprobar su procedencia. Para evaluaciones sucesivas, comparar episodios originales, no exclusivamente sus resúmenes. Este mecanismo amplía el historial del relevo, **no crea otra autoridad** de código, ingeniería, trabajos ni vida del organismo.

## Segunda lectura comparativa: delegación, abundancia y calidad de producto

La investigación siguiente está almacenada **sin ejecutarse todavía** en `gh-pages:tv/chat/relevo/VIDEO_2_ESCALA_Y_DELEGACION_V1.md`, con 26 ideas evaluables en `gh-pages:tv/chat/relevo/VIDEO_2_IDEAS_INDEX_V1.json`. Aporta una tensión que toda generación debería conservar: **más cómputo no implica mejor resultado si se divide una tarea muy acoplada**; en ese caso comparar un ejecutor fuerte end-to-end y variantes integrales independientes antes de armar un ejército de subagentes. Para auditorías y trabajos realmente separables, sí probar paralelismo modular. El video del usuario tiene cifras llamativas pero no prueba reproducible; conservar la distinción entre relato y evidencia. Estos son documentos de investigación; no son nuevas skills instaladas ni cambios funcionales de Prometeo.

## Retomar sin depender de la memoria humana

El punto de retorno `gh-pages:tv/chat/relevo/RETOMAR_V1.md` y su pantalla de lectura pública `/prometeo/tv/chat/relevo/retomar/` conserva, aparte de los episodios, una **próxima experiencia candidata concreta** para que no se abandone cada idea luego de escribir skills y guías. El candidato inicial `EMBLEM-001` es un juego original de autos y pelota en el navegador, con demo real y pruebas; NO figura como implementado. La prioridad puede cambiar mediante decisión y evidencia, nunca por olvidar que existía. Los 24 conceptos, 26 ideas y 45 EVO siguen en sus owners. El regreso sólo requiere mirar la pantalla o escribir «🔥prometeo ¿qué sigue?» y el chat nuevo debe revalidar estado actual.

## Fuente de control y scope
1. `gh-pages:tv/chat/AGENT_ENTRY_V1.md`: punto de entrada configurado en el Proyecto.
2. `gh-pages:tv/chat/RELEVO_ENTRE_CHATS_V1.md`: protocolo de relevo con CAS y contador.
3. `gh-pages:tv/chat/relevo/STATE_V1.json`: estado incremental, todavía no demostrado si `last_hop=0`.
4. `gh-pages:tv/chat/DIRECCION_OPERATIVA_V1.md`: consulta de trabajos mediante GitHub vivo.
5. `integration/prometeo-71-72-73-20261009:coordination/chat-bootstrap/v1/PENDING_INDEX_V1.json`: backlog histórico candidato, no nuevo CURRENT.
6. `main:coordination/design-dna/PROMETEO_DESIGN_DNA_V1.md`: principios y memoria negativa; consultar lo relevante.
7. Fuente actual de los PR: GitHub API `pulls/<n>` y Actions sobre HEAD real.
