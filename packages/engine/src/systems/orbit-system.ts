import { OrbitComponentInstance } from "../components/instances.js";

/**
 * Keplerian orbital propagation. Given a time offset from epoch and
 * classical orbital elements, produces the position in the primary's
 * reference frame (meters). Handles the two degeneracies one finds in real
 * astronomical data: circular orbits and near-zero inclinations.
 */

export interface KeplerElements {
  semiMajorAxisM: number;
  eccentricity: number;
  inclinationDeg: number;
  longitudeOfAscendingNodeDeg: number;
  argumentOfPeriapsisDeg: number;
  periodS: number;
  // mean longitude at epoch, degrees. Optional — defaults to 0.
  meanLongitude0Deg?: number;
}

export interface KeplerState {
  positionM: { x: number; y: number; z: number };
  trueAnomalyDeg: number;
  meanAnomalyDeg: number;
  eccentricAnomalyDeg: number;
}

const DEG = Math.PI / 180;

export function meanAnomalyAt(
  periodS: number,
  meanLongitude0Deg: number,
  tS: number
): number {
  // mean longitude = mean longitude at epoch + n * (t - t0)
  const n = (2 * Math.PI) / periodS; // rad/s
  const M = (meanLongitude0Deg * DEG + n * tS) % (2 * Math.PI);
  // normalize to [-pi, pi)
  return normalizeAngle(M);
}

function normalizeAngle(a: number): number {
  let r = a % (2 * Math.PI);
  if (r > Math.PI) r -= 2 * Math.PI;
  if (r < -Math.PI) r += 2 * Math.PI;
  return r;
}

/**
 * Solve Kepler's equation M = E - e sin E via Newton-Raphson.
 * Robust for e up to 0.999; the test suite uses e >= 0.
 */
export function solveKepler(
  M: number,
  e: number,
  tolerance = 1e-10,
  maxIter = 100
): number {
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < maxIter; i++) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    const dE = f / fp;
    E -= dE;
    if (Math.abs(dE) < tolerance) break;
  }
  return E;
}

export function trueAnomaly(E: number, e: number): number {
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );
  return nu;
}

/**
 * Position of the orbiting body relative to its primary, in the orbital
 * plane (standard perifocal frame).
 */
export function perifocalPosition(a: number, e: number, nu: number): { x: number; y: number } {
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
  return { x: r * Math.cos(nu), y: r * Math.sin(nu) };
}

/**
 * Rotate perifocal coordinates into a 3D frame using the classical Euler
 * angles (node Ω, inclination i, argument of periapsis ω).
 */
export function rotateToInertial(
  pf: { x: number; y: number },
  inclinationDeg: number,
  nodeDeg: number,
  periapsisDeg: number
): { x: number; y: number; z: number } {
  const i = inclinationDeg * DEG;
  const Om = nodeDeg * DEG;
  const w = periapsisDeg * DEG;

  // Periapsis rotation
  const cosw = Math.cos(w), sinw = Math.sin(w);
  const x1 = pf.x * cosw - pf.y * sinw;
  const y1 = pf.x * sinw + pf.y * cosw;

  // Inclination rotation
  const cosi = Math.cos(i), sini = Math.sin(i);
  const x2 = x1;
  const y2 = y1 * cosi;
  const z2 = y1 * sini;

  // Node rotation
  const cosO = Math.cos(Om), sinO = Math.sin(Om);
  const x = x2 * cosO - y2 * sinO;
  const y = x2 * sinO + y2 * cosO;
  const z = z2;

  return { x, y, z };
}

export function computeOrbitState(
  orbit: OrbitComponentInstance,
  tS: number
): KeplerState {
  const a = orbit.semiMajorAxisM ?? 1;
  const e = orbit.eccentricity ?? 0;
  const M0 = 0; // mean longitude at epoch defaults to 0
  const periodS = orbit.periodS ?? keplerPeriod(a);

  const M = meanAnomalyAt(periodS, M0, tS);
  const E = solveKepler(M, e);
  const nu = trueAnomaly(E, e);
  const pf = perifocalPosition(a, e, nu);
  const pos = rotateToInertial(
    pf,
    orbit.inclinationDeg ?? 0,
    orbit.longitudeOfAscendingNodeDeg ?? 0,
    orbit.argumentOfPeriapsisDeg ?? 0
  );

  return {
    positionM: pos,
    trueAnomalyDeg: nu / DEG,
    meanAnomalyDeg: M / DEG,
    eccentricAnomalyDeg: E / DEG,
  };
}

/** Kepler's third law giving an uncertified period from a alone. */
export function keplerPeriod(semiMajorAxisM: number): number {
  const mu = 1.32712440018e20; // standard gravitational parameter of the Sun, m^3/s^2
  const a3 = semiMajorAxisM * semiMajorAxisM * semiMajorAxisM;
  return 2 * Math.PI * Math.sqrt(a3 / mu);
}

export function elementsFromInstance(
  orbit: OrbitComponentInstance
): KeplerElements {
  return {
    semiMajorAxisM: orbit.semiMajorAxisM ?? 1,
    eccentricity: orbit.eccentricity ?? 0,
    inclinationDeg: orbit.inclinationDeg ?? 0,
    longitudeOfAscendingNodeDeg: orbit.longitudeOfAscendingNodeDeg ?? 0,
    argumentOfPeriapsisDeg: orbit.argumentOfPeriapsisDeg ?? 0,
    periodS: orbit.periodS ?? keplerPeriod(orbit.semiMajorAxisM ?? 1),
  };
}