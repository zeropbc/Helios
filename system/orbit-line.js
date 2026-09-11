import * as THREE from "three";
import { semiMinor, focal } from "../math/kepler.js";

export const ORBIT_LINE_COLOR = 0x334455;
export const ORBIT_LINE_OPACITY = 0.4;
export const ORBIT_SEGMENTS = 256;

/** Ellipse points, sun placed at the focus (origin). */
export function orbitPoints(config) {
  const { a, e } = config;
  const b = semiMinor(a, e);
  const c = focal(a, e);
  const points = [];
  for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
    const t = (i / ORBIT_SEGMENTS) * Math.PI * 2;
    points.push(new THREE.Vector3(-c + a * Math.cos(t), 0, b * Math.sin(t)));
  }
  return points;
}

export function createOrbitLine(config, color = ORBIT_LINE_COLOR) {
  const geometry = new THREE.BufferGeometry().setFromPoints(orbitPoints(config));
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: ORBIT_LINE_OPACITY,
  });
  const line = new THREE.Line(geometry, material);
  line.name = `orbit-${config.name}`;
  return line;
}