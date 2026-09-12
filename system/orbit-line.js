import * as THREE from "three";
import { orbitPoints } from "../math/kepler.js";

export const ORBIT_LINE_COLOR = 0x334455;
export const ORBIT_LINE_OPACITY = 0.4;

export function createOrbitLine(config, color = ORBIT_LINE_COLOR, segments = 256, opacity = ORBIT_LINE_OPACITY) {
  const geometry = new THREE.BufferGeometry().setFromPoints(orbitPoints(config, segments));
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  });
  const line = new THREE.Line(geometry, material);
  line.name = `orbit-${config.name}`;
  return line;
}
