#!/bin/sh
# Name: PROMETEO · INSTALAR
# Author: Prometeo
# Icon: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPoAAAGHCAIAAAAWRdjBAAADH0lEQVR42u3cQQqEUAxEwenh3//K7d69EkzVAYTER3Bl2v5gh78VIHeQO8gd5A5yB7mD3EHuIHeQO8gduYPcQe4gd5A7yB3kDnIHuYPcQe7IHeQOcge5w1TniYcmsVluJvyN1HXHxwzIHeQOcge5g9xB7iB3kDvIHeSO3EHuIHeQO8gd5A5yB7mD3EHuIHfkDnIHuYPcQe4gd5A7yB3kDnIHuSN3kDvIHeQOcge5g9xB7iB3kDvIHbmD3EHuIHeQO0xyVk3b9vMzJpG16w5yR+4gd5A7yB3kDnIHuYPcQe4gd5A7cge5g9xB7iB3kDvIHeQOcge5g9yRO8gd5A5yB7mD3EHuIHeQO8gd5I7cQe4gd5A7yB3kDnIHuYPcQe4gd+QOcge5g9xB7iB3kDvIHeQOcge5g9yRO8gd5A5yB7mD3EHuIHeQO8gd5I7cQe4gd5A7yB3kDnIHuYPcQe4gd7Y6q6ZN4pW77iB3kDvIHeQOcge5g9xB7iB3kDtytwLkDnIHuYPcQe4gd5A7yB3kDnIHuSN3kDvIHeQOcge5g9xB7iB3kDvIHbmD3EHuIHeQO8gd5A5yB7mD3EHuyB3kDnIHuYPcYYazatq2XrnrDnIHuYPcQe4gd5A7yB3kDnIHuSN3K0DuIHeQO8gd5A5yB7mD3EHuIHeQO3IHuYPcQe4gd5A7yB3kDnIHuYPckTvIHeQOcge5g9xB7iB3kDvIHeSO3EHuIHeQO8gd5A5yB7mD3EHuIHfkDnIHuYPcQe4gd5A7yB3kDnIHuYPckTvIHeQOcge5g9xB7iB3kDvIHeSO3EHuIHeQO8gd5A5yB7mD3EHuIHfkDnIHuYPcQe4gd5A7yB3kDnIHuSN3kDvIHeQOcge5g9xB7iB3kDvIHbmD3EHuIHeQO8gd5A5yB7mD3EHuIHfkDnIHuYPcQe4gd5A7yB3kDnIHuSN3kDvIHeQOcge5g9xB7iB3kDvIHbmD3EHuIHeQO8gd3pW2toDrDnIHuYPcQe4gd5A7yB3kDnIHuSN3kDvIHeQOcge5g9xB7iB3kDvIHbmD3EHuIHcY6QLShRIPOpzXygAAAABJRU5ErkJggg==
# Version: 1.0.0
# Description: Instalador seguro de Prometeo Kindle

set -eu

DOCS="/mnt/us/documents"
APP="$DOCS/PROMETEO_APP"
LAUNCHER="$DOCS/PROMETEO.sh"
STAGE="$DOCS/.prometeo_stage.$$"
BACKUP="$DOCS/.prometeo_backup"
URL="https://juanmanuelpm.github.io/prometeo/kindle/"
VERSION="1.0.0"
BRIDGE="${PROMETEO_BRIDGE:-0}"

say() {
  printf '%s\n' "$*"
  if command -v eips >/dev/null 2>&1; then eips "$*" >/dev/null 2>&1 || true; fi
}

rollback() {
  rm -rf "$STAGE" >/dev/null 2>&1 || true
  if [ -d "$BACKUP/app" ] && [ ! -d "$APP" ]; then mv "$BACKUP/app" "$APP" || true; fi
  if [ -f "$BACKUP/PROMETEO.sh" ] && [ ! -f "$LAUNCHER" ]; then mv "$BACKUP/PROMETEO.sh" "$LAUNCHER" || true; fi
}
trap 'rollback' HUP INT TERM

