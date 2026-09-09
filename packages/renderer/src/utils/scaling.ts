/**
 * Non-linear scene scaling. Physical reality spans ~10^11 m (planets) to
 * ~10^12 m (orbits) to ~10^16 m (interstellar). A raw linear scale makes
 * planets invisible. Helios uses a logarithmic distance scale so the
 * hierarchy reads correctly while preserving ordering and relative
 * proximity.
 */

export const RENDER_SCALE = 1 / 1e9; // 1 m → 1e-9 scene units (1e9 m per unit)

/**
 * Maps real distance/size (meters) to a quasi-logarithmic scene unit.
 * Small sizes stay roughly linear; large sizes compress.
 */
export function scaleLog(meters: number, refFloor = 1e6): number {
  // Below floor: linear. Above: logarithmic.
  if (meters <= refFloor) return meters / refFloor;
  const lg = Math.log10(meters);
  const lgFloor = Math.log10(refFloor);
  const lgCeil = Math.log10(1e17);
  const t = clamp((lg - lgFloor) / (lgCeil - lgFloor), 0, 1);
  return 1 + t * 9; // maps [refFloor, 1e17] → [1, 10]
}

/**
 * Returns (scenePosition, sceneRadius) for a body given its real orbit
 * distance from primary and real radius, using the log scale so parent
 * bodies remain recognizable and orbits render visibly.
 */
export function bodySceneTransform(
  realDistanceM: number,
  realRadiusM: number
): { x: number; radius: number } {
  const x = scaleLog(realDistanceM);
  // radii: minimum visible size to stay perceivable
  const minRadius = 0.06;
  const radiusScene = Math.max(minRadius, scaleLog(realRadiusM) * 0.35);
  return { x, radius: radiusScene };
}

export function sceneDistanceFromLog(logUnits: number): number {
  // inverse of scaleLog for the logarithmic band
  return Math.pow(10, ((logUnits - 1) / 9) * 17) * 1e6;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}