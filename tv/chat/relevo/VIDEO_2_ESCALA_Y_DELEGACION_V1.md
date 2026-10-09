# 🔥 Prometeo · Segundo video: recursos abundantes y estrategia de agentes · V1

**Estado:** INDEXADO / INVESTIGADO, NO IMPLEMENTADO. **Es una investigación técnica y agenda futura**, no otro scheduler, CURRENT, prompt obligatorio ni skill autoinstalada. No cambia PR #74 ni el trabajo paralelo actual. GitHub sólo recibe ideas técnicas generales, NO la transcripción privada completa.

## Tesis central y corrección de rumbo
Si desaparece la restricción económica como principal objetivo, **no se deduce que convenga usar más agentes en cada trabajo**. El objetivo es explorar más opciones y producir mejores resultados por mensaje humano. Para tareas fuertemente acopladas, repartir partes de un juego o corto puede destruir coherencia; para auditorías independientes, bibliografía, assets, pruebas o cobertura de múltiples variantes, la pluralidad ayuda. El experimento que falta NO es demostrar que cinco chats pueden escribir código: es demostrar que con los mismos objetivos podemos producir artefactos finales **mejores** y conservar lo que aprendemos.

El usuario dispone de chats del Proyecto `persistencia` lanzados manualmente, con GitHub conectado, y prefiere usar capacidad extensa por cada chat, sin ChatGPT Work ni nueva infraestructura local. Esto **no da tokens técnicamente infinitos**, no permite abrir chats automáticamente y no hace que dos turnos se mantengan conectados de manera residente. La arquitectura debe respetar esos límites mientras aprovecha al máximo cada ejecución.

## Qué cuenta el video (NO VERIFICADO FUERA DE LA TRANSCRIPCIÓN)
- La comparación declarada enfrenta un modelo fuerte solo con un modelo fuerte dirigiendo subagentes más económicos, en tres pruebas: minijuego de lanzamiento, corto animado samurái y revisión de defectos de una app.
- **Juego:** ambas variantes produjeron algo jugable; según el narrador, el solo mostró mejor sensación de física/animación, el equipo menor costo pero tardó más.
- **Corto:** según el narrador, el agente solo obtuvo mejor narración/coherencia y en esta prueba el equipo tardó más y costó ~80% más; tareas con ritmo y gusto compartido tienen alto acoplamiento.
- **Auditoría:** según el narrador, el equipo buscó muchos defectos en paralelo y ahorró ~61% de costo, pero registró más falsos positivos y menos errores confirmados que el solo. Dice 103 aceptados / 14 rechazados para equipo y 122 confirmados sin rechazados para solo; **el juez anunciado es otro modelo**, no demostración de que 122 errores sean reales o hayan sido reparados.
- Marcador reportado: solo 10 a 2. Son números del video, sin repos, instrucciones exactas, datasets, seeds, archivos, rúbricas independientes ni pruebas de defectos aportadas. El diseño de su `/delegate` cambió además el procedimiento, de modo que no es un A/B controlado de «mismo prompt y distinto número de agentes».
- Ni la comparación de modelos ni las denominaciones anunciadas en la transcripción se consideran verificadas; los resultados del video NO avalan un ranking general de modelos o una garantía de productividad.

## La cachetada constructiva para Prometeo
**A. Estamos limitando artificialmente el producto que pedimos.** Un juego jugable, una simulación interactiva o un corto multimedia están dentro del tipo de proyectos que puede intentar un chat de desarrollo con herramientas, siempre que el alcance sea concreto, se permita ejecución y se verifique. No es honesto prometer cine profesional en un turno, pero tampoco hay motivo para declarar victoria porque publicamos una tarjeta HTML.

**B. Nuestros prompts suelen pedir arquitectura y validación antes de un objetivo que entusiasme al humano.** Conservemos seguridad, contracts, pruebas y la demo real, pero empecemos por un `DO / SEE / FEEL / CHECK` ambicioso y una entrega visible, no por crear más andamiaje como producto principal.

