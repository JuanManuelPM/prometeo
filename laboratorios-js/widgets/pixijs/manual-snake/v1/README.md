# PixiJS · Laboratorio de aprendizaje: Snake y sus variaciones

> **Estado:** documentación de conocimiento, no un juego ni un widget publicable. No inscribir en `registry/pixijs.json`.
>
> **Origen:** transcripción completa proporcionada por el usuario el 13/10/2026 (aprox. 4.033 palabras) de un tutorial introductorio de *Snake con PixiJS* narrado por Hugo. La transcripción no incluye un enlace verificable al video ni al repositorio del autor. Menciona el sitio `simplepointingames.com` y una versión más avanzada controlada con cursor, que el propio autor reconoce imperfecta. **No reproducimos literalmente la transcripción, sus recursos ni código ajeno.**

## Entrada para el próximo chat / guía

**Leé estos archivos en este orden:**

1. [01 · Despiece completo del tutorial](01_DESPIECE_DEL_TUTORIAL.md): qué hizo Hugo, cómo funciona cada técnica, en qué orden la construyó y qué quedó sin resolver.
2. [02 · Motor reutilizable y variaciones](02_MOTOR_Y_VARIACIONES.md): arquitectura desacoplada, reglas reutilizables, plantillas de diseño y variantes radicalmente distintas, con criterios de aceptación.
3. Este README: procedencia, restricciones y estrategia de recuperación.

**La idea transferible:** no hay que recrear Snake para cambiar el juego. Separá el estado lógico (mundo, actor, segmentos, objetivos, colisiones), sus reglas de transición, las entradas, el reloj y el renderizador. Conservá lo que funciona y sustituí únicamente las piezas que afectan la propuesta jugable.

### Traducción de Snake a un motor de juegos

| En el tutorial | Módulo reutilizable | Qué se puede cambiar |
|---|---|---|
| Cuadrícula de 20 px | Mundo/topología | Grilla, hexágonos, nodos, trayectorias |
| Cabeza de la serpiente | Actor principal | Tren, gusano, caravana, hilo, convoy |
| Array de segmentos | Historial de posiciones / cadena articulada | Longitud, persistencia, separación, elasticidad |
| Flechas | Intenciones del jugador | WASD, botones táctiles, clic, gestos, IA |
| Una manzana | Objetivo recogible | Cartas, pasajeros, energía, semillas, pistas |
| `unshift` + `pop` | Seguimiento de trayectoria | Cola rígida, vagones, sombra, ruta dibujada |
| Autocolisión | Condición de riesgo | Choque, fatiga, exposición, enredos |
| Respawn | Política de falla | Reinicio total, vidas, daño, checkpoint |
| `Ticker` de 10 FPS | Reloj lógico | Pasos por turno, segundos reales, ritmo |
| PixiJS `Graphics` | Vista | Arte ilustrado, atlas, animación, filtros |

### Reglas de este aprendizaje

- **Fuente / deducción / mejora:** cada documento distingue `[VIDEO]`, `[CORRECCIÓN]`, `[EXTENSIÓN]` y `[DOC PIXIJS]`. No atribuir al video funciones que no aparecen.
- **No exigir el video de nuevo.** Recuperar la información directamente de estos documentos y, cuando importe reproducir el original, señalar lo que la transcripción no determina.
- **No copiar los defectos didácticos.** El video prioriza enseñanza rápida sobre arquitectura, robustez y calidad visual; la guía conserva sus mecánicas y señala las mejoras obligatorias.
- **No modificar automáticamente** el juego candidato «El bosque de las cartas» del PR #108: es un trabajo paralelo. Las variantes Snake no autorizan sobreescribir ese proyecto.
- **No publicar demostraciones ficticias.** Estos archivos son notas. Un futuro juego debe tener su propio `index.html`, carpeta/versionado nuevo, prueba de navegador real, licencia y registro sólo después de publicación servida.
- **Privacidad:** documentos sintetizados de una transcripción aportada voluntariamente para la biblioteca técnica. No incluyen datos personales, proyectos privados ni material académico.

### Consulta rápida de la documentación oficial PixiJS 8

- Inicio y plantilla Vite: https://pixijs.com/8.x/guides/getting-started/quick-start
- `Graphics` y `GraphicsContext`: https://pixijs.com/8.x/guides/components/scene-objects/graphics
- `Container` / jerarquía de escena: https://pixijs.com/8.x/guides/components/scene-objects
- `Ticker`: https://pixijs.com/8.x/guides/components/ticker
- Bucle de render: https://pixijs.com/8.x/guides/concepts/render-loop
- Notas de migración a v8: https://pixijs.com/8.x/guides/migrations/v8

> **Versión de API:** los ejemplos de ampliación se formulan para PixiJS 8. Antes de copiarlos a otro proyecto, comprobar la versión de `pixi.js` y el `package.json` real; el video describe un proyecto Vite/TypeScript pero no aporta sus archivos íntegros.
