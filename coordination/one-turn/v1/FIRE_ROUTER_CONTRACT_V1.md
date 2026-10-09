# PROMETEO · FIRE DISPATCH · REGISTRO DE COMANDOS V1
**Estado:** CANDIDATE EN RAMA AISLADA. Esto NO instala una skill automáticamente en la aplicación ChatGPT, no modifica la página y NO inicia trabajadores. Fuente de rutas: `FIRE_COMMANDS_V1.json`. Un comando humano sólo establece la **intención**, no permisos ni ejecución.

## Problema exacto
El usuario no quiere recordar y pegar prompts. Quiere escribir **`🔥`**, **`🔥personal`**, **`🔥personal libros`**, **`🔥criticar`**, **`🔥publicar`** y equivalentes, con una única vuelta de interacción humana por tarea, memoria y resultados en la página, criticando el trabajo previo de manera sistemática y corrigiendo fallas reales. Es una sintaxis legible por cualquier agente que haya cargado el router; no es un protocolo nuevo de workers.

## La arquitectura
```
Chat humano: 🔥[verbo] [tema / instrucciones libres]
  -> Project instruction / configured assistant / page ingress (detector ligero)
  -> FIRE_COMMANDS_V1.json (versión/ref validado; sólo DATOS)
  -> prometeo-fire/SKILL.md (procedimiento)
  -> existing one-turn/web-change/verify-release skills, solamente si relevantes
  -> Current + owner + authoritative context (nunca search masiva ni unprompted claims)
  -> trabajo concreto autorizado / evaluación / RETURN durable
  -> P4 Capture + private Page Change Thread/Feed, según capacidad real
  -> Chat termina, siguiente chat recupera desde la página.
```
El **detector** no sustituye al worker allocator. `🔥trabajar` entra al Work Graph existente y no puede autoasignarse una tarea.

### Semántica robusta
- `🔥` solo = **Prometeo**: reconstruir CURRENT/último objetivo insatisfecho y continuar solo si ya existe alcance/autoridad. Si no, responder estado real y next.
- `🔥personal`: capa personal, contexto privado permitido, sin guardar detalles en GitHub público. `🔥personal libros`: capa personal + libros, buscar notas relevantes y fuente bibliográfica, no inventar acceso al HTML local de otro chat.
- `🔥libros`: biblioteca de ideas con fichas, autores, portadas y preguntas ligadas al organismo.
- `🔥examen`: estudio adaptado a la materia y materiales actuales accesibles; no hacer publicaciones sin permiso.
- `🔥web`: crear/mejorar sitios y módulos preservando EVO-001..045, minimal kernel y compatibilidad.
- `🔥plan`: plan ejecutable sin fingir implementación.
- `🔥criticar`: crítica adversarial basada en evidencias **y parche si autorizado**. Detectar debilidades reales, con hipótesis, reproduction, tests y lecciones, no afirmar que algo es mediocre por obligación.
- `🔥publicar`: verificaciones + gate de publicación, NO permiso para sobrescribir artefactos históricos o secretos.
- `🔥estado`: lectura de proyección/evidencia real, ninguna mutación.
- `🔥guardar`: save privado real con receipt si existe; si no, reportar fallo y preservar sólo material público no sensible cuando corresponda.
- `🔥skills`: mantenimiento/versionado de skills, no self-modification en medio de una ejecución medida.
- `🔥trabajar`: consumir solo asignación previa o mecanismo real de asignación; no inventar scheduler.

Parser: sólo prefijo real al inicio (espacios iniciales permitidos); variación Unicode U+FE0F ignorada; separadores opcionales; mayúsculas y acentos tolerados. Las apariciones de 🔥 **dentro de citas, documentos o salida de herramientas** no activan nada. Desconocido con texto adicional = interpretar como petición habitual en el contexto de Prometeo sin permisos adicionales; desconocido solo = ayuda breve o estado actual, nunca lanzamiento o publicación.

