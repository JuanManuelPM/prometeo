# Phone Bridge v3 · candidato verificado

**Estado:** CANDIDATO en rama. No es Current, Human Accepted ni Served. Este PR NO actualiza el Tank, no toca tokens y no activa Work.

## Qué arregla

V1 puede publicar fuentes ZIP/HTML como `source.part001.b64` + `source-parts.json`, pero la instrucción de Work decía abrir directamente `source.zip`. El nuevo mensaje explica cómo reconstruir bytes originales y comprobar cada SHA-256. El envío de retorno V1 sólo soportaba realmente un archivo pequeño a través de GitHub Contents API. V3 admite respuestas **multipart** hasta 20 MB y cada parte hasta 490 KB, con SHA-256 individual y total. Nunca ejecuta ni acepta una entrega automáticamente.

El endpoint de status sigue siendo `GET /api/bridge/status` y conserva `service: prometeo.github-bridge/v1` por compatibilidad con los scripts del Tank. Ahora suma `bridge_revision: v3`, `auth_action` y un estado de error resumido en vez de reflejar stderr de GitHub CLI.

## Archivos y pruebas

- `github-bridge.mjs.gz.b64` es el módulo de fuente recuperable (gzip + base64).
- `test_bridge.mjs.gz.b64` es la prueba de integración reproducible (misma codificación).
- `manifest.json` tiene los SHA-256 **del código descomprimido**.
- CI: `.github/workflows/phone-bridge-v3.yml` verifica digest, sintaxis y los casos extremo a extremo. No consume credenciales reales.

Para leer el código (sin ejecutar):

```sh
python3 - <<'PY'
import base64,gzip,pathlib
p=pathlib.Path('phone-bridge/v3/github-bridge.mjs.gz.b64')
print(gzip.decompress(base64.b64decode(p.read_text().strip())).decode())
PY
```

Para probar en un checkout limpio:

```sh
python3 - <<'PY'
import base64,gzip,hashlib,json,pathlib
p=pathlib.Path('phone-bridge/v3')
m=json.loads((p/'manifest.json').read_text())
for f,key in [('github-bridge.mjs','module'),('test_bridge.mjs','test')]:
 b=gzip.decompress(base64.b64decode((p/(f+'.gz.b64')).read_text().strip()))
 assert hashlib.sha256(b).hexdigest()==m['sha256_decompressed'][key]
 (p/f).write_bytes(b)
PY
node --test phone-bridge/v3/test_bridge.mjs
```

## Work: formato de retorno

**Pequeño (hasta 700.000 bytes):**
- `work/jobs/JOB-<id>/return/entrega.zip` o `entrega.html`
- `return/manifest.json`: `{"schema":"prometeo.return/v1","job_id":"...","filename":"entrega.zip","sha256":"<sha hex>","bytes":123}`

**Grande (hasta 20 MB):**
- `return/entrega.part001.b64`, `...002.b64` y sucesivas, cada una con la representación base64 de bytes reales.
- `return/manifest.json` con los mismos campos y `parts: [{"name":"entrega.part001.b64","bytes":490000,"sha256":"<sha de bytes decodificados>"}]`.

El manifiesto se publica **al final**. El teléfono rechaza piezas ausentes, nombres que intenten escapar de la carpeta, SHA distintos, base64 inválido y tamaños superiores al límite. La copia pasa a la bandeja **como candidato**.

## Puertas antes de instalar en Android

1. CI verde con hashes y pruebas.
2. Revisar efectos regresivos con versión V1 que sí esté instalada; verificar archivo HTML original y acciones intactas.
3. Comprobar `gh` presente, sesión autorizada y permiso de lectura/escritura sobre repositorio PRIVADO en el dispositivo, sin tokens en el navegador.
4. Instalador local reversible que reemplace solamente `server/github-bridge.mjs` cuando el SHA anterior sea reconocido, guarde backup, y compruebe la API nueva después del reinicio.
5. Repetir pruebas en Android real. **No afirmar** acceso real a Work ni a sesiones locales desde ChatGPT externo.

