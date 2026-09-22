# Prometeo · Cognitive Forge Backlog

> Fuente canónica del backlog conceptual y técnico construido durante los experimentos de workers residentes, Cognitive Forge y Blueprint 84.

## Estado

- Total de ítems: **253**
- HECHO: **84**
- CONCLUSION: **5**
- DISENADO: **115**
- DESCUBRIMIENTO: **3**
- PENDIENTE: **37**
- CONCEPTO: **1**
- OBJETIVO: **8**

## Convenciones

- **HECHO**: existe o fue probado.
- **DISEÑADO**: está definido con bastante precisión, pero no completamente implementado.
- **PENDIENTE**: trabajo todavía por materializar o delegar.
- **DESCUBRIMIENTO**: hecho observado durante experimentos.
- **CONCLUSION**: inferencia arquitectónica derivada de evidencia.
- **CONCEPTO**: idea estructural que organiza varias piezas.
- **OBJETIVO**: dirección de largo plazo.

## Backlog completo

1. **[HECHO] Workers residentes.** Un worker termina una tarea, pide otra y continúa; ya no usamos 1 chat = 1 tarea.
2. **[HECHO] Identidades automáticas Kxxx.** El backend asigna patente automáticamente; no numeramos chats a mano.
3. **[HECHO] Cola compartida.** Los workers reclaman trabajo disponible sin routing humano.
4. **[HECHO] Leases por trabajo.** Cada asignación tiene token y vencimiento.
5. **[HECHO] Rescate automático.** Una tarea cuyo lease vence vuelve al pool.
6. **[HECHO] Protección contra resultados tardíos.** Un lease viejo no puede pisar trabajo más nuevo; devuelve STALE_LEASE.
7. **[HECHO] Espera residente.** Un worker sin trabajo ejecutable sigue consultando en vez de terminar.
8. **[HECHO] Cierre decidido por servidor.** GOAL_DONE/BLUEPRINT_DONE lo determina el backend, no el worker.
9. **[HECHO] Workers excedentes.** Existe NO_WORK cuando se supera el límite configurado.
10. **[HECHO] Estado durable separado del chat.** Supabase es fuente de verdad; el lenguaje natural no coordina el sistema.
11. **[HECHO] Eventos durables.** Entradas, asignaciones, publicaciones, expiraciones y rescates quedan registrados.
12. **[HECHO] Pool 8×20.** Probamos que menos chats pueden consumir más trabajos.
13. **[HECHO] Pool 8×100.** Escalamos la cola a cien trabajos.
14. **[HECHO] 100 trabajos completados.** Los ocho workers completaron los cien trabajos y quedaron esperando.
15. **[CONCLUSION] La cola dejó de ser el límite principal.** Ahora importa más profundidad, duración y estructura del trabajo que la cantidad bruta de jobs.
16. **[CONCLUSION] Aumentar densidad cognitiva.** Conviene enriquecer cada tarea en vez de sólo multiplicar tareas.
17. **[DISENADO] Tareas largas como secuencias cognitivas.** Observar, modelar, criticar, reconstruir, especificar y verificar.
18. **[DISENADO] Presupuestos de palabras por operación.** Evitar pedir miles de palabras sin función; repartir longitud entre operaciones mentales distintas.
19. **[DISENADO] Transferencia entre workers.** Un worker produce y otro continúa, critica o verifica.
20. **[DISENADO] Blind reconstruction.** Un worker ve la referencia; otro recibe sólo su descripción para medir pérdida de información.
21. **[HECHO] Cognitive Forge FORGE-8-01.** Creamos un Goal sin cola preescrita.
22. **[HECHO] Planner único.** El primer worker gana el rol de planificador.
23. **[HECHO] Workers esperan al planner.** El resto permanece residente hasta que exista trabajo.
24. **[HECHO] Planner construye DAG.** El planificador crea tareas y dependencias explícitas.
25. **[HECHO] Planner vuelve al pool.** Después de planificar deja su rol especial y ejecuta trabajo normal.
26. **[HECHO] Dependencias BLOCKED → READY.** El backend desbloquea nodos cuando sus prerequisitos terminan.
27. **[HECHO] Outputs previos como inputs.** Las tareas dependientes reciben outputs reales completos.
28. **[HECHO] Goal propagado.** Cada paquete de trabajo incluye el objetivo original.
29. **[HECHO] Subtareas dinámicas.** Una tarea puede crear hijos cuando descubre trabajo legítimo.
30. **[HECHO] Smoke test de subtarea.** Probamos nacimiento de una subtarea dinámica.
31. **[HECHO] Smoke test de rescate Forge.** Probamos lease vencido y reasignación.
32. **[HECHO] Smoke test de stale result.** Probamos rechazo de resultado tardío.
33. **[HECHO] 32 Cognitive Cards.** Existe una biblioteca inicial persistente.
34. **[HECHO] 5 Recipes.** Existe una biblioteca inicial de recetas.
35. **[HECHO] Familias de Cards.** Percepción, comprensión, creación, crítica, implementación, verificación y meta.
36. **[HECHO] FORGE-8-01 terminó.** El Goal real llegó a DONE.
37. **[HECHO] 12 tareas y 17.502 palabras.** Producción medida del run FORGE-8-01.
38. **[HECHO] Duración aproximada 9m26s.** Tiempo total observado del run.
39. **[HECHO] Sin rescates ni errores de longitud.** El run cerró limpio.
40. **[DESCUBRIMIENTO] No nacieron subtareas reales.** La expansión autónoma no apareció en el run.
41. **[DESCUBRIMIENTO] Carga concentrada.** K008 hizo 8 de 12 tareas.
42. **[DESCUBRIMIENTO] Cuatro workers quedaron ociosos.** K003, K004, K005 y K007 no ejecutaron tareas.
43. **[CONCLUSION] DAG demasiado angosto.** El grafo fue correcto pero perdió paralelismo después de las raíces.
44. **[CONCLUSION] Necesitamos más ramas independientes.** El siguiente sistema debía ofrecer más ancho ejecutable.
45. **[DISENADO] Separar Card, Tool, Plume, Recipe y Skill.** Cinco tipos de conocimiento con responsabilidades diferentes.
46. **[HECHO] Cognitive Card.** Forma reusable de pensar una tarea.
47. **[HECHO] Herramienta.** Procedimiento concreto para hacer algo.
48. **[HECHO] Pluma.** Pregunta que desbloquea o redirige razonamiento.
49. **[HECHO] Recipe.** Combinación reusable de Cards, Plumas y Herramientas.
50. **[DISENADO] Skill.** Procedimiento completo que combina estado, herramientas, cognición y verificación.
51. **[HECHO] 8 Plumas persistidas.** Primera biblioteca de preguntas cognitivas.
52. **[HECHO] Pluma: ¿Realmente no podés?.** Ataca falsas declaraciones de incapacidad.
53. **[HECHO] Pluma: ¿Ya funcionó antes?.** Busca evidencia de caminos ya demostrados.
54. **[HECHO] Pluma: ¿Probaste o inferiste?.** Separa prueba observable de especulación.
55. **[HECHO] Pluma: ¿Qué estás asumiendo?.** Expone premisas invisibles.
56. **[HECHO] Pluma: ¿Qué trabajo hacés hacer al humano?.** Busca automatización evitable.
57. **[HECHO] Pluma: próximo paso reversible.** Combate parálisis por análisis.
58. **[HECHO] Pluma: ¿Otro worker podría continuar?.** Mejora handoffs y persistencia.
59. **[HECHO] Pluma: ¿Qué aprendimos que merece sobrevivir?.** Detecta conocimiento reusable.
60. **[HECHO] 6 Herramientas persistidas.** Primera biblioteca procedural.
61. **[HECHO] Tool GitHub publicar.** Inspeccionar, modificar, publicar y verificar.
62. **[HECHO] Tool Supabase durable state.** Mover coordinación fuera del chat.
63. **[HECHO] Tool lease/rescue.** Asignación, expiración, requeue y fencing.
64. **[HECHO] Tool DAG.** Dependencias, desbloqueo y consumo de outputs.
65. **[HECHO] Tool resident wait.** Esperar trabajo sin terminar chat.
66. **[HECHO] Tool knowledge promotion.** Candidato, revisión y promoción de conocimiento.
67. **[DISENADO] Madurez del conocimiento.** CANDIDATE, REVIEWING, ACCEPTED, REJECTED y SUPERSEDED.
68. **[DISENADO] Revisión independiente real.** Nuevas Plumas/Herramientas deben ser revisadas por otro worker. Spec ejecutable: `docs/cognitive-forge/BACKLOG-068-INDEPENDENT-REVIEW-SPEC.md`.
69. **[DISENADO] Promoción automática con evidencia.** Promover sólo después de pruebas suficientes. Spec ejecutable: `docs/cognitive-forge/BACKLOG-069-AUTOMATIC-EVIDENCE-PROMOTION-SPEC.md`.
70. **[DISENADO] Medir utilidad histórica.** Registrar qué objetos cognitivos realmente ayudaron. Spec ejecutable: `docs/cognitive-forge/BACKLOG-070-HISTORICAL-UTILITY-SPEC.md`.
71. **[HECHO] 84 puntos online.** Los 84 pasos fueron convertidos en objetos independientes.
72. **[HECHO] Blueprint FORGE-BLUEPRINT-84-01.** Proyecto durable para desarrollar los 84 puntos.
73. **[HECHO] 84 puntos persistidos.** Cada punto tiene identidad y estado propios.
74. **[HECHO] 420 jobs creados.** Cinco fases por cada uno de los 84 puntos.
75. **[HECHO] Cinco fases cognitivas por punto.** Architect, Deep Development, Adversarial, Canonical y Learning.
76. **[HECHO] ARCHITECT 1.400–2.200.** Diseña cómo pensar el punto.
77. **[HECHO] DEEP_DEVELOPMENT 3.000–4.500.** Desarrollo operacional profundo.
78. **[HECHO] ADVERSARIAL 1.600–2.400.** Ataque crítico y detección de huecos.
79. **[HECHO] CANONICAL 3.500–5.000.** Documento definitivo del punto.
80. **[HECHO] LEARNING 900–1.500.** Extracción de conocimiento reusable.
81. **[HECHO] Architect elige 3–8 Cards.** La selección cognitiva queda explícita.
82. **[HECHO] Architect puede elegir Plumas y Tools.** Las bibliotecas entran en la planificación de cada punto.
83. **[HECHO] Architect formula 5–12 preguntas.** Cada punto arranca con preguntas centrales explícitas.
84. **[HECHO] Fase 2 consume arquitectura.** No vuelve a empezar desde cero.
85. **[HECHO] Fase 3 ataca desarrollo.** Crítica adversarial explícita.
86. **[HECHO] Fase 4 persiste canonical_text.** El documento final queda guardado en el punto.
87. **[HECHO] Fase 5 extrae aprendizaje.** El punto produce conocimiento además del documento.
88. **[HECHO] Smoke test 5 fases.** El pipeline completo fue probado.
89. **[HECHO] Desbloqueo secuencial verificado.** Cada publicación habilita sólo la fase siguiente.
90. **[HECHO] Persistencia canónica verificada.** canonical_text se escribe correctamente.
91. **[HECHO] Cierre de punto verificado.** El punto pasa a DONE tras Learning.
92. **[HECHO] Smoke test eliminado.** Los datos de prueba fueron limpiados.
93. **[HECHO] Blueprint virgen antes del lanzamiento.** Se verificó 0 workers y 0 outputs.
94. **[HECHO] 8 workers lanzados.** La cohorte actual está trabajando sobre el blueprint.
95. **[HECHO] Dejar terminar sin intervención innecesaria.** Runtime actual preserva leases válidos, permite DRAINING sin cortar trabajo activo y reserva la intervención para fallos/estados estructurales. Evidencia: `docs/cognitive-forge/BACKLOG-095-NO-UNNECESSARY-INTERVENTION-EVIDENCE.md`.
96. **[PENDIENTE] Analizar distribución de 420 jobs.** Medir quién hizo qué y cuánto.
97. **[PENDIENTE] Comprobar ancho real.** Ver si 84 raíces evitan concentración de trabajo.
98. **[PENDIENTE] Medir rescates del blueprint largo.** Analizar expiraciones y recuperación.
99. **[PENDIENTE] Auditar calidad canónica.** Revisar si los documentos finales son realmente implementables.
100. **[PENDIENTE] Auditar aprendizaje de los 84 puntos.** Ver qué Tools, Plumas y Recipes nuevas aparecieron.
101. **[HECHO] Índice web del Blueprint 84.** Existe una página de observación.
102. **[HECHO] Inspección individual de puntos.** Cada punto se puede abrir por separado.
103. **[HECHO] Cinco fases visibles.** La página muestra progreso por fase.
104. **[HECHO] Workers visibles.** La página muestra estado de cada patente.
105. **[HECHO] Palabras acumuladas visibles.** Se ve producción por punto.
106. **[DISENADO] Taller vivo, no dashboard.** La visualización futura debe mostrar trabajo como acción física.
107. **[DISENADO] Workers como piezas.** Grilla estable de presencia.
108. **[DISENADO] Pulso de worker activo.** Animación mínima para actividad.
109. **[DISENADO] Grafo físico central.** Tareas y dependencias como nodos espaciales.
110. **[DISENADO] Brazo/línea worker→objeto.** Mostrar qué toca cada worker.
111. **[DISENADO] Mano/pinza como acento.** Usarla sólo en tomar/depositar objetos importantes.
112. **[DISENADO] Zona de Herramientas.** Espacio visual separado para Tools.
113. **[DISENADO] Zona de Plumas.** Espacio visual separado para preguntas cognitivas.
114. **[DISENADO] Zona de Recipes.** Espacio visual separado para combinaciones.
115. **[DISENADO] Subtareas nacen de su madre.** Mostrar causalidad visual.
116. **[DISENADO] Rescate como transferencia.** Visualizar el paso de una tarea vencida a otro worker.
117. **[DISENADO] Nacimiento de candidata.** Una nueva pieza de conocimiento emerge desde el trabajo.
118. **[DISENADO] Revisión visual.** Otro worker toma la candidata y la evalúa.
119. **[DISENADO] Promoción visible.** La candidata aceptada entra a biblioteca permanente.
120. **[DISENADO] Rechazo con historial.** El rechazo no borra procedencia ni evidencia.
121. **[DISENADO] Vista global.** Primer nivel de inspección.
122. **[DISENADO] Detalle de tarea.** Segundo nivel de inspección.
123. **[DISENADO] Detalle de conocimiento.** Tercer nivel de inspección.
124. **[DISENADO] Inspeccionar worker.** Ver recorrido, tareas, rescates y conocimiento creado.
125. **[DISENADO] Inspeccionar tarea.** Ver Goal, Card, Plumas, Tools, inputs y outputs.
126. **[DISENADO] Inspeccionar objeto cognitivo.** Ver definición, procedencia, revisiones y uso histórico.
127. **[HECHO] Construir visualización física.** Pixel Campus en `demos/prometeo-pixel-world/`: mundo físico de workers conectado al runtime real, con fallback demo sólo si la lectura live falla.
128. **[DISENADO] Progreso ponderado.** No usar sólo jobs terminados / jobs totales.
129. **[DISENADO] Peso por fase.** Cada fase vale según trabajo esperado.
130. **[DISENADO] Peso Architect ~13,8%.** Estimación inicial dentro de un punto.
131. **[DISENADO] Peso Development ~28,8%.** Estimación inicial dentro de un punto.
132. **[DISENADO] Peso Adversarial ~15,4%.** Estimación inicial dentro de un punto.
133. **[DISENADO] Peso Canonical ~32,7%.** Estimación inicial dentro de un punto.
134. **[DISENADO] Peso Learning ~9,2%.** Estimación inicial dentro de un punto.
135. **[DISENADO] Dos porcentajes.** Mostrar puntos completos y trabajo estimado completo.
136. **[DISENADO] Progreso parcial activo.** Una tarea en curso puede aportar progreso estimado.
137. **[DISENADO] Cap de 90% en trabajos activos.** No considerar completo algo no publicado.
138. **[DISENADO] ETA sin IA.** Calcular en navegador usando datos existentes.
139. **[DISENADO] Usar timestamps Supabase.** No gastar workers en estimaciones.
140. **[DISENADO] Arranque con histórico.** Usar runs anteriores antes de tener muestras suficientes.
141. **[DISENADO] Migrar a datos del run actual.** La estimación se adapta automáticamente.
142. **[DISENADO] Usar mediana.** Reducir sensibilidad a outliers.
143. **[DISENADO] Duración por fase.** Aprender tiempos distintos para Architect, Development, etc.
144. **[DISENADO] Throughput por worker.** Usarlo para capacidad efectiva, no como ranking humano.
145. **[DISENADO] Simulación del scheduler.** Proyectar cola restante en JavaScript.
146. **[DISENADO] ETA rápido/central/lento.** Usar percentiles para banda temporal.
147. **[DISENADO] Confianza del ETA.** Mostrar cuánta evidencia respalda la estimación.
148. **[DISENADO] Confianza crece con muestras.** No inventar certeza temprana.
149. **[DISENADO] Utilización de workers.** Mostrar cuántos están efectivamente ocupados.
150. **[DISENADO] Detectar cuello de botella.** Identificar fase que domina tiempo restante.
151. **[DISENADO] Producción agregada.** Mostrar palabras por unidad de tiempo.
152. **[DISENADO] Retrabajo y rescates.** Mostrar costo de fallos y recuperación.
153. **[DISENADO] What-if de workers.** Simular 8, 12, 16, 24 workers sin abrir chats.
154. **[DISENADO] Capacidad útil del DAG.** Estimar cuándo más workers dejan de ayudar.
155. **[PENDIENTE] Implementar estimador.** Agregar ETA y progreso ponderado al observador Blueprint.
156. **[CONCLUSION] Cantidad de workers no debería ser fija.** El runtime final debe tolerar pools variables.
157. **[HECHO] Hard cap actual = 8.** El blueprint actual limita workers.
158. **[DISENADO] recommended_workers + safety cap.** Separar recomendación de límite técnico.
159. **[DISENADO] Menos workers = más lento.** Mismo trabajo, menor throughput.
160. **[DISENADO] Más workers = más paralelismo.** Mientras existan nodos READY.
161. **[DISENADO] Sobrantes deberían esperar.** WAIT es mejor que NO_WORK si puede aparecer trabajo futuro.
162. **[PENDIENTE] Eliminar hard cap rígido.** Runtime final debe aceptar cohortes variables.
163. **[DISENADO] Medir beneficio decreciente.** Encontrar empíricamente el punto donde sumar workers casi no ayuda. Spec ejecutable: `docs/cognitive-forge/BACKLOG-163-DIMINISHING-RETURNS-EXPERIMENT-SPEC.md`.
164. **[DISENADO] No implementar directo desde 84 documentos.** Primero hace falta una capa de compilación.
165. **[DISENADO] Interfaz compacta por punto.** Además del canonical largo, extraer un contrato pequeño.
166. **[DISENADO] Contenido de interfaz compacta.** Propósito, inputs, outputs, estados, funciones, eventos, invariantes y pruebas.
167. **[DISENADO] Integración por secciones.** Agrupar y reconciliar documentos relacionados.
168. **[DISENADO] 7 secciones principales.** Fundamentos, Planificación, Ejecución, Aprendizaje, Visualización, Experimento y Evaluación.
169. **[DISENADO] Detectar duplicaciones.** El integrador de sección debe encontrar conceptos repetidos.
170. **[DISENADO] Detectar contradicciones.** Resolver incompatibilidades entre puntos.
171. **[DISENADO] Normalizar vocabulario.** Unificar nombres para conceptos equivalentes.
172. **[DISENADO] Encontrar dependencias ausentes.** Hacer explícitas relaciones no modeladas.
173. **[DISENADO] Separar decisiones abiertas/canónicas.** No reabrir decisiones cerradas sin evidencia.
174. **[DISENADO] Section Specifications.** Una especificación integrada por sección.
175. **[DISENADO] System Spec global.** PROMETEO COGNITIVE FORGE SYSTEM SPEC.
176. **[DISENADO] Contrato exacto de interfaces compactas.** Definir schema reusable. Spec ejecutable: `docs/cognitive-forge/BACKLOG-176-COMPACT-INTERFACE-SCHEMA-SPEC.md`.
177. **[HECHO] Integrador de sección.** `FORGE_SECTION_INTEGRATOR` v1 quedó ACTIVE/ACCEPTED con contrato versionado, `forge_section_integrator_result_validate`, fixture de promoción y smoke reproducible. Spec: `docs/cognitive-forge/BACKLOG-177-SECTION-INTEGRATOR-SKILL-SPEC.md`.
178. **[PENDIENTE] Integrador global.** Diseñar y ejecutar la compilación final.
179. **[DISENADO] System Spec → Build Graph.** Compilar conocimiento en trabajo de implementación.
180. **[DISENADO] Generar tareas reales de implementación.** El sistema produce jobs técnicos a partir de la spec.
181. **[DISENADO] Workers modifican Prometeo.** Los jobs deben poder producir cambios reales.
182. **[DISENADO] Tests posteriores.** Toda implementación debe pasar pruebas.
183. **[DISENADO] Revisión posterior.** Separar constructor y revisor cuando sea posible.
184. **[DISENADO] Promoción posterior.** Sólo cambios validados llegan a producción.
185. **[CONCEPTO] Bootstrap cognitivo.** Idea → Blueprint → Spec → Build → Test → Promote → sistema mejor.
186. **[HECHO] Trazabilidad spec→cambio.** Vista `public.prometeo_control_spec_change_trace` implementada: une `frontier_source_key`/`source_ref` con referencias de artefacto, commit, migración o cambio y marca implementaciones sin referencia explícita. Migración: `supabase/migrations/20260922042200_frontier_spec_change_traceability_v1.sql`.
187. **[PENDIENTE] Aislamiento y rollback.** Definir cómo probar y revertir builds generados por workers.
188. **[DISENADO] Skill INSPECT_RUN.** Leer configuración, workers, jobs, outputs, eventos y métricas.
189. **[DISENADO] Skill DIAGNOSE_COORDINATION.** Detectar stalls, concentración, ancho insuficiente y fallos.
190. **[DISENADO] Skill DESIGN_NEXT_EXPERIMENT.** Convertir diagnóstico en hipótesis y configuración nueva.
191. **[DISENADO] Skill BUILD_DURABLE_PROTOCOL.** Crear schema, estados, RPCs, RLS, leases y eventos.
192. **[DISENADO] Skill SMOKE_TEST_PROTOCOL.** Crear test descartable y forzar fallos relevantes.
193. **[DISENADO] Skill CREATE_REAL_RUN.** Crear run limpio y verificar virginidad.
194. **[DISENADO] Skill PUBLISH_OBSERVER.** Construir, publicar y verificar observador.
195. **[DISENADO] Skill GENERATE_WORKER_PROTOCOL.** Convertir estados/RPCs reales en prompt homogéneo.
196. **[DISENADO] Skill LEARN_FROM_COMPLETED_WORK.** Extraer Skills, Tools, Plumas y Recipes de una ejecución.
197. **[HECHO] Registry durable de Skills.** `forge_skills` persiste identidad estable, estado y provenance; implementación durable: migración `forge_skill_registry_and_version_schema`.
198. **[HECHO] Schema de Skill.** `forge_skill_versions` conserva versiones históricas con inputs/outputs, pasos, rollback, verificación, evidencia y madurez; smoke reproducible: `forge_skill_registry_smoke_test()`.
199. **[HECHO] No depender de prompts largos.** Resolver pinneado + contrato `skill_ref` + smoke implementados; spec: `docs/cognitive-forge/BACKLOG-199-SKILL-REFERENCE-RUNTIME-SPEC.md`.
200. **[HECHO] Extraer determinismo de la IA.** Executor SQL determinista v1 para porcentajes, medianas, tasas, ETA, redondeo y batches acotados; smoke reproducible PASS. Evidencia: `docs/cognitive-forge/BACKLOG-200-DETERMINISTIC-EXECUTION-EVIDENCE.md`.
201. **[DISENADO] SKILL_COMPILER.** Detectar pasos repetidos en ejecuciones exitosas y crear Skill candidates.
202. **[DISENADO] Versionado de Skills.** Mantener versiones e historial.
203. **[DISENADO] Comparar Skill nueva vs anterior.** Probar sobre casos conocidos antes de promoción.
204. **[DISENADO] SUPERSEDED en vez de borrar.** Preservar historia y trazabilidad.
205. **[DISENADO] Banco de regresión para Skills.** Casos reutilizables para probar nuevas versiones. Spec ejecutable: `docs/cognitive-forge/BACKLOG-205-SKILL-REGRESSION-BANK-SPEC.md`.
206. **[HECHO] Trazar qué Skill produjo qué acción.** Persistencia + RPCs + smoke reproducible implementados en `forge_skill_action_traces`; spec: `docs/cognitive-forge/BACKLOG-206-SKILL-ACTION-TRACE-SPEC.md`.
207. **[DISENADO] Deep Skill ABSTRAER EL PROCEDIMIENTO.** Extraer el método reusable detrás de una solución.
208. **[DISENADO] Deep Skill CONSEJO DE PERSPECTIVAS.** Analizar desde empresario, IT, automatización, operaciones, UX, seguridad y otros roles.
209. **[DISENADO] Perspectivas deben discutir.** Resolver contradicciones entre puntos de vista.
210. **[DISENADO] RADICAL_SIMPLIFIER.** Intentar eliminar 50% de componentes sin perder propiedades.
211. **[DISENADO] ¿Por qué esto no es una función?.** Clasificar trabajo en determinista, cognitivo, humano y externo.
212. **[DISENADO] Reconstrucción sin original.** Medir qué información otro worker tuvo que inventar.
213. **[DISENADO] DIEZ VECES MÁS.** Preguntar qué cambiaría para 10× trabajo con mismos recursos humanos.
214. **[DISENADO] ¿Qué estamos haciendo dos veces?.** Buscar motores, pasos y protocolos duplicados.
215. **[DISENADO] Arquitecto de automatización.** Decidir qué corresponde a SQL, navegador, worker, Skill, scheduler o humano.
216. **[DISENADO] CEO vs Ingeniero.** Resolver tensiones entre valor, simplicidad, operación, UX, seguridad e IA.
217. **[DISENADO] Futuro retrospectivo.** Imaginar 50.000 tareas procesadas y volver al presente con cambios baratos.
218. **[DISENADO] FORGE_DEEP_RETHINK.** Combinar reconstrucción, perspectivas, simplificación, automatización, escala y aprendizaje.
219. **[DISENADO] NON_OBVIOUS_FINDINGS.** Exigir hallazgos no explícitos que cambien decisiones.
220. **[DISENADO] COMPRESSION_FINDINGS.** Buscar fusiones, funciones, contratos y políticas.
221. **[DISENADO] CAPABILITY_FINDINGS.** Buscar capacidades que el sistema supone falsamente que no tiene.
222. **[PENDIENTE] Persistir Deep Skills.** Convertirlas en objetos reales.
223. **[DISENADO] Rangos y contratos de Deep Skills.** Definir presupuestos y outputs obligatorios. Spec ejecutable: `docs/cognitive-forge/BACKLOG-223-DEEP-SKILL-CONTRACTS-SPEC.md`.
224. **[PENDIENTE] Medir utilidad de Deep Skills.** Registrar qué perspectivas producen hallazgos aceptados.
225. **[HECHO] Evolución de Deep Skills.** `forge_skill_propose_evolution` exige baseline `ACCEPTED` exacto y evidencia estructurada, rechaza cambios idénticos y crea sólo una versión `CANDIDATE` sin auto-promoción. Smoke: `SKILL_EVOLUTION_SMOKE_OK`. Migración: `supabase/migrations/20260922042500_forge_skill_evolution_v1.sql`.
226. **[DISENADO] Skill = determinismo + cognición + verificación.** Separar claramente las tres capas.
227. **[DISENADO] No gastar IA en cálculos.** Medianas, porcentajes y ETAs deben ser deterministas.
228. **[DISENADO] Usar IA para interpretación.** Anomalías, hipótesis y cambios de arquitectura sí requieren cognición.
229. **[DISENADO] Toda Skill termina con evidencia.** No basta con declarar éxito.
230. **[DISENADO] Intervención humana justificada.** Sólo autorización, preferencia real o acción física necesaria.
231. **[PENDIENTE] Backlog durable.** Externalizar pendientes y decisiones fuera de este chat.
232. **[HECHO] Cada backlog item como objeto online.** `backlog.json` expone 253 objetos con IDs 1–253 únicos y estado estable; Productive Frontier los referencia por `source_ref` y `frontier_source_key` sin colisiones observadas.
233. **[PENDIENTE] Estados del backlog.** IDEA, DESIGNED, READY, WORKING, VALIDATING, DONE y SUPERSEDED.
234. **[PENDIENTE] Relacionar backlog con origen.** Goals, Blueprint points, Skills, Tools y Plumas.
235. **[PENDIENTE] Workers reclaman backlog automáticamente.** Cuando termine el Blueprint actual, poder consumir pendientes sin intervención manual.
236. **[PENDIENTE] Descomponer pendientes complejos.** Un worker puede convertir un backlog item en subtrabajo.
237. **[PENDIENTE] Pendientes pueden crear pendientes.** Permitir crecimiento controlado del backlog.
238. **[PENDIENTE] Evitar duplicados.** Detectar similitud y relaciones, no sólo IDs.
239. **[PENDIENTE] Priorizar backlog.** Valor, dependencia, costo, riesgo y capacidad desbloqueada.
240. **[PENDIENTE] Separar mejora de experimento.** Distinguir construir Prometeo de aprender algo sobre Prometeo.
241. **[PENDIENTE] Registrar autoría/origen.** Usuario, worker o análisis posterior.
242. **[PENDIENTE] Conservar ideas rechazadas.** Guardar razones y evidencia.
243. **[PENDIENTE] Vista visual del backlog.** Conectarla con el taller de workers.
244. **[PENDIENTE] Mostrar capacidad desbloqueada.** Cada item debería declarar qué habilita.
245. **[PENDIENTE] Recomendar siguiente pendiente.** El sistema puede priorizar sin reemplazar preferencias humanas.
246. **[OBJETIVO] Prometeo recuerda procedimientos.** No depender de volver a explicarle cómo hacer algo ya aprendido.
247. **[OBJETIVO] Objetos durables en vez de prompts.** Mover memoria operacional fuera de conversaciones.
248. **[OBJETIVO] Goals generan trabajo.** Dejar de inventar manualmente cada cola.
249. **[OBJETIVO] Trabajo genera aprendizaje.** Cada ejecución puede producir conocimiento reusable.
250. **[OBJETIVO] Aprendizaje genera Skills.** Convertir patrones probados en procedimientos verificables.
251. **[OBJETIVO] Skills mejoran Prometeo.** El propio sistema usa conocimiento acumulado para evolucionar.
252. **[OBJETIVO] Cada Goal deja dos productos.** Resultado pedido + mejora potencial de capacidad.
253. **[OBJETIVO] Self-hosting cognitivo.** Prometeo comprende, planifica, construye, prueba, publica, observa, aprende y mejora con intervención humana sólo donde haga falta.

## Regla de mantenimiento

Este archivo debe evolucionar como índice durable. Cuando un ítem cambie de estado, se actualiza en lugar de duplicarlo. Si una idea es reemplazada, se marca como SUPERSEDED o se documenta la relación con su sucesora.