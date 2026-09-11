import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoundGlowPass } from "./round-glow-pass.js";
import { BLOOM } from "../config/post.js";

export function createComposer(renderer, scene, camera, width = renderer.domElement.width, height = renderer.domElement.height) {
  const composer = new EffectComposer(renderer);
  composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));

  const glowPass = BLOOM.enabled
    ? new RoundGlowPass(width, height, {
        strength: BLOOM.strength,
        radius: BLOOM.radius,
        iterations: BLOOM.iterations,
        threshold: BLOOM.threshold,
      })
    : null;
  if (glowPass) composer.addPass(glowPass);
  composer.addPass(new OutputPass());

  return { composer, bloomPass: glowPass };
}