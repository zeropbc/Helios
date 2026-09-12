import * as THREE from "three";

const HIGH_BODY_GEOMETRY = new THREE.SphereGeometry(1, 24, 16);
const LOW_BODY_GEOMETRY = new THREE.SphereGeometry(1, 8, 6);
const SURFACE_TEXTURES = new Map();

export function createSurfaceTexture(config, highResolution) {
  const detailed = ["Earth", "Jupiter", "Mars", "Saturn", "Uranus", "Neptune"].includes(config.name);
  const key = `${detailed ? config.name : "generic"}:${highResolution ? "high" : "low"}`;
  const cached = SURFACE_TEXTURES.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = detailed ? (highResolution ? 512 : 128) : 32;
  canvas.height = detailed ? (highResolution ? 256 : 64) : 16;
  const context = canvas.getContext("2d");
  const base = detailed
    ? `#${config.render.color.toString(16).padStart(6, "0")}`
    : "#ffffff";
  context.fillStyle = base;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (["Jupiter", "Saturn", "Uranus", "Neptune"].includes(config.name)) {
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    if (config.name === "Saturn") {
      [
        [0, "#a98768"], [0.18, "#d8b58b"], [0.34, "#f0d7b0"],
        [0.48, "#c19a73"], [0.62, "#f3dcb5"], [0.78, "#c5a079"], [1, "#907055"],
      ].forEach(([stop, color]) => gradient.addColorStop(stop, color));
    } else {
      const bands = config.name === "Jupiter"
        ? ["#c8a27b", "#efe2c8", "#a87961", "#f4e4c5", "#9c6e5b"]
        : ["#d8bd8a", "#e8d7b2", "#c3a879"];
      bands.forEach((color, index) => {
        const start = index / bands.length;
        gradient.addColorStop(start, color);
        gradient.addColorStop(Math.min(1, start + 0.42 / bands.length), color);
      });
    }
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (config.name === "Jupiter") {
      context.fillStyle = "#ad604b";
      context.beginPath();
      context.ellipse(canvas.width * 0.7, canvas.height * 0.62, canvas.width * 0.08, canvas.height * 0.05, 0, 0, Math.PI * 2);
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
  texture.anisotropy = 1;
  SURFACE_TEXTURES.set(key, texture);
  return texture;
}

const MAJOR_PLANETS = new Set(["Sun", "Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"]);
const PRIMARY_MOONS = new Set(["Moon", "Io", "Europa", "Ganymede", "Callisto", "Titan", "Enceladus", "Triton", "Pluto", "Charon"]);
const SECONDARY_MOONS = new Set(["Mimas", "Tethys", "Dione", "Rhea", "Iapetus", "Hyperion", "Phoebe", "Miranda", "Ariel", "Umbriel", "Titania", "Oberon"]);

export function getBodyRank(config) {
  const name = typeof config === "string" ? config : config.name;
  if (MAJOR_PLANETS.has(name)) return 1;
  if (PRIMARY_MOONS.has(name)) return 2;
  if (SECONDARY_MOONS.has(name)) return 3;
  if (config && config.parent) return 4;
  return 3;
}

function createLabel(config) {
  const name = typeof config === "string" ? config : config.name;
  const label = document.createElement("div");
  label.className = "body-label";
  label.textContent = name;
  label.dataset.bodyName = name;
  const rank = getBodyRank(config);
  label.dataset.rank = String(rank);
  if (rank === 1) label.classList.add("is-planet");
  else if (rank === 2) label.classList.add("is-major-moon");
  else if (rank === 3) label.classList.add("is-secondary-moon");
  else label.classList.add("is-minor-moon");
  document.body.append(label);
  return label;
}

export function createPlanetMesh(config) {
  const detailed = ["Earth", "Jupiter", "Mars", "Saturn", "Uranus", "Neptune"].includes(config.name);
  const material = new THREE.MeshStandardMaterial({
    map: createSurfaceTexture(config, false),
    color: detailed
      ? 0xffffff
      : config.render.color,
    roughness: 0.8,
    metalness: 0.1,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    emissive: config.name === "Saturn" ? 0x5a3d28 : 0x000000,
    emissiveIntensity: config.name === "Saturn" ? 0.5 : 0,
  });
  const mesh = new THREE.Mesh(LOW_BODY_GEOMETRY, material);
  mesh.scale.setScalar(config.render.radius);
  mesh.name = config.name;
  mesh.userData.state = {
    config,
    lod: {
      highGeometry: HIGH_BODY_GEOMETRY,
      lowGeometry: LOW_BODY_GEOMETRY,
      highTexture: detailed ? null : material.map,
      lowTexture: material.map,
      detailed,
    },
  };
  mesh.userData.label = createLabel(config);
  mesh.userData.rank = getBodyRank(config);
  return mesh;
}