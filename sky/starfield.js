import * as THREE from "three";
import { createStarGeometry } from "./star-geometry.js";

const STARFIELD = {
  count: 8000,
  spread: 8000,
  size: 0.8,
};

export function createStarfield(scene) {
  const geometry = createStarGeometry();
  const material = new THREE.PointsMaterial({
    size: STARFIELD.size,
    sizeAttenuation: true,
    color: 0xffffff,
  });
  const stars = new THREE.Points(geometry, material);
  stars.name = "starfield";
  scene.add(stars);
  return stars;
}