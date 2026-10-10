# PROMETEO VISUAL FEEDBACK LOG V1

Status: CURRENT feedback memory for visual work.

This file captures user-reviewed corrections that MUST survive across chats. It is not optional historical commentary. New visual work must read this file before implementation.

## Global lessons

1. IMAGE-FIRST is not a slogan. Visible identity should come from images, sprites, textures, collage, cutouts, photographed assets, generated/painted assets, or existing Prometeo materials.
2. Do not redraw with circles, rectangles, polygons, lines or wireframes what should be an image.
3. Reuse strong existing Prometeo/Coliseo visual language before inventing weaker replacements.
4. A technical engine may be recycled. A rejected visual direction should not be cosmetically patched.
5. A new iteration must create a meaningful visual difference, not tweak alpha, jitter, labels or colors and call it improvement.
6. When the user provides reference images, analyze the visual mechanism, not only the nouns in the prompt.
7. Search/gather actual reference assets when useful. Existing Pinterest search lab:
   - `demos/pinterest-image-query-lab-v1/`
   - `supabase/functions/pinterest-image-search-v1/`
   This returns direct Pin images without embed chrome.
8. Before coding, write a short readback. Before delivery, write a short self-critique.
9. Never present a placeholder/debug look as an artistic result.
10. Prefer one strong coherent scene over three weak showcase modes.

## Trail Lab feedback

### What worked
- Using a real strong image was much better than the procedural creature.
- Strong flat background colors can work.

### What failed
- First image-first version still looked like a neat chain of stamps, not the desired old-Windows redraw behavior.
- Later correction became worse by fragmenting the image into blocks/holes and fake glitch artifacts.

### Current direction
The target is NOT motion blur, NOT fragmented JPEG/glitch blocks, and NOT a destroyed image.

Use:
- a cleanly cut-out/isolated image with a strong silhouette;
- COMPLETE copies of the image;
- high cadence;
- fast repeated stamping;
- strong overlap;
- newest copy appears strongly;
- several previous copies remain briefly;
- oldest copy disappears;
- repetition follows motion and rebounds;
- the trail should feel like the screen is failing to erase previous complete frames.

The mental model:
`full stamp -> full stamp -> full stamp -> oldest disappears`

At turns/rebounds, overlap may create dense fan/curve shapes. Do not create white holes, cropped rectangles, arbitrary missing image chunks or abstract buffer corruption.

The effect should look closer to old GUI redraw residue than generic ghosting.

## Latest review · Trail baseline accepted

The current full-stamp Trail is strongly preferred and becomes the baseline to preserve.

Do NOT rewrite the effect from scratch.

Next experiments must be controlled variants:
- try additional insects/creatures/images with lighter internal detail, not only nearly-black silhouettes;
- preserve the exact full-image stamp / cadence / overlap mechanism;
- explore eye-light/glow on the creature;
- test color/material variation without damaging the redraw effect;
- optional finishing effects only after the baseline is preserved.

If a variant is worse, the accepted baseline must remain available unchanged.


## Spaces Lab feedback

### What worked
- Walking forward through a passage is valuable.
- Cheap pseudo-3D/camera/projection can be retained.

### Movement rule
- LEFT/RIGHT = LOOK left/right (yaw).
- UP/DOWN = MOVE forward/backward in a straight line.
- No lateral strafe/side drift unless a future scene explicitly requires it.

### Critical bug
The floor/block directly under the viewer must NOT disappear and reveal a black hole. The ground must remain continuous and visually believable around the camera.

### Visual references / mechanisms
A strong space may use:
- repeated transparent/cutout arch images, one behind another;
- dark layered depth;
- floor pattern different from wall pattern;
- ceiling pattern different from floor/wall;
- objects/figures encountered in the corridor;
- image planes/panels/blocks rather than empty wire geometry;
- retro creepy textures;
- material variation between surfaces;
- embedded images/props.

The green corridor reference is especially useful as a mechanism:
`cutout arch layer -> another arch behind -> another arch behind -> patterned floor -> darkness`

