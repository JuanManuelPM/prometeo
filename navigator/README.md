# Prometeo V54 · propuestas visuales integradas

V54 conserva la física exacta de V53 y reorganiza solamente el catálogo. Añade siete propuestas visuales conectadas a un Design Kernel, componentes táctiles y un whiteboard compartido.

## Autoridades

- `navigator/index.html`: cámara, vertical, horizontal, preload, terminal y Exact Back.
- `catalog/tree.json`: jerarquía semántica y orden visible.
- `catalog/pages.json`: enlaces, fechas, roles, linajes y autoridad.
- `shared/design-kernel/v1/`: tokens visuales de las propuestas.
- `shared/components/v1/`: controles táctiles físicos.
- `shared/widgets/whiteboard/v1/`: único pizarrón consumido por Clase y PageKit.
- `pages/proposals/`: contenido y composición de cada propuesta.

## Organización

Las propuestas aparecen primero dentro de Clases, Alumnos, Pizarra, Study, Controles, Feedback y Operación. Herramientas, Proyectos y Sistema reúnen productos o referencias diferentes y no reciben una fusión artificial.

Las carpetas con un único destino continúan colapsándose recursivamente. Cada `page_id` aparece una sola vez en el árbol.

## Fechas

El registro distingue `origin_date`, `published_date`, `last_modified_date`, `first_verified_date` y `date_confidence`. La fecha 2026-09-01 de incorporación al navegador no se presenta como origen de los HTML históricos.

## Controles V9

El archivo de controles creado el 2026-09-01 está clasificado como `RECONSTRUCTION_NOT_V9`. La propuesta 2026-09-02 conserva las reglas humanas recuperadas, pero no suplanta los bytes históricos favoritos, que siguen pendientes.

## Verificación

```bash
node tests/catalog.test.mjs
node tests/proposals.test.mjs
```

## Autoridad humana

- V50 adjunta permanece congelada con SHA-256 `85968e5ccdea0b56ac37ee77a3e1e0562c9e65c8218c11e6d2eb0b6e6605b187`.
- V53 fue archivada byte a byte en `navigator/candidates/v53-complete-example-atlas-20260901/`.
- `shared/navigation/folder-stack/CURRENT.json` continúa apuntando a V23 Human Accepted.
- V54 es `CANDIDATE_NOT_HUMAN_ACCEPTED`.
