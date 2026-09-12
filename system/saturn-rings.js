import * as THREE from "three";

export function createSaturnRings(config, options = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  const center = canvas.width / 2;
  context.clearRect(0, 0, canvas.width, canvas.height);
  for (let radius = 70; radius < 245; radius += 7) {
    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.strokeStyle = radius % 21 === 0
      ? "rgba(238, 224, 190, 0.6)"
      : "rgba(166, 149, 115, 0.28)";
    context.lineWidth = radius % 21 === 0 ? 5 : 2;
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const rings = new THREE.Mesh(
    new THREE.RingGeometry(options.inner ?? 1.23, options.outer ?? 2.32, 256),
    new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      alphaTest: 0.02,
      depthTest: true,
      depthWrite: false,
    })
  );
  rings.name = "SaturnRings";
  rings.rotation.x = -Math.PI / 2 +
    THREE.MathUtils.degToRad(options.tilt ?? 26.7);
  return rings;
}