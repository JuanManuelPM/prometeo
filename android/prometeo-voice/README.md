# Prometeo Voz — Android V1

Prueba mínima nativa de Android para escuchar la voz estratégica de Prometeo.

## Qué hace

- Lee el último mensaje de `prometeo_strategic_console_v2`.
- Usa la función TTS ya existente `prometeo-strategy-audio-v1`.
- Reproduce el audio con AndroidX Media3.
- Mantiene la reproducción al cambiar de app o bloquear la pantalla.
- Expone Play/Pausa en los controles multimedia del sistema.
- Mantiene el CPU despierto durante playback mediante el wake mode de Media3.

Esta V1 no intenta escuchar nuevos mensajes automáticamente. Eso queda separado para la siguiente capa de notificación/push.
