import * as THREE from "three";
import { createScene } from "./scene.js";
import { createCamera } from "./camera.js";
import { createRenderer } from "./renderer.js";
import { createControls } from "./controls.js";
import { createLoop } from "./loop.js";
import { createResizeHandler } from "./resize.js";
import { createComposer } from "../fx/composer.js";
import { createStarfield } from "../sky/starfield.js";
import { createSun } from "../bodies/sun/sun.js";
import { createSunLight, createAmbientLight } from "../bodies/sun/lights.js";
import { buildSolarSystem } from "../system/solar-system.js";
import { TIME } from "../config/time.js";

export function createApp(container) {
  const scene = createScene();
  const camera = createCamera();
  const renderer = createRenderer(container);
  const controls = createControls(camera, renderer.domElement);
  const { composer, bloomPass } = createComposer(renderer, scene, camera);

  container.appendChild(renderer.domElement);

  // environment
  createStarfield(scene);

  // sun + light
  const sun = createSun();
  scene.add(sun);
  scene.add(createSunLight());
  scene.add(createAmbientLight());

  // planets + orbits
  const system = buildSolarSystem(scene, sun);

  let simTime = 0;

  const loop = createLoop((dt) => {
    const step = dt * TIME.rate;
    simTime += step;
    controls.update(dt);
    system.update(step);

    // sun rotates slowly; static HDR stays put
    sun.rotation.y += dt * 0.02;

    composer.render();
  });

  createResizeHandler(renderer, camera, composer);

  window.helios = { scene, camera, renderer, controls, sun, system, bloomPass };

  loop.start();
}