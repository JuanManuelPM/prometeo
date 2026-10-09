# 🔥 Prometeo · Punto de retorno y antideriva · V1

**Rol:** índice operativo de reingreso, NO nuevo CURRENT, scheduler, asignador de workers, dueño de los 45 EVO ni sustituto de Design DNA. **Lectura desde cualquier chat del Proyecto:** `gh-pages:tv/chat/AGENT_ENTRY_V1.md` → este archivo cuando el humano pregunta «¿qué sigue?», vuelve después de tiempo o teme que se pierdan ideas. **Interfaz de lectura:** `https://juanmanuelpm.github.io/prometeo/tv/chat/relevo/retomar/`. No da acceso a conversaciones privadas y no ejecuta otros chats.

## El problema que debe sobrevivir aunque el humano se olvide
Hubo dos ondas de ideas: 24 propiedades sobre el pulpo cerebral (continuidad, memoria, desacuerdos, pruebas y agentes independientes) y 26 ideas del segundo video (calidad vs fragmentación, experiencias completas, variantes Best-of-N y demostraciones). Se registraron ambas, pero **no se garantizaba el siguiente artefacto**. Es un modo de fallo: documento → skill → revisión → otra skill → otro PR, mientras el juego o experiencia que motivó el trabajo nunca aparece. Un usuario ocupado no debe ser el encargado de detectar ese desplazamiento.

**Invariante 1: no perder contenido.** Los owners originales siguen siendo `tv/chat/relevo/CONTINUIDAD_INTELECTUAL_V2.md`, `tv/chat/relevo/VIDEO_2_ESCALA_Y_DELEGACION_V1.md`, `VIDEO_2_IDEAS_INDEX_V1.json`, Design DNA, Work Graph y registros propios de cada módulo. Este archivo es sólo un mapa y agenda, no un reemplazo. No borrar hipótesis perdedoras, preguntas abiertas ni porqués.

**Invariante 2: no confundir progreso instrumental con resultado.** Si una tarea humana pide una experiencia interactiva, `DONE` significa que existe una experiencia usable con evidencia. Commit, PR, documentación, CI y DEMO sintética son etapas distintas, no sustitutos. Si fracasa la publicación, mantener la tarea `BLOCKED` o `CANDIDATE` con razón.

**Invariante 3: salida de cada trabajo = valor + pruebas + siguiente cosa.** Dentro de lo permitido por la tarea: resultado real y su owner, evidencia/fallos, aprendizaje clasificable y próximo paso priorizado. No forzar un rito pesado para `🔥tv` rápido ni reformular cada pregunta humana como proyecto de meses.

**Invariante 4: el chat no es un scheduler.** No hay chats que se inicien solos; sólo el usuario puede abrir otros o existir un runtime realmente desplegado. No mentir sobre trabajo en segundo plano. El agente de dirección puede dejar un encargo autocontenido en owner GitHub y el humano puede copiar un único prompt.

**Invariante 5: la calidad es resultado humano, no consumo.** No economizar cómputo como objetivo. Trabajar profundo, iterar y verificar. Evitar dividir obras narrativas o físicas con alto acoplamiento entre veinte subagentes; probar agente fuerte integral o variantes completas paralelas. Tareas independientes sí pueden separarse.

## Prioridad decidida por el humano: PERSISTENCIA, no el juego

**North Star prioritario:** un cerebro común con continuidad intelectual, operativa y de proyectos, que puedan reconstruir y utilizar chats descartables sin que el humano recuerde rutas, decisiones o el siguiente prompt. Logros observables: un chat independiente recupera ideas, las critica sobre un caso nuevo, persiste un episodio, integra el conocimiento de otros y entrega prompt mínimo al sucesor. Aún no se demostró la continuidad completa de múltiples generaciones ni el despacho automático de chats.