**C. No optimizar por ahorrar tokens, pero tampoco llenar 14 chats de tareas que dependen continuamente unas de otras.** El costo de la coordinación puede ser calidad, tiempo y regresiones, incluso si el dinero no preocupa. Distinguir tiempo del humano, tiempo de ejecución, costo monetario real, calidad de la entrega y deuda de integración.

**D. La mejor alternativa a partir un corto en trozos puede ser poner tres agentes fuertes a crear tres cortos completos y elegir el mejor.** Aislar cada variante en su rama, dar un brief equivalente, evaluar historia/estética/sonido/estabilidad/UX, combinar sólo las piezas compatibles con evidencia, y conservar los perdedores para aprender.

**E. Un único chat puede ejecutar varios ciclos internos de crítica y mejora.** Pedir el producto primero no significa saltarse pruebas. Una sesión potente puede diseñar, producir, abrir navegador, reprobar y refinar varias veces. Más capacidad se invierte en iterar sobre la obra, no únicamente en documentación.

**F. Las skills deben cambiar resultados, no sólo sintaxis del prompt.** El autor del video afirma que explicitar /delegate en una skill mejoró la delegación respecto de un pedido informal; Prometeo ya tiene skills y debe evaluar si se cargan, obedecen, mejoran cumplimiento y evitan conflictos. Una skill universal «usar más agentes» sería exactamente la conclusión equivocada.

**G. La calidad creativa requiere criterio holístico.** Un test de que una animación carga no mide si su historia conmueve, ni uno que comprueba trayectoria balística demuestra que el juego es divertido. Combinar tests objetivos y valoración estética, con opiniones humanas cuando importan, sin fabricar aprobaciones.

**H. Los jueces IA se equivocan.** Para revisión de código: reportar defecto, reproducir en código base, demostrar fallo en fixture, corregir y volver a probar. «GPT6 Astra me otorgó 122 puntos» en el video es un relato, no verificación material de esos errores. Evitar reforzamiento por cantidad de denuncias.

## 26 ideas registradas y su aceptación
### Verificación y falsos positivos

**ESC-001 · Calibrar evidencia del video (P0).** No confundir demostración narrada con benchmark reproducible. Las métricas y nombres de modelos provienen de la transcripción; no hay repos, seeds ni auditores independientes adjuntos.

**Criterio de prueba:** Ficha de reproducibilidad: mismo brief, fuente, evaluación funcional, jueces independientes, tiempo, concurrencia y resultados verificables.

**ESC-008 · Sistema de prueba de gusto y coherencia (P0).** Historias, interfaz, sonido y experiencia requieren arbitraje holístico además de tests. No aceptar premio subjetivo del video como métrica universal.

**Criterio de prueba:** Rubrica doble: verificaciones mecánicas + evaluación visual/narrativa ciega por humano o jueces diversos; discrepancias conservadas.

**ESC-009 · Verificador adversarial independiente (P0).** Un modelo juez no confirma por sí solo un bug. Reproducir defectos con tests/fixtures/DOM real, conservar falsos positivos y corregir categorías frecuentes.

**Criterio de prueba:** Bugs CONFIRMED reproducibles, REJECTED o UNVERIFIED; reducción de falsos hallazgos sin elevar autoelogios.

**ESC-010 · Evaluación comparativa bajo mismo encargo (P0).** Comparar solo potente, partición modular y variantes completas en paralelo con controles de scope, prompts de base, criterios y entornos lo más equivalentes posible.

**Criterio de prueba:** Experimento A/B/C con receipts, productos reproducibles, calidad, tiempo, costo medido sólo si disponible y tasa de intervención humana.

### Arquitectura y conflictos

**ESC-002 · Clasificar trabajo por acoplamiento (P0).** Distinguir trabajo modular de creación fuertemente integrada; dividir una historia/estética en fragmentos puede disminuir coherencia y aumentar retrabajo.

**Criterio de prueba:** Dado un conjunto de tareas, clasificar CLEAN_SPLIT, TIGHTLY_COUPLED o UNCERTAIN y justificar por interfaces y evidencia.

**ESC-007 · Director no se transforma en cuello de botella (P1).** El orquestador debería formular objetivos y ensamblar resultados, no microgestionar cada movimiento del worker; reutilizar Guide/Work Graph existentes donde proceda.

