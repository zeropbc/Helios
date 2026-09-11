import * as THREE from "three";

export function createSunLight() {
  const light = new THREE.PointLight(0xfff0dd, 2.5, 0, 0.5);
  light.name = "sun-light";
  return light;
}

export function createAmbientLight() {
  const light = new THREE.AmbientLight(0xffffff, 0.04);
  light.name = "ambient";
  return light;
}

export const LIGHTS = { createSunLight, createAmbientLight };