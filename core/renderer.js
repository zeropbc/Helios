import * as THREE from "three";
import { RENDERER } from "../config/renderer.js";

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({
    antialias: RENDERER.antialias,
    logarithmicDepthBuffer: RENDERER.logarithmicDepthBuffer ?? true,
  });
  const pixelRatio = Math.min(
    Math.max(window.devicePixelRatio || 1, RENDERER.minPixelRatio),
    RENDERER.maxPixelRatio
  );
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(RENDERER.clearColor);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = RENDERER.toneMappingExposure;
  return renderer;
}