**Criterio de prueba:** Medir actividad productiva vs esperas/hand-offs y verificar que no hay nuevo scheduler ni autoridad.

**ESC-018 · Seguridad y continuidad entre ramas (P0).** Paralelismo manual en ChatGPT requiere ownership, HEAD fresco, CAS y PR; nunca sobrescribir UI V15 con main V7 ni modificar infraestructura ajena.

**Criterio de prueba:** Prueba de cambios concurrentes que retenga ambos o falle con conflicto diagnosticado sin pérdida.

### Modos de organización del trabajo

**ESC-003 · Un ejecutor potente de punta a punta (P0).** Usar chat potente único para un producto integral donde estética, física, audio y UX dependen de una visión común; no imponer subagentes por moda.

**Criterio de prueba:** Construir un producto de alcance definido con experiencia real y aceptación completa en un único chat.

**ESC-004 · Variantes completas en paralelo (P0).** Cuando el trabajo exige visión integral, lanzar 2-4 chats independientes con mismo brief y distintas direcciones creativas, no uno encargado de menú y otro de física sin contrato.

**Criterio de prueba:** Comparar dos ramas/prototipos autónomos de producto completo y seleccionar/mejorar con pruebas visuales y funcionales.

**ESC-005 · Descomposición modular legítima (P0).** Paralelizar auditorías, investigación de bibliografía, assets, accesibilidad o módulos con contratos estables; cada rama produce resultados autocontenidos.

**Criterio de prueba:** Al menos dos aportes compatibles se integran sin pérdida; conflictos quedan diagnosticados.

### Skills y contratos

**ESC-006 · Delegación mediante skill vinculante (P0).** El video relata que /delegate explícito mejoró el reparto respecto de pedir subagentes de forma vaga; formalizar rol, límites, entregables, herramientas, reportes y controles, pero comprobar ejecución real.

**Criterio de prueba:** Caso real donde se pruebe lectura de la skill, selección, ejecución, resultado y verificación de límites.

### Mejora evolutiva

**ESC-011 · Best-of-N con refinamiento evolutivo (P1).** Usar capacidad abundante para generar propuestas independientes, probar y retener ganadoras, luego refinar; inspirarse en AlphaEvolve pero sin afirmar que ya está implementado.

**Criterio de prueba:** En dos generaciones, la seleccionada cumple invariantes del baseline y mejora una métrica observada en un artefacto real.

**ESC-012 · Critic-reviewer no complaciente (P0).** Un chat dedicado debe intentar romper el producto, objetar hipótesis, detectar omisiones y comparar opciones; no aceptar cantidad de comentarios como prueba de calidad.

**Criterio de prueba:** Cada crítica incluye evidencia y corrección verificable o queda explícitamente como hipótesis.

### Ambición de productos visibles

**ESC-013 · Superar el sesgo de producir infraestructura (P0).** Es un fallo histórico pasar 10 turnos en skills, routers y PR sin una experiencia pública nueva usable. Reservar experimentos ambiciosos que entreguen valor visible.

**Criterio de prueba:** Una orden humana produce un juego sencillo o experiencia multimedia funcional publicada y probada, sin crear un panel genérico.

**ESC-014 · Prueba de producto de un solo prompt (P0).** Ejemplo: minijuego original de lanzamiento con niveles, física, audio, mobile y reinicio; o microcorto narrativo animado; preferir obra original evitando copiar marcas y assets de terceros.

**Criterio de prueba:** Link real, interacción en navegador, fixtures y grabación de demostración sobre el producto, no una simulación.

**ESC-015 · Objetivo sensorial y creativo antes del código (P0).** DO/SEE/FEEL/CHECK: no sólo botones y textos, también ritmo, feedback, audio, tacto móvil, emoción estética y legibilidad; demostrar sin confundir gusto con test binario.

**Criterio de prueba:** Rubrica de calidad sensorial con criterios explícitos, feedback humano y evidencia de funcionamiento.

