import * as THREE from "three";

/**
 * Google Earth-style orbit camera.
 * - Left-drag orbits, right-drag pans, wheel zooms toward the cursor.
 * - All motions are frame-rate-independent and exponentially damped, so the
 *   view glides smoothly and carries slight inertia.
 * - flyTo() tween-eases the view between focus points.
 * Call update(dt) each frame with the seconds since the last frame.
 */

export interface CameraControlOptions {
  domElement: HTMLElement;
  camera: THREE.PerspectiveCamera;
  target: THREE.Vector3;
  minDistance: number;
  maxDistance: number;
}

interface FlyAnim {
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromDist: number;
  toDist: number;
  elapsed: number;
  duration: number;
}

const DAMP_RESPONSE = 14; // 1/s — higher = snappier, lower = floatier
const ORBIT_SPEED = 0.005; // rad / px
const PAN_SPEED = 0.0015;
const ZOOM_FACTOR = 0.0018;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class OrbitCamera {
  private dom: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private minDistance: number;
  private maxDistance: number;

  private target: THREE.Vector3;
  private targetDest: THREE.Vector3;
  private azimuth = 0.6;
  private polar = 1.2;
  private distance = 40;
  private azimuthDest = 0.6;
  private polarDest = 1.2;
  private distanceDest = 40;

  private fly: FlyAnim | null = null;
  private dragging = false;
  private rightDragging = false;
  private lastX = 0;
  private lastY = 0;

  constructor(opts: CameraControlOptions) {
    this.dom = opts.domElement;
    this.camera = opts.camera;
    this.minDistance = opts.minDistance;
    this.maxDistance = opts.maxDistance;
    this.target = opts.target.clone();
    this.targetDest = opts.target.clone();

    this.dom.addEventListener("pointerdown", (e) => this.onDown(e));
    this.dom.addEventListener("pointermove", (e) => this.onMove(e));
    this.dom.addEventListener("pointerup", () => this.onUp());
    this.dom.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
  }

  private onDown(e: PointerEvent): void {
    this.cancelFly();
    if (e.button === 2) this.rightDragging = true;
    else this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  private onUp(): void {
    this.dragging = false;
    this.rightDragging = false;
  }

  private onMove(e: PointerEvent): void {
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    if (this.dragging) {
      this.azimuthDest -= dx * ORBIT_SPEED;
      this.polarDest = clamp(this.polarDest - dy * ORBIT_SPEED, 0.05, Math.PI - 0.05);
    } else if (this.rightDragging) {
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
      const up = new THREE.Vector3().crossVectors(right, forward).normalize();
      const scale = this.distance * PAN_SPEED;
      this.target.addScaledVector(right, -dx * scale);
      this.target.addScaledVector(up, dy * scale);
      this.targetDest.copy(this.target);
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.cancelFly();
    const newDist = clamp(
      this.distanceDest * Math.exp(e.deltaY * ZOOM_FACTOR),
      this.minDistance,
      this.maxDistance
    );
    if (newDist === this.distanceDest) return;
    const f = newDist / this.distanceDest;

    // Zoom toward the point under the cursor: scale the target's offset from
    // that point so the object under the pointer stays put on screen.
    const rect = this.dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const gaze = new THREE.Vector3();
    ray.ray.closestPointToPoint(this.target, gaze);
    this.targetDest.sub(gaze).multiplyScalar(f).add(gaze);
    this.distanceDest = newDist;
  }

  focusOn(position: THREE.Vector3, distance?: number): void {
    this.cancelFly();
    this.targetDest.copy(position);
    if (distance !== undefined) {
      this.distanceDest = clamp(distance, this.minDistance, this.maxDistance);
    }
  }

  getTarget(): THREE.Vector3 {
    return this.target;
  }

  getDistance(): number {
    return this.distance;
  }

  flyTo(position: THREE.Vector3, distance?: number, durationMs = 1100): void {
    this.cancelFly();
    this.fly = {
      fromPos: this.target.clone(),
      toPos: position.clone(),
      fromDist: this.distance,
      toDist: distance === undefined ? this.distance : clamp(distance, this.minDistance, this.maxDistance),
      elapsed: 0,
      duration: durationMs / 1000,
    };
  }

  private cancelFly(): void {
    this.fly = null;
  }

  update(dt: number): void {
    if (this.fly) {
      this.fly.elapsed += Math.max(dt, 0);
      const t = clamp(this.fly.elapsed / this.fly.duration, 0, 1);
      const e = easeInOutCubic(t);
      this.targetDest.lerpVectors(this.fly.fromPos, this.fly.toPos, e);
      this.distanceDest = this.fly.fromDist + (this.fly.toDist - this.fly.fromDist) * e;
      if (t >= 1) this.fly = null;
    }

    // Frame-rate-independent exponential damping toward the goal state.
    const k = 1 - Math.exp(-DAMP_RESPONSE * Math.max(dt, 0));
    const polarGoal = clamp(this.polarDest, 0.05, Math.PI - 0.05);
    this.azimuth += (this.azimuthDest - this.azimuth) * k;
    this.polar += (polarGoal - this.polar) * k;
    this.distance += (this.distanceDest - this.distance) * k;
    this.target.lerp(this.targetDest, k);

    const sinP = Math.sin(this.polar);
    const dir = new THREE.Vector3(
      this.distance * sinP * Math.cos(this.azimuth),
      this.distance * Math.cos(this.polar),
      this.distance * sinP * Math.sin(this.azimuth)
    );
    this.camera.position.copy(this.target).add(dir);
    this.camera.lookAt(this.target);
  }
}