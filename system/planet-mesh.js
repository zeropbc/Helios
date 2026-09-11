import * as THREE from "three";

export function createPlanetMesh(config) {
  const geo = new THREE.SphereGeometry(config.render.radius, 64, 64);
  const material = new THREE.MeshStandardMaterial({
    color: config.render.color,
    roughness: 0.8,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = config.name;
  mesh.userData.state = { config };
  return mesh;
}