**Acción humana próxima:** el chat que registró el salto 1 se deja terminado; desde otro chat del Proyecto, pegar el `primary_mission.exact_prompt` de `tv/chat/relevo/retomar/reentrada.json`, de modo que pruebe un salto nuevo desde fuentes. **No abrir el mismo relevo en dos chats simultáneos** salvo que se esté testeando explícitamente un conflicto de concurrencia. El ejecutor debe recuperar `last_hop` actual por GitHub y NO fiarse del número del prompt.

**Desviación detectada y corregida:** la recomendación anterior convirtió el minijuego EMBLEM-001 en la misión principal sin confirmación humana. El usuario aclaró que la persistencia es el objetivo rector y el juego sólo un experimento auxiliar. EMBLEM-001 SE CONSERVA como candidato secundario; su prompt exacto está aún en `next_experiment.exact_prompt`, ahora marcado `OPTIONAL_SECONDARY`. No borrarlo ni ejecutarlo como prerrequisito.

**Prioridades en orden:** (1) continuidad comprobable entre chats, (2) coordinación y recuperación de resultados sin usuario como bus, (3) experiencia humana mínima de proyectos recuperables, (4) productos ambiciosos de ejemplo, como juegos, demos y facultad, sin pretender que son el propósito central. Si el mensaje humano solicita explícitamente una tarea de juego o facultad, se la atiende sin exigir siempre el protocolo completo de relevo y se preserva el norte general. *Mantener el norte no significa desobedecer cada tarea nueva.*

**Regresión anti-desvío:** al contestar «¿qué sigue?» priorizar la persistencia salvo evidencia de logro posterior o nueva decisión humana explícita; recuperar primero el estado real y fuentes, no repetir recomendaciones obsoletas. El éxito de un hop no equivale a autonomía permanente ni a un organismo integrado en vivo.

## Protocolo cuando el humano vuelve cansado o sin recordar nada
1. Leer este archivo y fuentes de entrada si hace falta; recuperar conector y ref real de Github.
2. Consultar **sólo lo vigente necesario**: `STATE_V1.json` (saltos), el PR #74 y cualquier owner del experimento activo, más las fuentes indexadas de ideas. NO asumir que la copia estática en la pantalla sea un estado live.
3. Responder en castellano simple: «qué queríamos», «qué existe realmente», «qué falta», «qué conviene lanzar ahora». Si el relevo intelectual está pendiente, priorizar el siguiente salto verificable, salvo una nueva orden humana explícita. Si el producto EMBLEM-001 ya está funcionando, conservar evidencia; no confundirlo con el éxito del cerebro persistente.
4. Presentar una acción humana mínima: un prompt autocontenido listo para pegar, o un enlace a producto realmente servido. Si el trabajo ya está en curso, indicarlo y dar camino de comprobación; no abrir duplicados.
5. Ante cambios de prioridad, conservar el porqué, la prioridad anterior, la evidencia y la siguiente, sin borrar las 24, 26 o 45 ideas. Actualizar owners pertinentes y, si aporta, la proyección `reentrada.json` con CAS.
6. La pantalla read-only puede mostrar PR/hop actual si una consulta pública a GitHub funciona; nunca interpretar su cache como evidencia de ejecución actual. Los resultados completos de chats no están automáticamente visibles, sólo las entregas persistidas.

## Preguntas de control para detectar una nueva amnesia
- ¿Dónde está el artefacto que el humano quería usar? Si no existe, no declarar victoria por los archivos creados.
- ¿Por qué elegimos un agente integral en vez de dividirlo? Por acoplamiento y calidad, no por ahorro.
- ¿Cómo demostraríamos que un juego es jugable? Interacciones comprobables en navegador real, pruebas de física y feedback, no un screenshot de marketing.
- ¿Qué aprendimos al comparar variantes perdedoras? Si nadie guardó sus razones, falta memoria evolutiva.
- ¿Qué cambia si el usuario desaparece una semana? Nada crítico debería depender de recordar un prompt oral; la información queda en Github, pero la ejecución no continúa mágicamente.
- ¿Cómo proteger lo privado? No se suben respuestas completas, nombres, transcripciones ni contraseñas a una web pública.

