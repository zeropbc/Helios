import { PLANET_CONFIGS } from "./planet-data.js";
import { createPlanetMesh } from "./planet-mesh.js";
import { createOrbitLine } from "./orbit-line.js";
import { createOrbiter } from "./orbiter.js";
import { createMoon } from "./moon.js";
import { createSaturnRings } from "./saturn-rings.js";

/**
 * Builds the full planetary system: meshes, orbit lines, moons, rings.
 * Returns an object with scene refs and an update(dt) step.
 */
export function buildSolarSystem(scene, sun) {
  const planets = [];
  const orbitLines = [];

  for (const config of PLANET_CONFIGS) {
    const mesh = createPlanetMesh(config);
    const orbit = createOrbiter(config);
    const line = createOrbitLine(config);

    scene.add(line);
    scene.add(mesh);

    if (config.name === "Saturn") {
      const rings = createSaturnRings(config);
      mesh.add(rings);
    }

    if (config.name === "Earth") {
      const moon = createMoon(config);
      mesh.add(moon.mesh);
      planets.push({ mesh, orbit, moon, config });
    } else {
      planets.push({ mesh, orbit, config });
    }
    orbitLines.push(line);
  }

  return {
    planets,
    orbitLines,
    update(dt) {
      for (const p of planets) {
        p.orbit.step(dt);
        const pos = p.orbit.getPosition();
        p.mesh.position.set(pos.x, 0, pos.z);
        if (p.moon) p.moon.update(dt);
      }
    },
  };
}