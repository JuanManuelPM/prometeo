# PROMETEO · actualización segura de una página

Este protocolo está escrito para una IA que no conoce el historial completo. La IA debe trabajar por `page_id`, cargar sólo el contexto necesario y fallar cerrado.

## Orden obligatorio

1. Resolver el `page_id` en `catalog/pages.json`.
2. Leer el `PAGE_CONTRACT.json` junto al HTML activo.
3. Verificar que el hash o la versión de entrada coincidan con el contrato.
4. Leer sólo las dependencias declaradas por el contrato.
5. Crear una ruta de versión nueva; nunca sobrescribir una aceptada.
6. Modificar el owner correcto: página, template, widget, componente, kernel o navegador.
7. Ejecutar `node tests/catalog.test.mjs` y `node tests/proposals.test.mjs`.
8. Ejecutar el perfil visual indicado por el contrato.
9. Publicar como `CANDIDATE`, conservando rollback.
10. Cambiar el puntero estable sólo después de aceptación humana explícita.

## Límites de propiedad

- Contenido de una página: cambia sólo esa página o su paquete de datos.
- Composición de una categoría: cambia su template versionado.
- Botón o control: cambia `shared/components`, no cien HTML.
- Color, tipografía, sombra o ritmo global: cambia una nueva versión de `shared/design-kernel`.
- Pizarrón: cambia `shared/widgets/whiteboard`, luego se prueban todos sus consumidores.
- Cámara, vertical, horizontal, preload, rightmost seal y Exact Back: pertenecen exclusivamente a `navigator/index.html`.

## Autoridad

`latest != current != accepted`. Una propuesta o reconstrucción nunca se promociona por su fecha. La frase humana de aceptación es la única autorización para reemplazar un puntero aceptado.

## Recibo mínimo

Registrar: `page_id`, versión anterior, versión candidata, hashes, fecha, archivos modificados, dependencias, pruebas, resultados, rollback y estado de autoridad.
