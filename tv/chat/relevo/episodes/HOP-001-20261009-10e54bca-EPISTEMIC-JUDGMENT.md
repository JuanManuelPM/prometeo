# Prometeo · Relevo intelectual HOP 1: memoria criticable
**Tipo:** episodio técnico público, candidato intelectual, NO contrato CURRENT ni orden de implementación.
**Rama de evidencia:** gh-pages. **Fecha:** 2026-10-09. **Estado:** OPEN, aprendizaje formulado; todavía no se ha demostrado una cadena independiente de cinco chats.
**Vínculo causal:** `tv/chat/relevo/CONTINUIDAD_INTELECTUAL_V2.md` (memoria de criterio, preguntas abiertas y prueba fría) y `main:coordination/design-dna/PROMETEO_DESIGN_DNA_V1.md` (invariantes, Goldens, contraejemplos, procedencia y anti-bloat). No reemplaza esos owners.

## Pregunta
¿Cómo conservar inteligencia acumulada entre chats descartables sin convertir la memoria compartida en autoridad dogmática?

## Tesis y razonamiento nuevo
La métrica central no es retención textual sino **capacidad de justificar, cuestionar y revisar decisiones basadas en evidencia**. La pérdida más dañina suele ser causal: una hipótesis local se convierte en regla global mediante resúmenes reiterados sin nuevas pruebas. La repetición entre modelos/chat con fuente común NO es corroboración independiente.

### Selección y estados epistemológicos propuestos, NO implementados
Clasificar un aprendizaje *en su owner existente*, no en otro BRAIN: DECISIÓN VIGENTE (con alcance y autoridad), HECHO VERIFICADO (con SHA, método y límites), HIPÓTESIS (falsador), DESACUERDO ABIERTO (alternativas y test discriminante), ERROR APRENDIDO (causa y anti-regresión), OBSOLETO/SUPERSEDIDO (enlace al reemplazo, historia conservada). El valor de conservación depende de costo de reconstrucción, impacto en decisiones, irreemplazabilidad y costo de confiar en un error. Información privada fuera de GitHub público.

Para cada conocimiento de alto impacto preservar: afirmación, procedencia, alcance/tiempo, argumento causal, contraejemplo, condición de revisión, autoridad y efecto sobre consumidores. Documentar sin trasladar silenciosamente a Design DNA, skills o CURRENT; promover sólo mediante las autoridades/gates existentes. Regla del usuario sobre objetivos no transforma una proposición empírica en hecho.

### Objeción fuerte
Un dossier obligatorio por cada idea añade carga de coordinación, reviviendo un anti-Golden de Design DNA. Respuesta: profundidad proporcional a riesgo, y mínimo overhead para workers; registrar episodios acotados y pruebas sólo al intentar promoción. Otra objeción: CAS evita pérdida de bytes pero no resuelve desacuerdos semánticos ni evidencia falsa. Exigir pruebas independientes y posibilidad de revocación.

## Estado observado, no inferencia de lanzamiento
Consulta fresca 2026-10-09: PR #71 HEAD ed5939ae, #72 HEAD 4a46e0bd, #73 HEAD 55fb9344, #74 HEAD db5b307f; los cuatro seguían OPEN/DRAFT, sin merge. Para el HEAD de #74 cinco workflows asociados consultados figuran success. El recibo `integration/prometeo-71-72-73-20261009:coordination/chat-bootstrap/v1/INTEGRATION_RECEIPT_20261009.json` documenta Demo Engine V6 PASS automatizada en DOM real de escena #72 (tres viewports), pero NO aceptación visual humana, TV hardware, fusión ni publicación de escena candidata; served HTTP comprobó la versión anterior. Refrescar PR/CI/servido antes de afirmaciones actuales.

## Experimento longitudinal propuesto, NO ejecutado
Cinco chats distintos; prompts mínimos que sólo señalan fuentes estables, nueva pregunta en cada salto, sin copiar respuestas. H1 recupera y formula hipótesis refutable; H2 confronta Design DNA; H3 detecta conflicto entre estado histórico y HEAD actual; H4 demuestra carrera CAS preservando ambas contribuciones o conflicto; H5 presenta contraejemplo y revisa explícitamente la primera tesis. Por salto: GitHub read real + episodio único + CAS del estado + readback independiente. Evaluador separado con hechos ocultos, controles de baseline 'sólo resúmenes', y métricas: precisión de procedencia, calidad de decisión sobre caso nuevo, contradicción detectada, pérdida de historia, revisión ante contraejemplo y número de intervenciones humanas. Gates duros: cero afirmaciones ficticias de CURRENT/SERVED y cero información privada pública. Subir el contador no es suficiente.

## Preguntas abiertas para el sucesor
1. ¿Quién establece el criterio de promoción entre hipótesis y norma sin concentrar arbitrariamente autoridad? ¿Cómo comparar una instrucción humana y evidencia empírica contradictoria?
2. ¿Cómo medir deriva epistemológica (falsa certeza) versus compresión útil? ¿Qué baseline y juez independiente usar?
3. ¿Qué test adversarial revela que el sistema conserva sus prejuicios aunque conserve todos sus archivos?
4. ¿Cuánta explicación causal vale su costo en lecturas y mantenimiento? ¿Cuándo se invalida una prueba antigua?
5. ¿Cómo aislar una memoria pública de una privada cuando el hecho técnico depende de un episodio personal?
6. ¿Cómo separar integridad de escritura (CAS) de reconciliación de conclusiones incompatibles?

## No adoptar en silencio
Todo lo anterior es propuesta OPEN. No cambió ningún runtime, Design DNA, Work Graph, skill, widget ni TV. La continuidad funcional por cinco chats no está probada; este episodio es una contribución candidata para debatir, impugnar o ampliar.
