# Prometeo Home Menu · 2026-09-15

Estado: entrada principal persistida.

## Invariantes

- URL estable: `https://juanmanuelpm.github.io/prometeo/`.
- El root es un **owner shell**: las páginas Prometeo se abren debajo, dentro de `#pageHost`, y el control queda por encima.
- Abrir una página directamente por su URL no inyecta el owner shell: una página compartida sigue limpia, sin el botón privado de Prometeo.
- Nunca debe haber dos controles Prometeo superpuestos. El owner shell desactiva el antiguo `prometeo.shell.enabled.v1` dentro de esta navegación.
- Control visual Prometeo: 24 px, con área táctil mayor y luz de actividad.
- Física heredada de Corner Anchor v1: cerrado, el botón se arrastra libremente; a partir de 8 px el drag toma el puntero; al soltar hace snap a la esquina semántica más cercana en 210 ms, vibra y persiste la esquina.
- Menú y grabación se orientan automáticamente hacia adentro para `top-left`, `top-right`, `bottom-left` y `bottom-right`.
- Gestos de menú conservan resistencia tipo Selector V45 (`28 px`, unlock `14 px`): movimiento hacia adentro abre/ejecuta; hacia afuera vuelve/cierra; el eje vertical se invierte según la esquina para que recorrer opciones siempre sea cómodo desde el pulgar.
- El primer ítem del menú raíz es siempre `Grabar una nota`.
- El menú se genera desde `shared/prometeo-home/v1/menu-registry.js`; carpetas y subcarpetas admiten profundidad arbitraria y la lista es scrolleable.
- La implementación owner-shell actual vive en `shared/prometeo-home/v2/shell.js` y `shared/prometeo-home/v2/shell.css`.
- `Grabar una nota` ya no abre el dock visual viejo: usa una tarjeta translúcida superpuesta sobre la página actual.
- Grabación v2: luz roja viva + timer; tocar el centro pausa/reanuda; deslizar a la izquierda descarta; deslizar a la derecha guarda. El gesto sólo confirma al superar el umbral de commit.
- La UI nueva no reemplaza el pipeline: sigue usando `VoiceQueue`, IndexedDB, `shared/capture/v1/change-loop.js`, sincronización privada y Whisper.
- Cada audio conserva contexto de la página visible (`sourcePath`, `sourceHref`, `sourceTitle`) pero mantiene el `page_id` histórico `prometeo-universal-shell-v5` para no crear un silo nuevo de notas.
- Audio: MediaRecorder → guardado local → sincronización privada → transcripción → Pensar/Trabajar.
- El flujo de sesiones de IA conserva `pages/capture/save-session/index.html`.
- El Prometeo Universal Shell V5 previo no se destruye: queda en `legacy/prometeo-v5/`. Como ese bootloader bloquea frames anidados, Legado se abre directo fuera del owner shell.
- Agregar páginas nuevas no requiere rediseñar el menú: se agrega un nodo al registro.
