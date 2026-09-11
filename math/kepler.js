/**
 * Position along a Keplerian orbit.
 * @param {number} a semi-major axis
 * @param {number} e  eccentricity (0..1)
 * @param {number} nu true anomaly (radians)
 * @returns {{x: number, z: number, r: number}}
 */
export function positionOnOrbit(a, e, nu) {
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
  return { x: r * Math.cos(nu), z: r * Math.sin(nu), r };
}

/** Semi-minor axis for an ellipse of given semi-major axis and eccentricity. */
export function semiMinor(a, e) {
  return a * Math.sqrt(1 - e * e);
}

/** Distance from ellipse center to focus (linear eccentricity). */
export function focal(a, e) {
  return a * e;
}