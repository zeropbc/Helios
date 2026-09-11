import * as THREE from "three";
import { CAMERA } from "../config/camera.js";

export function createCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, aspect, CAMERA.near, CAMERA.far);
  camera.name = "camera";
  camera.position.set(...CAMERA.startPosition);
  camera.lookAt(...CAMERA.startTarget);
  return camera;
}