**ESC-016 · Portfolio de artefactos y no sólo páginas (P1).** Explorar juegos web, películas animadas, simuladores de estudio, recorridos interactivos, narraciones y widgets completos; elegir por objetivo, no por costumbre de hacer HTML de resúmenes.

**Criterio de prueba:** Tres formatos de salida distintos funcionan en los renderizadores reales con rutas estables y preservación de estado.

### Publicación y demos reales

**ESC-017 · Pipeline de publicación y demo (P0).** Conectar prueba funcional, integración, autorización, versión de Pages, smoke real y TV. Demo Engine V6 debe operar sobre DOM semántico real.

**Criterio de prueba:** Una publicación autorizada con SHA, URL servida, captura/ejecución de Demo V6 y recepción en TV.

### Memoria

**ESC-019 · Memoria de experimentos, incluidos perdedores (P1).** Registrar por qué una variante perdió: bugs, calidad, tiempo, acoplamiento, criticidad y evidencia; el cerebro común aprende de resultados negativos.

**Criterio de prueba:** Nuevo chat recupera causas y evita repetir una solución descartada sin razón.

**ESC-020 · Control de calidad a través de generaciones (P0).** El chat siguiente no recibe una narración recortada: recupera experimentos, métricas, decisiones y objeciones. No resumir los 24 puntos hasta hacerlos desaparecer.

**Criterio de prueba:** Un chat frío aplica una lección del experimento a un problema distinto y cita evidencia original.

### Aprovechar trabajo abundante

**ESC-021 · Inversión amplia de esfuerzo por mensaje (P0).** Con capacidad disponible generosa, continuar tareas útiles: generación, pruebas adversariales, QA móvil, alternativas, accesibilidad, integración y demo antes de cortar; no prometer tokens realmente infinitos.

**Criterio de prueba:** Medir operaciones verificadas, artefactos publicados y calidad por intervención; no medir sólo tokens.

**ESC-022 · Examen de concurrencia 1 vs 3 vs 8 chats (P1).** No escalar arbitrariamente por cantidad; medir curva de valor y deuda de integración con aislamiento por ramas y tareas independientes.

**Criterio de prueba:** Con distintos grados de paralelismo registrar entregas, retrabajo, conflictos, defectos y espera humana, sin inventar concurrencia automática.

### Observabilidad

**ESC-023 · Trazabilidad de trabajo frente a teatro de agentes (P0).** Mostrar estado sólo cuando existen commits/acciones/receipts realmente verificables; un chat abierto o un worker listado no implica progreso.

**Criterio de prueba:** Tablero o informe derivado de GitHub/CI con estados exactos y ausencia visible de evidencia.

### Criterio de elección

**ESC-024 · Estrategia de selección según naturaleza de la tarea (P0).** Un agente fuerte end-to-end para coherencia; varios fuertes para diversidad y cobertura; módulos separados para tareas con interfaces independientes; equipo mixto sólo si supera al baseline.

**Criterio de prueba:** Reglas de decisión probadas sobre juego, animación, auditoría de código y un caso de facultad/widget real.

### Límites y privacidad

**ESC-025 · Protección del objetivo humano y privacidad (P0).** Producción pública ambiciosa sin exponer cursos personales, transcripciones, credenciales ni presupuestos privados; publicar sólo artefactos de demostración o sanitizados.

**Criterio de prueba:** Pruebas de límite public/private y verificación de paquetes antes de Pages.

### Contraste de evidencia

**ESC-026 · Validar hipótesis antes de comprar narrativas (P1).** Contrastar el video con ejemplos externos: investigación paralela Anthropic favorable en tareas de amplitud y AlphaEvolve para búsqueda+evaluación; no trasladar porcentajes a Prometeo.

**Criterio de prueba:** Citar evidencia externa y tratar los números como resultados de esos entornos, no como beneficios prometidos.

## Cinco experiencias reales y orden recomendado
**Experimento 1: Producto real de un solo chat potente.** IDs ESC-003, ESC-013, ESC-014, ESC-015, ESC-017. **Resultado exigido:** Prototipo original completo, una URL pública y demo probada; baseline de calidad/tiempo/herramientas.

