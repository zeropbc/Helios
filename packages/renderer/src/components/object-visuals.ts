import * as THREE from "three";
import { ObjectInstance } from "@helios/engine";
import { describeRender } from "@helios/engine";
import { temperatureToRGB } from "../systems/blackbody.js";
import { createStarVisual } from "../systems/star-material.js";
import { bodySceneTransform } from "../utils/scaling.js";

export interface BuiltVisual {
  group: THREE.Group;
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
    group.add(buildSolid(group, desc, inst));
    const glow = buildAtmosphereGlow(inst);
    if (glow) group.add(glow);
    return group;
  }
  return group;
}

function buildLight(desc: { temperatureK?: number; luminosityW?: number }): THREE.Group {
  const t = desc.temperatureK ?? 5772;
  const lumW = desc.luminosityW ?? 3.828e26;
  const color = new THREE.Color().setRGB(...temperatureToRGB(t));
  const coreRadius = Math.max(0.06, 0.4 * Math.pow(lumW / 1e26, 0.25));
  return createStarVisual(color, coreRadius);
}

function buildSolid(
  group: THREE.Group,
  desc: { radiusM?: number },
  inst: ObjectInstance
): THREE.Mesh {
  const radiusM = desc.radiusM ?? 6.378e6;
  const distanceRelevant = Math.max(radiusM, 1e9);
  const { radius } = bodySceneTransform(distanceRelevant, radiusM);
  const geo = new THREE.SphereGeometry(radius, 48, 48);

  const renderHint = inst.object.visual?.render;
  const colorValue = renderHint?.color?.value ?? "gray";
  const color = namedColor(colorValue);

  // Procedural surface props — driven ONLY by component data
  const terrainComp = inst.components.get("terrain") as { class?: string } | undefined;
  const oceanComp = inst.components.get("ocean");
  const atmoComp = inst.components.get("atmosphere");
  const terrainClass = terrainComp?.class ?? "bare";
  const roughness = oceanComp ? 0.04 : (terrainClass === "gas_giant" ? 0.55 : terrainClass === "rocky" ? 0.95 : 0.82);
  const metalness = oceanComp ? 0.0 : (terrainClass === "metallic" ? 0.6 : 0.02);

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive: atmoComp ? new THREE.Color(0x1a2a3a).multiplyScalar(0.12) : undefined,
    emissiveIntensity: 0.35,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
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
    opacity: 0.18,
    depthWrite: false,
    side: THREE.BackSide,
  });
  return new THREE.Mesh(geo, mat);
}

function namedColor(name?: string): THREE.Color {
  const palette: Record<string, [number, number, number]> = {
    gray: [0.62, 0.62, 0.64],
    rust: [0.78, 0.35, 0.2],
    pale_gold: [0.92, 0.84, 0.66],
    pale_blue: [0.62, 0.78, 0.96],
    blue: [0.2, 0.4, 0.92],
    white: [0.98, 0.98, 0.98],
  };
  const c = palette[name ?? "gray"] ?? palette.gray!;
  return new THREE.Color(c[0], c[1], c[2]);
}

export { SCENE_SCALE };
