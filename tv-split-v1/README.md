# TV Split v1 — programación

La rama funciona como un canal de TV personal, separado de Prometeo.

## Superficies

- `tv/index.html`: salida de TV fullscreen. No tiene navegación ni controles persistentes.
- `control/index.html`: grilla de programación diaria.

## Tipos de tramo

- `clock`: reloj animado.
- `youtube`: un video exacto de YouTube.
- `page`: cualquier URL pública que permita iframe.
- `black`: pantalla negra.

## Backend

- `tv-schedule-v1`: CRUD de la programación, autenticado con los tokens de sala ya existentes.
- tabla `tv_program_blocks`: horarios persistentes por sala.
- la TV evalúa la grilla en `America/Argentina/Buenos_Aires`.
- los tramos no pueden superponerse.

No sustituye Prometeo ni depende del frontend principal.
