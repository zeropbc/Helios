import * as THREE from "three";

/**
 * HDR core material for the sun. The color values exceed 1.0 so the surface
 * is driven far above the bloom threshold — the halation you see is light,
 * not a sprite.
 */
export function createSunMaterial() {
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4.0, 3.5, 2.2) });
  return mat;
}