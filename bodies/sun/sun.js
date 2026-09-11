import * as THREE from "three";
import { createSunMaterial } from "./sun-material.js";

function createSunGlow() {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.48;

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0.0, "rgba(255, 247, 210, 1.0)");
  gradient.addColorStop(0.12, "rgba(255, 232, 145, 0.88)");
  gradient.addColorStop(0.25, "rgba(255, 192, 90, 0.42)");
  gradient.addColorStop(0.52, "rgba(255, 150, 55, 0.12)");
  gradient.addColorStop(0.8, "rgba(255, 100, 25, 0.03)");
  gradient.addColorStop(1.0, "rgba(255, 80, 0, 0.0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({
    map: texture,
    color: new THREE.Color(1.0, 1.0, 1.0),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.9,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(30, 30, 1);
  sprite.name = "sun-glow";
  return sprite;
}

export function createSun(config) {
  const geo = new THREE.SphereGeometry(config.render.radius, 128, 128);
  const material = createSunMaterial();
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = config.name;
  mesh.userData.state = { config };
  mesh.add(createSunGlow());
  return mesh;
}