[ -d "$DOCS" ] || { say "PROMETEO: documents no existe"; exit 20; }
[ -w "$DOCS" ] || { say "PROMETEO: documents no es escribible"; exit 21; }

rm -rf "$STAGE"
mkdir -p "$STAGE/app/logs" "$STAGE/app/data"
printf '%s\n' "$VERSION" > "$STAGE/app/VERSION"

cat > "$STAGE/app/config.conf" <<'PROM_CONFIG'
PROMETEO_WEB=https://juanmanuelpm.github.io/prometeo/kindle/
PROMETEO_VERSION=1.0.0
PROM_CONFIG

cat > "$STAGE/PROMETEO.sh" <<'PROM_LAUNCHER'
#!/bin/sh
# Name: PROMETEO
# Author: Prometeo
# Icon: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPoAAAGHCAIAAAAWRdjBAAADH0lEQVR42u3cQQqEUAxEwenh3//K7d69EkzVAYTER3Bl2v5gh78VIHeQO8gd5A5yB7mD3EHuIHeQO8gduYPcQe4gd5A7yB3kDnIHuYPcQe7IHeQOcge5w1TniYcmsVluJvyN1HXHxwzIHeQOcge5g9xB7iB3kDvIHeSO3EHuIHeQO8gd5A5yB7mD3EHuIHfkDnIHuYPcQe4gd5A7yB3kDnIHuSN3kDvIHeQOcge5g9xB7iB3kDvIHbmD3EHuIHeQO0xyVk3b9vMzJpG16w5yR+4gd5A7yB3kDnIHuYPcQe4gd5A7cge5g9xB7iB3kDvIHeQOcge5g9yRO8gd5A5yB7mD3EHuIHeQO8gd5I7cQe4gd5A7yB3kDnIHuYPcQe4gd+QOcge5g9xB7iB3kDvIHeQOcge5g9yRO8gd5A5yB7mD3EHuIHeQO8gd5I7cQe4gd5A7yB3kDnIHuYPcQe4gd7Y6q6ZN4pW77iB3kDvIHeQOcge5g9xB7iB3kDtytwLkDnIHuYPcQe4gd5A7yB3kDnIHuSN3kDvIHeQOcge5g9xB7iB3kDvIHbmD3EHuIHeQO8gd5A5yB7mD3EHuyB3kDnIHuYPcYYazatq2XrnrDnIHuYPcQe4gd5A7yB3kDnIHuSN3K0DuIHeQO8gd5A5yB7mD3EHuIHeQO3IHuYPcQe4gd5A7yB3kDnIHuYPckTvIHeQOcge5g9xB7iB3kDvIHeSO3EHuIHeQO8gd5A5yB7mD3EHuIHfkDnIHuYPcQe4gd5A7yB3kDnIHuYPckTvIHeQOcge5g9xB7iB3kDvIHeSO3EHuIHeQO8gd5A5yB7mD3EHuIHfkDnIHuYPcQe4gd5A7yB3kDnIHuSN3kDvIHeQOcge5g9xB7iB3kDvIHbmD3EHuIHeQO8gd5A5yB7mD3EHuIHfkDnIHuYPcQe4gd5A7yB3kDnIHuSN3kDvIHeQOcge5g9xB7iB3kDvIHbmD3EHuIHeQO8gd3pW2toDrDnIHuYPcQe4gd5A7yB3kDnIHuSN3kDvIHeQOcge5g9xB7iB3kDvIHbmD3EHuIHcY6QLShRIPOpzXygAAAABJRU5ErkJggg==
# Version: 1.0.0
# Description: Prometeo para Kindle

