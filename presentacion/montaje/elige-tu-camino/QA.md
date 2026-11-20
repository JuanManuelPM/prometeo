# QA · SECUENCIA BRANCHING V1 · 20/11/2026

## Evidencia local

**4 PASS de 4** ejecutadas en `/usr/bin/chromium` usando Playwright, un MP4 H.264/AAC de 10 s con audio generado por ffmpeg, y un grafo de prueba que conserva la estructura editorial reduciendo tiempos para automatización.

1. `test_unlock_and_decisions_are_not_flat_menu`: portada → mapa con 3 rutas → a1 → a2 → 1/2 rutas → b1 → 2/2 rutas → síntesis desbloqueada. Verifica que tocar la superficie del video no lo pausa; no hay controles nativos.
2. `test_branch_three_subtopic_gate`: en 844×390 el camino c1 solo no completa la ruta; c2 sí la completa; navegación horizontal interactiva funcional.
3. `test_no_source_is_honest`: sin MP4 no finge haber visto ningún fragmento y muestra opción de archivo local.
4. `test_desktop_visual_overflow`: vista 1280×720 sin desbordamiento horizontal.

Screenshots locales: `qa-desktop-hub.png`, `qa-landscape-hub.png`, `qa-mobile-reward.png`.

## Limitaciones expresas

- REPRODUCCIÓN del MP4 de HealthyGamerGG en Android: **NOT_RUN**.
- AUDIO_BOUNDARY_QA de los cinco recortes: **NOT_RUN**.
- Precarga de vídeo remoto entre posiciones: **NO garantizada**; se usa un solo archivo y se buscan los tiempos por `currentTime`, con potencial espera por buffer.
- Archivo multimedia en GitHub: **NO**; nunca se guarda el URL firmado en `story.json` ni en HTML. Fuente original 19:30 aprox., enlace con expiración.
- Un MP4 final nuevo unificado: **NO**, este experimento prueba branching, que depende de navegación interactiva y por diseño no equivale a un único MP4 lineal.
- QA de persistencia de sesión: código implementado, prueba automatizada específica: **NOT_RUN**.

## Condiciones de promoción

Completar la experiencia real con los segundos fuente, audio y transiciones en el dispositivo objetivo; ajustar límites de frases si se oyen cortadas; no afirmar que los recortes son clínicamente exactos. Las versiones previas permanecen intactas.
