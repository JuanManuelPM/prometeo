# Fuente recuperada S-GSAP · Despiece técnico original
Edición: 2026-10-13. Proveniencia: [VIDEO] una transcripción completa proporcionada en el chat sobre GSAP y landing de cócteles.
Autor presentado oralmente: Adrian / JSMastery. URL, duración, fecha, versión exacta de GSAP, repositorio, Figma, assets y video original: NO disponibles en el material recibido.
Este texto es análisis propio y ejemplos originales; no reproduce el guion protegido.

## 0. Pregunta técnica central
El curso consigue una landing cinematográfica cuyo valor proviene de sincronizar transición, desplazamiento, escena audiovisual y contenido editorial. No enseña Cytoscape.js. Para el laboratorio de grafos, transferimos **secuenciación significativa y narrativa controlable**, nunca el contenido visual comercial. Fuentes independientes de Cytoscape están documentadas en knowledge.json.

## 1. Primer bloque: fundamentos de interpolación
### 1.1 to
[VIDEO] `gsap.to(target, vars)` interpola propiedades desde el estado actual hasta valores de destino. Trabaja con X, rotación, duración y curvas ease; `repeat:-1` y `yoyo:true` invierten y repiten.
[CORRECCIÓN] No usar bucles infinitos como adorno en interfaces de estudio. Una animación debe detenerse al abandonar pantalla o cambiar estado.
[EXTENSIÓN] Panel contextual de un autor que entra desde el lateral después del foco de Cytoscape.
```js
const tween = gsap.to(panel,{x:0,opacity:1,duration:0.35,ease:"power2.out"});
// En cleanup, tween.kill().
```
Prueba: alternar foco A/B 20 veces, última ficha visible coincide con última selección.

### 1.2 from
[VIDEO] `gsap.from(target,vars)` parte de valores iniciales y regresa al estilo existente.
[CORRECCIÓN] Para elementos cargados asíncronamente, establecer el estado visual antes de animar evita destellos inesperados.
[EXTENSIÓN] Entrada escalonada de resultados de búsqueda y tarjetas bibliográficas.

### 1.3 fromTo
[VIDEO] Declara explícitamente ambos estados y permite transiciones repetibles.
[EXTENSIÓN] Animar entre paneles cuando el usuario cambia rápido de autor, con estados de partida determinísticos.
```js
gsap.fromTo(el,{y:20,opacity:0},{y:0,opacity:1,duration:.3});
```

## 2. Timeline: secuenciar sin bloquear
[VIDEO] `gsap.timeline()` agrupa varias animaciones; `play`, `pause`, `reverse` y offsets permiten control. El tutorial encadena transiciones de una caja y botones Play/Pause.
[CORRECCIÓN] La timeline representa la narración, NO el dato ni la autoridad de la vista. Cancelar una animación no debe cancelar el cambio de selección.
[EXTENSIÓN] Elegir «Escuela → autor → concepto → obra» revela grupos en secuencia; un botón «Saltar» muestra el estado final.
```js
const tl=gsap.timeline({paused:true});
tl.from(title,{autoAlpha:0,y:12,duration:.25})
  .from(description,{autoAlpha:0,y:12,duration:.25},"-=0.1");
tl.play();
```
Pruebas: Play/Pause, cambio de pantalla en mitad de la reproducción, preferencia reduced-motion.

## 3. Stagger: grupos ordenados
[VIDEO] Animación progresiva de elementos que comparten selector; puede distribuirse por eje, grilla o centro.
[CORRECCIÓN] No aplicar a 500 aristas individuales; dividir por grupos de significado o mostrar resumen.
[EXTENSIÓN] Al desplegar «Bibliografía», aparecen obras por año o relevancia, en vez de simultáneamente.
```js
gsap.from(cards,{autoAlpha:0,y:9,stagger:0.035,duration:.25});
```
Observación: la transcripción contradice 0.006 y 0.06 segundos. No trasladar ese número como hecho sin código original.

## 4. ScrollTrigger: scroll como señal
[VIDEO] `start` y `end` combinan posición del elemento y viewport; `scrub` acopla progreso; `pin` mantiene sección fija. El tutorial primero corrige un typo al registrar el plugin.
[CORRECCIÓN] La consulta de un grafo no debe depender de scroll. Usar sólo en un recorrido narrativo optativo.
[EXTENSIÓN] «Historia de una teoría» en modo narración; el avance por períodos corresponde a snapshots del dataset, NO a transformaciones visuales arbitrarias.
```js
gsap.registerPlugin(ScrollTrigger);
gsap.to(story,{opacity:1,scrollTrigger:{trigger:chapter,start:"top 75%",end:"bottom 35%",scrub:true}});
```
Prueba: teclado puede recorrer la misma narrativa sin rueda de ratón.

