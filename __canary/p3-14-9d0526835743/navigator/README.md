# Prometeo · reconstrucción escalable

Este paquete conserva la física de `PROMETEO_V50_VERTICAL_X_LOCK_RIGHTMOST_SEAL.html` y cambia únicamente la propiedad de los datos y de las páginas. Es un candidato; no reemplaza el `HUMAN_ACCEPTED_BASELINE` del repositorio.

## Autoridades

- `navigator/index.html`: física espacial, transición a página terminal y Exact Back.
- `catalog/tree.json`: jerarquía semántica. Sólo contiene IDs de página.
- `catalog/pages.json`: registro de páginas, URLs, estado y procedencia.
- Cada página: código y recursos propios en su repositorio o en `pages/`.

El navegador no acopla contenido de José, Adriana, Study ni PageKit a su física. Sólo resuelve un ID estable y abre su URL; los HTML históricos sin publicación previa viven ahora bajo `pages/` para que también sean destinos reales.

## Ley de colapso

`resolveDestination(node)` se ejecuta tanto en el gesto como en la entrada por teclado:

- cero hijos: abre la página;
- un hijo: sigue descendiendo sin crear otra pantalla;
- dos o más hijos: muestra una carpeta porque existe una decisión real.

El colapso es recursivo y conserva todos los nodos semánticos en el breadcrumb, pero no los convierte en gestos.

## Cambios aislados

| Necesidad | Archivo que cambia |
|---|---|
| Reemplazar el HTML de José sin cambiar su URL | Sólo el repo/ruta de José |
| Cambiar la URL de José | Sólo `catalog/pages.json` |
| Mover José a otra categoría | Sólo `catalog/tree.json` |
| Añadir una página a una carpeta existente | `pages.json` + una referencia en `tree.json` |
| Corregir el gesto horizontal o vertical | Sólo `navigator/index.html` |
| Cambiar un componente compartido compatible | Sólo la versión compartida indicada por su `current.json` |

## Publicación propuesta

La ruta estable del navegador debe ser:

`https://juanmanuelpm.github.io/prometeo/navigator/`

Las páginas que ya tenían URL se conservan donde están. Los artefactos recuperados fueron publicados en rutas locales del mismo sitio. Los 31 destinos del catálogo son páginas vivas y se abren dentro del terminal fullscreen; el agarre lateral conserva Exact Back.

Las cuatro referencias históricas que no conservaban bytes recuperables —Sofi submarino, Página Materia de José, Student Visual Vault y Controles V9— se reconstruyeron como ejemplos explícitamente identificados. Visual Vault reutiliza los dos archivos reales de stickers como vistas internas y evita duplicar sus recursos.

## Verificación local

Desde la raíz de este paquete:

```bash
python3 -m http.server 8000
```

Abrir `http://localhost:8000/navigator/`.

Ejecutar los gates del catálogo:

```bash
node tests/catalog.test.mjs
```

## Estado de autoridad

- V50 adjunta: baseline local congelada, SHA-256 `85968e5ccdea0b56ac37ee77a3e1e0562c9e65c8218c11e6d2eb0b6e6605b187`.
- Este paquete: candidato de integración de catálogo y páginas.
- `shared/navigation/folder-stack/CURRENT.json` del repositorio: sigue declarando V23 como `HUMAN_ACCEPTED_BASELINE`.
- Ningún `Current` humano debe cambiar hasta una aceptación explícita.
