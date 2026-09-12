import { createPlanetMesh, createSurfaceTexture } from "./planet-mesh.js?v=lod-saturn-5";
import { createOrbitLine } from "./orbit-line.js?v=moon-orbits";
import { createOrbiter } from "./orbiter.js";
import { createSaturnRings } from "./saturn-rings.js";
import { SCENE_UNITS_PER_LIGHT_YEAR } from "../config/units.js?v=zoom-labels";
import * as THREE from "three";

const LABEL_DISTANCE_SCALE = 0.018;
const LABEL_MIN_SIZE = 0.05;
const LABEL_MAX_SIZE = 5;
const HIGH_DETAIL_DISTANCE = 30;

export function buildSolarSystem(scene, bodies) {
  const bodyByName = new Map(bodies.map((body) => [body.name, body]));
  const objects = new Map();
  const orbitLines = [];
  let lastUpdate = 0;
  let lastLabelUpdate = 0;
  let lastLabelCollisionUpdate = 0;
  let lastCameraPosition = new THREE.Vector3();
  let lastCameraQuaternion = new THREE.Quaternion();
  let lastLodCameraPosition = new THREE.Vector3(Infinity, Infinity, Infinity);
  const worldPosition = new THREE.Vector3();

  for (const config of bodies) {
    if (!config.orbit) continue;
    const mesh = createPlanetMesh(config);
    const orbit = createOrbiter(config);
    scene.add(mesh);
    objects.set(config.name, { mesh, orbit, config });

    if (config.name === "Saturn") {
      const rings = createSaturnRings(config);
      mesh.add(rings);
    }
    if (config.name === "Jupiter") {
      const rings = createSaturnRings(config, { inner: 1.7, outer: 2.1, tilt: 3.1 });
      rings.name = "JupiterRings";
      rings.material.opacity = 0.16;
      mesh.add(rings);
    }
  }

  for (const { mesh, config } of objects.values()) {
    const parent = config.parent && objects.get(config.parent);
    const rank = mesh.userData.rank ?? 3;
    const opacity = parent ? (rank === 4 ? 0.12 : 0.22) : 0.4;
    const line = createOrbitLine(config, undefined, parent ? 64 : 256, opacity);
    line.userData.parent = parent;
    scene.add(line);
    orbitLines.push(line);
  }

  const result = {
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
      for (const line of orbitLines) {
        if (line.userData.parent) {
          line.position.copy(line.userData.parent.mesh.position);
        }
      }
    },
    getBody(name) {
      return bodyByName.get(name);
    },
    updateLevelOfDetail,
    setLabelsVisible(visible) {
      for (const { mesh } of objects.values()) {
        if (mesh.userData.label) mesh.userData.label.hidden = !visible;
      }
    },
    updateLabelVisibility(camera, enabled) {
      if (!enabled) {
        for (const { mesh } of objects.values()) {
          if (mesh.userData.label) mesh.userData.label.hidden = true;
        }
        return;
      }

      const now = performance.now();
      const cameraMoved = camera.position.distanceToSquared(lastCameraPosition) > 0.000001 ||
        1 - Math.abs(camera.quaternion.dot(lastCameraQuaternion)) > 0.000001;
      if (!cameraMoved && now - lastLabelUpdate < 33) return;
      lastLabelUpdate = now;
      lastCameraPosition.copy(camera.position);
      lastCameraQuaternion.copy(camera.quaternion);

      const candidates = [];
      const parentScreenCache = new Map();
      const fovRad = (camera.fov * Math.PI) / 360;

      for (const { mesh, config } of objects.values()) {
        const label = mesh.userData.label;
        if (!label) continue;

        const distance = camera.position.distanceTo(mesh.position);
        if (distance > SCENE_UNITS_PER_LIGHT_YEAR) {
          label.hidden = true;
          continue;
        }

        const rank = mesh.userData.rank ?? 3;
        const parent = config.parent && objects.get(config.parent);

        // Distance / LOD culling:
        // Rank 1 (Major planets): visible across the solar system
        // Rank 2 (Primary moons): visible when within 60 scene units
        // Rank 3 (Secondary moons): visible when within 15 scene units
        // Rank 4 (Minor moonlets): visible only when camera is close (< 1.8 scene units)
        if (rank === 2 && distance > 60) {
          label.hidden = true;
          continue;
        }
        if (rank === 3 && distance > 15) {
          label.hidden = true;
          continue;
        }
        if (rank === 4 && distance > 1.8) {
          label.hidden = true;
          continue;
        }

        const projected = worldPosition.copy(mesh.position).project(camera);
        const onScreen = projected.z >= -1 && projected.z <= 1 &&
          projected.x >= -1.1 && projected.x <= 1.1 &&
          projected.y >= -1.1 && projected.y <= 1.1;

        if (!onScreen) {
          label.hidden = true;
          continue;
        }

        const screenX = (projected.x * 0.5 + 0.5) * window.innerWidth;
        const screenY = (-projected.y * 0.5 + 0.5) * window.innerHeight;

        // Behind-parent occlusion check
        if (parent) {
          let parentInfo = parentScreenCache.get(parent.config.name);
          if (!parentInfo) {
            const parentProj = new THREE.Vector3().copy(parent.mesh.position).project(camera);
            const pX = (parentProj.x * 0.5 + 0.5) * window.innerWidth;
            const pY = (-parentProj.y * 0.5 + 0.5) * window.innerHeight;
            const pDist = camera.position.distanceTo(parent.mesh.position);
            const screenRadius = (parent.mesh.scale.x / (pDist * Math.tan(fovRad))) * (window.innerHeight * 0.5);
            parentInfo = { pX, pY, pDist, screenRadius };
            parentScreenCache.set(parent.config.name, parentInfo);
          }

          if (distance > parentInfo.pDist) {
            const dx = screenX - parentInfo.pX;
            const dy = screenY - parentInfo.pY;
            if (dx * dx + dy * dy < (parentInfo.screenRadius * 1.15) ** 2) {
              label.hidden = true;
              continue;
            }
          }
        }

        candidates.push({
          label,
          rank,
          distance,
          screenX,
          screenY,
        });
      }

      // Sort: higher rank first (Rank 1 planets, then 2, 3, 4); closer bodies first
      candidates.sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return a.distance - b.distance;
      });

      const occupied = [];
      for (const item of candidates) {
        const { label, rank, screenX, screenY } = item;
        const charWidth = rank === 1 ? 8 : 6.8;
        const width = label.textContent.length * charWidth + 14;
        const height = rank === 1 ? 20 : 16;

        const left = screenX - width / 2;
        const right = screenX + width / 2;
        const top = screenY - height - 4;
        const bottom = screenY + 4;

        const marginH = 8;
        const marginV = 5;
        const overlaps = occupied.some((box) =>
          left < box.right + marginH &&
          right > box.left - marginH &&
          top < box.bottom + marginV &&
          bottom > box.top - marginV
        );

        if (overlaps) {
          label.hidden = true;
        } else {
          label.hidden = false;
          label.style.left = `${screenX}px`;
          label.style.top = `${screenY}px`;
          occupied.push({ left, right, top, bottom });
        }
      }
    },
  };

  result.update(new Date());
  return result;

  function updateLevelOfDetail(camera) {
    if (camera.position.distanceToSquared(lastLodCameraPosition) < 0.0001) return;
    lastLodCameraPosition.copy(camera.position);
    for (const { mesh } of objects.values()) {
      const lod = mesh.userData.state?.lod;
      if (!lod) continue;
      const highDetail = camera.position.distanceToSquared(mesh.position) < HIGH_DETAIL_DISTANCE ** 2;
      const targetGeometry = highDetail ? lod.highGeometry : lod.lowGeometry;
      if (mesh.geometry !== targetGeometry) mesh.geometry = targetGeometry;
      if (highDetail && lod.detailed && !lod.highTexture) {
        lod.highTexture = createSurfaceTexture(mesh.userData.state.config, true);
      }
      const targetTexture = highDetail && lod.highTexture ? lod.highTexture : lod.lowTexture;
      if (mesh.material.map !== targetTexture) {
        mesh.material.map = targetTexture;
        mesh.material.needsUpdate = true;
      }
    }
  }
}
