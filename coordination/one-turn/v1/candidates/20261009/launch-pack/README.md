# PROMETEO · ONE TURN · paquete congelado de prompts candidatos

**LEER EN ORDEN:** `00_DIRECTIVA_INDEXADA.json` → `01_CRITICA_ULTIMO_WORKER.md` → `02_PLAN_COMPARTIDO.md` → `03_MANIFEST.json` → `03_PROMPT_UNIVERSAL_WORKER.txt` → la TASK específica `packets/Txx.txt` que asigne **el Work Graph existente** → `FREEZE.json`.

**Importante:** los 12 prompts NO se copian y envían a 12 workers especializados. Son **cápsulas de trabajo independientes** con dependencias y aceptación. El worker permanece fungible y recibe sólo la cápsula asignada por el allocator existente. El plan establece el orden de desarrollo y dice qué falta probar.

**Publicación:** Intenté registrar el primer índice en GitHub, pero la plataforma bloqueó explícitamente esa escritura. No lo eludí. Este ZIP es la entrega local comprobable; no está publicado en main/gh-pages ni armado en el Work Graph. Las skills originales están guardadas en `main`, pero su auto-discovery en ChatGPT no está probado.

**Inicio seguro para otro agente:** leer el manifiesto/plan, revisar autoridad real y heads, y convertir las candidatas en Work Packets mediante los procedimientos canónicos; nunca asumir queue, permission, creds, STOP o `queued=true`. No publicar contenido privado a un repo público.

**Meta crítica:** persistir el input y el RETURN en la página privada antes y después de la tarea, con ACK, sin segundo mensaje humano. FINITE CHAT + DURABLE WORK, no residencia infinita simulada.
