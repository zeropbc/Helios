import * as THREE from "three";
import { Universe, ObjectInstance, computeOrbitState } from "@helios/engine";
import { buildObjectVisual, SCENE_SCALE } from "../components/object-visuals.js";
import { buildOrbitLine } from "../components/orbit-lines.js";

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