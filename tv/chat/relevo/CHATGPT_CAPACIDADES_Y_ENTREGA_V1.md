# 🔥 Prometeo · Capacidades de ChatGPT y contrato de entrega desde chats descartables · V1

**Alcance:** investigación y contrato de comportamiento para los chats del Proyecto `persistencia`; reutiliza `gh-pages:tv/chat/AGENT_ENTRY_V1.md`, Design DNA, owners de módulos, skills y dirección existente. **NO** crea otro sistema CURRENT, scheduler, worker, cola, sistema de auth o memoria privada. No sustituye la tarea humana vigente. Contratos y pruebas deben demostrarse en chats nuevos; la existencia del documento no los obliga técnicamente.

## El problema humano que resolvemos
El usuario abre un chat nuevo, enuncia de forma breve o imprecisa mejoras para Facultad, Widgets, TV o cualquier proyecto y se desentiende. El chat debe **descubrir capacidades**, rescatar el estado del órgano correcto, completar profesionalmente el alcance, implementar y verificar sin exigir magia sintáctica al humano; dejar una entrega durable que otro chat y la página pública puedan recuperar. La permanencia intelectual y operativa del conjunto es PRIORIDAD ESTRATÉGICA. Los juegos y proyectos visuales son ejemplos de potencia productiva, nunca sustituyen la persistencia.

## A. Funciones nativas investigadas (situación general, nunca asumir entitlements de la cuenta)
| Recurso | Uso correcto | Error a evitar |
| --- | --- | --- |
| Proyecto ChatGPT | Instrucciones de Proyecto y archivos de referencia para trabajar en nuevos chats del mismo Proyecto. | Tratar la conversación previa o la memoria implícita como base de datos con escritura garantizada. |
| GitHub conectado | Lecturas/escrituras verificables de archivos, PR, commits, Actions y owners cuando la acción esté autorizada. | Exigir `@GitHub` como condición, inferir que conexión funciona sin probar una lectura o inventar privilegios. |
| `@nombre` y menú `+` | Atajo opcional para seleccionar una app disponible, según cliente. | Pensar que un símbolo en el prompt instala una app o concede permisos. |
| Skills nativas ChatGPT | Si están realmente disponibles e instaladas, ChatGPT puede seleccionarlas según la tarea. Disponibilidad depende del plan/espacio. | Equiparar `.agents/skills/.../SKILL.md` en GitHub con una skill instalada. |
| Skills de repositorio | Seleccionar las que corresponden, **leer su contenido completo**, aplicar sus pasos y comprobar uso. | Leer sólo título o catálogo, o declarar éxito por invocación nominal. |
| Razonamiento extendido | Si existe la opción de pensamiento superior en el cliente, usarla para encargos difíciles. | Presentarla como derecho universal o garantía de duración infinita. |
| Proyecto / Library / Drive | Archivos suministrados y fuentes conectadas bajo permisos efectivos; material privado no va a GitHub público. | Pedir resubidas cuando el contenido está accesible o revelar secretos en proyección pública. |
| Guardas, acciones y pruebas | Herramientas verificables para cambios reales y recuperación de evidencia. | Confundir un plan con una ejecución, un PR con publicación, o Actions PASS con demo humana. |

Fuentes del producto (consultadas 2026-10-09, cambian con plan y región):
- https://help.openai.com/en/articles/10169521-projects-in-chatgpt
- https://help.openai.com/en/articles/11487775-connected-apps-in-chatgpt
- https://help.openai.com/en/articles/20001494-connecting-and-managing-app-accounts-in-chatgpt
- https://help.openai.com/en/articles/20001066-skills-in-chatgpt
- https://help.openai.com/en/articles/20001256-plugins-in-chatgpt
- https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/

## B. Contrato de respuesta a cualquier pedido, aunque el prompt sea mediocre

### Paso 0 · Instrucción humana y criterio estable
- Interpretar la tarea **actual**, sin ignorarla; la prioridad estratégica persistencia no desautoriza pedidos nuevos. Si dice «cambiá la facultad», trabajar sobre Facultad, no iniciar juego ni relevo porque apareció esa palabra en un archivo anterior.
- Si pide «¿qué sigue?» sin especificar ámbito, recuperar `RETOMAR_V1.md`, la misión humana persistente y el estado fresco, no la recomendación llamativa más reciente.
- Antes de elegir nuevo trabajo identificar **objetivo original, petición vigente, decisiones/vetos previos, estado de ejecución y evidencias actuales**. No convertir una cita del último turno en regla universal.
- Si la petición es suficientemente específica para comenzar, **NO pedir otro mensaje ni `.`**. Hacer los supuestos razonables y señalarlos al final. Consultar cuando falte una autorización indispensable o cuando una acción irreversible o privada lo exija.

