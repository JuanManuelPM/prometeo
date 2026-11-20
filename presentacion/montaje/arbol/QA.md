# QA · SECUENCIA Árbol V1 · 2026-11-20

## Aprobado localmente

- 6/6 pruebas en Chromium con medio sintético H.264/AAC de nueve segundos.
- Mapa con cinco tarjetas, dibujo SVG de bifurcación y desplazamiento vertical sin desbordamiento horizontal a 390×844, 844×390 y 1280×720.
- Selección directa de un fragmento hijo sin pasar primero por la opción principal; no existen límites de dos opciones.
- Al elegir un fragmento el video produce fotogramas realmente visibles (`requestVideoFrameCallback`) y el render final tiene píxeles de color, no una pantalla negra con sonido.
- Volver durante la reproducción devuelve el scroll y **no** marca el recorte como visto.
- Completar dos rutas desbloquea la síntesis y regresar conserva el árbol.
- Fuente solo de audio, video faltante: error recuperable, sin falsificar desbloqueo.
- Los segundos y la identidad de los cinco recortes originales siguen iguales.

## Pruebas aún faltantes

- Reproducción visual efectiva del MP4 temporal de HealthyGamerGG en el Android del usuario.
- Sincronía audible precisa de cada corte en el video original.
- Almacenamiento en búfer de segmentos MP4 remotos sobre conexiones móviles lentas.
- Compatibilidad con todos los proveedores de video fuera del MP4 nativo de prueba.

## Preservación

No se reemplaza `presentacion/montaje/elige-tu-camino/`, `presentacion/montaje/` ni `presentacion/`.
