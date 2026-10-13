# CAP-001 · Material de follaje ilustrado (Three.js puro)

**Estado:** prototipo portable, pruebas unitarias Node. **Sin verificación WebGL, móvil ni assets GLB.** No es un widget publicado.

## Procedencia y licencia

Inspiración técnica: Takuya Matsuyama, [ghibli-style-shader](https://github.com/craftzdog/ghibli-style-shader). Su README declara MIT y contiene la demostración original. Nuestro módulo **no copia shaders literalmente**: reimplementa el principio general de iluminación cuantizada, corrigiendo espacios de coordenadas, normal no uniforme y salida de color, con interfaz parametrizada y sin React. 

No contiene `trees.glb` ni fotos originales. La licencia de ese GLB y del arte debe verificarse por separado antes de cualquier redistribución. Mantener la atribución al autor cuando se reutilice su idea y las condiciones aplicables al código/asset exactos.

## Uso básico

```js
import * as THREE from 'three';
import {createPaintedFoliageMaterial, PALETTES} from './painted-foliage.mjs';
const material = createPaintedFoliageMaterial(THREE, {
  palette: PALETTES.forest,
  stops: [0.6, 0.35, 0.001],
  lightPosition: [15, 15, 15],
});
// mesh.geometry debe tener position y normal válidos.
mesh.material = material;
```

### Lógica de la iluminación

Normal y fragmento se sitúan en **espacio de cámara** para evitar mezclar normales locales con posiciones mundiales. Calculamos producto escalar con luz de posición fija en espacio mundo transformada a vista; asignamos color por banda y convertimos correctamente la salida en Three.js >= r152. Los cuatro colores son entradas CSS en sRGB convertidas internamente a lineal por THREE.Color.

### Limitaciones conocidas

- No integra **sombras recibidas**, AO real, transparencia de hojas, niebla, textura UV ni iluminación PBR.
- El punto de luz es uniform global: actualizarlo explícitamente si cambia.
- Con mallas deformadas/animadas, las normales resultantes deben reflejar la geometría/rig correctos.
- Para **InstancedMesh** con escala individual no uniforme, Three.js tiene matices en normales por instancia; exigir test de GPU antes de prometer corrección general.
- `#include <colorspace_fragment>` exige versión relativamente moderna de Three.js; la demostración histórica se hizo con r149. No tratarla como API universal sin versionar.
- En pantalla y en un GLB real no se ha compilado ni renderizado todavía, porque el entorno no cuenta con el paquete npm Three.js/GLB descargado.

## Pruebas

`node --test painted-foliage.test.mjs`

Pruebas de bandas, entrada, parámetros, materiales con stubs y estructura GLSL. No equivalen a compilación GPU. Para probar arte de verdad: importación de un asset con licencia, tres encuadres/rotaciones, escalado no uniforme, dos paletas, sombras A/B, móvil vertical y medición de fotogramas.

## Tres opciones a conservar

- **Follaje por bandas**: material pequeño, barato, paletas pintadas; ideal para vegetación secundaria estilizada.
- **Material híbrido**: conservar normal mapping, alpha-cutout y sombras del estándar, reemplazar respuesta tonal con bandas mediante `onBeforeCompile` o nodos TSL. Requiere otra implementación y test de compatibilidad.
- **Entorno pictórico**: shader de follaje más texturas orgánicas y composición manual; un shader por sí solo no produce un bosque de calidad artística.

El código no implementa la segunda o tercera opción todavía.
