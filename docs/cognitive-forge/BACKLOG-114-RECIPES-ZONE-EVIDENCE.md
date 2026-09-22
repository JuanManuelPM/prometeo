# BACKLOG-114 · Zona de Recipes — evidencia

Estado reconciliado: **HECHO**.

## Necesidad

BACKLOG-114 pedía una zona visual separada para Recipes: combinaciones reusables de Cards, distintas de la biblioteca de Cards individuales.

## Evidencia backend verificada

`public.forge_recipes` existe y contiene 5 Recipes activas, cada una con identidad, nombre, descripción y secuencia `card_ids`:

- `learning.deep_topic`
- `research.synthesis`
- `software.feature`
- `web.new_interactive_page`
- `web.visual_reference`

## Implementación

Se actualizó `pages/forge-lab/index.html` para:

1. agregar una sección visual propia **Recipes** separada de **Biblioteca cognitiva**;
2. cargar Recipes activas directamente desde `forge_recipes`;
3. resolver los `card_ids` contra la biblioteca de Cards ya cargada;
4. mostrar cada Recipe con nombre, id, descripción, cantidad de pasos y flujo ordenado de Cards;
5. adaptar la zona a una sola columna en mobile.

Commit de implementación: `17d8a6826d2182989dadf6eecbbbb6b915cee22e`.

## Verificación

El artefacto publicado en `main` fue re-leído y contiene:

- sección `id="recipes"`;
- consulta REST a `forge_recipes`;
- función `renderRecipes()`;
- layout responsive específico para Recipes.

La comprobación del endpoint público de GitHub Pages no estuvo disponible desde el verificador web de esta sesión; no se declara ese check como evidencia.

## Criterio de cierre

La zona de Recipes ya existe como superficie separada y consume los objetos durables reales. BACKLOG-114 queda HECHO.
