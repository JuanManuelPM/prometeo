# J12 · PULSO · aceptación candidata
Fecha de revisión: 2026-10-10 (Argentina, UTC-03:00).

**Producto:** PULSO, juego 2D original de autos y pelota, 90 segundos, IA rival, rebotes, dos arcos, score, pausa, joystick multitáctil, turbo y teclado. Archivo autocontenido `PULSO_JUGAR.html` y edición modular.

**Recuperación:** PR #75, ruta `experiments/emblem-001-pulso/`, pruebas en `.github/workflows/pulso-j12-browser.yml`. Nada reemplaza la fuente primaria ni la página de Prometeo.

## Alternativas visuales
1. Arena neon geométrica del prototipo: se descartó como imagen principal por apariencia genérica e incompatible con el protocolo visual de Prometeo.
2. Sports cartoon / flat vector: se descartó por confundir accesibilidad técnica con identidad artística y por depender de más formas sintéticas.
3. **Cancha urbana nocturna ilustrada:** dirección adoptada, imagen original comprimida e incorporada como WebP inline autocontenido, luces cian/ámbar, material y textura auténtica; controles funcionales superpuestos. Sin portadas geométricas.

## Mejoras de motor y experiencia
- Contacto pelota-auto estático deja de inventar energía; impulso ligado a velocidad de acercamiento.
- Simulación a paso fijo 1/60, control de tiempo de ventana, pausa, pausa de reloj, reinicio.
- Joystick y turbo simultáneos con dueño de pointer; un tercer dedo no libera turbo accidentalmente.
- Zona jugable acotada al pavimento real de la ilustración.
- Viewports probados: 390×844, 844×390, 1440×900.
- Controles mínimos 44px en vertical, visibilidad y preferencia de movimiento reducido.
- Estilo landscape se corrige para evitar que tutorial y barra tapen cancha.

## Evidencia
CI inicial del producto: [77 comprobaciones, Chromium HTTP, 0 errores](https://github.com/JuanManuelPM/prometeo/actions/runs/38095209057). Revisión con arte: [83 comprobaciones, Chromium HTTP, 0 errores](https://github.com/JuanManuelPM/prometeo/actions/runs/38095680794). Se comprueban ambos modos: ES modules HTTP y HTML autocontenido. Capturas y JSON exactos en artifact del run.

## Límites / gate real
Estado: **CANDIDATE**. La ilustración original fue revisada en capturas pero no por otro chat crítico independiente. Falta Demo Engine V6 operando en DOM real con su receta/puntero y aceptación; no atribuir las pruebas Playwright al motor V6. Falta QA manual físico de Android y publicación/smoke de GitHub Pages. No declarar SERVED antes de comprobar URL, bytes, carga, juego, experiencia visual, recuperación y concurrencia. Conservar PR draft hasta gates.

El botón de reinicio no guarda partidas: la demo no requiere cuentas, cookies ni almacenamiento remoto. La fuente de verdad de esta entrega es la rama del PR #75 y su evidencia, no el catálogo público.
