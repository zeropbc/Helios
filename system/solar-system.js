import { createPlanetMesh } from "./planet-mesh.js";
import { createOrbitLine } from "./orbit-line.js";
import { createOrbiter } from "./orbiter.js";
import { createSaturnRings } from "./saturn-rings.js";
import { SCENE_UNITS_PER_LIGHT_YEAR } from "../config/units.js";

export function buildSolarSystem(scene, bodies) {
  const bodyByName = new Map(bodies.map((body) => [body.name, body]));
  const objects = new Map();
  const orbitLines = [];
  let lastUpdate = 0;

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
        const label = mesh.getObjectByName(`${mesh.name}-label`);
        if (label) label.visible = visible;
      }
    },
    updateLabelVisibility(camera, enabled) {
      for (const { mesh } of objects.values()) {
        const label = mesh.getObjectByName(`${mesh.name}-label`);
        if (!label) continue;
        label.visible = enabled &&
          camera.position.distanceTo(mesh.position) <= SCENE_UNITS_PER_LIGHT_YEAR;
      }
    },
  };
}
