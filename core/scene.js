import * as THREE from "three";

export function createScene() {
  const scene = new THREE.Scene();
  scene.name = "universe";
  return scene;
}