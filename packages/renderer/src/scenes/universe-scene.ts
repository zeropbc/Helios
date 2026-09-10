import * as THREE from "three";
import { Universe, ObjectInstance, computeOrbitState } from "@helios/engine";
import { buildObjectVisual, SCENE_SCALE } from "../components/object-visuals.js";
import { buildOrbitLine } from "../components/orbit-lines.js";
import { temperatureToRGB } from "../systems/blackbody.js";

// Times 1 L_sun at 1 scene unit: tunes where decay-2 point lights land so a
// planet at ~12.3 units (Earth) reaches a comfortable daylight irradiance.
const STELLAR_INTENSITY = 160;

function buildStarLights(universe: Universe, visuals: Map<string, SceneVisual>): void {
  for (const inst of universe.all()) {
    const ls = inst.components.get("light_source");
    if (!ls || ls.type !== "light_source") continue;
    const viz = visuals.get(inst.id);
    if (!viz) continue;

    const lumW = ls.luminosityW;
    const tempK = ls.effectiveTemperatureK ?? 5772;
    const color = new THREE.Color().setRGB(...temperatureToRGB(tempK));
    const lumRatio = lumW / 3.828e26;

    const light = new THREE.PointLight(color, STELLAR_INTENSITY * lumRatio, 0, 2);
    // Shadows only for the dominant star of a system — planet terminator
    // realism where scale actually resolves.
    if (lumRatio > 0.5) {
      light.castShadow = true;
      light.shadow.mapSize.set(1024, 1024);
      light.shadow.camera.near = 0.1;
      light.shadow.camera.far = 220;
      light.shadow.bias = -0.0002;
    }
    viz.group.add(light);
  }
}

/**
 * UniverseScene mirrors the engine's universe graph as a Three.js scene.
 * Every object gets a THREE.Group; orbiting objects are parented to their
 * primary so the hierarchy nests naturally. Positions are computed from
 * orbit components each tick — never from classification.
 */

export interface SceneVisual {
  group: THREE.Group;
  instance: ObjectInstance;
}

export class UniverseScene {
  readonly scene: THREE.Scene;
  private visuals = new Map<string, SceneVisual>();
  private orbitLines = new Map<string, THREE.Line>();
  private parent = new Map<string, string>();
  private universe: Universe;

  constructor(universe: Universe) {
    this.universe = universe;
    this.scene = new THREE.Scene();
    this.build();
  }

  private build(): void {
    // Create a visual group for every object.
    for (const inst of this.universe.all()) {
      const group = buildObjectVisual(inst);
      const v: SceneVisual = { group, instance: inst };
      this.visuals.set(inst.id, v);
    }

    // Attach groups following the universe's parent-child wiring.
    for (const inst of this.universe.all()) {
      const viz = this.visuals.get(inst.id)!;
      if (inst.parent) {
        const parentViz = this.visuals.get(inst.parent.id);
        if (parentViz) {
          parentViz.group.add(viz.group);
          this.parent.set(inst.id, inst.parent.id);
        } else {
          this.scene.add(viz.group);
        }
      } else {
        this.scene.add(viz.group);
      }
    }

    this.buildOrbitLines();
    buildStarLights(this.universe, this.visuals);
  }

  private buildOrbitLines(): void {
    for (const inst of this.universe.all()) {
      const orbit = inst.components.get("orbit");
      if (!orbit || orbit.type !== "orbit") continue;
      const line = buildOrbitLine(orbit);
      const primaryId = orbit.primary;
      const primaryViz = this.visuals.get(primaryId);
      if (primaryViz) {
        primaryViz.group.add(line);
      } else {
        this.scene.add(line);
      }
      this.orbitLines.set(inst.id, line);
    }
  }

  /** Advance the simulation to time tS and update all group positions. */
  update(tS: number): void {
    this.universe.step(tS);
    for (const viz of this.visuals.values()) {
      const orbit = viz.instance.components.get("orbit");
      if (orbit && orbit.type === "orbit") {
        const state = computeOrbitState(orbit, tS);
        viz.group.position.set(
          state.positionM.x * SCENE_SCALE,
          state.positionM.y * SCENE_SCALE,
          state.positionM.z * SCENE_SCALE
        );
      } else {
        viz.group.position.set(0, 0, 0);
      }
    }
  }

  get(id: string): SceneVisual | undefined {
    return this.visuals.get(id);
  }

  all(): IterableIterator<SceneVisual> {
    return this.visuals.values();
  }
}