import * as THREE from "three";
import { RENDERER } from "../config/renderer.js";

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: RENDERER.antialias });
  const pixelRatio = Math.max(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(RENDERER.clearColor);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = RENDERER.toneMappingExposure;
  return renderer;
}