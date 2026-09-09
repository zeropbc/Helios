import * as THREE from "three";
import { OrbitComponentInstance, computeOrbitState } from "@helios/engine";
import { SCENE_SCALE } from "./object-visuals.js";

/**
 * Builds a THREE.Line representing an orbit path (the full ellipse/turn of
 * an orbiting body), relative to its primary at the origin.
 */
export function buildOrbitLine(
  orbit: OrbitComponentInstance,
  samples = 256
): THREE.Line {
  const points: THREE.Vector3[] = [];
  const periodS = orbit.periodS ?? 3.15576e15;
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * periodS;
    const state = computeOrbitState(orbit, t);
    points.push(
      new THREE.Vector3(
        state.positionM.x * SCENE_SCALE,
        state.positionM.y * SCENE_SCALE,
        state.positionM.z * SCENE_SCALE
      )
    );
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({
    color: 0x888888,
    transparent: true,
    opacity: 0.35,
  });
  return new THREE.Line(geo, mat);
}