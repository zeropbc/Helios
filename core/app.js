import * as THREE from "three";
import { createScene } from "./scene.js";
import { createCamera } from "./camera.js?v=zoom-labels";
import { createRenderer } from "./renderer.js";
import { createControls } from "./controls.js?v=zoom-labels";
import { createLoop } from "./loop.js";
import { createResizeHandler } from "./resize.js";
import { createComposer } from "../fx/composer.js";
import { createSun } from "../bodies/sun/sun.js";
import { createSunLight, createAmbientLight } from "../bodies/sun/lights.js";
import { buildSolarSystem } from "../system/solar-system.js?v=moon-orbits";
import { loadBodies } from "../system/body-data.js?v=lod-saturn-5";
import { TIME } from "../config/time.js";
import { loadMpcBodies } from "../system/mpc-catalog.js";
import { createMinorBodyMesh } from "../system/minor-body-mesh.js";
import { MPC_CATALOG } from "../config/catalog.js";

export async function createApp(container) {
  const bodies = await loadBodies();
  const sunConfig = bodies.find((body) => body.name === "Sun");
  if (!sunConfig) throw new Error("Body manifest must include Sun");
  const scene = createScene();
  const camera = createCamera();
  const renderer = createRenderer(container);
  container.appendChild(renderer.domElement);
  const controls = createControls(camera, renderer.domElement);
  const { composer, bloomPass } = createComposer(
    renderer,
    scene,
    camera,
    container.clientWidth || window.innerWidth,
    container.clientHeight || window.innerHeight
  );

  // sun + light
  const sun = createSun(sunConfig);
  scene.add(sun);
  scene.add(createSunLight());
  scene.add(createAmbientLight());

  // planets + orbits
  const system = buildSolarSystem(scene, bodies);
  const settings = createSettings(system);
  const search = createSearch(system, bodies, camera, controls);
  let minorBodyMesh = null;
  if (MPC_CATALOG.enabled) {
    const mpcBodies = await loadMpcBodies();
    minorBodyMesh = createMinorBodyMesh(mpcBodies);
    scene.add(minorBodyMesh);
  }
  let simDate = Date.now();
  const loop = createLoop((dt) => {
    simDate += dt * TIME.rate * 1000;
    controls.update(dt);
    const date = new Date(simDate);
    system.update(date);
    system.updateLevelOfDetail(camera);
    system.updateLabelVisibility(camera, settings.checkbox.checked);
    minorBodyMesh?.userData.update(new Date(simDate));

    // sun rotates slowly; static HDR stays put
    sun.rotation.y += dt * 0.02;

    composer.render();
  });

  createResizeHandler(renderer, camera, composer);

  const urlParams = new URLSearchParams(window.location.search);
  const initialTarget = urlParams.get("target") || urlParams.get("focus");
  if (initialTarget) {
    // Match stable slugs (s-2007-s-7), provisional designations (S/2007 S 7),
    // or plain names (Titan) — HeliosDB links use slugs.
    const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const key = slug(initialTarget);
    const object = system.planets.find((entry) =>
      slug(entry.config.name) === key ||
      (typeof entry.config.id === "string" && slug(entry.config.id) === key));
    if (object) {
      controls.target.copy(object.mesh.position);
      const distance = Math.max(object.mesh.scale.x * 12, 0.00001);
      camera.position.set(
        object.mesh.position.x + distance,
        object.mesh.position.y + distance * 0.6,
        object.mesh.position.z + distance
      );
      controls.update();
    }
  }

  window.helios = { scene, camera, renderer, controls, sun, system, bloomPass, minorBodyMesh, settings, search };

  loop.start();
}

function createSettings(system) {
  const button = document.createElement("button");
  button.className = "settings-button";
  button.type = "button";
  button.setAttribute("aria-label", "Open settings");
  button.textContent = "⚙";

  const panel = document.createElement("aside");
  panel.className = "settings-panel";
  panel.innerHTML = `
    <h2>Settings</h2>
    <label><input type="checkbox" checked> Show labels</label>
  `;
  const checkbox = panel.querySelector("input");
  checkbox.addEventListener("change", () => system.setLabelsVisible(checkbox.checked));
  button.addEventListener("click", () => {
    panel.classList.toggle("is-open");
    button.setAttribute("aria-expanded", panel.classList.contains("is-open"));
  });
  document.body.append(button, panel);
  return { button, panel, checkbox };
}

function createSearch(system, bodies, camera, controls) {
  const wrapper = document.createElement("div");
  wrapper.className = "search-control";
  wrapper.innerHTML = `
    <button class="search-button" type="button" aria-label="Open search">⌕</button>
    <input class="search-input" type="search" placeholder="Search Helios" aria-label="Search Helios">
    <div class="search-results" role="listbox"></div>
  `;
  const button = wrapper.querySelector(".search-button");
  const input = wrapper.querySelector(".search-input");
  const results = wrapper.querySelector(".search-results");

  function renderResults(query) {
    const normalized = query.trim().toLowerCase();
    const matches = normalized
      ? bodies.filter((body) => [
        body.name,
        ...(body.aliases ?? []),
        body.classification,
      ].some((value) => String(value ?? "").toLowerCase().includes(normalized))).slice(0, 8)
      : [];
    results.replaceChildren(...matches.map((body) => {
      const result = document.createElement("button");
      result.type = "button";
      result.className = "search-result";
      result.textContent = body.name;
      result.addEventListener("click", () => {
        const object = system.planets.find((entry) => entry.config.name === body.name);
        if (object) {
          controls.target.copy(object.mesh.position);
          const distance = Math.max(object.mesh.scale.x * 12, 0.00001);
          camera.position.set(
            object.mesh.position.x + distance,
            object.mesh.position.y + distance * 0.6,
            object.mesh.position.z + distance
          );
          controls.update();
        }
        input.value = body.name;
        results.replaceChildren();
      });
      return result;
    }));
  }

  button.addEventListener("click", () => {
    wrapper.classList.add("is-open");
    input.focus();
  });
  input.addEventListener("input", () => renderResults(input.value));
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      input.value = "";
      results.replaceChildren();
      wrapper.classList.remove("is-open");
      button.focus();
    }
  });
  document.body.append(wrapper);
  return { wrapper, button, input, results };
}