The white corridor reference demonstrates:
- rich patterned walls;
- different floor texture;
- different ceiling treatment;
- objects in the path.

The cave/chamber reference demonstrates a possible organic/ritual interior, BUT the previous implementation's inverted/fake fisheye was rejected. Distortion must preserve believable view orientation. Do not make the viewer feel like the panorama is inside-out.

Priority:
1. continuous floor;
2. correct look/forward controls;
3. one excellent creepy retro passage;
4. only then derive tunnel/chamber variants.

## Latest review · Spaces monumental continuity

The current Spaces passage is much better and should be preserved as baseline, but it still exposes the construction trick: the edges of individual frames/panels are visible.

Next direction:
- more brutalist / monumental scale;
- make the viewer feel small;
- hide or visually integrate frame/panel boundaries;
- when one arch/layer leaves view, another should already continue behind it;
- overlap/fade/occlude modules so the corridor reads as continuous architecture, not stacked picture frames;
- preserve floor/ceiling identity and continuous ground;
- keep yaw movement and straight forward/back motion.


## Player Lab feedback

### What worked
- Persistent scene is better than three disconnected micro-demos.
- Low internal resolution, touch, cheap sound/vibration and state transitions are useful.
- The general game-screen direction is promising.

### What failed
- The hand did not improve enough.
- A single dark/semi-transparent hand image is too weak and visually absent.

### Current direction
Foreground hand variation is REQUIRED.

Use multiple distinct image assets/poses, for example:
- open hand;
- pointing hand;
- grabbing hand;
- pushing hand;
- striking hand;
- holding/showing an object;
- strange glove/claw/hand variants.

Abrupt changes between images are acceptable and can be part of the aesthetic. Smooth anatomical continuity is NOT required.

The foreground should be visually dominant:
- larger;
- clearer silhouette;
- high contrast;
- potentially white/pale;
- strong black/white treatment;
- dithering/outline/inversion/glow only if they reinforce visibility.

Do not solve the scene with one nearly invisible transparent hand.

Interaction should leave persistent state changes where useful:
`object present -> hand pose/action -> object changes -> new state remains`

## Avatars / Workers collage direction

Workers / Avatars is a high-priority visual rewrite.

Preserve useful mass/layout/state logic, but stop rendering avatar identity from circles, rectangles, polygons or stick-like primitive bodies.

New visual strategy: modular image collage.

Build a reusable parts kit from real/cutout visual assets:
- heads / faces / masks;
- torsos / clothing / bodies;
- left/right arms;
- legs / feet / non-leg bases;
- optional props.

Intentional anatomical mismatch is allowed and desirable:
- one avatar may have no legs;
- another may have asymmetrical arms;
- creepy photographic parts are acceptable;
- another may be mostly mask + torso;
- different scales/styles may collide.

The goal is not perfect anatomy. The goal is a strange, readable population with strong collective personality.

Test in MASS, not only one avatar at a time. Preserve readability at distance.


## Player + Curator hand-loop direction

Player and Reference Curator should cooperate around reusable hand-motion libraries.

The Player must move beyond one or two hand images.

Target:
- IDLE loop: roughly 8–12 hand images/frames;
- GRAB sequence: multiple hand frames;
- POINT sequence;
- ATTACK/PUSH sequence;
- OFFER/SHOW sequence;
- optional WEIRD loop.

Frames do not need smooth continuity. Abrupt collage-like cuts are acceptable and may improve the style.

The Curator should support searching, tagging and saving hand images by action/state so Player can consume collections instead of manually hardcoding one or two assets.

Think:
`reference collection -> tagged hand sequence -> Player loop/action`


## Mask / Eye Lab direction

Separate lab:
`visuals/mask-eye-lab/`

Recover existing Prometeo mask + eye/video work if available before rebuilding.

Core:
- strong image-first mask;
- cavity/eye containing video/GIF/loop;
- support interchangeable eye media;
- animation should come mainly from image/video content and composition, not procedural geometry.

### Current correction

