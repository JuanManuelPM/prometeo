# PLAN EJECUTABLE · D3.js · v1
Fecha: 2026-10-13 (Argentina)
Estado: PENDIENTE DE SEÑAL "."; NO son widgets desarrollados.
Fuentes: transcripciones aportadas de Adam Fortuna y Germán Álvarez; URL originales no presentes. No hay código original verificable.

## Contratos
Biblioteca d3. Ruta: laboratorios-js/widgets/d3/<slug>/v1/index.html; registro laboratorios-js/registry/d3.json. Preservar atlas-tecnico/v1.
Entrada y contenido local: JSON externo versionado junto al widget o embed seguro para sandbox; sin localStorage, sin secretos ni API paga.
Proceso: Kent Beck TDD + ejemplos Adzic + aceptación sistema Freeman/Pryce. Funciones de filtrado y proyección testeadas independientemente antes de UI. Browser desktop/móvil, teclado, Pointer Events y reducida animación.

## Secuencia común
1. Releer atlas data.json, contrato, constitución y HEAD; asegurar rutas vacías y conservar versiones.
2. Verificar licencias y descargar únicamente datos geográficos públicos permitidos o crear fixture explícito. Registrar procedencia/fecha.
3. Implementar modelo, validador, transformaciones puras y fixtures de pruebas.
4. Construir componentes y composición responsive, abrir navegador y probar interacciones reales; corregir.
5. Registrar cada experiencia solo cuando el HTML sirva, pase pruebas y URLs reales. Actualizar d3.json con CAS preservando atlas y entradas concurrentes.
6. Leer desde Pages las URLs y registro y confirmar iframe sandbox, teclado y móvil. Documentar SHA/hora y limitaciones honestamente.

## Tres experiencias
### 1. ATLAS · Territorios del pensamiento
Clase: Emblemática
Objetivo: Atlas académico de historia de la psicología con tres perspectivas conectadas: mapa geográfico de centros documentados, línea temporal y comparación conceptual.
Datos: Fixture académico con fuentes públicas explícitas, sin datos personales; autor, acontecimiento, fecha, ciudad, relación y enlace; ninguna conexión especulativa se presenta como hecho.
Mecánicas: Elegir época y autor, seleccionar centros, cambiar vista conservando contexto, abrir ficha y procedencia, buscar, volver y usar teclado.
Arquitectura: Modelo JSON tipado → validación → selectores → vistas D3 (geoPath, time scale, joins) → panel HTML accesible.
Interfaz: Atlas histórico sobrio, tipografía editorial, cartografía contextual sin decoración geométrica.
Pruebas de aceptación: La misma selección persiste al cambiar vistas; búsqueda resuelve autor; fechas se ordenan; mapa no pinta regiones sin coordenadas; 320px sin texto diminuto.
Extensión: Anotar cursos/lecturas y nuevas instituciones sin cambiar render.
Dependencias: D3.js versión fijada, vanilla JS/CSS, datos JSON con licencia; evitar dependencias de pago.

### 2. OBSERVATORIO · Mesa de investigación
Clase: Laboratorio
Objetivo: Laboratorio de investigación visual donde una pregunta sobre datos reales se explora con escalas, filtros y small multiples y se transforma en un relato verificable.
Datos: Fixture descargable explícito de eventos de lectura con duplicados intencionales; ningún dato presentado como Hardcover real.
Mecánicas: Manipular regla de limpieza, ventana temporal, métrica y escala; comparar bruto/depurado; inspeccionar anomalías; exportar evidencia y método.
Arquitectura: Dataset versionado → transformaciones puras → agregaciones → vistas D3 → panel de metodología y CSV/JSON.
Interfaz: Mesa editorial de análisis con gráficos grandes y anotaciones legibles.
Pruebas de aceptación: Regla ≥5 lecturas/semana cambia conteos previsibles; no confunde popularidad con tendencia; nulls no rompen escala; vista y tabla concuerdan.
Extensión: Cargar datasets abiertos validados localmente.
Dependencias: D3.js versión fijada, vanilla JS/CSS, datos JSON con licencia; evitar dependencias de pago.

### 3. ESTRATOS · Cartografía del tiempo
Clase: Variación radical
Objetivo: Transformar la técnica de rotación/proyección del globo en una historia de migraciones de ideas y publicaciones entre centros, navegable por capítulos temporales.
Datos: Eventos históricos públicos y enlaces verificables; desplazamiento como relación documentada, no efecto decorativo.
Mecánicas: Deslizar por décadas para revelar rutas, detenerse en episodios, comparar antes/después y alternar mapa/glosario.
Arquitectura: GeoJSON de puntos/centros → escala temporal → proyección D3 → rutas geográficas y anotaciones → narrador por scroll o controles.
Interfaz: Ensayo cartográfico en capas, mapas históricos y prosa breve.
Pruebas de aceptación: La línea temporal no inventa eventos intermedios; cambiar época actualiza ruta/ficha; control touch y teclado; rotación no bloquea scroll.
Extensión: Capítulos y regiones añadibles mediante archivos JSON.
Dependencias: D3.js versión fijada, vanilla JS/CSS, datos JSON con licencia; evitar dependencias de pago.

## Continuidad
Revisar atlas-tecnico/v1/data.json y esta planificación antes de desarrollar. Un mensaje "." autoriza comenzar y publicar cuando cada aplicación cumpla la aceptación, sin reinterpretar borradores como publicación. Si falla una validación, conservar avance sin anunciar served.