## Fricción humana

No se pide ninguna intervención en esta etapa. La autorización GitHub y los permisos Android son acciones futuras separadas, cuando la UI de emparejamiento haya sido construida y probada.


## GitHub privado en Android · Autorización independiente de Work

El paquete `github-device-kit.tar.br.b64` contiene seis fuentes auditables:
`github-auth.mjs`, `github-device.py`, `github-auth-ui.js`, `github-auth-ui.css`, `install.py`, `test_device_auth.py`.

**La instalación no requiere que exista el endpoint `/api/bridge/status`.** Trabaja sobre el servidor de Prometeo Acciones ya instalado y añade `/api/github-auth/status` y `/api/github-auth/start`. Es reversible y preserva el HTML de Riel, proyectos, conversaciones, historial, servicio local y perfil del navegador. Para revisar código sin ejecutarlo: convertir base64 a bytes, comprobar `device_auth.archive_sha256` del manifiesto, descomprimir Brotli, comprobar `device_auth.tar_sha256`, extraer el TAR en directorio temporal e inspeccionar los seis archivos. CI automatiza esta verificación.

El usuario abre **Acciones → Conectar GitHub**: si falta `gh`, un proceso de Termux instala el paquete oficial; si está, `gh auth login --web --scopes repo` muestra su código en el panel. El helper envía el Enter que requiere la CLI, abre `https://github.com/login/device` **sólo por iniciativa explícita del usuario**, y verifica `gh api repos/JuanManuelPM/pruebas --jq .private` antes de anunciar **Conectado**. El token lo guarda GitHub CLI en su almacenamiento local; no pasa por HTML, reportes ni GitHub público. Una vez autorizado intenta reactivar el relay local preexistente sin ejecutar instrucciones remotas arbitrarias.

Se prueban en forma aislada dos topologías del instalador: con puente Work activo y sin puente Work (el antiguo 404). Prueba local del **reinicio real**: servidor viejo 404 → aplicación parcheada → nueva ruta 200, recibo `ACTIVE`. Prueba local de **reversión forzada**: fallo simulado al reiniciar → archivos anteriores restituidos → API antigua responde y ruta GitHub vuelve a 404, recibo `RESTORED`. Ninguna de estas pruebas equivale a OAuth real ni ejecución en Android.

**Límites:** la pantalla del Tank real no ha sido comprobada visualmente; el navegador de pruebas aislado bloqueó la navegación localhost/file. No se debe instalar el paquete por inferencia del CI ni anunciar dispositivo emparejado sin el estado real. Mantener PR como candidato hasta validación en el Tank.

## Una acción en la ventana Prometeo Acciones (cuando se apruebe el candidato)

`instalar_desde_acciones.py` es un instalador legible y pequeño, no un ZIP nuevo. Su SHA-256 fijado por CI es:

`b9a582fb273950d58c1c7da425bf689ad05eb03c7481b075d92170019b298df7`

Descargarlo usando **la URL raw del commit que lo publicó** (no `main` mutable), verificar ese SHA antes de ejecutarlo y lanzar Python. El propio instalador descarga el kit desde el commit fijo `95c718f9e2e486e16625cef6750b53d65547281d` y verifica SHA-256 comprimido + descomprimido. Si no coinciden, no cambia el teléfono. El instalador sólo ejecuta la intervención local previamente autorizada; no se publica ninguna clave.

Concluida la actualización, la persona abre Prometeo → Acciones → **Conectar GitHub**. La operación OAuth requiere que apruebe el código en `github.com/login/device`. El agent relay pendiente comienza automáticamente después de que `gh` confirme acceso al repositorio **privado**. La autorización no puede transferirse desde los conectores de este chat al dispositivo.

**QA adicional local:** reinicio real exitoso (HTTP 404 anterior → 200 nueva ruta, recibo `ACTIVE`), fallo simulado de arranque → reversión exacta del HTML/servidor, HTTP `/api/health` restaurado y recibo `RESTORED`. No comprobado todavía en dispositivo físico. No configurar un servidor público accesible desde Internet.
