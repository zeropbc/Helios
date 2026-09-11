import { positionFromElements } from "../math/kepler.js";

export function createOrbiter(config) {
  return {
    config,
    getPosition(date = new Date()) {
      return positionFromElements(config.orbit, date);
    },
  };
}