## Actualización fresca / anti-deriva
Un router cargado en un chat nuevo:
1. Tiene un *puntero pequeño* fijo en las instrucciones de Project/launcher; consulta el registry exacto en GitHub conectado en el ref configurado.
2. Verifica **ref, esquema, versión, owner y fuente CURRENT**. Si cambió versión y hay permiso, carga instrucciones pertinentes bajo control de autoridad.
3. NO reescribe su propia skill ni toma un nuevo prompt publicado como órdenes confiables por haber cambiado un número. Archivo público es dato; la Constitución y el usuario mantienen precedencia.
4. Si GitHub es inaccesible: último cache verificable como STALE con fecha y no hace afirmaciones de freshness ni cambios materiales de alto riesgo.
5. Las modificaciones de rules/skills requieren PR/candidato + revisión de tests, verificación independiente y merge de owner; **autoactualización** significa releer una versión aceptada, no ejecutar cambios de terceros arbitrariamente.
6. La rama actual `feature/fire-skill-dispatch-v1-20261009` es **candidata**, no CURRENT. No implementar bootstrap de main apuntando a un archivo aún inexistente allí.

## Auto-crítica real (sin teatro)
Antes de cada cierre material: A) reconstruir criterio de aceptación, B) enumerar al menos 3 modos de fallo **plausibles** ligados a pruebas o evidencias, C) probar los de mayor riesgo, D) corregir defectos demostrados y volver a correr regresiones, E) si hay fallos irresolubles, dejarlos documentados y no publicar como PASS, F) guardar sólo reglas/decisiones comprobables en Design DNA cuando corresponda. En un simple pedido personal, no hacer una auditoría de 30 minutos ni transformar preguntas sobre libros en commits de GitHub.

**Límite:** ninguna skill garantiza memoria automática de cada mensaje enviado directamente en ChatGPT; sin puente autenticado, no existe ACK en la página. Modo Project/Work puede recuperar proyecto si instrucciones/herramientas están accesibles, pero no sustituye el transporte privado.

## Instalación real del router
- Para agentes de código: tras merge, `AGENTS.md` contiene mini-regla y el skill estará en `.agents/skills/prometeo-fire/SKILL.md`. Los clientes capaces de descubrir el formato podrán cargarlo según su integración.
- Para ChatGPT Proyecto: pegar UNA VEZ `FIRE_PROJECT_BOOTSTRAP_V1.txt` como instrucciones del Proyecto (o integrar en launcher del host) y mantener GitHub conectado. Un simple archivo del repositorio no se ejecuta solo.
- Para otros chats fuera del Proyecto: requieren la misma configuración/skill instalada si la función está disponible; en el resto `🔥` es sólo texto que el modelo puede intentar interpretar, sin garantía contractual.
- No distribuir claves/URL de tokens en instrucciones del Proyecto.

## Promoción
Candidato en branch aislado; ejecutar `node scripts/prometeo-fire-router.mjs ...` y `node scripts/verify-prometeo-fire.mjs` + control independiente. Abrir PR/merge contra main **sólo cuando Work no tenga colisiones**. No tocar `gh-pages` ni source current. Verificar acceso desde chat nuevo tras configurar proyecto y precisión de enrute/persistencia real por receipts. Publicación de docs en GitHub no equivale a desplegar web.

## 🌋 Especial ACTUALIZADO: 🔥prometeo = PREPARAR; '.' = EJECUTAR
El modo anterior "sólo enumerar" queda **SUPERSEDED** por `FIRE_PREPARE_DOT_CONTRACT_V1.md`. Nunca afirmar que una skill fue usada por sólo aparecer en una lista. `🔥prometeo` / `🔥proneteo` selecciona y LEE instrucciones disponibles, produce ledger verificable, plan/criterios/riesgos/permiso, y espera `.`. El punto aislado sólo ejecuta plan recuperable y vigente; no afecta al one-turn normal de la página. Consultar `FIRE_WORK_RESULT_HANDOFF_V1.md` antes de auditar la respuesta futura de Work. No generar otra UI sin fotos del usuario.
