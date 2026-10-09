# Atelier bicolor de widgets · Contrato V1

**Estado:** CANDIDATE, propuesta artística vinculada a Issue #76. No cambia Current, TV, chat principal, gh-pages servido, PR #77 ni kernel. Es un paquete de aspecto visual y una maqueta funcional aislada con datos explícitamente ilustrativos. La misión principal sigue siendo persistencia real entre chats.

## Visión humana verificable

Una sola aplicación móvil: arriba un carrusel de proyectos/publicaciones con cubiertas visuales; debajo una cronología de pedidos y resultados recuperables de chats descartables. Tocar un objeto lleva a su proyecto y versiones; tocar una conversación abre detalle; Atrás vuelve sin obligar al humano a conocer PR, GitHub o skills. El compositor de voz/texto solo funcionará cuando exista un ingreso autenticado y ACK real.

## Lectura de las referencias

**Referencia primera:** cuadros independientes con radios coherentes, espaciado fijo, variaciones de tamaño, funciones concretas y máximo dos acentos. Aplicamos su gramática modular, NO sus gráficos, avatar o tablero exacto.

**Referencia segunda:** grabado blanco-negro construido mediante masas planas, tramas que simulan medios tonos, silueta, planos recortados, hatching y vacíos. Aplicamos sus métodos compositivos, NO su escena, silueta humana o televisor exactos.

**La intersección:** widgets modernos en dos tintas que puedan ser bellos por la ilustración de sus contenidos y no por glow, gradientes aleatorios o tarjetas con texto diminuto.

## Arte de dos tintas: oficio y sistema

- Sólo dos pigmentos base: tinta #111111 y papel #f4f2eb. Los valores aparentes intermedios se obtienen con densidades de puntos y rayas usando ESOS mismos pigmentos. Un gris extra en CSS o SVG rompe la ley.
- Tonos ópticos: 0% papel; 10-15% puntos dispersos; 25-35% puntos regulares; 45-55% tramas cruzadas; 70-80% líneas/puntos densos; 100% tinta sólida. Una zona texturada se lee como un valor a distancia pero muestra oficio al acercarse.
- Las masas negras y blancas deciden la silueta. Antes de detalles, reducir la miniatura a un cuarto de su tamaño y comprobar que el objeto aún se distingue.
- Biblioteca limitada: DOTS para aire/ambiente; HATCH para sombra; LINES para estructura; CROSSHATCH para profundidad; SOLID INK para foco; SOLID PAPER para lectura; POSTER para objeto/portada. Nada de noise universal como relleno de inseguridad artística.
- Máximo 20-30% de trama densa en regiones informativas; el texto vive sobre superficies sólidas. La portada ilustrada puede ser más compleja, pero el nombre y la acción quedan separados sobre un plano limpio.
- Cada proyecto debe tener una imagen/portada con composición propia, no el mismo icono genérico en otra caja. La ilustración editorial y la naturaleza del objeto guían el patrón, manteniendo la paleta común.
- La profundidad nace de capas, recortes, bordes de dos grosores, ritmo de manchas y oclusión; no de sombras borrosas ni degradados. El marco de un widget no necesita parecer un dispositivo retro.
- Inversión oscuro/claro intercambia papeles de tinta/papel, nunca introduce color nuevo. Las imágenes de los productos reales conservan sus colores en su vista interna: el sistema bicolor afecta la presentación, no reescribe el artefacto.
- No convertir estética en decoración molesta: animación mínima, transiciones cortas, reduced motion, ninguna textura animada detrás de texto. Primero una imagen estática hermosa, después interacción.

## Gramática espacial y tipográfica

- Un widget ocupa espacio sólo para un objeto, una acción, un resultado o un estado verificable. Prohibidos discursos de bienvenida, slogans sobre un cerebro, instrucciones redundantes y pequeñas leyendas de infraestructura en la portada.
- UI móvil: título de sección 24-28px, objeto 19-22px, cuerpo 16-17px, dato secundario 14-15px. No usar metadatos esenciales a 10-12px. Máximo cuatro niveles.
- Ritmo 8/12/16/24px; radios 8-12px, no pastillas gigantes; bordes finos 1px, activos 2-3px; dos planos altamente contrastantes. Interacción táctil >=44x44px.
- Carrusel vertical de 3:5 en ancho, visible 1.2-1.5 tarjetas en 390 CSS px; última entrega a la izquierda, anteriores a la derecha; altura suficiente para cubierta y estado, sin descripción larga.
- Debajo, widget de actividad con resumen real y objeto enlazado. El scroll lateral NO bloquea scroll vertical, teclado ni Android Back.
- La portada no lista SHAs, CI ni contratos. Esa evidencia permanece recuperable en un detalle técnico secundario. Un error sí debe verse en lenguaje humano simple.
- Estados con texto verdadero: REQUEST_CAPTURED, CANDIDATE, TESTED, PUBLISHED, SERVED_VERIFIED, BLOCKED, UNVERIFIED. Ninguna etiqueta de versión nueva por simple commit. Fecha/hora America/Argentina/Buenos_Aires sólo cuando el origen tiene timestamp verificable.

