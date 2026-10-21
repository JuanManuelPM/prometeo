# Phone Bridge v5 · entrega y sincronización segura

**Estado: CANDIDATO, no instalado, no sincroniza automáticamente.**

Reutiliza, no reemplaza, el Riel Dispatch de `app/server/dispatch/{core,server}.mjs` y el puente del PR #123. El servidor real conserva los cuatro proyectos y la autoridad de disco. Este módulo solo aporta funciones puras (no publica, no cambia archivos del usuario ni ejecuta comandos).

## Hechos del servidor de Prometeo 1.0
- `/api/health` informó `dispatch.github_configured=false` aunque GitHub CLI ya fue autorizado; son **dos autenticaciones distintas**. El Dispatch antiguo esperaba variables `RIEL_GITHUB_REPO` y `RIEL_GITHUB_TOKEN`; no pedir al humano pegar otro token ni publicar uno en HTML.
- GitHub Bridge usa su flujo privado. La decisión de convergencia debe ser adoptar el puente existente como transporte autorizado para Dispatch, no instalar un segundo scheduler ni almacenar contraseñas nuevas.
- El relay actual sólo admite diagnósticos por allowlist y ya completó **dos** solicitudes del Tank; no proporciona consola remota ni inicia Work automáticamente.

## Funciones de este candidato
1. `composeWorkPacket`: exige comprobación positiva de repo privado + permiso de escritura (objeto de prueba); produce manifiesto de handoff con SHA y referencia a la carpeta de retorno. No realiza llamadas a GitHub ni ChatGPT Work.
2. `prepareReturn` y `verifyReturn`: mismo formato de `prometeo.return/v1` del PR #123, entrega pequeña y multipart de máximo 20 MB, piezas de máximo 490 KB, SHA por parte y total, nombres sin escape de ruta. Sólo `CANDIDATE_ONLY`.
3. `snapshotProject`: inventario **local de hashes**, sin contenido de archivos; excluye dotfiles, credenciales, symlinks y dependencias. No envía bytes.
4. `compareSnapshots`: comparación de tres versiones (base, teléfono, PC), marca conflictos en vez de sobrescribir cambios divergentes.

## Pruebas
- Batería local ampliada `test_contract.mjs`: 8/8, con retorno de 1,5 MB, duplicados, corrupción, directorios ocultos y 3-way merge.
- Batería pública legible: `test_contract.mjs` en la rama PR, 5 tests; workflow recompone la fuente `contract.mjs.gz.b64` con hash SHA-256 fijado antes de ejecutarla. El hash de los bytes descomprimidos es `a3aa11ceb854cf588b27b6bbfa177f596127cdea2fda7e3f58e6b5d665fcb77e`.
- Las pruebas de CI son locales/simuladas y **no** demuestran dos dispositivos sincronizados ni un trabajo de Work ejecutado.

## No hacer en esta fase
- No subir a repositorios públicos contenidos de proyectos, secretos o chats.
- No activar un comando shell a partir de una solicitud remota.
- No declarar Work conectado por el mero hecho de poder usar GitHub o ChatGPT.
- No prometer sincronización hasta ensayar conflictos reales, fallos offline, versiones y recuperación.
- No sustituir `Current`, `Catalog`, `Lineage`, Universal Control ni Riel existente.

## Próximos gates
1. Extender el **puente ya instalado** para presentar los métodos v5 sin token adicional; solicitud de publicación sigue requiriendo revisión humana.
2. Probar GitHub privado con un proyecto descartable: staging de job → lectura → retorno verificado → candidato, sin instalarlo automáticamente.
3. Habilitar sincronización opt-in solo para archivos explícitos, con historial, `baseline_sha256` y resolución de conflictos.
4. Mostrar trabajos y resultados en la UI de Acciones sin JSON por defecto.

La arquitectura de un solo dueño del control plane se conserva. Si falta el EPOCH servido, el cambio no se promoverá fuera de la rama candidata.
