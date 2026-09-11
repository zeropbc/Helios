import * as THREE from "three";

export function createSaturnRings(config) {
  const rings = new THREE.Mesh(
    new THREE.RingGeometry(config.r * 1.4, config.r * 2.4, 64),
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