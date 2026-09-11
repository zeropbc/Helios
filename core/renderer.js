import * as THREE from "three";
import { RENDERER } from "../config/renderer.js";

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: RENDERER.antialias });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(RENDERER.pixelRatio);
  renderer.setClearColor(RENDERER.clearColor);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = RENDERER.toneMappingExposure;
  return renderer;
}