# Prometeo Kindle Bridge

Bootstrap Android para instalar Prometeo en un Kindle jailbreakeado que ya tenga KOReader + SH_Integration.

## Human boundary

1. Kindle y teléfono en la misma Wi-Fi.
2. En KOReader: activar `Login without password` y `SSH server` para el primer bootstrap.
3. En Android: abrir Bridge y tocar `ENCONTRAR E INSTALAR`.

Bridge resuelve automáticamente: subred, IP, puerto 2222, identificación de Kindle/KOReader, transferencia, SHA-256, ejecución, verificación y provisión de una clave ECDSA local para futuras conexiones.

El instalador no modifica rootfs ni appreg.db. Crea `/mnt/us/documents/PROMETEO.sh` y `/mnt/us/documents/PROMETEO_APP/` y abre la UI publicada en `https://juanmanuelpm.github.io/prometeo/kindle/`.

## Distribution

`.github/workflows/kindle-bridge.yml` compila el APK y lo publica en la rama `gh-pages` como `kindle/install/PROMETEO_BRIDGE.apk`.
