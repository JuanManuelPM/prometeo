# Atlas técnico de PixiJS · v2

**Conservación:** esta versión suma despiece completo, doce variaciones, fuentes estructuradas y 16 fichas sin modificar el atlas v1 que otro chat publicó. Hasta comprobar navegador público y URL servida, v1 continúa registrado como versión visible.

**Producto:** documentación pública navegable e investigada, NO un videojuego ni uno de los tres widgets experimentales de Fase 2.

**Entrada del atlas:** `index.html`. **Fuente estructurada de datos:** `conocimiento.json`; una copia idéntica de sus datos está incrustada en el HTML para funcionar también dentro del iframe `sandbox` sin `allow-same-origin` y sin permisos especiales. Cambiar ambos en conjunto al actualizar.

## Inventario y origen (13/10/2026)

- **1 tutorial de usuario** recuperado: Snake introductorio de Hugo, transcripción inglesa adjuntada en esta conversación (URL exacta del video, duración y fecha no disponibles). Análisis original, no reproducción textual.
- **8 referencias públicas externas**: documentación oficial y ejemplos PixiJS 8, repositorio Open Games MIT, Puzzling Potions, tutorial histórico Learning Pixi v5 y Showcase. No son ocho videos de usuario.
- **16 fichas de capacidad**, cada una con función, algoritmo/piezas, fuente, límites, fallos, patrones, aplicaciones, pseudocódigo y prueba.
- **12 ideas de juegos** con cambios sustanciales de reglas.
- **4 trabajos previos** (PR #108 bosque candidato, PR #109 documentación, Anatomía de Juegos local, Atelier local), con estados veraces.
- **5 decisiones** y **3 experiencias preparadas** (no desarrolladas en esta fase).

## Archivos

| Archivo | Uso |
|---|---|
| `index.html` | Navegación interactiva, sin dependencias externas |
| `conocimiento.json` | Modelo semántico legible por otra IA, ID y procedencia por fuente |
| `docs/01_DESPIECE_DEL_TUTORIAL.md` | Del primer comando al último choque, video distinguido de correcciones |
| `docs/02_MOTOR_Y_VARIACIONES.md` | Motor conceptual, reglas TDD, 12 variantes y rendimiento |
| `PLAN_FASE2.md` | Especificación completa de los tres widgets a ejecutar con «.» |
| `PROCEDENCIA_Y_ESTADO.md` | Fuentes, licencias, riesgos, decisiones y verdades verificables |
| `tests.mjs` | Tests de consistencia offline del contenido, a ejecutar mediante Node |

## Interfaz y experiencia

Las seis pestañas tienen contenido generado desde los datos: **Técnicas**, **Fuentes**, **Trabajos previos**, **Variaciones**, **Decisiones** y **Próximas experiencias**. Buscar filtra en cada sección; las fichas permiten profundizar, y los conceptos se clasifican por familia. Al tocar un resultado en celular se abre un panel de lectura con botón cerrar y Escape. En escritorio el detalle permanece junto a la lista; navegación teclado y contraste alto. El atlas no accede a cámara, micrófono ni datos del visitante.

## Evidencia (separar las capas)

- GitHub: los archivos se publicaron primero en rama independiente; la ruta y SHAs deben confirmarse tras integración.
- Prueba de síntaxis real del script embebido: JavaScript compilado con `new Function`, sin error.
- Pruebas lógicas de UI realizadas en V8 con doble DOM: **17 afirmaciones exitosas** (6 secciones, búsqueda vacía y positiva, filtros, apertura/cierre mobile, 11 etapas de tutorial, fuentes, ideas, plan, proyectos). Esto **no** constituye una prueba Chromium real ni prueba de píxeles/layout.
- El navegador local de ejecución de herramientas no puede resolver `github.io` ni `raw.githubusercontent.com`: una respuesta de GitHub Contents sólo comprueba que GitHub conserva los bytes, no que Pages los sirve.
- **Condición de registro:** abrir HTML exacto servido y la vista `?lab=pixijs` en navegador real escritorio/móvil, verificar funcionamiento real, comprobar salida de GitHub Pages, recién entonces escribir `registry/pixijs.json` preservando widgets existentes. Si esto está bloqueado, conservar candidato/PR sin inventar servicio.

## Contrato de privacidad/licencia

Material redactado de cero; enlaces externos sin extraer sprites ni transcripciones protegidas; `index.html` sin CDN, localStorage, cookies, llamadas API o código externo. Google Fonts inexistente; fuentes del sistema. No se publicaron datos académicos, personales ni credenciales.

## Recuperación de continuidad

Leer: `conocimiento.json` → `docs/` → `PLAN_FASE2.md` → `PROCEDENCIA_Y_ESTADO.md`. Si el mensaje futuro consiste en «.», ejecutar **Fase 2** de este chat, no repetir Fase 1 ni pedir aprobación adicional, pero sostener la regla de pruebas reales y no publicar trabajo incompleto como terminado.
