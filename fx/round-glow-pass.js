import {
  HalfFloatType,
  ShaderMaterial,
  UniformsUtils,
  WebGLRenderTarget,
  Vector2,
} from "three";
import { Pass, FullScreenQuad } from "three/addons/postprocessing/Pass.js";

const MAX_TAPS = 33;

function gaussianWeights(sigma) {
  const ws = [];
  let sum = 0;
  const spacing = (3 * sigma) / (MAX_TAPS - 1);
  for (let i = 0; i < MAX_TAPS; i++) {
    const x = i * spacing;
    const w = Math.exp(-(x * x) / (2 * sigma * sigma));
    ws.push(w);
    sum += i === 0 ? w : 2 * w;
  }
  for (let i = 0; i < MAX_TAPS; i++) ws[i] /= sum;
  return ws;
}

const thresholdShader = {
  uniforms: {
    tDiffuse: { value: null },
    threshold: { value: 1.0 },
  },
  vertexShader: `varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse;
    uniform float threshold;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float w = max(max(c.r, c.g), c.b);
      float bloom = smoothstep(threshold * 0.65, threshold * 2.2, w);
      gl_FragColor = vec4(c * bloom, 1.0);
    }`,
};

const blurShader = {
  uniforms: {
    tDiffuse: { value: null },
    direction: { value: new Vector2(1, 0) },
    texelSize: { value: new Vector2(1, 1) },
    sigma: { value: 4.0 },
    weights: { value: gaussianWeights(4.0) },
  },
  vertexShader: `varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse;
    uniform vec2 direction;
    uniform vec2 texelSize;
    uniform float sigma;
    uniform float weights[MAX_TAPS];
    varying vec2 vUv;
    void main() {
      vec2 off = direction * texelSize;
      vec3 c = texture2D(tDiffuse, vUv).rgb * weights[0];
      for (int i = 1; i < MAX_TAPS; i++) {
        c += texture2D(tDiffuse, vUv + off * float(i)).rgb * weights[i];
        c += texture2D(tDiffuse, vUv - off * float(i)).rgb * weights[i];
      }
      gl_FragColor = vec4(c, 1.0);
    }`,
};

const compositeShader = {
  uniforms: {
    tScene: { value: null },
    tBloom: { value: null },
    strength: { value: 1.0 },
  },
  vertexShader: `varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tScene;
    uniform sampler2D tBloom;
    uniform float strength;
    varying vec2 vUv;
    vec3 ACESFilm(vec3 x) {
      float a = 2.51;
      float b = 0.03;
      float c = 2.43;
      float d = 0.59;
      float e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }
    void main() {
      vec3 scene = texture2D(tScene, vUv).rgb;
      vec3 bloom = texture2D(tBloom, vUv).rgb;
      vec3 color = scene + bloom * strength;
      gl_FragColor = vec4(ACESFilm(color), 1.0);
    }`,
};

export class RoundGlowPass extends Pass {
  constructor(width, height, params) {
    super();
    this.params = params;
    this.thresholdMaterial = new ShaderMaterial(thresholdShader);
    this.blurMaterial = new ShaderMaterial({
      ...blurShader,
      defines: { MAX_TAPS },
    });
    this.compositeMaterial = new ShaderMaterial(compositeShader);
    this.fsQuad = new FullScreenQuad(null);

    const w = Math.max(1, Math.round(width / 2));
    const h = Math.max(1, Math.round(height / 2));
    this.targetA = new WebGLRenderTarget(w, h, { type: HalfFloatType });
    this.targetB = new WebGLRenderTarget(w, h, { type: HalfFloatType });
    [this.targetA, this.targetB].forEach((t) => {
      t.texture.generateMipmaps = false;
    });
    this.applyParams();
    this.setSize(width, height);
  }

  applyParams() {
    const p = this.params;
    this.thresholdMaterial.uniforms.threshold.value = p.threshold;
    this.blurMaterial.uniforms.sigma.value = p.radius;
    this.blurMaterial.uniforms.weights.value = gaussianWeights(p.radius);
    this.blurMaterial.uniforms.texelSize.value.set(1, 1);
    this.compositeMaterial.uniforms.strength.value = p.strength;
  }

  setSize(width, height) {
    const w = Math.max(1, Math.round(width / 2));
    const h = Math.max(1, Math.round(height / 2));
    this.targetA.setSize(w, h);
    this.targetB.setSize(w, h);
    this.blurMaterial.uniforms.texelSize.value.set(1 / w, 1 / h);
  }

  render(renderer, writeBuffer, readBuffer) {
    const blurPass = (src, dst) => {
      this.fsQuad.material = this.blurMaterial;
      renderer.setRenderTarget(dst);
      renderer.clear();
      this.fsQuad.render(renderer);
    };

    // 1. threshold: bright pixels -> targetA
    this.fsQuad.material = this.thresholdMaterial;
    this.thresholdMaterial.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.targetA);
    renderer.clear();
    this.fsQuad.render(renderer);

    // 2. repeated isotropic (H + V) gaussian blur, ping-pong
    let src = this.targetA;
    for (let i = 0; i < this.params.iterations; i++) {
      const dst = src === this.targetA ? this.targetB : this.targetA;
      this.blurMaterial.uniforms.tDiffuse.value = src.texture;
      this.blurMaterial.uniforms.direction.value.set(1, 0);
      blurPass(src, dst);

      this.blurMaterial.uniforms.tDiffuse.value = dst.texture;
      this.blurMaterial.uniforms.direction.value.set(0, 1);
      blurPass(dst, dst === this.targetA ? this.targetB : this.targetA);
      src = dst === this.targetA ? this.targetB : this.targetA;
    }

    // 3. composite scene + bloom -> writeBuffer
    this.compositeMaterial.uniforms.tScene.value = readBuffer.texture;
    this.compositeMaterial.uniforms.tBloom.value = src.texture;
    this.fsQuad.material = this.compositeMaterial;
    renderer.setRenderTarget(writeBuffer || null);
    renderer.clear();
    this.fsQuad.render(renderer);
  }

  dispose() {
    [this.targetA, this.targetB].forEach((t) => t.dispose());
    [this.thresholdMaterial, this.blurMaterial, this.compositeMaterial].forEach((m) => m.dispose());
    this.fsQuad.dispose();
  }
}