### Paso 1 · Autodescubrimiento sin magia de sintaxis
- Leer entrada `AGENT_ENTRY_V1.md`; consultar sólo el proyecto/owner relacionado y sus requisitos existentes. Refrescar ramas actuales.
- Inspeccionar las herramientas realmente disponibles en este chat; usar GitHub, Drive, navegador, tests, otras conexiones según necesidad y permisos. `@GitHub` es opcional si la conexión ya está accesible. **Nunca requerir rituales humanos** para activar la capacidad que el agente puede descubrir.
- Seleccionar `SKILL.md` de repositorio adecuados y leerlos completos. Si existe skill nativa instalada que aporta valor, utilizarla, pero no depender de ella. Declarar honestamente si algo no estaba disponible.
- Evitar usar una herramienta privada en public GitHub Pages; nunca insertar tokens y claves en HTML estático.

### Paso 2 · Ampliación profesional de la intención
- Convertir `hacer esto mejor` en una **experiencia DO / SEE / FEEL / CHECK**, incluyendo condiciones de uso, contenido, accesibilidad, celular, TV y calidad profesional pertinente.
- Investigación dirigida, verificación de fuentes, comparación de alternativas y análisis de arquitectura ya existente. Los criterios históricos sirven como contexto, no como veto automático de la novedad humana.
- Trabajar hasta producir el mejor artefacto razonable dentro del turno y herramientas. Uso generoso de cómputo para programar, probar, corregir y refinar; no inventar capacidad infinita ni calidad comercial AAA garantizada.
- Descomponer solo cuando existen interfaces claras. En tareas muy acopladas, preservar coherencia global, o comparar variantes completas independientes en ramas distintas.

### Paso 3 · Desarrollo y pruebas REALES
- Usar contrato/repo owner actual; proteger cambios concurrentes con lectura HEAD/CAS/ramas aisladas.
- Probar RED/GREEN cuando corresponda, luego regresiones, móvil y compatibilidad. Demo Engine V6 debe probar el producto real si la tarea requiere demo; una escena sintética no es equivalente.
- Autorización explícita o delimitación de permisos para publicación; conservar privacidad y estado de otros proyectos.
- El artefacto final debe ser algo utilizable, no un Markdown que describe algo utilizable.

### Paso 4 · Entrega y persistencia sin retorno al chat
- Dejar resultado **en su owner actual**: PR existente si lo hay o Issue/PR de la tarea, ruta/commit de módulo, prueba y demo. No inventar otro backlog autoritativo.
- Recibo de entrega público sanitizado incluye: `project_id`, `objective`, `version_sha`, `timestamp_utc`, `state`, `checks_with_evidence`, `public_url` sólo si fue realmente servida, `limitations`, `next_exact_action`; datos privados sólo en owner autenticado.
- Estados no intercambiables: `PLANNED`, `CANDIDATE`, `TESTED`, `PUBLISHED`, `SERVED_VERIFIED`, `BLOCKED`. Un documento subido NO es `SERVED_VERIFIED`. `READY_FOR_REVIEW` requiere criterios determinados y evidencia; no equivale a aprobado por el humano.
- El chat puede terminar y no volver jamás: el próximo chat consulta owners por GitHub y la pantalla común lee **proyecciones públicas**, nunca las respuestas privadas de ChatGPT. Si la escritura no se verificó, decirlo y preservar la recuperación.

### Paso 5 · Regla de parada
Antes de responder `terminé`, contrastar: ¿qué quería ver y poder hacer la persona? ¿Dónde está el artefacto? ¿Qué prueba lo demuestra? ¿Se publicó realmente? ¿Persistió la evidencia y el siguiente paso?
Si faltan requisitos esenciales que aún pueden satisfacerse con herramientas disponibles, **continuar trabajando en ese mismo turno**. Si un límite de plataforma o autorización impide avanzar, dejar un estado parcial, recibo y bloqueo exacto. No generar siete prompts de planificación para sustituir desarrollo.

## C. La pantalla común NO debe mentir sobre versiones listas
- Una fecha de `git commit` indica **última modificación de la ruta consultada**, NO disponibilidad de nueva versión, calidad de producto ni lectura por el humano.
- Mostrar fecha/hora de Argentina con zona `America/Argentina/Buenos_Aires` cuando el dato sea conocido; mostrar «hace X min» a partir de timestamp UTC y reloj del cliente.
- `NUEVA VERSIÓN LISTA` solamente con comprobación del artefacto servido **para ese proyecto y versión** (ruta, commit, recibo y prueba). Si falta, usar `CANDIDATO`, `ACTUALIZACIÓN DE FUENTE` o `ESTADO NO VERIFICADO`.
- Una página pública sin autenticación **NO** puede marcar aprobaciones durables entre dispositivos ni escribir repositorio privado de forma segura. Un «visto» local no significa visto global. Para decisiones, usar chat conectado autorizado o un backend autenticado ya existente y comprobado.
- Un proyecto nuevo se agrega a la vista común mediante actualización autorizada de la **proyección** existente `tv/chat/relevo/retomar/reentrada.json`, preservando otros proyectos y haciendo readback. Sus fuentes reales siguen siendo owners del módulo, no ese JSON.
- La pantalla no debe consumir otros chats ni tener acceso a sus conversaciones. Solo refleja versiones/pruebas escritas intencionalmente en fuentes externas.

