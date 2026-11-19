# PROMETEO · SECUENCIA · presentación audiovisual nativa

**Página pública actual:** https://juanmanuelpm.github.io/prometeo/presentacion/

Esta versión sirve 3 fragmentos MP4 H.264/AAC propios desde `/presentacion/v2/media/`, sin Canva, JavaScript de YouTube, iframe ni descargas de YouTube. El montaje conserva las 7 diapositivas, la estética y las dos flechas originales. La receta está en `presentacion/index.html` (HTML/CSS/JS). La versión previa se conserva en `/presentacion/v1/` como respaldo. El motor v2 íntegro sigue accesible en `/presentacion/v2/`.

**Material:** Big Buck Bunny © 2008 Blender Foundation / www.bigbuckbunny.org; CC BY 3.0. Se usan recortes de la fuente oficial y se reconocen las modificaciones. Ver `v2/ATTRIBUTION.md` y `v2/media/manifest.json`. Edición/recodificación reproducible en GitHub Actions `.github/workflows/presentation-native-media-v2.yml`.

**Verificación:** CI real de Chrome (códecs propietarios) pasó (run 44620953085), incluyendo reproducción, tiempo en movimiento, EOF, segunda y tercera escena y cero consultas a YouTube. Tests locales Chromium: 7/7 PASS. No se afirma reproducción sonora Android probada: codecs AAC existen y el video no estaba muteado en Chrome, pero la salida audible depende del dispositivo/política. `presentacion/RECEIPT_NATIVE_V2.json` contiene evidencia y hashes.