## 5. Textos
[VIDEO] SplitText divide caracteres, palabras y líneas, luego anima con stagger y easing `expo.out`.
[CORRECCIÓN] Revertir SplitText en cleanup; mantener contenido accesible para lectores de pantalla, respetar reduced-motion.
[EXTENSIÓN] Destacar términos en explicación relacionada con selección sin retardar párrafos de estudio.
Prueba: texto completo disponible de inmediato para asistencias; no desaparece al interrumpir.

## 6. Puesta en marcha: React, Vite, Tailwind
[VIDEO] Inicia con Vite/React, instala GSAP y @gsap/react; registra ScrollTrigger y SplitText. Tailwind CSS organiza clases utilitarias, variables de tema y utilidades repetidas.
[CORRECCIÓN] Transcripción dictada dice «mpm» pero el comando real es `npm`. El video agrega «use client» a un componente de Vite que ya es cliente: no es requisito general. No copiar rutas ni CSS completo sin consultar compatibilidad.
[EXTENSIÓN] Nuestros widgets pueden ser vanilla JS + Cytoscape sin React: dependencia más pequeña y menos complejidad en iframe.
Pruebas: build y ejecución local sin fetch privilegiado, sin claves, HTML ejecutable desde directorio de publicación.

## 7. Arquitectura editorial y datos
[VIDEO] Divide Navbar, Hero, Cocktails, About, Art, Menu, Contact. Los arrays de contenido viven en constants/index.js; las imágenes, videos y fuentes en public. El instructor usa Figma y un asset kit enlazado desde la descripción del video, no adjuntos aquí.
[CORRECCIÓN] Estos recursos NO están recuperados ni tienen licencia acreditada. No copiarlos. Mantener datos por separado de composición y estado de interacción.
[EXTENSIÓN] Separar `graph-data`, `queries`, `ui`, `layout`, `motion`, `sources`.

## 8. Barra de navegación
[VIDEO] Nav HTML semántico con anclas a secciones y fondo translúcido/blurry al desplazar.
[EXTENSIÓN] Buscador que permanece visible al abrir paneles densos. En celular, prioridad a texto y control de foco en vez de vidrio decorativo.
[CORRECCIÓN] Animar color y filtro no debe impedir legibilidad ni consumir CPU continuamente.

## 9. Hero tipográfico y parallax de hojas
[VIDEO] Título gigante dividido en caracteres, subtítulos por líneas y dos hojas animadas por scroll en direcciones diferentes.
[CORRECCIÓN] Son recursos narrativos del sitio de cócteles; su traducción literal a grafo reduciría claridad.
[EXTENSIÓN] Selección: nodo central destaca, comunidades secundarias atenúan mientras el panel bibliográfico entra; NO desplazar posiciones de cada nodo con GSAP.

## 10. Scrubbing de video
[VIDEO] Video HTML5 muted, playsInline, ref React, sin autoplay final; `loadedmetadata` permite conocer duration; GSAP cambia `video.currentTime` con scroll. En la transcripción un agente genera una primera versión que funciona distinto de lo pedido, y se corrige manualmente. El plugin pin fija el video.
[VIDEO] Usa FFmpeg para convertir a archivo con keyframe en cada frame y mejorar el seeking al arrastrar scroll.
[CORRECCIÓN] El all-intra video puede pesar mucho; usar carga diferida y fallback; medir memoria, red y reproducción móvil antes de adoptar.
[EXTENSIÓN] Un módulo opcional de historia visual, nunca el motor para relaciones ni obligatorio para navegar.
Algoritmo: esperar metadatos → snapshot duración → programar tween de `currentTime` → control scroll → kill timeline en desmontaje.
Prueba: saltar al 90%, retroceder al 10%, interrumpir, comprobar frame concordante y ausencia de audio.

## 11. Sección de listas: contenido + parallax
[VIDEO] Dos listas de cócteles/mocktails basadas en constants, datos estructurados con nombre, país, detalle y precio. Nuevas hojas parallax sincronizadas con entrada en viewport.
[EXTENSIÓN] Dos columnas «Autores» y «Obras», o una vista de comparación con fuentes, en lugar de menús de bebida.
[CORRECCIÓN] Evitar precios ficticios o contenido inventado no señalizado en bibliografía; una relación necesita evidencia.

