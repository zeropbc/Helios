import {
  HeliosObject,
  Status,
} from "@helios/schemas";
import { AnyComponentInstance, createComponentInstances } from "../components/instances.js";
import { OrbitComponentInstance } from "../components/instances.js";
import { computeOrbitState } from "../systems/orbit-system.js";

/**
 * Runtime universe. Built from validated data objects. Objects are resolved
 * into ObjectInstances with component instances. The engine never switches
 * on identity.classification — behavior is driven entirely by components.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ObjectInstance {
  readonly id: string;
  readonly object: HeliosObject;
  readonly components: Map<string, AnyComponentInstance>;
  readonly children: ObjectInstance[];
  parent: ObjectInstance | null;
  /**
   * Position relative to parent, in meters, computed from the orbit
   * component at the current simulation time. Stored for the renderer to
   * consume each frame.
   */
  localPositionM: Vec3;
  /** Always current in the coordinate system of the primary. */
  renderPositionM: Vec3;
}

export class Universe {
  private byId = new Map<string, ObjectInstance>();
  private roots: ObjectInstance[] = [];

  constructor(objects: Iterable<HeliosObject>) {
    // First pass: create all instances, resolve components.
    for (const obj of objects) {
      const instance: ObjectInstance = {
        id: obj.id,
        object: obj,
        components: createComponentInstances(obj),
        children: [],
        parent: null,
        localPositionM: { x: 0, y: 0, z: 0 },
        renderPositionM: { x: 0, y: 0, z: 0 },
      };
      this.byId.set(obj.id, instance);
    }
    // Second pass: wire relationships and root detection.
    for (const instance of this.byId.values()) {
      const rel = instance.object.relationships;
      if (rel?.parent && this.byId.has(rel.parent)) {
        instance.parent = this.byId.get(rel.parent)!;
        instance.parent.children.push(instance);
      }
      if (rel?.children) {
        for (const childId of rel.children) {
          const child = this.byId.get(childId);
          if (child && child.parent == null) {
            child.parent = instance;
            instance.children.push(child);
          }
        }
      }
    }
    this.roots = [...this.byId.values()].filter((n) => n.parent == null);
  }

  get(id: string): ObjectInstance | undefined {
    return this.byId.get(id);
  }

  getComponent<T extends AnyComponentInstance>(
    id: string,
    componentName: string
  ): T | undefined {
    const inst = this.byId.get(id);
    return inst?.components.get(componentName) as T | undefined;
  }

  get rootsList(): ObjectInstance[] {
    return this.roots;
  }

  get size(): number {
    return this.byId.size;
  }

  all(): IterableIterator<ObjectInstance> {
    return this.byId.values();
  }

  /** Advance all orbiting bodies to time tS (seconds from epoch). */
  step(tS: number): void {
    for (const inst of this.byId.values()) {
      const orbit = inst.components.get("orbit");
      if (orbit && orbit.type === "orbit") {
        const state = computeOrbitState(orbit, tS);
        inst.localPositionM = state.positionM;
      } else {
        inst.localPositionM = { x: 0, y: 0, z: 0 };
      }
    }
    this.updateRenderPositions();
  }

  private updateRenderPositions(): void {
    // compute absolute positions in the top-level coordinate frame
    const stack: Array<{ inst: ObjectInstance; acc: Vec3 }> = [];
    for (const root of this.roots) {
      stack.push({ inst: root, acc: root.localPositionM });
    }
    while (stack.length > 0) {
      const { inst, acc } = stack.pop()!;
      inst.renderPositionM = acc;
      for (const child of inst.children) {
        stack.push({ inst: child, acc: add(acc, child.localPositionM) });
      }
    }
  }

  /** Orbit-paths of every orbiting body, for renderers that draw trails. */
  orbitPaths(): Map<string, Vec3[]> {
    const out = new Map<string, Vec3[]>();
    const samples = 128;
    for (const inst of this.byId.values()) {
      const orbit = inst.components.get("orbit");
      if (!orbit || orbit.type !== "orbit") continue;
      const path: Vec3[] = [];
      const periodS = orbit.periodS ?? 0;
      const tEnd = periodS > 0 ? periodS : 31557600;
      // Precompute a static-sample of the ellipse.
      for (let i = 0; i < samples; i++) {
        const t = (i / samples) * tEnd;
        const state = computeOrbitState(orbit, t);
        // path should be relative to primary (parent at origin in its frame)
        path.push(state.positionM);
      }
      out.set(inst.id, path);
    }
    return out;
  }
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export type { OrbitComponentInstance, Status };