import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CAMERA } from "../config/camera.js?v=zoom-labels";

export function createControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = CAMERA.dampingFactor;
  controls.minDistance = CAMERA.minDistance;
  controls.maxDistance = CAMERA.maxDistance;
  controls.panSpeed = CAMERA.panSpeed;
  controls.rotateSpeed = CAMERA.rotateSpeed;
  controls.target.set(...CAMERA.startTarget);
  return controls;
}