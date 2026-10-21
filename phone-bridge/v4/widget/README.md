# PROMETEO · Acceso de un toque desde Android

**Estado: candidato. Sin cambios ejecutados en el Tank.**

## Funcionamiento

Termux:Widget admite crear un ícono/atajo de inicio para un archivo ejecutable bajo `~/.shortcuts/`. El instalador crea exclusivamente `~/.shortcuts/PROMETEO`, de forma idempotente y con permisos `0700`.

El ícono delega la recuperación al **launcher original**, ya probado en el Tank:

```sh
bash "$HOME/.local/share/prometeo/app/launcher.sh" abrir
```

Ese launcher hace una comprobación de salud, inicia el servicio existente sólo cuando es necesario y abre Chrome. No crea otro servidor ni da acceso remoto al shell, no abre puertos nuevos, no comparte credenciales y no toca proyectos.

## Configuración humana, una sola vez

1. Instalar **Termux:Widget** desde la **misma fuente de firma** que el Termux actual (F-Droid con F-Droid, GitHub con GitHub); abrirlo.
2. Ejecutar una sola vez el instalador de este PR desde el Termux existente (o desde Acciones si el servidor ya corre), descargado desde un commit inmutable y SHA-256 comprobado.
3. Agregar a la pantalla principal el atajo **PROMETEO** desde Termux:Widget; según el launcher se puede mantener pulsada la app y añadir el atajo, o agregar el widget y seleccionar PROMETEO.
4. Probar el ícono **con servidor apagado y con servidor activo**, sin reiniciar el teléfono.

Después, basta tocar ese ícono; no hay que memorizar `127.0.0.1`, ni reiniciar, ni ejecutar `prometeo abrir` manualmente.

## Delimitación importante

- Termux:Boot mantiene el *inicio al arrancar Android*, pero no garantiza recuperación si Android mata el proceso horas después.
- Un ícono Chrome/PWA solo intenta cargar la URL; no puede ejecutar Termux cuando el servidor está apagado.
- Termux:Widget inicia el script local con acción explícita del usuario, y esta vía funciona aun si Prometeo no está levantado, **siempre que Android permita ejecutar Termux:Widget y Termux**.
- El atajo usa foreground (directorio `~/.shortcuts`) porque Android 10+ limita lanzar actividades desde background, y así hay menos riesgo de quedar sin abrir Chrome.
- Android puede restringir actividad en segundo plano; **no** se garantiza que quede activo 24/7. La propiedad esperada es recuperar al tocar el ícono.
- Este candidato pasa pruebas de archivos en CI pero no se ha ensayado aún en tu Android. Un éxito de CI no acredita ningún permiso Android.
- La reversión `python installer.py --undo` sólo elimina exactamente el archivo que instaló; si otra persona lo modifica, se niega a borrarlo.

## Fuente oficial Termux:Widget
- https://github.com/termux/termux-widget/blob/master/README.md
- https://f-droid.org/packages/com.termux.widget/

## QA y verdad
El test local comprueba que un toque delegado llama `abrir` al launcher real conocido, instalación repetible y retorno, conflicto de nombre, symlink, ausencia de launcher, rechazo fuera de Termux y reversión exacta. El test de fuente local pasó 7/7. CI se ejecuta sobre cada PR.
