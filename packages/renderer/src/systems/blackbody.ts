/**
 * Blackbody color approximation (Tanner Helland / gist style).
 * Maps effective temperature in Kelvin to a tinted sRGB color via a
 * piecewise polynomial fit to the CIE blackbody locus. Deterministic,
 * good enough for scientific visualization where the goal is qualitative
 * stellar classification colors (M dwarfs red, Sun yellow-white, O stars
 * blue-white), not photographic accuracy.
 */

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function temperatureToRGB(temp: number): [number, number, number] {
  const t = clamp(temp / 100, 15, 400); // temp in hundreds of K

  let r: number, g: number, b: number;

  // Red
  if (t <= 66) {
    r = 255;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
  }

  // Green
  if (t <= 66) {
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
  } else {
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  }

  // Blue
  if (t >= 66) {
    b = 255;
  } else if (t <= 19) {
    b = 0;
  } else {
    b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  }

  return [
    clamp(r / 255, 0, 1),
    clamp(g / 255, 0, 1),
    clamp(b / 255, 0, 1),
  ];
}

// Sanity check probes used by tests
export const BLACKBODY_PROBES: Record<number, [number, number, number]> = {
  [2980]: temperatureToRGB(2980),
  [5772]: temperatureToRGB(5772),
  [10000]: temperatureToRGB(10000),
};