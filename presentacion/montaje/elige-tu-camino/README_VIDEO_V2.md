# SECUENCIA · Motor de video visible v2

Se corrigió la pantalla negra con audio mediante un motor **común**, no una excepción para un video concreto.

- **Datos editoriales:** `story.json`, único lugar para cambiar rutas, segundos, textos y desbloqueos.
- **Composición:** `index.template.html`, conserva el aspecto visual existente.
- **Motor de reproducción:** `scripts/presentacion/shared/video-frame-guard.js`, único código de verificación de video. Se incrusta automáticamente al compilar HTML con `build.py`, de forma que el reproductor publicado es autónomo y no requiere que GitHub Pages sirva otro archivo JS.
- **Validación:** `tests/test_sequence_media_gate.py`, prueba video real decodificado y píxeles visibles, dispositivo con audio sin video, overlay, rutas y desbloqueos. Genera captura `tests/qa-painted-frame-mobile.png` durante la ejecución.
- **Publicación:** `index.html` generado y verificado, se publica en la misma ruta de la historia. CI queda configurada para reconstruir y exigir igualdad entre fuentes y HTML generado antes de cualquier promoción.

## Contrato para otras IA

No modificar la lógica del reproductor para cada video ni copiar código propio del clip. Editar únicamente `story.json` y reconstruir. Si se descubre una falla de video, mejorar `video-frame-guard.js` y ejecutar **todos los tests de regresión** de los consumidores. Los cambios de diseño, temas y recorridos son independientes de la capa de video.

La fuente de HealthyGamerGG sigue siendo un MP4 temporal con URL firmada que llega en `#src=...`, no incluido en los archivos públicos ni garantizado después de su vencimiento. La prueba local usa video sintético H.264/AAC. Ningún crédito de transcripción usado.
