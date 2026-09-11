import * as THREE from "three";
import { createSunMaterial } from "./sun-material.js";

export function createSun() {
  const geo = new THREE.SphereGeometry(5, 64, 64);
  const material = createSunMaterial();
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = "sun";
  return mesh;
}