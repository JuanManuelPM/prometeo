# MediaPipe · plan ejecutable v1
Fecha: 2026-10-13 (Argentina). Estado: PLANIFICADO, ningún widget final construido.

## Contrato compartido
- UI en HTML/CSS/JS dentro de iframe sandbox sin allow-same-origin y en apertura directa.
- Modalidad táctil/mouse COMPLETA, activa por defecto; cámara opcional, permiso explícito, getUserMedia solo tras clic y contexto seguro.
- Video local en memoria; nunca cargar fotogramas a servidores, analytics ni endpoints. Recursos WASM/modelos remotos se identifican separadamente de datos de cámara. Descarga inicial NO es offline garantizado.
- Adaptador InputAction: {source, pointer, state, x, y, confidence, timestamp, handId}; los motores visuales no acoplan entrada a cámara.
- Máquina gestual IDLE→HOVER→GRAB→DRAG→RELEASE con umbrales relativos al ancho de palma, histéresis, suavizado, tolerancia a pérdida y timeout.
- MediaPipe JS @mediapipe/tasks-vision HandLandmarker / PoseLandmarker según proyecto; modo VIDEO y timestamps estrictamente crecientes; un frame nuevo por inferencia; evaluar CPU/GPU y fallback.
- Medir FPS, latencia percibida, errores, memoria; ocultar diagnósticos en interfaz final. Testear Firefox/Chrome escritorio + Android táctil y permiso denegado en hardware real; sin resultado real, no publicar como verificado.
- Pruebas guiadas por Beck, Adzic, Freeman/Pryce: primero escenarios observables, unitarias para reducers y gestos, integración sin cámara, prueba real del producto.
- Persistencia: exportación JSON/SVG/PNG descargable, nunca localStorage del iframe. Licencias y créditos visibles.
- Publicar bajo widgets/mediapipe/<slug>/v1/index.html, preservar v1 e incrementar versiones. Actualizar SOLO registry/mediapipe.json después de servir bytes y verificar URLs. Sin edición de portada.

## 1. ESCULTOR · Materia viva (emblemático)
Objetivo: esculpir superficie orgánica con una o dos manos; alternativa pointer/touch completa.
Visual: taller de cerámica contemporánea; objeto de material arcilla con sombreado profundo, iluminación de estudio, sin overlays de detección. Three.js como motor de malla 3D complementario, no reemplaza MediaPipe.
Estados: elegir herramienta > señalar área > pinza/agarrar > deformar superficie mediante campo radial suave sobre vértices cercanos > soltar > persistir forma > deshacer/rehacer > exportar OBJ/JSON/PNG.
Mecánica: raycast puntero a malla, arrastre proyectado en plano tangente o vista, preservar topología, límite de desplazamiento y pesos decrecientes; 2 manos para rotación/escala solo si no hay deformación activa. Gestos nunca aplican operaciones destructivas sin señal clara. Mouse: clic/arrastre; táctil: arrastrar, gesto dos dedos para orbitar; herramientas visibles de rotación y zoom.
Pruebas: (1) con permiso denegado modelo sigue editable; (2) pinza estable altera zona seleccionada sin teletransportarse; (3) pérdida mano finaliza gesto sin deformar; (4) 10 deshacer/rehacer producen mismo resultado; (5) exportación y reimportación conservan malla; (6) rendimiento móvil aceptable tras 5 min.
Futuro: materiales adicionales, máscaras y colecciones, sin introducir dependencia cloud.

## 2. GESTUARIO · Laboratorio de precisión gestual
Objetivo: herramienta experimental para comprender, ajustar y guardar mapping de gestos.
Visual: banco de instrumentos editorial con escena central y panel de 3 herramientas reales, no dashboard.
Módulos: calibración de palma; medición pinza normalizada, distancia entre dedos y mano izquierda/derecha; suavizado configurable EMA/One Euro; umbrales independientes de entrada y salida; estado/HUD mínimo; timeline visual del último gesto; perfiles exportables JSON.
Ejercicio evaluable: sujetar y trasladar un objeto delicado a un destino en una escena ilustrada; precisión, saltos y fallas se registran de manera local. Comparación directa contra mouse/táctil con exactamente el mismo motor.
Casos: 20 pinzas deliberadas generan 20 y no 40 ciclos; mano perdida desbloquea; la calibración reduce falsos positivos; controles y export no requieren webcam.
Futuro: macros y soporte para controladores adicionales.

## 3. ECO · Teatro de sombras vivas (variación radical)
Técnica origen: contador de repeticiones a partir de ángulos de 3 landmarks del entrenador físico. Reinterpretación: composición escénica audiovisual por postura.
Escena ilustrada de bosque nocturno artesanal, plantas y criaturas con distintas capas. PoseLandmarker interpreta inclinación del torso, altura relativa de muñecas y apertura de brazos; estados corporales modifican viento, luces y posición de elementos, y una secuencia corporal narrativa habilita nueva estación. No hay datos de ejercicio ni cuenta de curls.
Alternativa completa: deslizador de postura, arrastre sobre elementos y botones para activar estados con teclado/táctil; ninguna escena depende de pose estimada.
Arquitectura: Pose adapters → finite-state director → scene renderer Canvas2D/WebGL → export frame PNG. Audio opcional sin autoplay; ninguna grabación.
Pruebas: escena interactúa sin cámara; brazos altos cambian estado solo con confianza adecuada; pérdida de pose no lanza cambios repentinos; todas las escenas equivalentes accesibles a mouse/táctil; captura exportable.
Futuro: secuencias coreografiadas accesibles y narrativas educativas.

## Orden de implementación cuando llegue "."
1. Leer este plan + atlas + registro y HEAD nuevos, contrastar cambios concurrentes y permisos.
2. Construir pruebas de input core/histéresis y arnés de modo manual.
3. Completar ESCULTOR y validación real; GESTUARIO aprovecha entrada; ECO añade pose y escena independiente.
4. Registrar pruebas, capturas reales, licencias, links y diferencias en cada v1; no afirmar hardware comprobado si no se probó.
5. Publicar cada aplicación verificada sin sobrescribir Atlas; actualizar manifest de manera conservadora; verificar Pages/iframe/móvil.


## Adenda v2 · Reproducción desde catálogo estructurado
Ruta pública de análisis: `laboratorios-js/widgets/mediapipe/atlas-tecnico/v2/knowledge.json`. Contiene 3 fuentes, 11 capítulos, 17 capacidades, 5 patrones originales, 13 referencias vinculadas y decisiones. La lectura futura debe empezar por ese JSON, luego por las fichas editoriales y este plan. No reconstruir transcripciones ajenas ni volver a investigar sin motivo.
Exigencia de publicación fase 2: navegación por teclado y móvil, cámara opcional por permiso, fixtures declarados como sintéticos, pruebas sobre hardware real y no presentar repositorio/PR como URL servida. Las tres experiencias se llaman ESCULTOR · Materia viva, GESTUARIO · Precisión y ECO · Teatro de sombras. Cada una con carpeta versionada separada y registro exclusivo de mediapipe.
