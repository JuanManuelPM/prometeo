# Prometeo · HOP 008 · Recuperación autónoma y resultados por proyecto
Fecha UTC de inicio comprobada: 2026-10-10T12:42:36Z (creación PR #83). Registro: 2026-10-10.

## Prueba auténtica entre conversaciones independientes, alcance exacto
Este chat **nuevo** recibió la orden humana amplia y recuperó desde GitHub conectado `gh-pages:tv/chat/AGENT_ENTRY_V1.md`, `STATE_V1.json` con `last_hop=7` y las decisiones/artefactos del PR #82, además del Issue #76, PR #77 (ahora merged), #79, #80, #81 y #82. No se transportaron manualmente respuestas de los chats anteriores. Se comprobó la lectura del blob de STATE `56b4b779abc84f34aec4e4fb65798d356ad9956a`, con HOP7 y evidencia de Pages HOP6/7. Se produjo trabajo nuevo en el PR #83, rama aislada; el siguiente chat debe volver a leer HEAD y no basarse en este snapshot.

Esto demuestra **recuperación de contexto público guardado entre chats y acción nueva**, NO transmisión automática de mensajes privados, dos chats simultáneos autónomos, ingreso web autenticado, ni que un chat ejecute después de cerrar.

## Producto candidato nuevo (fuente, no todavía publicación)
- PR #83: https://github.com/JuanManuelPM/prometeo/pull/83
- Owner de UI sin tercera pantalla: `tv/chat/relevo/retomar/index.html`. Se corrigió que el catálogo `reentrada.json` sólo se leyera al inicio. Ahora relee la misma proyección al recuperar foco o cada 60 segundos, preserva selección/historial y descarta catálogos duplicados o inválidos sin borrar la vista.
- Se agregó soporte a `public_receipts` **en la proyección existente**, identificados por proyecto, fuente GitHub y estado de entrega. La UI distingue CANDIDATE/TESTED/PUBLISHED/SERVED_VERIFIED y no toma el commit de una ruta como release.
- Se actualizó `AGENT_ENTRY_V1.md` en la rama candidata para que otros ejecutores aporten recibos públicos sanitizados, sin copiar audios, conversaciones ni credenciales.
- Nuevos ensayos en Chromium sobre el HTML real con catálogo futuro SINTÉTICO y recepción de recibos: modificación sin recarga, conservar tarjetas anteriores, Back, rechazar registros corruptos. La simulación **no cuenta como chat nuevo real**.
- Se amplió el CI existente para exigir Demo Engine V6 original sobre DOM real; no es un laboratorio sintético.

## Evidencia y fallos honestos
- Primer CI del PR #83: https://github.com/JuanManuelPM/prometeo/actions/runs/38052956883 · falló la regresión visual por esperar Facultad cuando el ensayo había seleccionado Persistencia; candidato HTTP y Pages baseline pasaron. Se corrigió el escenario para contrastar la selección real.
- Otro CI: https://github.com/JuanManuelPM/prometeo/actions/runs/38053225146 · candidat HTTP+V6 y Pages baseline pasaron, pero seguía el falso supuesto en el test de selección. Se corrigió para esperar Persistencia tras el acceso a su historial.
- Suite posterior a `6f45255b...`: estado y resultado **pendientes de comprobación fresca** al crear este episodio. Ver https://github.com/JuanManuelPM/prometeo/pull/83/checks.
- No se ejecutó navegador físico Android, sólo Chromium emulado en GitHub Actions. El HTTP externo desde este chat estaba bloqueado en entorno local, por lo que la prueba pública fiable debe venir de Actions post-merge.
- G5 sigue sin resolver: el composer V11 diferencia `QUEUED`, `LOCAL_DURABLE` y `BOUNDARY_AUTH_REQUIRED`. La página pública de lectura no puede prometer ingesta de voz o mensajes privados sin autenticación.

## Siguiente gate material
Cerrar CI último HEAD PR #83 (incluido V6 y móvil), reconciliar base `gh-pages` concurrente, revisión independiente, fusionar sólo si no hay fallos y autorización efectiva, verificar GitHub Pages por URL, SHA de blob y Chromium. Si hay bloqueo, conservar PR como CANDIDATE y el error concreto. El siguiente chat debe probar una orden diferente y comprobar que su recibo de proyecto aparece en la **misma URL abierta**, sin reusar una fixture.
