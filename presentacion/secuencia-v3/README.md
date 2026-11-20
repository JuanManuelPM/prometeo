# PROMETEO · SECUENCIA V3 · Corte semántico verificable

## Estado y objetivo
CANDIDATE. No promover al reproductor nativo V2 ni reemplazar ninguna página anterior.
Cambia **el proceso**, no el lenguaje visual aprobado: fondo tinta / papel / salvia, dos flechas, video de fuente original, tipografía editorial.

### Evidencia
- Fuente: https://www.youtube.com/watch?v=z9t147FrV4Y
- Investigación preliminar: https://podscripts.co/podcasts/modern-wisdom/576-dr-john-barry-does-psychology-have-a-negative-view-of-masculinity (pódcast temporizado, **no es prueba de sincronía con YouTube**).
- La receta publicada se construye SOLAMENTE con subtítulos temporizados del VIDEO DE YOUTUBE. No capítulos ni timestamps asumidos. Marcadores de inicio y final deben encontrarse con confianza >= 0.76.
- Tres afirmaciones seleccionadas: beta bias aplicado a terapia; encuesta sobre valores; extrapolar comportamientos extremos a todos.
- Resultado bajo /presentacion/secuencia-v3/ SOLO si la acción encontró seis marcadores y superó los tests.
- El campo \`audioBoundaryListened=false\` permanece hasta una revisión A/V real por navegador/persona. Los subtítulos son evidencia de palabras y tiempo, no garantía de sílabas.
- No publicar en GitHub Pages la transcripción íntegra: el artifact de CI de 14 días la conserva.

## QA
[ ] 6/6 marcadores en captions reales, con procedencia y hashes.
[ ] Revisar escuchando las seis fronteras (inicios/finales), sin cortar ideas.
[ ] Reproducción 3 clips consecutivos y autoavance al final.
[ ] Swipe horizontal rápido, sin conflicto con botón.
[ ] Volver a un clip = empezar desde su segundo inicial.
[ ] Slides de texto 1000 ms (no 8500).
[ ] Dos reproductores: cue del próximo, sin prometer buffer completo en YouTube.
[ ] Pruebas móviles en Android y sonido real.
[ ] 3/3 clips reproducibles en despliegue público.