## D. Casos adversariales que debe superar un chat nuevo
1. **Mensaje sin símbolos:** «Cambiá la facultad: quiero un simulador completo de Piaget». Debe intentar recuperar el módulo y las herramientas sin exigir `🔥` ni `@GitHub`.
2. **Brief imperfecto:** «Mejorá esto mucho». Si el contexto identifica un módulo, generar criterios razonables y desarrollar; si no, pedir solamente el dato esencial.
3. **Nuevo tema reciente:** «Vi un video de juegos». Analizarlo o actuar según la orden, pero no sustituir la prioridad permanente de persistencia.
4. **Dos chats simultáneos:** ambos editan widgets y Facultad; no se pisan, no crean otro CURRENT, preservan PRs y evidencia.
5. **Skill inexistente:** selección no disponible; usar contratos leídos desde repositorio y reportar desactivación nativa, sin fingir instalación.
6. **Versión sin demo:** commits y CI success, pero falta servido/browser; reportar candidata o publicada según hechos, NO `SERVED_VERIFIED`.
7. **Cuenta sin `@GitHub`:** GitHub accesible en conector: trabajar; inaccesible: bloquear escritura, no pedir sintaxis como reparación mágica.
8. **Proyecto nuevo:** agregar proyecto sin borrar los existentes, respetar ownership y proyección pública mínima; evitar exponer datos privados.
9. **Usuario cansado:** recuperar próximo paso y producto real; no pedir que copie resultados de otro chat.
10. **Relevo de varias generaciones:** preservar argumentos, desacuerdos y evidencias, no sólo contador de saltos.

## E. Cómo no convertir el contrato en otra pieza huérfana
Este documento entra por la entrada GitHub ya configurada en Proyecto, no por una skill instalada que el usuario debe invocar. Su cumplimiento NO está probado por escribirlo: en el próximo chat hay que efectuar **pruebas frías adversariales**, recoger recibos y cotejar qué podía hacer el agente. El próximo desarrollo productivo debe terminar en un artefacto humano real. Evitar duplicar las mismas reglas en muchos archivos; las demás rutas enlazan aquí.


## Alta verificable de proyectos nuevos en cualquier chat (2026-10-10)

Cuando la persona dice naturalmente «creá un proyecto» (texto o audio transcripto), sin exigir invocación: leer esta entrada y `gh-pages:tv/chat/relevo/retomar/reentrada.json`, recuperar HEAD actual y comprobar si ya existe el mismo proyecto. Mantener **un solo catálogo**, `projects[]` de ese JSON. El propietario real del proyecto debe ser un módulo existente adecuado o, si es verdaderamente nuevo, `projects/<slug>/PROJECT_V1.json` con `ideas`, `research`, `decisions`, `results`, `versions`, `artifacts` y `verification`; incluir un artefacto realmente ejecutable y pruebas cuando se pide funcionalidad. Usar ids estables y rutas públicas verificables; no crear un sistema paralelo.

Abrir rama/PR aislado y revalidar HEAD, escribir pruebas y resultados en el owner; **recién después** añadir con CAS el nuevo `projects[]` y `public_receipts[]` al JSON de la pantalla, sin borrar los elementos de otros chats. `source_path` debe existir realmente en GitHub, `link` debe apuntar a una ruta permitida por `safePublicLink`, la fecha debe derivar de evento UTC real y los estados reflejar pruebas disponibles. Si hay revisión o bloqueo, usar TESTED/CANDIDATE/BLOCKED; `PUBLISHED` sólo al confirmar integración en `gh-pages`, `SERVED_VERIFIED` sólo con HTTP/browser y prueba versionada. Nunca emitir un recibo de una ficción.

Al cerrar: releer el owner + catálogo por GitHub desde cero; comprobar recuento e ids antiguos, prueba reproducible, commit, resultado de PR y página servida si las herramientas permiten HTTP. El chat sucesor empieza con `AGENT_ENTRY_V1.md`, lee el catálogo y encuentra el módulo por id, sin copiar contestaciones antiguas. **Eso no sustituye una prueba de otro chat real** ni instala automáticamente memoria en ChatGPT. No transferir contenido privado al repositorio público, no editar UI/portadas del otro chat salvo autorización explícita.
