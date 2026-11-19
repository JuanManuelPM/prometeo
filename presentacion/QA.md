# QA · Presentación audiovisual web · 2026-11-19

## Ejecución local

- Chromium headless disponible; Playwright y pytest locales.
- Test de navegación anterior/siguiente, único par de botones, segmentación 65–77 / 142–153 / 220–230 mediante API simulada: **PASS**.
- Finalización automática del clip por límite de tiempo y por evento `ENDED`: **PASS**.
- Navegación manual sobre escenas temporizadas: **PASS**.
- Transición cronometrada tras 8500 ms en la escena diagrama: **PASS**.
- Diseño sin scroll y geometría visible en 1280×720 y 390×844: **PASS**.
- HTML autónomo integrado (CSS/JS inlines) con simulación de la API YouTube: **PASS**.
- API de YouTube con conexión real, video remoto y audio en Android: **NOT_RUN** (entorno local no resuelve dominios externos).
- GitHub Pages público served-byte/audio: **NOT_RUN** hasta comprobación de hosting.

La simulación no representa reproducción efectiva del video de YouTube. `endSeconds` está basado en la referencia oficial del API YouTube IFrame.