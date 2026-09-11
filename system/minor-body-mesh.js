import * as THREE from "three";
import { positionFromElements } from "../math/kepler.js";
import { AU } from "../config/constants.js";
import { MPC_CATALOG } from "../config/catalog.js";

export function createMinorBodyMesh(bodies) {
  const geometry = new THREE.SphereGeometry(MPC_CATALOG.visibleRadius, 6, 4);
  const material = new THREE.MeshBasicMaterial({ color: 0x8fa6b8 });
  const mesh = new THREE.InstancedMesh(geometry, material, bodies.length);
  const transform = new THREE.Object3D();
  mesh.name = "MPC minor planets";
  mesh.userData.bodies = bodies;
  let lastUpdate = 0;
  mesh.userData.update = (date) => {
    if (date.getTime() - lastUpdate < 3600000) return;
    lastUpdate = date.getTime();
    for (let i = 0; i < bodies.length; i += 1) {
      const position = positionFromElements(bodies[i].orbit, date);
      transform.position.set(position.x, position.y, position.z);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  mesh.userData.update(new Date());
  return mesh;
}
