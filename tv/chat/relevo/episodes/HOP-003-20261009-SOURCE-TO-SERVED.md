# Prometeo · HOP 3 · Del recuerdo textual a la prueba material de proyectos

**Fecha de trabajo:** 2026-10-09, Argentina. **Estado:** CANDIDATO verificado por lectura/escritura de GitHub; NO pantalla SERVED_VERIFIED. **Misión:** persistencia entre chats descartables. **Antecesores:** HOP 1 (juicio epistemológico) y HOP 2 (antideriva, `last_hop=2`). No reenumerar ni borrar 24/26/45 ideas.

## Pregunta nueva y respuesta crítica

**¿Cuándo es real la persistencia de un proyecto si el chat anterior ya desapareció?**

Recitar objetivos o hallar un commit no alcanza: se requiere una cadena recuperable `owner → bytes/versión → historial/estado → publicación → comportamiento observable → siguiente decisión`. Cada flecha admite fallo independiente.

**Criterio A, rechazado:** la última fecha GitHub significa «versión lista». Falso para PR #75 y para cualquier commit que nunca haya sido integrado, desplegado o verificado.

**Criterio B, candidato implementado:** la pantalla común `tv/chat/relevo/retomar/index.html`, ya existente, recibe su catálogo `reentrada.json`; consulta GitHub API en vivo por ruta/branch del owner para recuperar tres commits recientes, fecha de autoría/commit y SHA del archivo; para el objeto público hace `fetch` a Pages y compara `SHA1("blob <len>\\0" + bytes)` contra el SHA blob de GitHub. Muestra el enlace a evidencia, fecha argentina y si coincide byte a byte. Si no puede consultar GitHub/Pages, conserva «NO VERIFICADO». Esta comparación acredita **contenido de un archivo** solamente; no acredita que el juego funcione, que alguien lo vio, ni que un chat haya recuperado memorias privadas.

**Objeción:** un archivo de referencia idéntico al servidor puede apuntar a artefactos dependientes rotos (módulos CSS/JS), una página puede ser servida con diferencias por el publicador, y GitHub API anónimo puede agotar cuotas o no estar accesible. Por eso UI reporta el alcance exacto y ofrece refresco manual, NO declara `SERVED_VERIFIED` ni `READY`.

## Ensayo material real de recuperación sin copiar chat anterior

Se leyeron `gh-pages:AGENT_ENTRY_V1.md`, `RETOMAR_V1.md`, `STATE_V1.json`, `reentrada.json`, HOP 2, dirección, contrato de entrega y las tres skills de main para web/entrega/one-turn. Se consultaron refs GitHub y PR #74/#75, y se recuperó estado directo de **cinco owners** desde sus rutas reales (no del resumen):

| Proyecto | Owner público en gh-pages | SHA blob recuperado | Último commit UTC |
| --- | --- | --- | --- |
| persistencia | `tv/chat/relevo/STATE_V1.json` | `7169097be440905eed5e60ec42703871e44f82b0` | 2026-10-09T17:16:46Z |
| facultad | `pages/psicologia-evolutiva/index.html` | `1ab5cdc5b782b5bc7a9b963e84b20538d296c5ad` | 2026-10-08T22:31:22Z |
| widgets | `ui-workspace-v1/current.json` | `a5b3219d0864309d67592e53113150fe226c52fd` | 2026-10-08T00:17:38Z |
| tv | `tv/chat/state.json` | `fc0accefba064dd9bcd16c6620c92b20e935fae7` | 2026-10-09T13:18:51Z |
| experiencias | `tv/chat/relevo/VIDEO_2_IDEAS_INDEX_V1.json` | `10246447c1ae8357d71194181724512c8076e240` | 2026-10-09T16:42:56Z |

Los timestamps UTC se exhiben `Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})`. La fecha de commit no es fecha de release.

`gh-pages` HEAD observado al comenzar `8175630cccb5cd3bfabf243908f7695270261611`; workflow Pages del HEAD `completed/success` (run 37965593960), anterior a este desarrollo. **No demostrar por ello la versión nueva.** `main` baseline `b13a1e497afd9959fa125ff0359ae6106957caf8`.

**PULSO:** PR #75 abierto/draft en branch candidata `feature/emblem-001-pulso-20261009`; `validation/RECEIPT_V1.json` acredita 8/8 motor Node y 21/21 navegador inline reportados, no HTTP ESM, no V6 real ni juego SERVED. En PR #75 se añadió `experiments/emblem-001-pulso/ENGINE_REUSE_LESSONS_V1.md` con lectura posterior, separando motor/adaptadores, reloj fijo, colisiones, input, eventos y 3D no fingido. Aprendizaje SECUNDARIO.

## Desarrollo material en la pantalla existente (sin sistema paralelo)

