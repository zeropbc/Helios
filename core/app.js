import * as THREE from "three";
import { createScene } from "./scene.js";
import { createCamera } from "./camera.js";
import { createRenderer } from "./renderer.js";
import { createControls } from "./controls.js";
import { createLoop } from "./loop.js";
import { createResizeHandler } from "./resize.js";
import { createComposer } from "../fx/composer.js";
import { createSun } from "../bodies/sun/sun.js";
import { createSunLight, createAmbientLight } from "../bodies/sun/lights.js";
import { buildSolarSystem } from "../system/solar-system.js";
import { loadBodies } from "../system/body-data.js";
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
    system.updateLabelVisibility(camera, settings.checkbox.checked);
    minorBodyMesh?.userData.update(new Date(simDate));

    // sun rotates slowly; static HDR stays put
    sun.rotation.y += dt * 0.02;

    composer.render();
  });

  createResizeHandler(renderer, camera, composer);

  window.helios = { scene, camera, renderer, controls, sun, system, bloomPass, minorBodyMesh, settings };

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