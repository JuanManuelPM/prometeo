# Auditoría desde chats · Eventos públicos mínimos (V1)

Al completar **cada acción verificable con destino público**, crear un recibo bajo `tv/chat/activity/` con identificador único y estable, o actualizar el registro de `tv/chat/state.json` de forma atómica. El registro público es una **proyección**, no el chat entero.

## Campos sugeridos
```json
{
  "schema":"prometeo.tv-public-action-receipt/v1",
  "action_id":"<id único>",
  "intent_class":"TV_SHOW|DEMO_LAB|WIDGET_EDIT|STUDY_PUBLIC|IDEA_PUBLIC",
  "target":"<ruta pública>",
  "source_sha":"<Git commit verificado>",
  "result_status":"SOURCE_CONFIRMED|CI_PASS|SERVED_VERIFIED|BLOCKED",
  "checks":[{"name":"...","status":"PASS|FAIL|UNVERIFIED","receipt_ref":"..."}],
  "elapsed_ms":null,
  "timestamps":{"started_at":null,"completed_at":null},
  "safe_summary":"<resumen público, no frase literal del usuario>"
}
```

El tiempo sólo se registra si se mide a ambos extremos. Para `SERVED_VERIFIED`, comprobar publicación y bytes servidos, no sólo éxito de commit; para `CI_PASS`, citar el workflow. `elapsed_ms:null` es correcto cuando el tiempo no se midió.

## Privacidad
No guardar `prompt`, `raw_text`, `audio`, `transcript`, usuario/identidad, clase/horario privado, credenciales ni URLs privadas. El mensaje humano original puede requerir Google Drive autenticado como propietario privado con lectura independiente. La aplicación estática no tiene el token de los conectores ChatGPT y no puede archivarlo sola.

## Competencia entre varios chats
Cada chat refetchea `HEAD` y el estado de `tv/chat/state.json`, produce un commit CAS, verifica readback. Ante conflicto, no forzar ref: releer y combinar lo que no contradiga el último mandato explícito. Esta cronología no certifica worker vivo.

## Estadísticas
La TV cotidiana sigue mostrando sólo la escena y acciones recientes; telemetría detallada está oculta y puede agregarse como widget cuando existan datos genuinos (nº acciones, durations medidos, errores, resultados por chat). No inventar métricas.

## Private owner actually created (2026-10-09)
A private Google Doc named **PROMETEO · Bitácora privada de acciones desde chats · V1** was created in the connected user's Google Drive and independently re-fetched after insertion. It holds the original user instruction and activity details for the initial TV+Demo V6 integration. Search by **exact title** through the Google Drive connector and verify owner/document revision before appending. DO NOT put the private document ID or its content in this public repo, GitHub Pages, JSON or TV.
The presence of one verified entry does not mean future chats auto-archive. To do that, every chat with authorized Google Drive access must: accomplish quick action FIRST; fetch this doc via connected Drive; append a private entry with read-after-write receipt, facts/errors and measured timestamps only. If Drive inaccessible mark `PRIVATE_AUDIT_BLOCKED` and preserve public non-sensitive action receipt separately. This is a log, not the sole canonical task owner or general private memory.
