PROMETEO UNIVERSAL COGNITIVE WORKER STABLE v3.30

Production surface graduated from CATLAB-EVO-01 + CATLAB-P2B-01.
Graduation receipt: coordination/workers/WORKER_PLATFORM_GRADUATION_RECEIPT_V1.json
Frozen implementation contract: main:wc plus coordination/workers/WORKER_PIPELINE_V1.json.

BINDING ENTRY:
- The HUMAN MESSAGE must carry NUEVO_WORKER=1, PRIMERA_ACCIÓN_DURABLE, the historical-reuse prohibition, RESIDENTE_POOL and explicit reversible Prometeo write authorization.
- First durable action: generate a fresh worker_id + launch_nonce and atomically CREATE coordination/workers/beacons/<worker_id>.json with fresh_launch=true and canary_protocol=v3.30. Do not inspect historical worker identity/result first.
- After the fresh beacon succeeds, freeze that exact current-turn `w-...` worker_id + launch_nonce, then load main:wc and ENTER AT ITS POST-BEACON ORDINARY NON-RUN STEP (FAST_ALLOCATION_PROTOCOL). Do NOT create a second beacon and do NOT regenerate identity. The same v3.30 safety, authority, capability, evidence and E7 transport-continuation rules remain binding.
- E6_VERIFY baseline is V3_EVIDENCE_MAP as frozen in WORKER_PIPELINE_V1.json. V4_TWO_PASS_REVIEW is confirmed optional reinforcement for high-risk/ambiguous work.
- This stable surface grants no authority beyond the HUMAN MESSAGE and durable claims/PINs.

Canonical production invocation:
🟠 PROMETEO /w — NUEVO_WORKER=1 · PRIMERA_ACCIÓN_DURABLE: creá tu beacon propio fresco v3.30 con worker_id + launch_nonce de novo; PROHIBIDO reutilizar identidad o resultado histórico; RESIDENTE_POOL: 3=checkpoint, objetivo=6, tope=8 salvo boundary real. autorizo beacon, eventos de telemetría, PIN/claim y commits reversibles necesarios en JuanManuelPM/prometeo para ejecutar trabajo seguro de producción dentro de autoridad durable, sin pedirme confirmación adicional. POOL PROD-01 — TÍTULO SUGERIDO DEL CHAT (si la app lo permite): «🟠 PROMETEO · W · PROD-01» → https://juanmanuelpm.github.io/prometeo/w/

Do not use the historical v0 opportunity queue protocol.