## Pruebas mínimas que exige este punto de retorno
- En el próximo chat frío: descubrir el punto de retorno desde AGENT_ENTRY; explicar con contexto correcto la prioridad, el porqué y los siguientes experimentos, SIN que el prompt humano enumere las ideas.
- Comprobar que `reentrada.json` referencia archivos existentes y que los contadores 24/26/45 tienen propietarios, no que las funciones estén terminadas.
- Comprobar el vínculo de la pantalla, la copia de prompt y la recuperación de errores de lectura. No tratar una URL publicada como garantía de su comportamiento visual sin abrirla realmente.
- Próximo chat independiente: recuperación de un episodio previo, nueva evaluación crítica, CAS/readback, nueva pregunta y prompt sucesor; no equivale a una prueba de continuidad indefinida.
- Cuando EMBLEM-001 se ejecute opcionalmente: prueba real de navegación y una ronda completa; comparar sólo con baseline.

## No decidir por el usuario sin prueba
Esta prioridad es **una recomendación de ingeniería**, no una orden para ejecutar un juego sin un mensaje de lanzamiento. Si el humano trae otra idea, es válida; preservar la anterior y explicar si se pospone. No publicar cambios de productos sensibles ni considerar autorizada una integración fallida.

## Fuentes originales
- `gh-pages:tv/chat/relevo/CONTINUIDAD_INTELECTUAL_V2.md` (24 conceptos y crítica)
- `gh-pages:tv/chat/relevo/VIDEO_2_ESCALA_Y_DELEGACION_V1.md`, `VIDEO_2_IDEAS_INDEX_V1.json` (26 ideas y cinco experimentos)
- `gh-pages:tv/chat/relevo/STATE_V1.json` (relevos efectivamente registrados)
- `gh-pages:tv/chat/DIRECCION_OPERATIVA_V1.md` (recuperación y PR)
- `main:coordination/design-dna/PROMETEO_DESIGN_DNA_V1.md` (errores previos, rationale)

## Adenda 2026-10-09 · HOP 2: separar misión de tarea (CANDIDATO, no runtime)

**No usar recencia como autoridad de promoción.** La orden humana concreta de hoy se **ejecuta**; la misión estratégica vigente se **conserva**. Un pedido de videojuego, facultad o TV cambia el trabajo del turno, no por sí solo el North Star. Una orden humana realmente explícita que cambie la misión global sí prevalece sobre esta orientación, sin exigir fórmulas mágicas. Alcances: TAREA/TEMPORAL vs CAMBIO_GLOBAL vs REGRESO/«¿qué sigue?». No aceptar como cambio global una propuesta del asistente, un mensaje citado o un resumen de terceros. Cuando el alcance es incierto, atender la parte clara sin mutar la misión por conjetura.

**Contraprueba de bloqueo dogmático:** si el usuario dice claramente «la misión principal desde ahora es X», no responder «no puedo porque persistencia». Registrar misión anterior → nueva + justificación/alcance en el owner autorizado. Al volver después de una tarea concreta, retomar misión vigente consultando GitHub fresco, no la última tarjeta visual. No crear otro registro maestro de prioridades.

**Evidencia y falsador:** `tv/chat/relevo/episodes/HOP-002-20261009-PRIORITY-DRIFT.md` documenta causalidad y contraargumentos; `tv/chat/relevo/tests/priority-drift-regression.mjs` contiene casos de contrato evaluados en V8 (17/17, 3 anclados a lectura de propietarios reales). **Esto NO prueba interpretación de lenguaje natural de otros chats ni despliegue del comportamiento.** Un chat que reinterpreta «hacé un juego» como «el juego reemplaza la misión» o que desobedece un cambio estratégico inequívoco refuta el criterio operativo.