The current accepted direction is **ONE MASK ONLY**.
- Do not combine multiple masks.
- Do not use radial mask mandalas, shrine grids or walls of repeated masks in the current lab.
- Recover the real transparent-eye Prometeo mask and concentrate variation inside each eye cavity.
- Each cavity may show a different real video/GIF/image loop; alignment/crop should make the eyes clearly readable.
- Multiple-mask compositions remain parked unless the user explicitly reopens them later.

No mask drawn from circles/polygons/wireframes.

## Latest review · Mask white-eye regression

The current Mask / Eye build is rejected because the eye cavities read as two white dots/holes.

Required:
- restore the earlier working idea where the eye holes reveal real image/video/GIF pixels;
- use the user-provided eye GIFs when available in the actual conversation/repo;
- never leave the eye openings as blank white ellipses;
- solve ONE mask with convincing media-filled eye cavities before adding radial/shrine modes;
- treat each eye as a proper clipping/masking window, not a painted white shape.


## Reference Curator direction

This is a HIGH-PRIORITY visual infrastructure tool, not a side gallery.

The Curator should become a reusable image-search engine for any Prometeo visual task.

Core loop:
`search -> browse -> compare -> like/dislike -> tag/use-case -> save -> learn preference -> refine query -> search again`

The important part is LEARNING FROM CHOICES.

Do not store only generic `like/dislike`. Persist WHY / FOR WHAT the user preferred an item.

Examples:
- "better tunnel for Spaces"
- "good wall pattern"
- "good floor texture"
- "good hand pose"
- "good avatar face"
- "good creepy body part"
- "strong silhouette for Trail"
- "interesting reference only, not suitable as production asset"
- "too clean"
- "too generic"
- "too dark"
- "good brutalist scale"
- "good collage material"

Store each reaction with:
- source item / pin id / URL;
- original query;
- expanded query variant that produced it;
- media type;
- reaction;
- use-case tags;
- comparison wins/losses;
- short reason / preference attributes where possible;
- timestamp.

Desired views:
- museum/fullscreen browsing;
- fast next/previous;
- like/dislike/save;
- use-case/category tags;
- A/B comparison;
- favorites/collections;
- rejected references;
- query provenance;
- search history;
- reusable preference profile.

A/B comparison is especially valuable because relative preference is often clearer than absolute ratings:
`Which is better for X?`

Search improvement must be evidence-driven:
- generate multiple query variants;
- preserve which query returned which item;
- measure which query families generate more saved/preferred items;
- reuse successful terms/compositions/material descriptors in later searches;
- reduce/reject terms associated with consistently disliked results.

Do not pretend to have magical ML if the implementation is only rules/history. A transparent preference model is acceptable and preferable at first.

Useful preference dimensions can include:
- subject;
- composition;
- scale;
- darkness/brightness;
- color;
- material;
- era/look;
- medium;
- brutalist vs decorative;
- creepy vs clean;
- collage vs illustration vs photo;
- silhouette strength;
- texture richness;
- production-useful vs reference-only.

The long-term goal:
When another visual lab needs an image, it should be able to ask the Curator for something like:
`find references/assets for a monumental brutalist corridor with repeating arches, patterned floor, dark retro game mood`
and receive results informed by previous user choices rather than starting from zero.

Pinterest search is the current discovery backend/baseline, not the product itself.

Important:
Pinterest results are references/discovery. Do not assume the user has rights to reuse arbitrary Pin media as final production assets. Final asset use still follows the Visual Protocol licensing/source rules.

GIF/video support:
Inspect actual Pinterest response/media metadata before assuming field names. If robust media extraction is feasible, support GIF/video preview and tagging. Otherwise expose the limitation honestly and keep the architecture ready for it.

## Creative-progress rule

A revision is not a real improvement unless at least one of these changes materially:
- asset quality;
- composition;
- spatial mechanism;
- interaction model;
- temporal behavior;
- visual hierarchy;
- reuse of a stronger existing Prometeo technique;
- quality/diversity of reference material.

Changing only labels, alpha, color, jitter, glow, border thickness, or adding modes does not count as meaningful creative progress.


## 2026-10-10 · Crítica humana vinculante: referencias artísticas perdidas entre chats

