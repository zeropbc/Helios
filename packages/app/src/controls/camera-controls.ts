import * as THREE from "three";

/**
 * Minimal orbit camera. Left-drag orbits, wheel zooms, right-drag pans.
 * Follows a target point; call update() each frame.
 */

export interface CameraControlOptions {
  domElement: HTMLElement;
  camera: THREE.PerspectiveCamera;
  target: THREE.Vector3;
  minDistance: number;
  maxDistance: number;
}

export class OrbitCamera {
  private dom: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  target: THREE.Vector3;
  private azimuth = 0.6;
  private polar = 1.2;
  private distance = 40;
  private minDistance: number;
  private maxDistance: number;

  private dragging = false;
  private rightDragging = false;
  private lastX = 0;
  private lastY = 0;

  constructor(opts: CameraControlOptions) {
    this.dom = opts.domElement;
    this.camera = opts.camera;
    this.target = opts.target;
    this.minDistance = opts.minDistance;
    this.maxDistance = opts.maxDistance;

    this.dom.addEventListener("pointerdown", (e) => this.onDown(e));
    this.dom.addEventListener("pointermove", (e) => this.onMove(e));
    this.dom.addEventListener("pointerup", () => this.onUp());
    this.dom.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
  }

  private onDown(e: PointerEvent): void {
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
      this.azimuth -= dx * 0.005;
      this.polar = clamp(this.polar - dy * 0.005, 0.05, Math.PI - 0.05);
    } else if (this.rightDragging) {
      // pan in the camera plane using the camera's right and up vectors
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
      const up = new THREE.Vector3().crossVectors(right, forward).normalize();
      const scale = this.distance * 0.0015;
      this.target.addScaledVector(right, -dx * scale);
      this.target.addScaledVector(up, dy * scale);
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const factor = Math.exp(e.deltaY * 0.001);
    this.distance = clamp(this.distance * factor, this.minDistance, this.maxDistance);
  }

  focusOn(position: THREE.Vector3, distance?: number): void {
    if (distance !== undefined) this.distance = distance;
    this.target.copy(position);
  }

  update(): void {
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

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}