# Prometeo · recuperación de arranque Android (candidato aislado)

**No instalado en el Tank. No reemplaza el escritorio ni el servidor.**

## Contrato
Esta mejora conserva la app y sus proyectos. Sólo crea, cuando la persona apruebe instalarla, un script en `~/.termux/boot/70-prometeo-recovery`. El script invoca `~/.local/share/prometeo/app/launcher.sh iniciar` existente. Ese launcher valida salud y PID y evita servidores duplicados. No pide credenciales ni altera GitHub.

## Por qué
El acceso `http://127.0.0.1:19471/` es estable únicamente mientras el servidor está vivo. Un acceso directo de Chrome **no puede revivir procesos de Termux** a través de ese enlace. Android puede cerrar el servidor si suspende Termux; de hecho se observó una página `ERR_CONNECTION_REFUSED`.

## Dependencia humana real
El complemento **Termux:Boot** debe instalarse desde una fuente compatible con Termux y abrirse al menos una vez. El script de arranque por sí solo no habilita ese complemento. Android podría requerir permitir actividad de Termux en segundo plano o excluirlo de optimizaciones agresivas de batería. Nada de esto se finge desde ChatGPT.

La recuperación automática tras reiniciar Android se comprobará **en el Tank real**, sólo después de confirmar instalación y permisos. No hay promesa de supervivencia garantizada ante cierres forzados, restricciones de batería o desinstalación de Termux.

## Verificaciones
`python -m unittest discover -s phone-bridge/v4 -p 'test_*.py' -v` cubre:
- instalación reversible y sin sobrescritura;
- segunda instalación sin duplicaciones;
- ejecución de launcher con `iniciar`, sin lanzar navegador;
- rechazo de ruta ocupada, enlaces simbólicos, launcher ausente, entorno que no sea Termux;
- reversión mediante `python boot-recovery.py --undo`: sólo borra el archivo propio si sus bytes coinciden; no elimina scripts de usuario;
- recibo honesto: sin intervención en proyectos ni prueba de reinicio de Android.

## Estado de autoridad
`candidate → CI tested → Android QA → accepted → served`. Ésta es una contribución aditiva en rama separada; no modifica `Current`, `Catalog`, `Lineage`, ni `Human Accepted`. La constitución y el `AGENTS.md` siguen mandando.

## Alternativa complementaria
La app instalada en la pantalla principal con Chrome puede abrir `127.0.0.1:19471` cuando el servicio corre. Para reanimar el servidor **después de un cierre forzado de Android**, puede requerirse abrir Termux o usar un atajo de Termux:Widget, pero ninguna página web pública puede saltarse los permisos Android por sí sola.

## Firma compatible de complementos Android

La documentación oficial de Termux:Boot exige que el complemento esté **firmado con la misma clave** que Termux principal. No instalar una APK cualquiera ni mezclar distribuciones F-Droid y GitHub sin comprobar el origen. Fuente: https://github.com/termux/termux-boot/blob/master/README.md. Abrir Termux:Boot una vez luego de instalarlo para activar el receptor de arranque. La política de batería y las restricciones Android siguen siendo un límite físico.

## Instalación reproducible desde Acciones (no ejecutada en Tank)

El código de `boot-recovery.py` en el commit `de3ed40136527bbbf89b3fa0069fc8d3f2c3b8fc` tiene SHA-256 `f7fafdf0ea49c290f41b041f116262b6eb93d5bad6eb7314e950112529610045`. El paquete debe descargarse desde esa revisión inmutable por HTTPS, validarse antes de ejecutarse y llamarse explícitamente mediante `terminal.run` de Prometeo con aprobación local.

**La instalación del hook no implica que Termux:Boot esté instalado ni activado.** Para revertir posteriormente: `python ~/.local/share/prometeo/updates/android-boot-recovery.py --undo`. La reversión se niega a borrar bytes que no reconozca.

La única excepción de firma es el complemento Android, que debe provenir de una fuente compatible con el Termux existente. No se instala ni se habilita por inferencia.
