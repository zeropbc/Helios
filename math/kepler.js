import * as THREE from "three";
import { TAU } from "../config/constants.js";
import { astronomicalUnitsToSceneUnits } from "../config/units.js";

const DEG = Math.PI / 180;
const CENTURY_DAYS = 36525;

export function julianDate(date = new Date()) {
  return date.getTime() / 86400000 + 2440587.5;
}

export function centuriesSinceJ2000(date = new Date()) {
  return (julianDate(date) - 2451545.0) / CENTURY_DAYS;
}

function solveKepler(meanAnomaly, eccentricity) {
  let eccentricAnomaly = meanAnomaly;
  for (let i = 0; i < 6; i += 1) {
    eccentricAnomaly -=
      (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly) /
      (1 - eccentricity * Math.cos(eccentricAnomaly));
  }
  return eccentricAnomaly;
}

/**
 * Converts J2000 ecliptic orbital elements to Three.js coordinates.
 * Angles are in degrees in JSON and positions are scene units (AU * AU).
 */
export function positionFromElements(elements, date = new Date()) {
  const t = centuriesSinceJ2000(date);
  const value = (key) => elements[key] + (elements.rates?.[key] ?? 0) * t;
  const a = elements.perihelion_distance_au
    ? elements.perihelion_distance_au / (1 - elements.eccentricity)
    : value("semi_major_axis_au");
  const e = value("eccentricity");
  const inclination = value("inclination_deg") * DEG;
  const node = value("longitude_ascending_node_deg") * DEG;
  const periapsis = value("longitude_periapsis_deg") * DEG;
  let meanAnomaly;
  if (elements.perihelion_jd !== undefined) {
    const gaussianConstant = 0.01720209895;
    meanAnomaly = gaussianConstant * (julianDate(date) - elements.perihelion_jd) /
      Math.pow(a, 1.5);
  } else if (elements.epoch_jd !== undefined) {
    const elapsedDays = julianDate(date) - elements.epoch_jd;
    meanAnomaly = (elements.mean_anomaly_deg * DEG) +
      (elements.mean_motion_deg_per_day * DEG * elapsedDays);
  } else {
    const longitude = value("mean_longitude_deg") * DEG;
    meanAnomaly = longitude - periapsis;
  }
  meanAnomaly = THREE.MathUtils.euclideanModulo(meanAnomaly, TAU);
  const eccentricAnomaly = solveKepler(meanAnomaly, e);
  const trueAnomaly = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(eccentricAnomaly / 2),
    Math.sqrt(1 - e) * Math.cos(eccentricAnomaly / 2)
  );
  const radius = a * (1 - e * Math.cos(eccentricAnomaly));
  const argumentOfPeriapsis = periapsis - node;
  const orbitalPosition = new THREE.Vector3(
    radius * Math.cos(trueAnomaly),
    0,
    radius * Math.sin(trueAnomaly)
  );

  orbitalPosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), -argumentOfPeriapsis);
  orbitalPosition.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclination);
  orbitalPosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), -node);

  return {
    x: astronomicalUnitsToSceneUnits(orbitalPosition.x),
    y: astronomicalUnitsToSceneUnits(orbitalPosition.y),
    z: astronomicalUnitsToSceneUnits(orbitalPosition.z),
    r: astronomicalUnitsToSceneUnits(radius),
  };
}

export function semiMinor(a, e) {
  return a * Math.sqrt(1 - e * e);
}

export function orbitPoints(config, segments = 256) {
  const points = [];
  const baseOrbit = { ...config.orbit, rates: undefined };
  for (let i = 0; i <= segments; i += 1) {
    const orbit = {
      ...baseOrbit,
      mean_longitude_deg: baseOrbit.mean_longitude_deg + (i / segments) * 360,
    };
    const position = positionFromElements(orbit, new Date(Date.UTC(2000, 0, 1, 12)));
    points.push(new THREE.Vector3(position.x, position.y, position.z));
  }
  return points;
}
