# PULSO · Cancha de impacto

Juego web arcade **original en 2D**. Para jugar localmente desde un servidor estático: `python -m http.server 8080` y abrir `/`. Requiere navegador moderno con Canvas2D y módulos ES. No hay APIs, dependencias ni recursos externos.

- PC: WASD o flechas; Espacio = turbo; R = reiniciar.
- Móvil: joystick a la izquierda y mantener TURBO a la derecha. Modo horizontal para campo más grande.
- Partido: 90 segundos activos, goles en arco contrario, rival que persigue la pelota, tablero final y reinicio.
- Sonido: osciladores Web Audio activados desde el botón de inicio, botón mute. No usa audio externo.

Ver `proof/DEMO_PLAN.json` y `validation/*` para pruebas y limitaciones **verificadas**. La rama candidata no es un lanzamiento; no dar URL de Pages hasta superar gate V6 y smoke real.

## Estado de entrega J12 publicado (2026-10-10)
Juego en GitHub Pages: https://juanmanuelpm.github.io/prometeo/experiments/emblem-001-pulso/PULSO_JUGAR.html

Version verificable: SHA del archivo HTML `af35726605e3a8379e4787b6890ca35db2dcf111` (46.550 bytes). Release Git `1f00380b50285d9208b073fb2062a201e3af3e24`.
Comprobación remota real y recuperación desde biblioteca: https://github.com/JuanManuelPM/prometeo/actions/runs/38096513509. V6 real: https://github.com/JuanManuelPM/prometeo/actions/runs/38096262945.
Documento de recuperación: `projects/pulso-j12/PROJECT_V1.json` en gh-pages. No confundir V6/Chromium automático con QA manual en hardware.
