# Laboratorios JS · Prometeo
**PÁGINA PÚBLICA:** https://juanmanuelpm.github.io/prometeo/laboratorios-js/
**RAMA:** gh-pages  |  **ALCANCE:** laboratorios-js/

Nueve escritorios independientes: Three.js, PixiJS, Tone.js, MediaPipe, D3.js, Cytoscape.js, Motion + GSAP, PDF.js + EPUB.js, Embeds + SDK.
**Estado inicial: cero widgets publicados en cada uno.** Esta no es una lista de demostraciones simuladas. Las experiencias aparecerán solo cuando un especialista publique un HTML real, versionado y registrado en su propio JSON.

## Para iniciar una conversación con un especialista
1. Abrí la página pública, elegí una biblioteca y pulsá **«Copiar prompt para conversar»**.
2. Pegalo en un chat nuevo de este mismo Proyecto de ChatGPT. **La primera respuesta debe ser inmediata, breve y sin usar GitHub:** propone 2–3 ideas para hablar con vos.
3. Mandale videos de YouTube, repositorios, capturas y críticas. El especialista analiza las técnicas y compara qué conservar, incorporar, reemplazar o descartar. Podés hacer muchas rondas sin construir nada.
4. **Solo cuando le pidas desarrollar** pasará a investigar más profundamente y a preparar una experiencia local que puedas probar.
5. **Solo cuando apruebes la experiencia y le pidas publicarla**, utilizará el repositorio para crear una nueva versión y actualizar su registro. Las versiones anteriores se conservan y cada escritorio muestra únicamente demos verificadas.

**El botón copia; no abre automáticamente otro chat, no ejecuta código ni publica en GitHub.**

**Importante:** copiar un prompt **no crea un chat**, ni instala skills, ni inicia procesos en segundo plano. Los nuevos chats necesitan el conector GitHub autorizado para escribir. El sitio es de lectura pública; sólo quienes tengan permisos de repositorio pueden publicar. Los nueve JSON separados reducen conflictos entre especialistas.
Leé `CONTRATO.md` para rutas, formato, aceptación y seguridad. No modificamos la página principal ni sustituimos el sistema de estado de Prometeo.

## Avances visibles antes de la publicación (actualización)
La página ahora distingue dos secciones:
1. **Avances de los especialistas:** consulta dinámicamente PRs públicos de GitHub dirigidos a `gh-pages`, examina sus archivos bajo `laboratorios-js/<biblioteca>/` o `laboratorios-js/widgets/<biblioteca>/` y muestra título, fecha, estado **borrador/en revisión/integrado**, enlaces al PR y a documentos/código. No hace merge ni publica una demo. La API REST pública de GitHub es de lectura y puede estar limitada por red o cuota; en ese caso el sitio muestra un error explícito y un enlace a GitHub, nunca «sin avances» falso. El botón «Actualizar publicaciones» actualiza ambas secciones.
2. **Widgets publicados:** únicamente archivos servidos desde GitHub Pages y registrados en `registry/<biblioteca>.json`, con versiones.

Los chats pueden seguir conversaciones y guardar análisis como **PR borrador** sin autorización de publicación de un widget. Si guardan archivos bajo la ruta de su biblioteca y orientan el PR a `gh-pages`, la página los detectará sin modificar manifiestos. Si NO se pide ni guardar en GitHub, nada se sube automáticamente. La página no lee conversaciones privadas de ChatGPT.
