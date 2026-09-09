import * as THREE from "three";
import { Universe } from "@helios/engine";
import { UniverseScene } from "@helios/renderer";
import { fetchCatalog } from "./data/catalog.js";
import { OrbitCamera } from "./controls/camera-controls.js";
import { HeliosUI } from "./ui/overlay.js";
import "./styles/fonts.css";
import "./styles/helios.css";

async function main(): Promise<void> {
  const container = document.getElementById("app")!;

  // ---- data + universe --------------------------------------------------
  const { objects, errors } = await fetchCatalog();
  const statusEl = document.createElement("div");
  statusEl.id = "load-toast";
  statusEl.textContent =
    errors.length > 0
      ? `${errors.length} object(s) failed to load`
      : `loaded ${objects.length} object(s)`;
  if (errors.length > 0) statusEl.classList.add("err");
  container.appendChild(statusEl);
  setTimeout(() => statusEl.remove(), 5000);

  const universe = new Universe(objects);
  const sceneViz = new UniverseScene(universe);

  // ---- three.js ----------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x020208);
  container.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.01,
    2000
  );
  const controls = new OrbitCamera({
    domElement: renderer.domElement,
    camera,
    target: new THREE.Vector3(0, 0, 0),
    minDistance: 0.3,
    maxDistance: 400,
  });

  sceneViz.scene.add(new THREE.AmbientLight(0x444466, 0.6));
  const sun = sceneViz.get("star/sol");
  if (sun) {
    sun.group.add(new THREE.PointLight(0xfff0d0, 3, 0, 2));
  }

  // ---- UI -----------------------------------------------------------------
  const ui = new HeliosUI(container, {
    onFocus: (id) => {
      const viz = sceneViz.get(id);
      if (!viz) return;
      const world = new THREE.Vector3();
      viz.group.getWorldPosition(world);
      controls.focusOn(world, 20);
      ui.showInfo(viz.instance);
      ui.setActive(id);
    },
    onTimeRate: () => {},
    onPause: () => {},
  });
  ui.setObjects(universe.all());
  ui.showInfo(sun?.instance ?? null);
  ui.setActive("star/sol");

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---- simulation loop -----------------------------------------------------
  let simTime = 0;
  let last = performance.now();
  const secondsPerYear = 31557600;

  function tick(now: number): void {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (!ui.isPaused) {
      simTime += dt * ui.timeRate * secondsPerYear;
      sceneViz.update(simTime);
    }
    ui.updateHUD(simTime);
    controls.update();
    renderer.render(sceneViz.scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Debug access
  (window as unknown as Record<string, unknown>).helios = {
    universe,
    sceneViz,
    simTime: () => simTime,
  };
}

void main();