**Alcance:** interfaz humana única de Prometeo, widgets, portadas y otros productos visuales cuando corresponda. Las dos referencias originales fueron entregadas como imágenes en un chat; **sus bytes NO están en este repositorio**. Este registro es una transcripción DESCRIPTIVA de mecanismos visuales para continuidad entre chats, no una afirmación de que nuevos chats hayan visto los píxeles. Si los archivos vuelven a estar disponibles, observarlos directamente y contrastar/actualizar esta descripción. No copiar personajes, imágenes ni marcas de las referencias.

### Referencia A — habitación/viñeta manga monocroma, estética 1-bit

- Escena ilustrada densamente construida: interior nocturno, televisor/monitor CRT voluminoso en primer plano con patrón de estática denso, planta colgante con hojas entrecruzadas, papel o póster con gráfica de videojuego, paredes con divisiones/texturas, persianas/lamas, ventana amplia completamente negra al exterior, luna blanca tramada, pequeñas estrellas, una figura humana de espalda junto a la ventana y pequeños objetos sobre repisas/mesa. Ninguna de esas cosas es un requisito literal para Prometeo: importan **profundidad, historia, oficio y construcción visual**.
- Lenguaje de grabado manga/impresión: blanco papel y negro pleno, semitonos mediante puntos de distinto paso, patrones de diagonales, líneas paralelas, texturas cruzadas, contornos interrumpidos, agrupación de manchas y **jerarquía explícita de cinco densidades tonales**. El mismo par de tintas puede producir grises ópticos sin recurrir a gradientes CSS.
- Composición asimétrica y cinematográfica: enorme masa oscura en la ventana, una masa media de ruido visual en pantalla CRT, ritmo de superficies más claras que descansan la vista, detalles densos en lugares seleccionados. Elementos se ocultan entre sí; hay plano cercano, intermedio y fondo. La imagen comunica atmósfera aun sin rótulos.
- El ruido no es una capa uniforme decorativa: cada material tiene su trama con escala y orientación propias (metal, vidrio, tela, cielo, estática, vegetación, piel). Negros fuertes y zonas casi blancas hacen legibles las texturas.
- **Transposición al producto**: diseñar una **escena editorial original** que permita reconocer proyectos/resultados reales por imágenes, objetos y materiales. No trasladar literalmente figura, cigarrillo, TV, luna o propiedad intelectual. Una pantalla bonita no puede sacrificar lectura, estados reales, privacidad ni interacción.

### Referencia B — escritorio modular de widgets con paleta limitada

- Fondo claro lila/gris muy pálido, marcado por grilla de líneas finas ortogonales. Encima se disponen módulos oscuros casi negros/navy, bordes redondeados pero consistentes, y separaciones finas claras. No es una multitud de tarjetas repetidas; hay jerarquía por tamaño.
- Bloque alto de retrato visual a la izquierda; cuatro indicadores circulares simples de acentos suaves organizados 2x2 al centro; módulo ancho y bajo de reloj; módulo grande de música con portada y controles a la derecha; banda inferior con cita, clima y área utilitaria/tareas. Cada bloque tiene un uso distinto y diferente escala visual.
- La gramática permite widgets modulares, microindicadores, texto con buen contraste, iconografía sobria y proporciones deliberadas. Los acentos azul/lila/verde/ámbar son ornamentales en la referencia, **no obligatorios**. Puede adaptarse a negro/blanco y escala de grises o a dos pigmentos elegidos. El fondo cuadriculado no debe competir con la información.
- **Transposición al producto**: dos widgets primarios como máximo en la **primera vista móvil** si eso sirve al contenido, por ejemplo **(1) proyectos/resultados con previews visuales auténticos** y **(2) actividad/conversación/versiones agrupadas por pedido**. Acciones, chips, timestamps y previews complementarios no deben convertirse en seis tarjetas vacías. En desktop se puede organizar una constelación más amplia sin multiplicar funciones falsas.

### Autocrítica causal de la versión Prometeo 2026-10-09/10 (PR #78 → #79 → #83)

