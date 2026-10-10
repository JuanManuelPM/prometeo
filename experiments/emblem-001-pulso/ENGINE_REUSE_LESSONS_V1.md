# PULSO · Aprendizaje reutilizable para motores 2D, 3D y animación · V1

**Prioridad: SECUNDARIA.** Owner: `experiments/emblem-001-pulso/` (PR #75). El objetivo principal de Prometeo sigue siendo persistencia entre chats. Este documento no es una prueba de publicación ni un motor nuevo.

## Evidencia y límites de procedencia

- `engine.mjs` (blob `ed945c729b3a748bf55a226177b84a7a92f92850`): estado explícito, motor independiente del DOM y exportaciones `createGame` / `step`. Escenario 960×540 con choques auto-pelota, rebotes, arcos, saque, reloj y rival simple.
- `game.mjs` (blob `168ddad62186b2f8f219a7781806bb046a44d7e3`): adaptadores de teclado, puntero/joystick, animación Canvas y WebAudio habilitado tras interacción; render y reglas están separados.
- `validation/RECEIPT_V1.json`: 8/8 pruebas Node reportadas; 21/21 comprobaciones Chromium sobre empaquetado *inline* de código original; navegaciones HTTP/file bloqueadas, módulos ES nativos y V6 real no verificados; PR candidato, no servido.
- La lectura del código NO verifica rendimiento real, tacto físico, sincronía online, accesibilidad completa, reproducibilidad entre dispositivos ni calidad final. No afirmar que PULSO ya implementa 3D.

## Arquitectura transferible, sin copiar juego ni marca

1. **Núcleo portable y testeable:** reglas de juego/estado, entradas y física sin DOM, audio ni canvas; adaptadores de visualización distintos para Canvas2D, WebGL/WebGPU/Three o escena 3D nativa. No reconstruir el juego para cada renderer.
2. **Tiempo y determinismo:** avanzar simulación con paso fijo y acumulador acotado; distinguir reloj de partida, tiempo de simulación y tiempo de pared/pausa. En PULSO actual el reloj descuenta hasta 120 s mientras el movimiento se limita a 0,05 s por llamada: **riesgo a comprobar** de divergencia ante frames largos, no necesariamente error en la partida habitual. Tests: secuencias de 30/60/120 fps, suspensión de pestaña, reanudación y replay reproducible.
3. **Contratos explícitos de colisiones:** capas, radios y masas, separación y rebotes con eventos; testear contactos en reposo, múltiples colisiones simultáneas, esquinas, gol en borde del arco y ausencia de impulso ficticio. El código PULSO aplica impulso base de 155 al solaparse el auto y la pelota; auditar jitter y energía antes de generalizar.
4. **Entrada desacoplada:** normalizar teclado, mouse, gamepad y táctil a una intención única; múltiples `pointerId` independientes para dirección/turbo; limpiar en blur, pointercancel y captura perdida. Validar multitouch en teléfono físico y navegación sin teclado.
5. **Eventos de dominio:** el motor emite `hit`, `goal`, `wall`, `end`; los renderers producen partículas, shake, UI, audio y vibración sin contaminar lógica. Para animaciones 2D/3D usar timeline reproducible y transiciones con cancelación/cleanup.
6. **3D es otro problema geométrico:** conservar reglas generales (marcador, fases, objetivos, comandos) pero evolucionar colisiones a vectores 3D, normales, orientaciones, cámaras y contactos reales. No llamar 3D a un canvas isométrico; exigir iluminación, oclusión, cámara controlable y pruebas de rendimiento/GPU si se promete 3D.
7. **Audio robusto:** sintetizar tras gesto humano por políticas del navegador; juego sigue utilizable si WebAudio no está disponible. Agregar control de volumen, límite de voces y prueba de suspensión/reanudación antes de reutilizar en demos masivas.
8. **Aceptación evidencia > aspecto:** motor Node, DOM/browser con módulos ES servidos, móvil táctil real, Demo Engine V6 sobre página real, Pages SHA y prueba de uso humano son gates distintos. `set_content` con módulos inline cubre comportamiento parcial, NO integridad de imports/navegación. Guardar resultados negativos.

## Próximos experimentos secundarios (NO desplazan persistencia)

- PULSO: resolver bloqueo de navegación/V6/imports y una partida de 90 s, no publicar antes.
- Motor reutilizable: extraer `inputIntent`, eventos de dominio y reloj fijo en una rama de experimento **solo después** de tests basales; probar swap de renderer sin reescribir reglas.
- Animación: comparar Canvas2D con renderer 3D para una misma secuencia determinista; medir latencia, consumo y fidelidad de eventos.
- Pruebas adversariales: frames de 2 s, colisión estando quietos, gola en límites, pointercancel simultáneo y reducción de movimiento/accesibilidad.

**Falsador:** si un renderer nuevo exige reescribir marcador, acciones y reglas, la separación entre motor y presentación no es suficientemente estable. Si CI/browser inline pasa pero la URL HTTP con módulos falla, la cadena de release permanece BLOQUEADA.
