import { TAU } from "../config/constants.js";

const DAY = 86400; // seconds per day

/** Real sidereal orbital period in days. */
const PERIOD_DAYS = {
  Mercury: 87.97,
  Venus: 224.7,
  Earth: 365.25,
  Mars: 686.98,
  Jupiter: 4332.59,
  Saturn: 10759.22,
  Uranus: 30688.5,
  Neptune: 60182,
};

/** Orbital angular speed: one full revolution per real period. */
const speed = (days) => TAU / (days * DAY);

/** Solar system planet configs (hardcoded for a simple demo). */
export const PLANET_CONFIGS = [
  { name: "Mercury", id: "mercury", r: 0.4, a: 0.39 * 30, e: 0.206, color: 0xaaaaaa, speed: speed(PERIOD_DAYS.Mercury) },
  { name: "Venus",   id: "venus",   r: 0.9, a: 0.72 * 30, e: 0.007, color: 0xe8cda0, speed: speed(PERIOD_DAYS.Venus) },
  { name: "Earth",   id: "earth",   r: 1.0, a: 1.00 * 30, e: 0.017, color: 0x4488cc, speed: speed(PERIOD_DAYS.Earth) },
  { name: "Mars",    id: "mars",    r: 0.55, a: 1.52 * 30, e: 0.093, color: 0xcc5533, speed: speed(PERIOD_DAYS.Mars) },
  { name: "Jupiter", id: "jupiter", r: 3.5, a: 3.20 * 30, e: 0.049, color: 0xc8a060, speed: speed(PERIOD_DAYS.Jupiter) },
  { name: "Saturn",  id: "saturn",  r: 3.0, a: 5.00 * 30, e: 0.057, color: 0xd4b87a, speed: speed(PERIOD_DAYS.Saturn) },
  { name: "Uranus",  id: "uranus",  r: 1.8, a: 7.00 * 30, e: 0.046, color: 0x88ccdd, speed: speed(PERIOD_DAYS.Uranus) },
  { name: "Neptune", id: "neptune", r: 1.7, a: 9.00 * 30, e: 0.010, color: 0x3355aa, speed: speed(PERIOD_DAYS.Neptune) },
];