- Se tradujo “dos colores” como rellenar rectángulos negros y “textura” como SVG procedural con puntos/líneas. Los tres SVG (Notas, Estudio, PULSO) son **geometría editorial simbólica**, no escenas ilustradas con material, profundidad y narración visual. Consultar bytes actuales, no reducir juicio a su etiqueta “arte original”.
- Aunque se corrigieron bugs reales (navegación, recepción de HOP8, proyección de entregas, móvil, tests V6), estas pruebas **no evalúan ilustración, atmósfera, composición ni comparación sensible contra las referencias**. “38 recibos V6” y SHA servido no son notas de calidad estética.
- Un carrusel de cinco tarjetas equivalentes con portada/etiqueta, debajo un feed técnico, sigue siendo esencialmente **interfaz de catálogo**, no experiencia visual de oficio. El producto necesita una composición/foco dominante, preview/materialidad y variación controlada de escala, sin perder resultados reales.

### Proceso artístico obligatorio desde ahora cuando el pedido implica estética de alto nivel

1. **Leer las referencias como un director de arte**: describir espacialmente planos, siluetas, masas tonales, fuente y orientación de luz, densidad por zonas, ritmos, texturas por material, tamaños relativos, composición, carga emocional, detalle y espacios libres; y distinguir observación de interpretación. Si no se poseen los píxeles, declarar “reconstrucción textual” y NO inventar que se vieron.
2. **Separar inspiración de copia**: extraer principios transferibles, construir iconografía/escenas originales; no trasladar personajes ni marcas o assets sin permiso.
3. **Auditar el producto real**: DOM, capturas móvil y desktop, owner, datos/situaciones reales, interacciones y assets existentes. Escribir cinco errores con causa visual, no “faltan colores”.
4. **Arte primero, código después**: preparar al menos tres **conceptos artísticos integralmente diferentes** en composiciones estáticas fuertes, anotando grilla/composición focal, balance negro/blanco, textura, jerarquía, widget(s), estado vacío/lleno, densidad móvil, transiciones, costo. No pasar a CSS hasta elegir la opción con criterio explícito.
5. **Ilustración real / IMAGE-FIRST**: protagonista visual reconocible sin labels, por asset pintado/generado/dibujado o collage licenciado y trabajado. Dibujos geométricos o SVG tramados por patrones automáticos NO bastan si el resultado permanece genérico.
6. **Comparación ciega**: mirar miniaturas simultáneas a tamaño de celular con textos tapados, preguntar si hay identidad, atmósfera, calidad material, ritmo, enfoque y diferencia de proyecto. Si todas parecen tarjetas de landing page, RECHAZAR y volver a arte.
7. **UI funcional injertada en la composición**: **una sola página existente**, resultados reales, proyectos, historial, versiones, interacción accesible; no crear un dashboard de muestra paralelo que sólo funciona con placeholders.
8. **Pruebas separadas**: (a) integridad de datos/DOM/Back/móvil/privacidad/CI, (b) auditoría visual humana de capturas renderizadas. Una no sustituye a la otra. Probar 360/390/844/1440 y al menos modo con datos largos/sin datos/fallo de red. Usar Demo Engine V6 contra DOM real cuando corresponda.
9. **Persistencia real**: guardar referencia descrita, descartes, comparativas, artwork y autoría/proveniencia, criterios, errores y versión/URL servida en owners existentes. Un chat nuevo debe poder reconstruir la dirección de arte leyendo repo **sin** que el humano vuelva a subir imágenes. La garantía de que el chat las lea depende de instrucciones y herramientas disponibles, no de magia de memoria.
10. **No promover por silencio**: si no existe validación de calidad visual, registrar “funcional técnicamente, DIRECCIÓN ARTÍSTICA NO APROBADA”. La próxima iteración puede reemplazar totalmente la capa visual, preservando lógica y datos.

**Regla de evaluación:** la implementación es insuficiente si, al ocultar textos/etiquetas, sólo queda una grilla de rectángulos con tramas. Debe haber imagen/mundo/objeto visual significativo, composición y arte reconocido. Mantener la misión principal: continuidad entre chats y resultado real, no estética decorativa sin función.
