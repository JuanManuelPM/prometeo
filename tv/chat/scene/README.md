# Escena pública desde chats · V1

Una escena simple para la tele, no reemplaza los widgets ni el Demo Engine. El chat nuevo puede actualizar `tv/chat/scene/scene.json` (título, subtítulo, hasta 8 bloques), y después fijar `tv/chat/state.json.focus.path="/prometeo/tv/chat/scene/"` y `display.mode="page"`.

**No trasladar un mensaje completo del chat ni un audio a GitHub**, incluso si se trata de facultad, sin comprobar que ese contenido se autorizó para PUBLICACIÓN. Solo material público o ideas que explícitamente se pidan mostrar en la tele. Si el material es privado, crear documento privado autenticado y presentar sólo un indicador neutro en televisión.

Usar `textContent` para evitar inyección de HTML. Sin iframe arbitrarios. `scene.json` se valida contra `prometeo.tv-public-scene/v1`; máximo 8 elementos, y cada elemento lleva `title` y `text`. Verificar HEAD y revisión previa por lectura independiente; no pisar cambios de otro chat.

Este módulo es un canvas de texto provisional; el usuario enviará fotografías de estilo. No diseñar una nueva página global antes de esas referencias.
