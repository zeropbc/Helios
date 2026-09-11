import { julianDate } from "../math/kepler.js";
import { MPC_CATALOG } from "../config/catalog.js";

function packedDate(value) {
  const year = value[0] === "K"
    ? 2000 + Number(value.slice(1, 3))
    : Number(value.slice(0, 2)) + 1900;
  const month = "123456789ABCDEFGH".indexOf(value[3]) + 1;
  const day = "123456789ABCDEFGHIJKLMNOPQRSTUV".indexOf(value[4]) + 1;
  return julianDate(new Date(Date.UTC(year, month - 1, day)));
}

function numberAt(line, start, end) {
  return Number(line.slice(start - 1, end).trim());
}

function parseMinorPlanet(line) {
  if (line.length < 95 || line[0] === "#" || line[0] === " ") return null;
  const epoch = packedDate(line.slice(21, 26));
  const meanMotion = numberAt(line, 78, 86);
  const semiMajorAxis = numberAt(line, 88, 95);
  if (!Number.isFinite(epoch) || !Number.isFinite(meanMotion) || !Number.isFinite(semiMajorAxis)) return null;
  return {
    name: line.slice(1, 7).trim() || `MPC-${line.slice(0, 7).trim()}`,
    orbit: {
      epoch_jd: epoch,
      mean_anomaly_deg: numberAt(line, 27, 35),
      longitude_periapsis_deg: numberAt(line, 38, 46),
      longitude_ascending_node_deg: numberAt(line, 48, 56),
      inclination_deg: numberAt(line, 58, 66),
      eccentricity: numberAt(line, 68, 76),
      mean_motion_deg_per_day: meanMotion,
      semi_major_axis_au: semiMajorAxis,
    },
  };
}

function parseComet(line) {
  const fields = line.trim().split(/\s+/);
  if (fields.length < 9 || !/^[A-Z][A-Z0-9]{7}$/.test(fields[0])) return null;
  const day = Number(fields[3]);
  const perihelionDate = new Date(Date.UTC(Number(fields[1]), Number(fields[2]) - 1, Math.floor(day)));
  perihelionDate.setUTCMinutes((day % 1) * 1440);
  const eccentricity = Number(fields[5]);
  if (!Number.isFinite(eccentricity) || eccentricity >= 1) return null;
  return {
    name: fields[0],
    orbit: {
      perihelion_jd: julianDate(perihelionDate),
      perihelion_distance_au: Number(fields[4]),
      eccentricity,
      longitude_periapsis_deg: Number(fields[6]),
      longitude_ascending_node_deg: Number(fields[7]),
      inclination_deg: Number(fields[8]),
    },
  };
}

function parseCatalog(text, parser, limit) {
  const bodies = [];
  for (const line of text.split(/\r?\n/)) {
    const body = parser(line);
    if (body) bodies.push(body);
    if (bodies.length >= limit) break;
  }
  return bodies;
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load MPC catalog ${url} (${response.status})`);
  return response.text();
}

export async function loadMpcBodies() {
  const [minorPlanets, comets] = await Promise.all([
    fetchText(MPC_CATALOG.minorPlanetsUrl),
    fetchText(MPC_CATALOG.cometsUrl),
  ]);
  return [
    ...parseCatalog(minorPlanets, parseMinorPlanet, MPC_CATALOG.maxObjects),
    ...parseCatalog(comets, parseComet, MPC_CATALOG.maxComets),
  ];
}