URL="https://juanmanuelpm.github.io/prometeo/kindle/"
LOG="/mnt/us/documents/PROMETEO_APP/logs/launch.log"
mkdir -p "/mnt/us/documents/PROMETEO_APP/logs" >/dev/null 2>&1 || true
printf '%s launch\n' "$(date '+%Y-%m-%dT%H:%M:%S%z' 2>/dev/null || date)" >> "$LOG" 2>/dev/null || true

if [ -x /usr/bin/browser ]; then
  exec /usr/bin/browser -j "$URL"
fi

if [ -x /usr/bin/chromium/bin/kindle_browser ]; then
  export XDG_CONFIG_HOME="/mnt/us/system/browser/"
  export LD_LIBRARY_PATH="/usr/bin/chromium/lib:/usr/bin/chromium/usr/lib:/usr/lib/"
  exec /usr/bin/chromium/bin/kindle_browser --no-zygote --no-sandbox --single-process --disable-gpu --in-process-gpu --disable-gpu-sandbox --disable-gpu-compositing --enable-low-end-device-mode --js-flags="jitless" "$URL"
fi

if command -v eips >/dev/null 2>&1; then
  eips "PROMETEO necesita el browser Chromium del Kindle (FW 5.16.4+)."
else
  echo "PROMETEO necesita el browser Chromium del Kindle (FW 5.16.4+)."
fi
exit 40
PROM_LAUNCHER
chmod 755 "$STAGE/PROMETEO.sh"

cat > "$STAGE/app/uninstall.cmd" <<'PROM_UNINSTALL'
#!/bin/sh
rm -f /mnt/us/documents/PROMETEO.sh
rm -rf /mnt/us/documents/PROMETEO_APP
sync
PROM_UNINSTALL
chmod 755 "$STAGE/app/uninstall.cmd"

ARCH="$(uname -m 2>/dev/null || echo unknown)"
FW="$(cat /etc/pretty_version 2>/dev/null || cat /etc/version 2>/dev/null || echo unknown)"
BROWSER="no"
[ -x /usr/bin/browser ] && BROWSER="wrapper"
[ -x /usr/bin/chromium/bin/kindle_browser ] && BROWSER="chromium"
KO="no"; [ -d /mnt/us/koreader ] && KO="yes"

cat > "$STAGE/app/data/device.txt" <<PROM_DEVICE
arch=$ARCH
browser=$BROWSER
koreader=$KO
installed_at=$(date '+%Y-%m-%dT%H:%M:%S%z' 2>/dev/null || date)
firmware=$FW
PROM_DEVICE

[ -s "$STAGE/PROMETEO.sh" ] || { say "PROMETEO: launcher vacio"; exit 30; }
[ -s "$STAGE/app/VERSION" ] || { say "PROMETEO: VERSION faltante"; exit 31; }

rm -rf "$BACKUP"
mkdir -p "$BACKUP"
if [ -d "$APP" ]; then mv "$APP" "$BACKUP/app"; fi
if [ -f "$LAUNCHER" ]; then mv "$LAUNCHER" "$BACKUP/PROMETEO.sh"; fi

if ! mv "$STAGE/app" "$APP"; then rollback; exit 32; fi
if ! mv "$STAGE/PROMETEO.sh" "$LAUNCHER"; then
  rm -rf "$APP"
  rollback
  exit 33
fi
rmdir "$STAGE" >/dev/null 2>&1 || true

[ -x "$LAUNCHER" ] && [ "$(cat "$APP/VERSION")" = "$VERSION" ] || {
  rm -rf "$APP"; rm -f "$LAUNCHER"; rollback; exit 34;
}

printf 'ok\n' > "$APP/install.ok"
rm -rf "$BACKUP"
sync

case "$0" in
  "$DOCS"/PROMETEO_KINDLE_INSTALL.sh) rm -f "$0" >/dev/null 2>&1 || true ;;
esac

say "PROMETEO instalado"

if [ "$BRIDGE" != "1" ]; then
  ( sleep 1; "$LAUNCHER" >/dev/null 2>&1 </dev/null & ) >/dev/null 2>&1 || true
fi
exit 0
