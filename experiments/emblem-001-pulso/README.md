# PULSO · Cancha de impacto

Juego web arcade **original en 2D**. Para jugar localmente desde un servidor estático: `python -m http.server 8080` y abrir `/`. Requiere navegador moderno con Canvas2D y módulos ES. No hay APIs, dependencias ni recursos externos.

- PC: WASD o flechas; Espacio = turbo; R = reiniciar.
- Móvil: joystick a la izquierda y mantener TURBO a la derecha. Modo horizontal para campo más grande.
- Partido: 90 segundos activos, goles en arco contrario, rival que persigue la pelota, tablero final y reinicio.
- Sonido: osciladores Web Audio activados desde el botón de inicio, botón mute. No usa audio externo.

Ver `proof/DEMO_PLAN.json` y `validation/*` para pruebas y limitaciones **verificadas**. La rama candidata no es un lanzamiento; no dar URL de Pages hasta superar gate V6 y smoke real.
