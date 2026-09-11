import * as THREE from "three";

const BODY_GEOMETRY = new THREE.SphereGeometry(1, 24, 16);

function createLabel(name) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  context.font = "bold 32px system-ui";
  context.fillStyle = "white";
  context.textAlign = "center";
  context.fillText(name, 256, 58);
  const texture = new THREE.CanvasTexture(canvas);
  const label = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  }));
  label.name = `${name}-label`;
  label.scale.set(8, 1.5, 1);
  label.position.y = 2;
  return label;
}

export function createPlanetMesh(config) {
  const material = new THREE.MeshStandardMaterial({
    color: config.render.color,
    roughness: 0.8,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(BODY_GEOMETRY, material);
  mesh.scale.setScalar(config.render.radius);
  mesh.name = config.name;
  mesh.userData.state = { config };
  mesh.add(createLabel(config.name));
  return mesh;
}