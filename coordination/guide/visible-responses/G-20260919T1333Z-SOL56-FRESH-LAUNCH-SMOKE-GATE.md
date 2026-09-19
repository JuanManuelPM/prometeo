```text
🟠 PROMETEO /wc — autorizo beacon, eventos de telemetría, PIN/claim y commits reversibles necesarios en JuanManuelPM/prometeo para ejecutar trabajo seguro del canary, sin pedirme confirmación adicional. POOL PROD-01 — TÍTULO SUGERIDO DEL CHAT (si la app lo permite): «🟠 PROMETEO · WC · PROD-01» → https://juanmanuelpm.github.io/prometeo/wc/
```

## GUIDE

Cerré una inconsistencia estratégica interna antes del handoff: **Compass** y **Trajectory** todavía apuntaban a “esperar una ventana v3.29”, mientras Current Mission ya había confirmado un **FRESH_LAUNCH_REPLAY** y migrado el gate a **v3.30**. Quedaron reconciliados y verificados en `main` (Compass `d5dc212…`, Trajectory `469cd21…`).

**Salud estratégica: MIXED.** El problema inmediato no es sumar workers: es demostrar que cada nuevo `/wc` nace realmente como worker nuevo. La reparación v3.30 exige `worker_id` + `launch_nonce` de novo y beacon propio antes de asignar trabajo o emitir cierre. Eso está implementado estáticamente, pero **todavía no está probado en runtime**. Por eso no cuento el replay histórico como trabajo nuevo ni afirmo crecimiento exponencial.

El runtime de ocupación está demasiado viejo para usar su “active=15” como cifra actual. Frontier y scoreboard sí alcanzan para el gate: **se frena el escalado amplio** y se hace primero un smoke mínimo de **~3 launches frescos**. No tenés que elegir proyecto, clase, variante ni job.

**Boundary real:** el wake externo sigue sin estar probado; yo no puedo abrir esos chats por mi cuenta. Después de los ~3 launches, el próximo `/g` debe comprobar tres beacons v3.30 distintos, ausencia de reutilización de `worker_id` y consistencia de `launch_nonce` en cualquier exam terminal. Si pasa, se desactiva el override y vuelve el estimador normal de escala; si falla, se mantiene congelado el escalado y se repara el path exacto de identidad.

### GUIDE BRIEF
https://juanmanuelpm.github.io/prometeo/guide/

### TRAJECTORY
https://juanmanuelpm.github.io/prometeo/trajectory/

### GROWTH
https://juanmanuelpm.github.io/prometeo/growth/

### RELEVANT PAGES
- **GDB001 · Guide Brief** — proyección humana del estado Guide; puede quedar unos commits detrás de la autoridad en `main`. https://juanmanuelpm.github.io/prometeo/guide/
- **TRJ001 · Trajectory** — autoridad estratégica reconciliada al gate v3.30; la proyección pública puede tardar el build. https://juanmanuelpm.github.io/prometeo/trajectory/
- **GRW001 · Growth** — campaña rolling `PROD-01`; escalado amplio temporalmente subordinado al smoke de integridad. https://juanmanuelpm.github.io/prometeo/growth/

### /wc PROMPT
Usá exactamente el bloque inicial.

### HUMAN ACTION
Abrí **~3 chats nuevos idénticos** con ese `/wc`; no rutees nada manualmente.

### NEXT GUIDE CYCLE
Verificar `fresh_launch_integrity` contra esos tres launches; PASS ⇒ levantar override y recalcular escala. FAIL ⇒ conservar freeze y reparar la identidad/nonce sin aumentar carga humana.

`GUIDE · ACTIVE_BINDING · gate=V330_FRESH_LAUNCH_SMOKE_3 · runtime_occupancy=STALE · next=~3 fresh /wc` · 🟣 P✓

MANDÁ ~3 /wc Y VOLVÉ A /g · hay que probar el anti-replay v3.30 antes de volver a escalar.