## Roles de widgets que debe absorber el sistema vigente

- ProjectRailWidget: cubiertas y nombres de proyectos/artefactos, versión/estado, orden.
- ActivityThreadWidget: un pedido identificado por request_id con respuestas, resultados y evidencia.
- ArtifactPreviewWidget: producto/URL/versión real con prueba de servido.
- VersionRailWidget: versiones comprobables del mismo artefacto, no proyectos duplicados.
- ComposerWidget: texto/voz con canal autenticado y ACK; si no existe se muestra indisponible, jamás fake queued.
- EvidenceDrawerWidget: evidencia/sha/errores a demanda, no pantalla principal.
- ActionTileWidget: acciones realmente ejecutables de crear/abrir/volver.

Estos son roles de aspecto, NO widgets ya registrados. El kernel existente de ui-workspace-v1 tiene ownership sobre shell, mover, minimizar, fullscreen, resize y persistencia. Para incorporar un widget real hay que seguir Widget API V1, READINESS_GATE_V1 y WIDGET_CONTINUITY_PROTOCOL_V1 (CONTEXT, versions, messages, references, prompt, exam). No crear otro router, shell, autoridad, scheduler ni Current.

## Tres composiciones maestras

**Inicio:** nombre compacto y acción real, rail de publicaciones con ilustraciones grandes + actividad útil inmediata. Sin título hero ni marketing.

**Proyecto:** back con estado recuperable, portada, última entrega y acceso a versiones. Si el estado no está verificado, dilo. Historial filtrado al proyecto.

**Conversación:** pedidos/respuestas asociados, resumen conciso por defecto, expandir texto completo sólo cuando existe almacenamiento autorizado; un composer pequeño abajo, accesible y honesto.

Este paquete adjunta CSS reutilizable, SVG de tres portadas originales y una prueba local con navegación entre estas tres composiciones. La muestra NO contiene mensajes reales: todos los ejemplos están etiquetados. No se publica como otra app.

## Pruebas de aceptación, antes de integrar

1. Dos códigos HEX y ninguna gama color decorativa; tramas deliberadas.
2. Tres vistas funcionales, navegación Back y selección conservadas; datos de ejemplo etiquetados.
3. 360/390/430/844/1440 CSS px y navegador Android real, sin miniaturizar layout ni generar overflow global.
4. 1.2-1.5 cards visibles a 390px, miniaturas originales reconocibles a tamaño reducido.
5. Dither sólo en imágenes/cubiertas, nunca bajo contenido.
6. Texto 16px o mayor, meta al menos 14px y controles con objetivo táctil >=44px.
7. Gestos lateral/vertical independientes, foco teclado, prefers-reduced-motion.
8. Seguridad: sin red ni emisión en muestra; en app real nunca transcript privado ni credencial en Pages.
9. Prototipo visual PASS no implica datos reales, publicación, versión servida ni persistencia terminada.
10. Revisar captura humana en celular: ¿se entienden objetos y acciones en tres segundos? ¿quedan barras vacías o frases AI? Si sí, rechazar.
11. Antes de adoptar: preservar baseline y PR #77, montar roles en la superficie única del Issue #76, real DOM+Demo V6, permisos y pruebas de datos. No tercer producto.
12. Continuidad: otro chat debe recuperar ESTE contrato, dueño y fallos sin que el usuario copie la respuesta. Una guía no reemplaza pruebas ni arte final.

## Objeciones de un director artístico

Dos colores pueden ser aburridos si sólo se convierten en tarjetas planas: el trabajo expresivo está en la composición específica de cada portada, no en inventar gradientes. Las tramas pueden cansar si se usan por todas partes: reservarlas para materiales e ilustraciones. Un widget bello sin resultado recuperable es un póster, no persistencia. Un carrusel minimalista no sustituye el chat; el timeline sigue siendo protagonista. Evitar inspirarse demasiado literalmente en las imágenes ajenas.

## Fuentes y owner

- github Issue #76: https://github.com/JuanManuelPM/prometeo/issues/76
- main: visuals/VISUAL_PROTOCOL_V1.md, VISUAL_FEEDBACK_LOG_V1.md, EXECUTION_CHECKLIST_V1.md
- gh-pages: ui-workspace-v1/current.json page_version 15; ui-workspace-v1/kernel/WIDGET_API_V1.md, UI_RULES_CURRENT.md, ui-workspace-v1/protocols/WIDGET_CONTINUITY_PROTOCOL_V1.md
- main: ui-workspace-v1/continuity/evolution-v1/ARCHITECTURE_SPEC_V1.md, IDEA_INDEX_V1.json (45 EVO son requisitos no implementados)
- PR #77 es desarrollo funcional separado, no tocarlo sin reconciliar head y pruebas.
