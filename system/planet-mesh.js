import * as THREE from "three";

const BODY_GEOMETRY = new THREE.SphereGeometry(1, 24, 16);

function createSurfaceTexture(config) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  const base = `#${config.render.color.toString(16).padStart(6, "0")}`;
  context.fillStyle = base;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (["Jupiter", "Saturn", "Uranus", "Neptune"].includes(config.name)) {
    const bands = config.name === "Jupiter"
      ? ["#c8a27b", "#efe2c8", "#a87961", "#f4e4c5", "#9c6e5b"]
      : ["#d8bd8a", "#e8d7b2", "#c3a879"];
    bands.forEach((color, index) => {
      context.fillStyle = color;
      context.fillRect(0, index * canvas.height / bands.length, canvas.width, canvas.height / bands.length * 0.55);
    });
    if (config.name === "Jupiter") {
      context.fillStyle = "#ad604b";
      context.beginPath();
      context.ellipse(720, 320, 80, 24, 0, 0, Math.PI * 2);
      context.fill();
    }
  } else if (config.name === "Earth") {
    context.fillStyle = "#2f7fbd";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#477b4d";
    for (let i = 0; i < 18; i += 1) {
      context.beginPath();
      context.ellipse((i * 173) % canvas.width, 90 + ((i * 71) % 300), 70, 28, i, 0, Math.PI * 2);
      context.fill();
    }
  } else if (config.name === "Mars") {
    context.fillStyle = "#a94f35";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(75, 32, 25, 0.35)";
    for (let i = 0; i < 24; i += 1) context.fillRect((i * 97) % canvas.width, (i * 43) % canvas.height, 90, 14);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createLabel(name) {
  const label = document.createElement("div");
  label.className = "body-label";
  label.textContent = name;
  label.dataset.bodyName = name;
  document.body.append(label);
  return label;
}

export function createPlanetMesh(config) {
  const material = new THREE.MeshStandardMaterial({
    map: createSurfaceTexture(config),
    color: 0xffffff,
    roughness: 0.8,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(BODY_GEOMETRY, material);
  mesh.scale.setScalar(config.render.radius);
  mesh.name = config.name;
  mesh.userData.state = { config };
  mesh.userData.label = createLabel(config.name);
  return mesh;
}