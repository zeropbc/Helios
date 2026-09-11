import { createPlanetMesh } from "./planet-mesh.js";
import { createOrbitLine } from "./orbit-line.js";
import { createOrbiter } from "./orbiter.js";
import { createSaturnRings } from "./saturn-rings.js";
import { SCENE_UNITS_PER_LIGHT_YEAR } from "../config/units.js?v=zoom-labels";
import * as THREE from "three";

const LABEL_DISTANCE_SCALE = 0.018;
const LABEL_MIN_SIZE = 0.05;
const LABEL_MAX_SIZE = 5;

export function buildSolarSystem(scene, bodies) {
  const bodyByName = new Map(bodies.map((body) => [body.name, body]));
  const objects = new Map();
  const orbitLines = [];
  let lastUpdate = 0;
  const worldPosition = new THREE.Vector3();

  for (const config of bodies) {
    if (!config.orbit) continue;
    const mesh = createPlanetMesh(config);
    const orbit = createOrbiter(config);
    scene.add(mesh);
    objects.set(config.name, { mesh, orbit, config });

    if (!config.parent) {
      const line = createOrbitLine(config);
      scene.add(line);
      orbitLines.push(line);
    }
    if (config.name === "Saturn") mesh.add(createSaturnRings(config));
    if (config.name === "Jupiter") {
      const rings = createSaturnRings(config);
      rings.name = "JupiterRings";
      rings.scale.set(1.18, 1.18, 1.18);
      rings.material.opacity = 0.16;
      mesh.add(rings);
    }
  }

  return {
    planets: [...objects.values()],
    orbitLines,
    update(date = new Date()) {
      const timestamp = date.getTime();
      if (timestamp - lastUpdate < 33) return;
      lastUpdate = timestamp;
      for (const body of objects.values()) {
        const position = body.orbit.getPosition(date);
        const parent = body.config.parent && objects.get(body.config.parent);
        if (parent) {
          body.mesh.position.set(
            parent.mesh.position.x + position.x,
            parent.mesh.position.y + position.y,
            parent.mesh.position.z + position.z
          );
        } else {
          body.mesh.position.set(position.x, position.y, position.z);
        }
      }
    },
    getBody(name) {
      return bodyByName.get(name);
    },
    setLabelsVisible(visible) {
      for (const { mesh } of objects.values()) {
        if (mesh.userData.label) mesh.userData.label.hidden = !visible;
      }
    },
    updateLabelVisibility(camera, enabled) {
      for (const { mesh } of objects.values()) {
        const label = mesh.userData.label;
        if (!label) continue;
        const distance = camera.position.distanceTo(mesh.position);
        const bodyRadius = mesh.scale.x;
        const screenSize = Math.min(
          Math.max(distance * LABEL_DISTANCE_SCALE, LABEL_MIN_SIZE),
          LABEL_MAX_SIZE
        );
        const closeApproachLimit = bodyRadius * 0.75;
        const size = distance < bodyRadius * 100
          ? Math.min(screenSize, closeApproachLimit)
          : screenSize;
        const projected = mesh.getWorldPosition(worldPosition).project(camera);
        const onScreen = projected.z >= -1 && projected.z <= 1;
        label.hidden = !(enabled && onScreen && distance <= SCENE_UNITS_PER_LIGHT_YEAR);
        label.style.left = `${(projected.x * 0.5 + 0.5) * window.innerWidth}px`;
        label.style.top = `${(-projected.y * 0.5 + 0.5) * window.innerHeight}px`;
        label.style.fontSize = `${Math.max(7, Math.min(7, size * 80))}px`;
      }
    },
  };
}