Branch aislada `feature/retomar-live-evidence-hop3-20261009`, base exacta gh-pages anterior. Owner `tv/chat/relevo/retomar/index.html`:
- Agrega panel «Fuentes, cambios y versiones» al detalle de la tarjeta seleccionada.
- Consulta las rutas/branches existentes en `reentrada.json`; cachea resultados de commits para no duplicar lecturas; muestra cambios recientes y sus links, SHA blob real, fechas relativas + Argentina.
- Consulta PR candidato desde `next_experiment.candidate.pull_request` (se eliminó un primer hardcode #75); consulta en vivo su estado abierto/draft/merge y **no infiere publicación**.
- Compara bytes descargados desde Pages con formato SHA1 Git blob de GitHub. Sólo si coinciden reporta `COINCIDE byte a byte`, nunca «demo verificada». Error de permisos/red o discrepancia produce `SIN VERIFICAR`/diferencia.
- Restringe `source_path` contra traversal y `source_branch` a `main`/`gh-pages`; datos de API con `textContent` en vez de `innerHTML`. Agrega botón de nueva consulta bajo gesto del usuario; no hace polling de alta frecuencia, ni escribe notas privadas, TV, Current, widgets, Supabase ni un scheduler.

**Pruebas ejecutadas:** sintaxis de script real leído desde GitHub mediante `new Function`; primera tanda V8 14/14 y segunda 15/15 con mocks de DOM/red y bytes/digest, sobre script recuperado de la rama GitHub: ruta segura/unsafe, PR de proyección, cambios, SHA igual/diferente, caching, refresh, 403, rotulación candidato y juego no servido. Las pruebas usan **respuestas simuladas**: NO son navegador DOM real ni API HTTP exitosa desde la página pública. Los cinco owners reales y PR #75 sí fueron leídos por GitHub conectado, de forma separada.

**Bloqueos:** el navegador web disponible no pudo abrir Pages ni API con `web.run`, y el contenedor no resuelve DNS externo. No se ha ejecutado Demo V6 sobre el DOM real; no se ha comparado el SHA de la UI candidata con un archivo Pages servido; no se ha probado una sesión nueva autónoma con sólo pantalla; no se ha probado autenticación/almacenamiento privado. Cumpliendo proof-first, dejar PR **DRAFT**, NO hacer merge ni alterar UI servida con este cambio hasta resolver gates. El HOP como investigación y prueba de GitHub **sí** puede quedar en owners públicos vía SHA/CAS.

## Falsadores

1. Si la pantalla muestra `SERVED_VERIFIED` ante commit/PR/CI sin coincidencia de bytes, refutada.
2. Si presenta un blob Pages coincidente como «PULSO jugable» sin HTTP ESM/V6/interacción, refutada.
3. Si se agota GitHub API y la pantalla oculta el error o finge estado nuevo, refutada.
4. Si un nuevo chat no logra recuperar cinco proyectos/owner, HOP anterior, PR75 y decisión sin que el humano los copie, continuidad todavía insuficiente.
5. Si al regresar de jugar se reemplaza la misión global por PULSO, regresión HOP2.
6. Si resolver el indicador exige almacenar claves privadas en Pages o crear CURRENT alternativo, arquitectura rechazada.

## Siguiente salto intelectual

**HOP 4:** desde chat frío, demostrar con navegador real que la pantalla recupera PRs y cinco owners, auditar como humano la diferencia entre *fuente, deployment y uso*, resolver V6 real + served smoke antes de integrar, y estudiar el experimento adversarial de lenguaje natural pendiente de HOP2 sin convertir la clasificación en prioridad por recencia. Guardar evidencia con IDs, timestamps, SHA, fallos, CAS/readback. El criterio no es `last_hop=4` sino una cadena material que cualquier chat sucesor puede reproducir.

**Decisión conservada:** misión principal persistencia; ejecución del juego como experimento auxiliar; no se crean sistemas paralelos ni se promueve un candidato por escritura.

**PR de pantalla:** https://github.com/JuanManuelPM/prometeo/pull/77, OPEN/DRAFT. Base: gh-pages; no merge ni validación de contenido servido. GitHub Pages actualizado concurrentemente en un archivo independiente RETOMAR_V1.md; no sobrescribirlo.

## Adenda · reconciliación concurrente verificada

Mientras se desarrollaba la pantalla, `gh-pages` avanzó por una modificación independiente de `tv/chat/relevo/RETOMAR_V1.md` (HEAD intermedio `1a862fe405becde932e3bdb5d8923059f3d42927`). Después de guardar HOP3, el HEAD público pasó a `bc1bd660c4b5eb3a23e5bf130da9aa0fa378358e`. El PR #77 se mostró temporalmente `mergeable=false` por base divergente. Se corrigió sin pisar el trabajo concurrente: `create_tree` heredó **todos los archivos** del árbol público vigente y sustituyó únicamente `tv/chat/relevo/retomar/index.html` por su blob probado `ad2116f8eabc8f20f6731e7d00362230aca072f7`; `create_commit` parent `bc1bd660...`; `update_ref(force=true,expected_sha=15ca1d337dd74f18d3e56938366e875458a2941a)` pasó con lease. PR #77 nuevo HEAD `149774820b2bc01a7f280ff7ca28e0282908d326`. Compare frescos: `ahead=1, behind=0`, **único archivo cambiado index.html**, PR open/draft/mergeable=true. No merge. La ejecución Pages para el HEAD público previo `bc1bd660...` informó success; NO equivale a prueba visual de la UI candidata.

**Lección:** el propio relevo entre chats debe tolerar versiones concurrentes: estado de cada owner se refresca antes de escribir, el diff es explícito, y los conflictos se resuelven sin reimponer una rama vieja. El nuevo PR no lleva el viejo episodio ni revierte `RETOMAR_V1.md`, `STATE_V1.json` o `reentrada.json`.
