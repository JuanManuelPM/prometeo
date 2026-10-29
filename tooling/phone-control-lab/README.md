# Tank Mini 1 · Jarvis Capability Lab

Estado: **CANDIDATO**, no instalado en Android, ningún permiso concedido y ningún comando ejecutado remotamente.

## Qué ya hicimos
- `probe.py`: enumera presencia de herramientas Termux y consulta exclusivamente `pm path` para cuatro paquetes conocidos. No lee notificaciones, chats, SMS, contactos, ubicación, pantalla ni portapapeles.
- `scan_and_publish.py`: acción **local** que primero verifica SHA-256 del código de auditoría, confirma repositorio privado con permisos de escritura y publica **sólo el informe de estados** en `JuanManuelPM/pruebas/relay/tank-mini-1/capabilities/latest.json`. No ejecuta comandos arbitrarios remotos ni crea un servicio.
- `PROMPT_PLAYBOOK.md`: encargos completos de desarrollo, UI, proveedores y Android.
- `cloud-preview/index.html`: simulador funcional de composición de prompts, sin llamadas de red ni persistencia del texto introducido. Vercel preview del proyecto existente `prometeo-live-hub`, **no producción**.
- CI: [Phone Capability Lab](https://github.com/JuanManuelPM/prometeo/actions/runs/39675624229): **12 tests Python y 2 tests Node aprobados**. La auditoría sobre Android no fue ejecutada.
- Roadmap privado: `JuanManuelPM/pruebas/work/JARVIS-MASTER-PLAN-20261021.md`.

## Modelo de verdad
El binario `termux-media-player` presente sólo significa que existe una herramienta; no demuestra poder pausar Spotify ni YouTube Music. Una app listada no significa que se puedan leer datos privados. `UNVERIFIED` incluye el caso de visibilidad limitada de paquetes en Android. Accesibilidad, media session, listener de notificaciones, ADB y Shizuku requieren autorizaciones independientes.

## Una acción humana de alto valor (cuando la persona quiera)
Abrir Prometeo → Acciones y aprobar una **única ejecución local de auditoría**, descargando `scan_and_publish.py` desde el commit inmutable `4033d333c50ce77de87cfbfcc0cb06c51c915d74` y verificando SHA-256:
`c99c6027907a93aae265c68a0afd80c29d5bd5c3311f5ea36776a963a371e773`.

Esa ejecución no reinicia el Tank ni cambia apps. Envía los resultados directamente a GitHub privado; el usuario no copia la salida. Si `gh` no tiene permiso, la subida falla con mensaje en vez de usar un repositorio público.

### Posteriormente
Con evidencia de herramientas disponibles, preparar un experimento físico reversible que pruebe **control de una app real**. Para multimedia de terceros, buscar acceso controlado a MediaSession desde una app Android instalada con consentimiento; Termux:API por sí sola no acredita ese alcance. Para notificaciones específicas, usar NotificationListener opt-in. No instalar cinco complementos sin conocer su utilidad real.

## Repositorio / arquitectura
Preserva `AGENTS.md`, `Global Constitution`, Riel, P4, `personal-app-hub-v1` y los puentes #123/#126. Este código no agrega un scheduler ni un backend paralelo.
