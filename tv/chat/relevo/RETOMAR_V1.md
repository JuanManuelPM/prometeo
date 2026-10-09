# 🔥 Prometeo · Punto de retorno y antideriva · V1

**Rol:** índice operativo de reingreso, NO nuevo CURRENT, scheduler, asignador de workers, dueño de los 45 EVO ni sustituto de Design DNA. **Lectura desde cualquier chat del Proyecto:** `gh-pages:tv/chat/AGENT_ENTRY_V1.md` → este archivo cuando el humano pregunta «¿qué sigue?», vuelve después de tiempo o teme que se pierdan ideas. **Interfaz de lectura:** `https://juanmanuelpm.github.io/prometeo/tv/chat/relevo/retomar/`. No da acceso a conversaciones privadas y no ejecuta otros chats.

## El problema que debe sobrevivir aunque el humano se olvide
Hubo dos ondas de ideas: 24 propiedades sobre el pulpo cerebral (continuidad, memoria, desacuerdos, pruebas y agentes independientes) y 26 ideas del segundo video (calidad vs fragmentación, experiencias completas, variantes Best-of-N y demostraciones). Se registraron ambas, pero **no se garantizaba el siguiente artefacto**. Es un modo de fallo: documento → skill → revisión → otra skill → otro PR, mientras el juego o experiencia que motivó el trabajo nunca aparece. Un usuario ocupado no debe ser el encargado de detectar ese desplazamiento.

**Invariante 1: no perder contenido.** Los owners originales siguen siendo `tv/chat/relevo/CONTINUIDAD_INTELECTUAL_V2.md`, `tv/chat/relevo/VIDEO_2_ESCALA_Y_DELEGACION_V1.md`, `VIDEO_2_IDEAS_INDEX_V1.json`, Design DNA, Work Graph y registros propios de cada módulo. Este archivo es sólo un mapa y agenda, no un reemplazo. No borrar hipótesis perdedoras, preguntas abiertas ni porqués.

**Invariante 2: no confundir progreso instrumental con resultado.** Si una tarea humana pide una experiencia interactiva, `DONE` significa que existe una experiencia usable con evidencia. Commit, PR, documentación, CI y DEMO sintética son etapas distintas, no sustitutos. Si fracasa la publicación, mantener la tarea `BLOCKED` o `CANDIDATE` con razón.

**Invariante 3: salida de cada trabajo = valor + pruebas + siguiente cosa.** Dentro de lo permitido por la tarea: resultado real y su owner, evidencia/fallos, aprendizaje clasificable y próximo paso priorizado. No forzar un rito pesado para `🔥tv` rápido ni reformular cada pregunta humana como proyecto de meses.

**Invariante 4: el chat no es un scheduler.** No hay chats que se inicien solos; sólo el usuario puede abrir otros o existir un runtime realmente desplegado. No mentir sobre trabajo en segundo plano. El agente de dirección puede dejar un encargo autocontenido en owner GitHub y el humano puede copiar un único prompt.

**Invariante 5: la calidad es resultado humano, no consumo.** No economizar cómputo como objetivo. Trabajar profundo, iterar y verificar. Evitar dividir obras narrativas o físicas con alto acoplamiento entre veinte subagentes; probar agente fuerte integral o variantes completas paralelas. Tareas independientes sí pueden separarse.

## La única acción priorizada recomendada
**EMBLEM-001 = una experiencia original de autos y pelota, jugable en la web.** Es deliberadamente más ambiciosa que una nueva página de resúmenes; se inspira en la crítica del usuario de haber hablado de un juego estilo arena y terminar construyendo andamios. Objetivo concreto: física entretenida, una partida completa, gol, puntaje, reinicio y controles móviles; sonido y calidad estética reales. El código debe ser original, sin materiales copiados de franquicias. **Estado actual: PROPUESTA, NO LANZADA NI IMPLEMENTADA.** El prompt exacto está en `tv/chat/relevo/retomar/reentrada.json` (campo `next_experiment.exact_prompt`) y en la pantalla de retorno.

**Experimento posterior, no condición de EMBLEM-001:** lanzar varias versiones integrales independientes del mismo brief en ramas aisladas, revisar críticamente con pruebas reales, comparar estética/móvil/funcionalidad, conservar perdedoras y pasar la mejor a otra generación de mejora. Después evaluar costo de handoff de división modular.

## Protocolo cuando el humano vuelve cansado o sin recordar nada
1. Leer este archivo y fuentes de entrada si hace falta; recuperar conector y ref real de Github.
2. Consultar **sólo lo vigente necesario**: `STATE_V1.json` (saltos), el PR #74 y cualquier owner del experimento activo, más las fuentes indexadas de ideas. NO asumir que la copia estática en la pantalla sea un estado live.
3. Responder en castellano simple: «qué queríamos», «qué existe realmente», «qué falta», «qué conviene lanzar ahora». Si ya está funcionando EMBLEM-001, cambiar de prioridad **basándose en resultados reales**; no repetir una tarea ya completada.
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
- Cuando EMBLEM-001 se ejecute: prueba real de navegación y una ronda completa; comparar luego con otras variantes sólo cuando exista un baseline utilizable.

## No decidir por el usuario sin prueba
Esta prioridad es **una recomendación de ingeniería**, no una orden para ejecutar un juego sin un mensaje de lanzamiento. Si el humano trae otra idea, es válida; preservar la anterior y explicar si se pospone. No publicar cambios de productos sensibles ni considerar autorizada una integración fallida.

## Fuentes originales
- `gh-pages:tv/chat/relevo/CONTINUIDAD_INTELECTUAL_V2.md` (24 conceptos y crítica)
- `gh-pages:tv/chat/relevo/VIDEO_2_ESCALA_Y_DELEGACION_V1.md`, `VIDEO_2_IDEAS_INDEX_V1.json` (26 ideas y cinco experimentos)
- `gh-pages:tv/chat/relevo/STATE_V1.json` (relevos efectivamente registrados)
- `gh-pages:tv/chat/DIRECCION_OPERATIVA_V1.md` (recuperación y PR)
- `main:coordination/design-dna/PROMETEO_DESIGN_DNA_V1.md` (errores previos, rationale)
