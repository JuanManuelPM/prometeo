# PixiJS · Procedencia, decisiones y límites de verdad

Actualizado: 13/10/2026. Documentación pública. Se recuperó lo que estaba realmente disponible, no se inventaron páginas de video ni archivos de otros chats.

## Fuentes aportadas por el usuario

**Una (1) transcripción íntegra recuperada:** tutorial introductorio de Snake con PixiJS. El narrador se presenta como «Hugo». Idioma inglés. Duración, fecha de publicación, canal, enlace al video y versión exacta de PixiJS **no constan en los datos**. Se mencionan VS Code, Node, Vite, npm, Graphics, tipos TS, Snake, teclado, Ticker, comida, crecimiento, `unshift/pop`, aleatoriedad, colisiones y un juego de cursor imperfecto en `simplepointingames.com`. La transcripción original estaba adjunta en la conversación; **no se republicó el texto literal** por derechos de terceros.

**Síntesis exhaustiva original:** `docs/01_DESPIECE_DEL_TUTORIAL.md` (adaptada desde PR #109); `docs/02_MOTOR_Y_VARIACIONES.md` (técnica, patrones, doce ideas y tests). Usar etiquetas `[VIDEO]`, `[CORRECCIÓN]`, `[INVESTIGACIÓN]`, `[INFERENCIA]` y `[EXTENSIÓN]` para no confundir atribuciones.

## Investigaciones públicas externas

- PixiJS 8 [Quick Start](https://pixijs.com/8.x/guides/getting-started/quick-start), [Graphics/GraphicsContext](https://pixijs.com/8.x/guides/components/scene-objects/graphics), [Ticker](https://pixijs.com/8.x/guides/components/ticker), [ejemplos](https://pixijs.com/8.x/examples) y [showcase](https://pixijs.com/showcase), consultados el 13/10/2026.
- [PixiJS Open Games](https://github.com/pixijs/open-games), [Bubbo Bubbo](https://github.com/pixijs/open-games/tree/main/bubbo-bubbo) y [Puzzling Potions](https://github.com/pixijs/open-games/tree/main/puzzling-potions), código MIT según repositorio. Esas fuentes enseñan estructura de producción y recursos, pero **no se copió su arte ni código** al atlas.
- [Learning Pixi](https://github.com/kittykatattack/learningPixi), orientado a PixiJS v5.3.10: referencia pedagógica **legada**, no API para PixiJS v8.
- Showcase: menciones a *Happy Wheels*, *Suroi* y otros productos. La presencia en showcase no implica acceso a su código ni licencia de sus assets.
- [PixiJS ParticleContainer](https://pixijs.com/8.x/guides/components/scene-objects/particle-container) tiene advertencia de API experimental; solo usar tras prueba de versión.

## Material propio de esta conversación

- `Anatomia_de_Juegos_PixiJS_Laboratorio.html`, archivo generado localmente: tres widgets educativos conectados; animación, microscopio y mutaciones (Snake/tren/micelio) en Canvas 2D. Se reportaron pruebas anteriores de Chromium escritorio/móvil. **No significa que PixiJS haya sido probado.** El archivo local no se publica ni reproduce íntegro aquí.
- `Atelier_PixiJS_Mundos_Vivos.html`, generado localmente: bosque y tres herramientas, Canvas funcional con intento de PixiJS vía CDN. Capturas y pruebas previas de la rama Canvas, no verificación de renderer Pixi por red. No afirmar WebGL real verificado.
- PR [#108](https://github.com/JuanManuelPM/prometeo/pull/108), borrador de «El bosque de las cartas» con spritesheet, parallax, cartas y faro; código candidato en rama propia, sin merge ni URL servida probada al momento de preparar el atlas.
- PR [#109](https://github.com/JuanManuelPM/prometeo/pull/109), borrador de síntesis Snake. Sus documentos originales fueron recuperados y copiados/adaptados al atlas, sin hacer merge del PR con trabajo concurrente.
- La entrada `laboratorios-js/registry/pixijs.json` estaba inicialmente vacía. El atlas se registrará como **conocimiento**, jamás como juego. La publicación/verificación se documenta aparte con recibos reales.

## Rechazos explícitos y correcciones

1. No usar cuadrados y círculos como sustituto del diseño ilustrado final.
2. No reconstruir `Graphics` ni destruir contenedores enteros en cada ticker; preferir sprites/contextos retenidos.
3. No hacer que cursor-hover mueva protagonista sin clic/intención.
4. No desactivar lint global como práctica permanente.
5. No afirmar que `Ticker.maxFPS=10` garantiza simulación igual a cualquier framerate.
6. No usar `localStorage` dentro del iframe sandbox.
7. No presentar candidatos PR/HTML local como juegos servidos en Pages.
8. No copiar assets de Figma de Puzzling Potions; la propia referencia restringe su reutilización.
9. No integrar trabajo sobre rutas ajenas ni sobreescribir versiones previas.

## Decisión de producto

Tres experiencias futuras, con alcance y pruebas ya cerrados en `PLAN_FASE2.md`: aventura ilustrada completa (Bosque de las cartas), herramienta interactiva (Atelier de Mundos) y estrategia botánica con grafo (Micelio · subsuelo). **El atlas no contiene esos tres juegos ni afirma que existan publicados**.

## Costo y datos personales

PixiJS es MIT; documentación original, HTML/JS estáticos, GitHub Pages y recursos propios no obligan a un backend de pago ni requieren claves. El hosting/CDN gratuito está sujeto a disponibilidad de terceros; offline solo es posible si el runtime y assets se distribuyen juntos con licencias compatibles. No se recopilan ni publican datos académicos, salud, ubicación, cuentas o credenciales del usuario.

## Lectura por otra IA

1. `conocimiento.json` define IDs/familias/fuentes y material consultable.
2. `docs/01_DESPIECE_DEL_TUTORIAL.md` explica todas las etapas comprobables del video.
3. `docs/02_MOTOR_Y_VARIACIONES.md` detalla motor puro, pseudocódigo, pruebas y doce variantes.
4. `PLAN_FASE2.md` congela los tres productos, los criterios y su orden de ejecución.
5. Revisar HEAD/contrato y estado real, no considerar que un texto de continuidad da acceso mágico a otro chat.
