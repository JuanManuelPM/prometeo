# Tone.js · Plan ejecutable Fase 2

Estado: **PLAN_READY_NOT_IMPLEMENTED**. No se han programado las tres aplicaciones.

Atlas: `index.html` y `atlas.json`; plan estructurado: `plan.json`.

## Reglas innegociables
- Mantener Tone.js como motor principal real y empaquetado de cada experiencia.
- Preservar el prototipo Sendero previo como antecedente, no sobrescribirlo ni afirmar que su motor principal ya es Tone.js.
- Publicar sólo apps con pruebas de navegador, controles reales, licencias y recursos correctos.
- La lectura dentro del iframe sandbox debe funcionar sin localStorage, cookies o fetch desde `null` origin.
- Consultar constitución, HEAD, EPOCH, contrato y registro antes de cada publicación, sin alterar otros escritorios.

## Tres productos

### Sendero Music Studio · Edición de autor (Experiencia 1 · Proyecto emblemático)
Una estación de composición indie que escribe música, la transforma para Sendero y la exporta sin perder su partitura.

**Ruta propuesta:** `laboratorios-js/widgets/tonejs/sendero-studio/v1/index.html`

**Arquitectura**
- core/score.ts: esquema y migración v1 a v2
- audio/tone-engine.ts: Transport, instrumentos, buses, Offline
- arrangement/editor.ts: comandos reversibles y patrones
- adaptive/scenes.ts: estado y transiciones
- io/project.ts: JSON/ZIP, assets y metadatos de licencia
- ui/: vista responsive y accesible

**Ejecución**
1. 1. Recuperar y probar local sendero-music-studio; fijar baseline
2. 2. Empaquetar Tone.js y migrar motor por adaptador; verificar A/B y offline
3. 3. Migrar song.json y sonidos con manifest de licencias
4. 4. Completar editor y mezcla con estado único
5. 5. Escenas/automatización, exportación y pruebas
6. 6. Capturas, escucha humana pendiente señalada, publicar tras tests

**Pruebas de aceptación**
- [ ] Reproduce 48 compases de 9 pistas, sin silencios inesperados
- [ ] Las escenas cambian dentro de una frontera de compás definida
- [ ] Editar + guardar + reabrir conserva notas, instrumentos y assets
- [ ] WAV exportado tiene duración, señal y niveles válidos; auditar divergencias Tone live/offline
- [ ] 12 replays sin eventos duplicados; memoria y CPU razonables en celular
- [ ] Paneles principales probados en 360px y escritorio, con controles accesibles

**Recursos/licencias**
- Conservar la partitura original song.json y sus 1.417 eventos
- No publicar los 3 WAV del prototipo salvo verificación de derechos y calidad; son sintéticos originales
- Seleccionar multisamples acústicos con licencias y atribución archivo por archivo
- No copiar bandas sonoras de otros juegos

### Atelier de Timbres · Banco de sonido (Experiencia 2 · Laboratorio interactivo)
Un taller donde cada decisión sonora se oye, se compara y se guarda como un instrumento real.

**Ruta propuesta:** `laboratorios-js/widgets/tonejs/atelier-timbres/v1/index.html`

**Arquitectura**
- graphs/graph-builder.ts: validación y dispose de nodos
- voices/instrument-factory.ts: sintetizadores y sampler
- compare/a-b.ts: nivelación y snapshot
- assets/license-manifest.json y carga explícita
- views/: foco teclado + cadena + atributos sonoros

**Ejecución**
1. 1. Baseline de audio desbloqueado y transporte compartido
2. 2. Instrument factory y patch schema con tests
3. 3. Cadena configurable y validación de grafos
4. 4. A/B, comparador, teclado y patrones
5. 5. Save/load patch y recursos con licencia
6. 6. Tests de sonido, CPU, móviles y publicación

**Pruebas de aceptación**
- [ ] Todos los módulos alteran audio, ninguno es decorativo
- [ ] A/B con el mismo patrón y volumen compensado
- [ ] Cambiar 100 presets no deja voces ni nodos huérfanos
- [ ] JSON importado reproduce configuración y muestras de forma determinista
- [ ] Tres tipos de instrumento con carácter distinguible y explícita nota de calidad
- [ ] La interfaz es utilizable con teclado y táctil

**Recursos/licencias**
- Muestras de prueba originales o CC BY con créditos completos
- No utilizar grabaciones de terceros hasta verificar fuente individual
- Presets originales creados por síntesis, no copiados de software comercial

### Museo Invisible · Aventura auditiva (Experiencia 3 · Variación radical)
Un juego de exploración donde la información esencial llega por el oído y los acertijos se resuelven navegando espacios sonoros.

**Ruta propuesta:** `laboratorios-js/widgets/tonejs/museo-invisible/v1/index.html`

**Arquitectura**
- world/rooms.ts: grafo de salas y objetos
- audio/spatial.ts: panners, occlusión ligera y tonos de pista
- puzzles/motif.ts: máquina de estados y comparación rítmica con tolerancia
- ui/map.ts: accesibilidad táctil, texto alternativo
- state/progress.ts: progreso exportable sin localStorage requerido

**Ejecución**
1. 1. Prototipo jugable de una sala con Tone.js y a11y
2. 2. Eventos de mundo, navegación y modelo de sonido
3. 3. Puzzle con motif que usa reloj del primer y segundo tutorial
4. 4. Extender a tres salas originales, guardar progreso
5. 5. Arte, narración, experiencia mobile y tests
6. 6. Verificar URLs, assets y publicación

**Pruebas de aceptación**
- [ ] Tres salas recorribles y puzzle con solución real
- [ ] Volumen/posición del sonido cambia con desplazamiento; no clipping
- [ ] Al completar un puzzle cambia estado persistible y escena audible
- [ ] Jugable en teléfono de 360px, teclado de escritorio y modo sin auriculares
- [ ] Audio sólo por gesto y alternativa con texto para cada pista indispensable
- [ ] Salir/reentrar no duplica sonidos ni handlers

**Recursos/licencias**
- Sonidos originales generados o bibliotecas con licencias verificadas
- Relato y arte original; no usar sprites genéricos ni audios de juegos comerciales
- Pistas de audio con traducción a información textual

## Contrato de continuidad
- `.` autoriza implementación y publicación de tres widgets tras gates reales.
- No crear workers, cuentas, servidores ni tecnologías pagas innecesarias.
- El atlas ya registrado no cambia de identidad durante Fase 2.
- Ver `plan.json` para estado, paths y criterios legibles por máquina.
- Clasificar resultados CANDIDATE / TESTED / SERVED por evidencia separada.
