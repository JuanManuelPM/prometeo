# PROMETEO · Modo cine nativo (candidato)

**Meta:** un reproductor HTML5 sin iframe, API de YouTube, anuncios insertados por plataforma, títulos o controles nativos. Conservar la composición editorial de PROMETEO y no sustituir el experimento anterior sin aprobar sus pruebas.

## Modos

- `/presentacion/cine/`: demo nativa **Big Buck Bunny**, clips MP4 previamente publicados en `/presentacion/v2/media/` desde el material CC BY 3.0 de Blender Foundation. No es la entrevista de psicología. Uso únicamente como demostración de la arquitectura libre de UI de terceros.
- `/presentacion/cine/?privado`: composición sobre el video de psicología masculina. Utiliza **un video local elegido en el navegador**. No descarga medios de YouTube, no transmite el archivo elegido al servidor ni publica el video. Requiere escoger el archivo: la automatización URL→archivo privado no está implementada aquí. Cortes 892–927, 2115–2203 y 3317–3392 segundos, **sin QA auditiva** ni alineación palabra a palabra.

## Requisitos de UX

Video `controls` ausente y `pointer-events:none`, `object-fit:contain`. La superficie táctil pertenece exclusivamente a la presentación: toque avanza, swipe horizontal permite recorrer. Dos flechas, textos de transición de 1000 ms. Inicio tras gesto, con fallback neutro de reproducción denegada. No se presentan controles o subtítulos de YouTube porque no se carga YouTube.

## Riesgos y límites

La privacidad es local mientras el archivo provenga de una selección de archivo local. Archivo no se sube ni se persiste al cerrar; repetir selección en otra sesión es necesario. Para cero fricción desde URL se necesita una tubería autorizada que obtenga los medios y los haga accesibles privadamente al navegador. El HTML puro alojado en GitHub Pages no convierte un enlace YouTube en `video/mp4` directamente. YouTube IFrame API no dispone de parámetros documentados para quitar todos los anuncios y branding. El modo nativo evita anuncios de YouTube **porque no usa su reproductor**, no porque evada sus anuncios.

## QA

No marcar reproducción de YouTube original ni portabilidad del original como pasada. Este candidato no reemplaza `/presentacion/` ni `/presentacion/ejemplos/psicologia-masculina-v2/`.