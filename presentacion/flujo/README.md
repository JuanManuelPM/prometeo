# PROMETEO · Video → SECUENCIA / Flujo universal v1

**Mapa:** https://juanmanuelpm.github.io/prometeo/presentacion/flujo/

**Demostración editorial:** https://juanmanuelpm.github.io/prometeo/presentacion/ejemplos/psicologia-masculina/

**Motor audiovisual aprobado:** https://juanmanuelpm.github.io/prometeo/presentacion/ (preservado sin modificaciones).

## Contrato
IDENTIFICAR → DERECHOS → TRANSCRIBIR → COMPRENDER → SELECCIONAR → NARRAR → COMPONER → REPRODUCIR → VERIFICAR → PUBLICAR → APRENDER.

Cada nodo tiene salida, criterio PASS y ruta de error. El flujo visual documenta el proceso para la IA; no agrega controles a la presentación final.

## Adaptador automático
El workflow `.github/workflows/presentacion-from-video-v1.yml` recibe URL o título, consulta metadatos y subtítulos temporizados con yt-dlp **sin descargar el video**, genera una receta JSON, crea una presentación candidata y la publica en `/presentacion/auto/`. La transcripción no se publica por defecto. Si no hay subtítulos, utiliza capítulos con etiqueta `chapter_only`; si tampoco existen, falla sin inventar segundos. La selección por densidad léxica es heurística, **no una evaluación semántica completa**.

## Ejemplo
Video de Chris Williamson con John Barry: https://www.youtube.com/watch?v=z9t147FrV4Y . Los intervalos 08:09–08:24, 16:05–16:20 y 57:16–57:31 son **propuestas basadas en capítulos públicos**, no cortes validados contra una transcripción. Al no constar licencia de descarga, se utiliza YouTube IFrame API y no se aloja el material.

## Límites
El título se resuelve con búsqueda automática de primer resultado; para títulos ambiguos debe verificarse el ID elegido. La disponibilidad de subtítulos y autoplay con audio depende de YouTube y del navegador. No se sobrescribe el motor nativo V2 ni su diseño. La salida automática es CANDIDATE hasta revisión semántica y QA real.
