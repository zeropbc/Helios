import { positionOnOrbit } from "../math/kepler.js";

/**
 * Drives one planet along its Keplerian orbit.
 * `nu` advances at fixed angular speed (visual simplification — true
 * orbital periods vary, but this keeps motion pleasantly readable).
 */
export function createOrbiter(config) {
  let nu = config.startNu ?? 0;

  return {
    config,
    step(delta) {
      nu += delta * config.speed;
    },
    getPosition(target = {}) {
      return positionOnOrbit(config.a, config.e, nu);
    },
    get nu() {
      return nu;
    },
  };
}