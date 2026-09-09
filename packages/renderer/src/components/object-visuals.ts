import * as THREE from "three";
import { ObjectInstance } from "@helios/engine";
import { describeRender } from "@helios/engine";
import { temperatureToRGB } from "../systems/blackbody.js";
import { bodySceneTransform } from "../utils/scaling.js";

/**
 * Builds a visual representation for a single object, driven ENTIRELY by
 * its components (via describeRender). The engine renders a light source
 * when a light_source component exists, a solid orb when terrain/ocean/
 * radius measurements exist, and so on. It never checks "is this Earth?".
 */

export interface BuiltVisual {
  group: THREE.Group;
  /** Scales world-unit position delta (1e9 m per unit) to scene units. */
  sceneScale: number;
}

const SCENE_SCALE = 1e-9;

export function buildObjectVisual(inst: ObjectInstance): THREE.Group {
  const group = new THREE.Group();
  group.userData.heliosId = inst.id;

  const desc = describeRender(inst);

  if (desc.kind === "light_point") {
    group.add(buildLight(desc));
    return group;
  }

  if (desc.kind === "solid") {
    group.add(buildSolid(inst, desc));
    const glow = buildAtmosphereGlow(inst);
    if (glow) group.add(glow);
    return group;
  }

  // bare or system_root: nothing to draw, but children still attach.
  return group;
}

function buildLight(
  desc: { temperatureK?: number; luminosityW?: number }
): THREE.Group {
  const g = new THREE.Group();
  const t = desc.temperatureK ?? 5772;
  const color = new THREE.Color().setRGB(...temperatureToRGB(t));

  // Core sprite: additive-ish bloom via point sprite texture
  const sizeFactor = 0.4 * Math.pow((desc.luminosityW ?? 1) / 1e26, 0.25);
  const coreRadius = Math.max(0.06, sizeFactor);
  const geo = new THREE.SphereGeometry(coreRadius, 16, 16);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
  });
  const mesh = new THREE.Mesh(geo, mat);
  g.add(mesh);

  // Soft halo
  const haloGeo = new THREE.SphereGeometry(coreRadius * 3.2, 24, 24);
  const haloMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  g.add(new THREE.Mesh(haloGeo, haloMat));

  return g;
}

function buildSolid(
  inst: ObjectInstance,
  desc: { radiusM?: number }
): THREE.Group {
  const g = new THREE.Group();
  const radiusM = desc.radiusM ?? 6.378e6;

  // Scene-space sphere. Radius uses the log scale for visibility.
  const distanceRelevant = Math.max(radiusM, 1e9);
  const { radius } = bodySceneTransform(distanceRelevant, radiusM);
  const geo = new THREE.SphereGeometry(radius, 24, 24);

  const renderHint = inst.object.visual?.render;
  const colorValue = renderHint?.color?.value ?? "gray";
  const color = namedColor(colorValue);

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8,
    metalness: 0.1,
  });
  g.add(new THREE.Mesh(geo, mat));
  return g;
}

function buildAtmosphereGlow(inst: ObjectInstance): THREE.Object3D | null {
  const atmo = inst.components.get("atmosphere");
  if (!atmo) return null;
  const radiusM = inst.object.measurements?.radius?.value
    ? inst.object.measurements.radius.value * 6.378e6
    : 6.378e6;
  const { radius } = bodySceneTransform(Math.max(radiusM, 1e9), radiusM);
  const geo = new THREE.SphereGeometry(radius * 1.03, 24, 24);
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0x88ccff),
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
    side: THREE.BackSide,
  });
  return new THREE.Mesh(geo, mat);
}

function namedColor(name: string): THREE.Color {
  const palette: Record<string, [number, number, number]> = {
    gray: [0.6, 0.6, 0.62],
    rust: [0.72, 0.32, 0.2],
    pale_gold: [0.92, 0.82, 0.62],
    pale_blue: [0.62, 0.78, 0.95],
    blue: [0.2, 0.4, 0.9],
  };
  const c = palette[name] ?? palette.gray!;
  return new THREE.Color(c[0], c[1], c[2]);
}

export { SCENE_SCALE };