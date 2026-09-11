export const BLOOM = {
  enabled: true,
  strength: 0.7,
  radius: 16, // gaussian sigma, in half-res texels — controls glow width
  iterations: 4, // blur passes; more = wider, softer glow
  threshold: 1.0,
};