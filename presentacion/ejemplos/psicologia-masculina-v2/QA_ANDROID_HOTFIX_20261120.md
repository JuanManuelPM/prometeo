# PROMETEO · SECUENCIA · Hotfix de Android, 20/11/2026

## Evidencia humana
La captura de un Android WebView mostraba una miniatura YouTube enorme y cortada, el botón rojo de Play, sin reproducción efectiva. **Se demostró la falla de autoplay en el dispositivo, no se comprobó de manera remota su solución.**

## Causa en el HTML publicado
1. El iframe se estiraba a toda la altura de la pantalla vertical, sin respetar 16:9.
2. El iframe siempre tenía `pointer-events:none`: cuando el navegador bloqueaba autoplay, el botón nativo YouTube no recibía el toque.
3. Los textos avanzaban automáticamente antes de que hubiera una interacción inicial; el primer vídeo podía solicitar autoplay sin gesto del usuario.
4. El watchdog adelantaba fragmentos sin verificar reproducción real y las dos instancias del iframe favorecían pérdidas de permiso de sonido.

## Hotfix implementado
- Video YouTube centrado, aspecto 16:9 letterbox, sin zoom en retrato ni paisaje.
- Portada inicial se mantiene hasta interacción; textos de transición siguen en 1000 ms.
- YouTube IFrame `onAutoplayBlocked`: permite interacción real con el iframe y no salta el fragmento bloqueado.
- Avanza solo tras PLAYING y llegada al límite/end; no simula que hubo reproducción.
- Mobile reutiliza el mismo reproductor que recibió el gesto; el segundo queda para cue/preparación, no promete buffering de video.
- `loadVideoById` con inicio y fin del segmento, reproducción al volver, swipe táctil y dos flechas.
- Mensaje de error y enlace de rescate solamente cuando falla el video.

## QA local real
Chromium + Playwright con dobles de YouTube IFrame API, viewport 390×844 Android y 844×390 Android:
- PASS portada no avanza sin gesto.
- PASS transición hasta el primer clip.
- PASS al bloquear reproducción no salta y el iframe tiene pointer-events:auto.
- PASS iframe de 390×219.375 px centrado en portrait; 693.33×390 en landscape.
- PASS PLAYING desactiva interacción sobre video y final del segmento avanza.
- PASS al revisitar el clip se solicita de nuevo startSeconds=892.
- PASS deslizamiento horizontal fuera del iframe.
- NOT_RUN reproducción real de YouTube en Android in-app browser con audio, origen de video, su sincronía textual y buffering real.

El recorte editorial todavía es una propuesta basada en transcripción por bloques del podcast, no palabras alineadas de YouTube. No marcar ART_APPROVED ni AUDIO_SYNC_VERIFIED.

## Rollback
Commit previo gh-pages: `f024a3b64ed6279487bd62fd40456b7f36ba1094`. El producto nativo `/presentacion/` no fue modificado.
