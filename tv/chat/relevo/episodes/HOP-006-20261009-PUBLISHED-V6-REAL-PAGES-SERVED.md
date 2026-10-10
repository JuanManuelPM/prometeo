# HOP 006 · Prueba de demo real, integración y versión realmente servida

**Fecha del recibo:** 2026-10-10T01:54:55Z = 09/10/2026 22:54:55 Argentina. **Objetivo persistente:** los chats descartables recuperan trabajo real y la aplicación común lo muestra. El objetivo COMPLETO NO está resuelto por una UI read-only.

## Resultado material, no ficción de chats

- El humano autorizó explícitamente continuar y publicar lo que superara los controles, sin pedir mensajes de relevo.
- PR #79 fusionado a `gh-pages`: commit de integración `cc70ae0fa65b2ef9cdd4664b394cd57ae4ea6d85`, conservando HOP1–5 y los archivos `live/` ajenos. La URL existente sigue siendo `https://juanmanuelpm.github.io/prometeo/tv/chat/relevo/retomar/`; NO se creó otra pantalla ni shell.
- El HTML introdujo galería vertical de cinco proyectos, tres portadas editoriales originales bicolor, actividad desde dueños públicos, estados no inventados, horas argentinas, selección con Back/Forward, detalles técnicos expandibles y enlace seguro a propietarios. Candidatos y commits NO se presentan como productos publicados. La sección pública solo enseña datos públicos, nunca transcripciones privadas.

## Gate PRE: original V6 sobre DOM real, no laboratorio

- [Actions original V6 run 38014800223](https://github.com/JuanManuelPM/prometeo/actions/runs/38014800223) sobre HEAD candidato `24289fa5258a83de4add0ac6e7f3b2f6515194d8`, `completed/success`.
- El motor original `JuanManuelPM/Experimentos:gh-pages:demo-engine-v6/` se cargó de su origen dentro de Chromium sobre el checkout **HTTP local** real del `retomar/index.html`.
- 390 CSS px y 1440 CSS px: `V6_REAL_PAGE_PASS` cada uno, **38 eventos registrados, 0 quality issues** y `viewport_owner=FREE` al terminar. Selección de Facultad y regreso a Persistencia sobre controles reales, carrusel con scroll horizontal nativo adaptado, historia preservada. Prueba/recibos `tv/chat/relevo/tests/retomar-v6-original-real-dom-v1.cjs`.
- La prueba inicial RED detectó `overlay_out_of_stage`; quedó corregido el anclaje del cursor al origen del stage y se agregó una acción de revelación horizontal real, sin suprimir la auditoría.

## Gate PRE: navegador responsive, seguridad y recuperación entre chats

- [Actions 38014803599](https://github.com/JuanManuelPM/prometeo/actions/runs/38014803599) tres jobs verdes: suite previa PR #77, Chromium 360/390/430/844/1440, tres SVG servidos por HTTP, Back/Forward, GitHub 403/503, fallo de bytes, ausencia de overflow, hora Argentina.
- Desde la candidata se recuperó por HTTP el STATE real que Pages servía con HOP5; se vio `Relevo 5` y la continuidad real, sin inventar respuesta privada.

## Gate POST: GitHub Pages y bytes reales

- [Pages build/deploy 38014908156](https://github.com/JuanManuelPM/prometeo/actions/runs/38014908156) `completed/success` para commit de integración `cc70ae0fa65b2ef9cdd4664b394cd57ae4ea6d85`.
- Se **reejecutó independientemente** job Chromium público `114103080470` de [Actions 38014803599, attempt 2](https://github.com/JuanManuelPM/prometeo/actions/runs/38014803599): `success`. GET página/ GitHub Contents/ STATE público: **200/200/200**. SHA Git blob del HTML **servido** = SHA GitHub `gh-pages` = `71a6c35b865ac8517738f82d1680ba915411d054`. STATE observado HOP5 / cinco episodios, Chromium 390/1440 sin JS errors ni overflow, cinco tarjetas.
- **SOURCE, DEPLOY, SERVED y DOM verificados** para el HTML integrado. Las ilustraciones de proyecto no son prueba de publicación de cada artefacto.

## Límites y continuidad

- Aún NO hay compositor web autenticado / ACK real / respuestas privadas de ChatGPT en el feed, ni permisos universales para proyecto nuevo; no llamar a esto persistencia operativa completa. El feed usa resultados públicos de GitHub y conserva salto entre chats. No confundir con una sesión viva que se despierta sola.
- Las tres ilustraciones son diseño, no screenshots de productos verificados. Para próximos productos, verificar URL/versión/preview por proyecto y asociar request_id/response_id a autoridad real, sin texto privado en GitHub.
- Nunca detenerse tras PR o GREEN de CI: continuar gates hasta resultado material o bloqueo comprobado. Nunca omitir seguridad ni sobrescribir cambios de otro chat.
- Proximo relevo debe leer `gh-pages:tv/chat/AGENT_ENTRY_V1.md`, este episodio, `STATE_V1.json`, Issue #76 y producto/owner requerido, **no pedir al usuario copiar respuestas**.
