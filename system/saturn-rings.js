import * as THREE from "three";

export function createSaturnRings(config) {
  const rings = new THREE.Mesh(
    new THREE.RingGeometry(1.45, 2.3, 128),
    new THREE.MeshStandardMaterial({
      color: 0xc8b070,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    })
  );
  rings.name = "SaturnRings";
  rings.rotation.x = -Math.PI / 2.2;
  return rings;
}