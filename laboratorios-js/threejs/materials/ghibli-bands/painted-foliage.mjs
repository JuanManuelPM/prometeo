/**
 * PROMETEO | CAP-001 | Material de follaje ilustrado por bandas.
 * Implementación original a partir del principio de iluminación por bandas
 * estudiado en https://github.com/craftzdog/ghibli-style-shader .
 * Three.js >= r152: usa <colorspace_fragment>. Sin dependencia de React.
 * Requiere un THREE namespace aportado por el programa consumidor.
 * Este material es deliberadamente estilizado, NO incluye sombras físicas.
 */
export const PALETTES = Object.freeze({
  forest: Object.freeze(['#427062', '#33594e', '#234549', '#1e363f']),
  spring: Object.freeze(['#9cae79', '#769969', '#466f65', '#264d51']),
  dusk: Object.freeze(['#d2a676', '#a77871', '#785b75', '#42475c']),
});

export const DEFAULT_STOPS = Object.freeze([0.6, 0.35, 0.001]);

export function assertPalette(palette) {
  if (!Array.isArray(palette) || palette.length !== 4 ||
      palette.some(color => typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color))) {
    throw new TypeError('Se requieren exactamente cuatro colores CSS #RRGGBB.');
  }
  return [...palette];
}

export function assertStops(stops) {
  if (!Array.isArray(stops) || stops.length !== 3 ||
      stops.some(v => typeof v !== 'number' || !Number.isFinite(v) || v < -1 || v > 1) ||
      !(stops[0] > stops[1] && stops[1] > stops[2])) {
    throw new TypeError('Tres umbrales finitos y estrictamente descendentes, entre -1 y 1.');
  }
  return [...stops];
}

export function bandIndex(dotNormalLight, stops = DEFAULT_STOPS) {
  assertStops(stops);
  if (!Number.isFinite(dotNormalLight)) throw new TypeError('Iluminación no finita.');
  const [a, b, c] = stops;
  return dotNormalLight > a ? 0 : dotNormalLight > b ? 1 : dotNormalLight > c ? 2 : 3;
}

export const vertexShader = /* glsl */ `
  varying vec3 vViewPosition;
  varying vec3 vViewNormal;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = viewPosition.xyz;
    // normalMatrix = inverse transpose de modelViewMatrix: soporta escala no uniforme.
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;
  uniform vec3 uPalette[4];
  uniform float uStops[3];
  uniform vec3 uLightWorld;
  varying vec3 vViewPosition;
  varying vec3 vViewNormal;
  void main() {
    // Superficie, normales y luz en el MISMO espacio de coordenadas (cámara).
    vec3 lightView = (viewMatrix * vec4(uLightWorld, 1.0)).xyz;
    vec3 lightDirection = normalize(lightView - vViewPosition);
    float lightAmount = dot(normalize(vViewNormal), lightDirection);
    vec3 pigment = uPalette[3];
    if (lightAmount > uStops[0]) pigment = uPalette[0];
    else if (lightAmount > uStops[1]) pigment = uPalette[1];
    else if (lightAmount > uStops[2]) pigment = uPalette[2];
    gl_FragColor = vec4(pigment, 1.0);
    // Paleta en espacio lineal; convertir al espacio de salida del renderer.
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * @param {object} THREE - namespace importado de Three.js (>= r152)
 * @param {object} options - {palette, stops, lightPosition, toneMapped}
 * @returns {THREE.ShaderMaterial} una instancia independiente de material
 */
export function createPaintedFoliageMaterial(THREE, options = {}) {
  const palette = assertPalette(options.palette ?? PALETTES.forest);
  const stops = assertStops(options.stops ?? DEFAULT_STOPS);
  const light = options.lightPosition ?? [15, 15, 15];
  if (!Array.isArray(light) || light.length !== 3 || light.some(v => !Number.isFinite(v))) {
    throw new TypeError('lightPosition debe ser [x,y,z] de números finitos.');
  }
  const uniforms = {
    uPalette: {value: palette.map(hex => new THREE.Color(hex))},
    uStops: {value: stops},
    uLightWorld: {value: new THREE.Vector3(...light)}
  };
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    toneMapped: options.toneMapped ?? true,
  });
}

/** Actualiza parámetros sin recrear el shader ni generar recompilaciones. */
export function updatePaintedFoliageMaterial(THREE, material, changes = {}) {
  if (!material?.uniforms?.uPalette || !material.uniforms?.uStops || !material.uniforms?.uLightWorld) {
    throw new TypeError('El objeto no es un material creado por createPaintedFoliageMaterial.');
  }
  // Validar toda la operación antes de mutar: un error no deja cambios parciales.
  const palette = changes.palette === undefined ? null : assertPalette(changes.palette);
  const stops = changes.stops === undefined ? null : assertStops(changes.stops);
  const p = changes.lightPosition;
  if (p !== undefined && (!Array.isArray(p) || p.length !== 3 || p.some(v => !Number.isFinite(v)))) {
    throw new TypeError('lightPosition inválida');
  }
  if (palette) palette.forEach((hex, i) => material.uniforms.uPalette.value[i].set(hex));
  if (stops) material.uniforms.uStops.value = stops;
  if (p) material.uniforms.uLightWorld.value.set(...p);
  return material;
}
