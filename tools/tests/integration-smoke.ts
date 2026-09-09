import { loadDataDirectory, validateLoad, buildUniverseGraph } from "@helios/data";
import { Universe, computeOrbitState } from "@helios/engine";
import { UniverseScene, temperatureToRGB } from "@helios/renderer";
import { fileURLToPath } from "node:url";
import * as fs from "node:fs";
import * as path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

function findDataDir(start: string): string {
  let cur = start;
  for (let i = 0; i < 12; i++) {
    if (fs.existsSync(path.join(cur, "data", "stars"))) {
      return path.join(cur, "data");
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  throw new Error("data/ directory not found");
}

const dataRoot = findDataDir(here);

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`  ✗ ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ ${msg}`);
  }
}

// ---- 1. validation ---------------------------------------------------------
console.log("validation:");
const result = loadDataDirectory(dataRoot);
const report = validateLoad(result);
assert(report.valid, `all data valid (${report.objectCount} objects)`);

// ---- 2. universe graph ----------------------------------------------------
console.log("universe graph:");
const graph = buildUniverseGraph(result);
assert(graph.size === result.objects.size, `graph has ${result.objects.size} nodes`);
const solNode = graph.get("star/sol");
assert(!!solNode && solNode.children.length === 4, "Sol has 4 planet children");

// ---- 3. engine: keplerian propagation --------------------------------------
console.log("engine:");
const universe = new Universe([...result.objects.values()].map((p) => p.object));
universe.step(0);
const earth = universe.get("planet/earth")!;
assert(earth.localPositionM.x !== 0 || earth.localPositionM.y !== 0, "Earth positioned by orbit");

const orbit = earth.components.get("orbit");
assert(!!orbit && orbit.type === "orbit", "Earth has orbit component");
// after half an Earth year the body should be at roughly aphelion
const halfYear = 0.5 * 365.256 * 86400;
const state = computeOrbitState(orbit as never, halfYear);
const rApo = Math.hypot(state.positionM.x, state.positionM.y);
const AU = 1.495978707e11;
assert(
  Math.abs(rApo - AU * (1 + 0.0167)) < AU * 0.02,
  `aphelion ≈ ${(rApo / AU).toFixed(3)} AU (expected ~1.017)`
);

// ---- 4. renderer: scene assembly -------------------------------------------
console.log("renderer:");
const sceneViz = new UniverseScene(universe);
sceneViz.update(halfYear);
assert(sceneViz.get("star/sol") !== undefined, "Sol visual built");
assert(sceneViz.get("planet/earth") !== undefined, "Earth visual built");
assert(sceneViz.get("moon/luna") !== undefined, "Luna visual built");
const solViz = sceneViz.get("star/sol")!;
assert(solViz.group.children.length > 0, "Sol group has rendered children");
console.log("  Visual hierarchy parented (Sol group has children)");

// ---- 5. blackbody colors ---------------------------------------------------
console.log("blackbody:");
const sun = temperatureToRGB(5772);
assert(sun[0] > sun[2], "Sun is warmer red than blue (yellow-white)");
const prox = temperatureToRGB(2980);
assert(prox[0] > prox[1] && prox[1] > prox[2], "Proxima red-dominant");
console.log(`  Sun RGB ${sun.map((v) => v.toFixed(2))} | Proxima RGB ${prox.map((v) => v.toFixed(2))}`);

// ---- 6. moving the simulation advances render positions --------------------
const earthVizBefore = sceneViz.get("planet/earth")!.group.position.clone();
sceneViz.update(halfYear + 0.25 * 365.256 * 86400);
const earthVizAfter = sceneViz.get("planet/earth")!.group.position.clone();
assert(
  earthVizBefore.distanceTo(earthVizAfter) > 1.8,
  `Earth moved ~${earthVizBefore.distanceTo(earthVizAfter).toFixed(2)} scene units between orbital phases`
);

console.log(process.exitCode ? "\nFAILED" : "\nALL PASS");