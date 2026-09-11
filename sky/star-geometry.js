import * as THREE from "three";

export const STARFIELD = {
  count: 8000,
  spread: 8000,
  size: 0.8,
};

export function createStarGeometry() {
  const n = STARFIELD.count;
  const positions = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) {
    positions[i] = (Math.random() - 0.5) * STARFIELD.spread;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geo;
}