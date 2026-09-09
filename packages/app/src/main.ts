import * as THREE from "three";
import { Universe } from "@helios/engine";
import { UniverseScene } from "@helios/renderer";
import { fetchCatalog } from "./data/catalog.js";
import { OrbitCamera } from "./controls/camera-controls.js";
import { HeliosUI } from "./ui/overlay.js";
import "./styles/fonts.css";
import "./styles/helios.css";

function focusDistance(viz: { group: THREE.Group }): number {
  let d = 4;
  viz.group.traverse((o) => {
    if (o instanceof THREE.Mesh && o.geometry) {
      const bs = o.geometry.boundingSphere;
      if (bs) d = Math.max(d, bs.radius * 2.6);
    }
  });
  return d;
}

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
  renderer.setClearColor(0x000000);
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

  sceneViz.scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const sun = sceneViz.get("star/sol");
  if (sun) {
    sun.group.add(new THREE.PointLight(0xfff0d0, 3, 0, 2));
  }

  // ---- UI -----------------------------------------------------------------
  const ui = new HeliosUI(container, {
    onFocus: (id) => {
      const viz = sceneViz.get(id);
      if (!viz) return;
      sceneViz.scene.updateMatrixWorld(true);
      const world = new THREE.Vector3();
      viz.group.getWorldPosition(world);
      controls.flyTo(world, focusDistance(viz));
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
  // Sim time is seconds since the J2000 epoch; at timeRate = 1 the sim runs in
  // real time, so the default clock shows the current calendar date.
  const J2000_SEC = Date.UTC(2000, 0, 1, 12) / 1000;
  let simTime = Date.now() / 1000 - J2000_SEC;
  let last = performance.now();

  function tick(now: number): void {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (!ui.isPaused) {
      simTime += dt * ui.timeRate;
      sceneViz.update(simTime);
    }
    ui.updateHUD(simTime);
    controls.update(dt);
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