# Prometeo Home Menu · 2026-09-15

Estado: entrada principal persistida.

## Invariantes

- URL estable: `https://juanmanuelpm.github.io/prometeo/`.
- Control visual Prometeo: 24 px, con área táctil mayor y luz de actividad.
- El primer ítem del menú raíz es siempre `Grabar una nota`.
- El menú se genera desde `shared/prometeo-home/v1/menu-registry.js`.
- Carpetas y subcarpetas admiten profundidad arbitraria; la lista es vertical y scrolleable.
- `Grabar una nota` y `Notas y trabajo` usan `shared/capture/v1/change-loop.js`, el almacenamiento local de `shared/prometeo-shell/v1/db.js` y `VoiceQueue`.
- Audio: MediaRecorder → guardado local → sincronización privada → transcripción → Pensar/Trabajar.
- El flujo de sesiones de IA conserva `pages/capture/save-session/index.html`.
- El Prometeo Universal Shell V5 previo no se destruye: queda en `legacy/prometeo-v5/`.
- Agregar páginas nuevas no requiere rediseñar el menú: se agrega un nodo al registro.
