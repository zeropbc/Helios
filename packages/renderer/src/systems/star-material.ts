import * as THREE from "three";

/**
 * Realistic star visuals built from pure procedural shaders — no textures,
 * no raymarching, a handful of draw calls. Three layers:
 *
 *   1. Photosphere disk  — SphereGeometry + fragment shader: solar granulation,
 *      faculae (limb-bright), sunspot mottle and true limb darkening, all
 *      scaled to the star's radius and tinted by its blackbody temperature.
 *   2. Corona           — camera-facing billboard hugging the limb with a
 *      (uDisk / x)^spread falloff, additive.
 *   3. Aureole          — wide, faint billboard doing the 1/x-ish glow so the
 *      star reads against pure black without a second "blob".
 *
 * The billboards recentre on the camera in onBeforeRender (one matrix copy
 * per layer per frame), so everything stays cheap at any zoom.
 */

// Smallest luminous core so faint dwarfs never collapse to a point.
const MIN_DISK_RADIUS = 0.06;

const SURFACE_VERTEX = /* glsl */ `
varying vec3 vPos;
varying vec3 vNormal;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPos = wp.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const SURFACE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uRadius;
varying vec3 vPos;
varying vec3 vNormal;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0.0, 0.0, 0.0)), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}

// 4-octave fractal value noise — granulation mottling.
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.01;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 view = normalize(cameraPosition - vPos);
  float mu = clamp(dot(n, view), 0.0, 1.0);

  // Dimensionless surface coords (~[-1,1]) so granule scale tracks the disk.
  vec3 q = vPos / uRadius;
  float gran = fbm(q * 48.0);          // convection granules
  float mottle = fbm(q * 4.0);         // large-scale magnetic structures
  float fac = fbm(q * 11.0 + 7.7);     // faculae

  // Solar limb darkening (linear law) with a crisp rim cutoff.
  float limb = 1.0 - 0.6 * (1.0 - mu);
  limb *= smoothstep(0.03, 0.38, mu);

  // Granules: bright centres, slightly dim lanes.
  float granF = 1.0 + 0.28 * (gran - 0.5);
  // Faculae concentrate toward the limb.
  float facF = 0.10 * fac * smoothstep(0.35, 0.9, 1.0 - mu);
  // Sunspots: dark mottles restricted to mid-latitude activity bands.
  float band = smoothstep(0.45, 0.85, 1.0 - abs(n.y));
  float spotF = 1.0 - 0.30 * smoothstep(0.66, 0.80, mottle) * band;

  vec3 col = uColor * (limb * granF * spotF) + vec3(1.0) * (facF * limb);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const GLOW_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const GLOW_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uDisk;      // disk radius as a fraction of the quad half-extent
uniform float uPeak;      // limb intensity
uniform float uSpread;    // (uDisk / x)^uSpread falloff
varying vec2 vUv;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float x = length(p);
  float gate = smoothstep(uDisk, uDisk + 0.004, x);   // nothing inside the disk
  float profile = pow(clamp(uDisk / max(x, 1e-4), 0.0, 1.0), uSpread);
  float fade = 1.0 - smoothstep(0.55, 1.05, x);        // soft quad-edge cut
  float a = uPeak * gate * profile * fade;
  gl_FragColor = vec4(uColor * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createStarVisual(color: THREE.Color, diskRadius: number): THREE.Group {
  const r = Math.max(MIN_DISK_RADIUS, diskRadius);
  const group = new THREE.Group();

  // --- photosphere disk ---------------------------------------------------
  const surface = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color },
      uRadius: { value: r },
    },
    vertexShader: SURFACE_VERTEX,
    fragmentShader: SURFACE_FRAGMENT,
  });
  const disk = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 48), surface);
  disk.castShadow = false;
  disk.receiveShadow = false;
  group.add(disk);

  // --- coronal glow layers --------------------------------------------------
  const corona = buildGlowQuad({ color, uDisk: 1 / 6, uPeak: 0.18, uSpread: 3.7 }, r * 6);
  const aureole = buildGlowQuad({ color, uDisk: 1 / 16, uPeak: 0.055, uSpread: 1.3 }, r * 16);

  group.add(corona, aureole);
  return group;
}

function buildGlowQuad(
  opts: { color: THREE.Color; uDisk: number; uPeak: number; uSpread: number },
  halfExtent: number
): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: opts.color },
      uDisk: { value: opts.uDisk },
      uPeak: { value: opts.uPeak },
      uSpread: { value: opts.uSpread },
    },
    vertexShader: GLOW_VERTEX,
    fragmentShader: GLOW_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.scale.set(halfExtent, halfExtent, 1);
  mesh.frustumCulled = false;
  // Keep the quad facing the camera every frame (closure, since the
  // onBeforeRender `group` argument is null for ShaderMaterial in three r168).
  mat.onBeforeRender = (_renderer, _scene, camera) => {
    mesh.quaternion.copy(camera.quaternion);
  };
  return mesh;
}