**Experimento 2: Tres variantes holísticas independientes.** IDs ESC-004, ESC-008, ESC-010, ESC-011. **Resultado exigido:** Dos o más interpretaciones completas del MISMO brief; comparación ciega y mejora de la ganadora.

**Experimento 3: Descomposición modular y crítica.** IDs ESC-002, ESC-005, ESC-006, ESC-009, ESC-012, ESC-018. **Resultado exigido:** Comparar división de subtrabajo y revisión adversarial sin crear autoridad paralela ni falsos PASS.

**Experimento 4: Persistencia intelectual multigeneracional.** IDs ESC-019, ESC-020, ESC-023. **Resultado exigido:** Nuevo chat recupera baseline, perdedores, criterios y razones; demuestra uso del aprendizaje.

**Experimento 5: Escalar capacidad con evidencia.** IDs ESC-021, ESC-022, ESC-024, ESC-026. **Resultado exigido:** Curva de resultado verificable por intervención humana, al probar 1/3/8 chats y elegir modo por tarea.

### Prueba comparativa decisiva
Mismo brief de un producto original, misma fuente base y conjunto de pruebas:
- **A = solo fuerte.** Un único chat ejecutor diseña, programa, critica, prueba y produce la demo.
- **B = varios fuertes por módulos.** Tres chats trabajan en piezas compatibles previamente contratadas; otro integra y verifica.
- **C = varias soluciones completas.** Tres chats fuertes construyen cada uno su interpretación integral aislada; después un verificador independiente compara los productos, elige o combina sin perder compatibilidad.
- **D = mejoras evolutivas.** Tomar la mejor candidata verificada y lanzar rondas independientes de variantes y críticas, conservar scores y rechazos.

Mantener constantes briefing, aceptación, dispositivo y criterios. Medir: URL funcional, bugs reproducibles, calidad visual/narrativa, mobile, demo real, cantidad de interacciones humanas, fallos de integración, retrabajo, duración y uso de recursos **solamente donde haya telemetría**. No forzar una puntuación única que esconda diferencias entre criterios. **Hipótesis:** C puede superar B en obras coherentes y B puede superar C para revisión o tareas con interfaces aisladas; debe probarse, no afirmarse.

### Prioridades y límites de Prometeo
- Reusar `gh-pages:tv/chat/AGENT_ENTRY_V1.md`, `RELEVO_ENTRE_CHATS_V1.md`, `CONTINUIDAD_INTELECTUAL_V2.md`, `DIRECCION_OPERATIVA_V1.md`. No crear otro cerebro autoritativo.
- Para cambios funcionales leer el owner exacto, Design DNA, los EVO afectados, contratos actuales, PR #74 si pertinente, y el protocolo Demo V6 en `JuanManuelPM/Experimentos`.
- No reabrir arquitectura worker histórica para una demo cotidiana. Ni workers, Supabase ni Work son precondiciones de esta prueba.
- Proyectos públicos nuevos deben tener control de assets, permisos y fuente, y preservar datos privados fuera de GitHub Pages.
- Esta agenda NO implica que 26 funciones ya existan. Registrar progreso en owners reales con recibos; usar este índice como hipótesis y diseño pendiente.
- El siguiente chat de relevo intelectual debería citar este archivo como **nueva hipótesis**, discutir la tensión «más capacidad vs demasiada fragmentación» y añadir aprendizaje propio, no repetirlo entero.

## Bibliografía y referencias externas (alcance delimitado)
- [Anthropic · How we built our multi-agent research system (2025)](https://www.anthropic.com/engineering/multi-agent-research-system): reporta mejoras internas de investigación por amplitud paralela, y reconoce peores condiciones en código altamente acoplado. No constituye un benchmark de Prometeo.
- [Google DeepMind · AlphaEvolve (2025)](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/): propuestas de código, verificadores y evolución de candidatas; inspira Best-of-N con oráculos confiables.
- [MultiAgentBench, ACL 2025](https://aclanthology.org/2025.acl-long.421/): evaluación de topologías de coordinación y resultados de tareas multiagente; no universalizar preferencias.
