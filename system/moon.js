import * as THREE from "three";
import { createOrbiter } from "./orbiter.js";
import { TAU } from "../config/constants.js";

export function createMoon(parentConfig) {
  const config = {
    name: "Moon",
    r: 0.27,
    a: 2.5, // around Earth
    e: 0.0549,
    color: 0x999999,
    speed: TAU / (27.32 * 86400), // real ~27.3 day period
  };
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(config.r, 16, 16),
    new THREE.MeshStandardMaterial({ color: config.color, roughness: 1 })
  );
  mesh.name = "Moon";
  const orbit = createOrbiter(config);

  return {
    mesh,
    orbit,
    update(delta) {
      orbit.step(delta);
      const pos = orbit.getPosition();
      mesh.position.set(pos.x, 0, pos.z);
    },
  };
}