## 12. Cuadrícula de imágenes
[VIDEO] En About construye mosaico de 12 columnas (3+6+3 / 8+4), título con SplitText.words, imágenes animadas con un offset de solapamiento `-=0.5`.
[EXTENSIÓN] Vista biblioteca: tarjetas de portadas, fechas y abstract con procedencia, sincronizadas con grafo sin transformarse en nodos innecesarios.
Prueba: a 360px se apilan sin recortar títulos; sin imágenes la estructura conserva utilidad.

## 13. Máscara de revelado
[VIDEO] CSS `mask-image`, `mask-size` y `mask-position` utilizan una imagen como máscara sobre otra; un Timeline ScrollTrigger con pin y scrub la expande. Al final aparece texto de cierre.
[INFERENCIA] Este recurso sugiere una metáfora de profundidad semántica, no produce una relación nueva.
[EXTENSIÓN] Expansión de comunidad: el panel editorial revela material del siguiente nivel mientras Cytoscape ejecuta su propia transición de foco.
[CORRECCIÓN] No ocultar operaciones esenciales detrás de una máscara. Saltar/reduced-motion muestran contenido final inmediatamente.

## 14. Carrusel de cócteles
[VIDEO] Índice `useState`, helper «elemento en desplazamiento», botones previo/siguiente, selección directa, texto descriptivo; GSAP anima imagen y datos cuando `currentIndex` cambia.
[CORRECCIÓN] Con índices negativos, usar fórmula módulo positivo. Limpiar animaciones al cambio rápido.
[EXTENSIÓN] Comparador autor A ↔ autor B; cada movimiento actualiza título, relaciones y fuentes, conservando selección en Cytoscape.
```js
const wrap=(i,n)=>((i%n)+n)%n;
function move(delta){index=wrap(index+delta,items.length); selectById(items[index].id);}
```
Pruebas: ciclo prev desde índice cero, selección directa, 20 cambios rápidos sin desincronización de grafo y ficha.

## 15. Footer y entrega
[VIDEO] Footer con dirección/contacto/horarios/sociales y timeline de entrada; Git commits por funcionalidad y despliegue guiado en Vercel. La transcripción afirma que el despliegue del ejemplo del instructor funcionó en su demostración, no que esté accesible ahora.
[CORRECCIÓN] Para Prometeo usar repositorio y GitHub Pages existentes, sin servicios pagos ni nuevos repositorios; verificar el contenido servido, no inferirlo por commit.

## 16. Matriz de transferencia a Cytoscape
CONSERVAR: datos de grafo, identidad, selección, zoom, relaciones y navegación del sistema original (requerimientos, código base aún no visto).
AGREGAR EN PARALELO: paneles, comparación, biblioteca editorial, narraciones controladas, historial exacto, referencia verificable.
REEMPLAZAR SOLO SI HAY PARIDAD: animaciones confusas, búsqueda débil, falta de accesibilidad; pruebas deben demostrar que ninguna capacidad se pierde.
DESCARTAR: parallax ornamental, video pesado automático, bucles infinitos, scroll obligatorio, animar aristas una a una.

## 17. Variaciones auténticas construibles
A) Cartografía de teorías: pregunta/verifica conexiones; motor Cytoscape, contraste con bibliografía.
B) Mesa de topologías: experimenta con layouts/algoritmos y mide resultados reproducibles.
C) Cronoscopio: transforma Timeline/ScrollTrigger en historial determinístico de eventos de una red, con diff y fuentes.
Las tres están diseñadas en `PLAN_EJECUTABLE.md`; todavía no son widgets terminados.

## 18. Pruebas principales
- Estructura: ID único, arista apunta a ID existente, sourceUrl validada si se declara hecho documentado.
- Consulta: filtro sin tildes, comparador A/B correcto, cancelar animación no cancela selección.
- Reversibilidad: colapsar/expandir conserva dataset, historial vuelve a pan/zoom originales.
- Temporalidad: scrub temporal hacia adelante y atrás reproduce el mismo snapshot.
- Móvil: 360px, interacciones por toque y alternativa de teclado.
- Publicación: registro en JSON, archivos versionados, GitHub Pages sirviendo bytes correctos y sandbox sin localStorage.
