const MANIFEST_URL = new URL("../bodies/manifest.json", import.meta.url);
const SATURN_MOON_SOURCES = [
  "../db/Moons_of_Saturn_1.csv",
  "../db/Moons_of_Saturn_2.csv",
  "../db/Moons_of_Saturn_3.csv",
  "../db/Moons_of_Saturn_4.csv",
];
const KNOWN_RADII_KM = {
  Moon: 1737.4, Phobos: 11.27, Deimos: 6.2,
  Io: 1821.6, Europa: 1560.8, Ganymede: 2634.1, Callisto: 2410.3,
  Amalthea: 83.5, Metis: 21.5, Thebe: 49.3, Himalia: 69.8, Elara: 43,
  Mimas: 198.2, Enceladus: 252.1, Tethys: 531.1, Dione: 561.4,
  Rhea: 763.8, Titan: 2574.7, Iapetus: 734.5, Janus: 89.5,
  Epimetheus: 58.1, Phoebe: 106.5, Atlas: 15.5, Prometheus: 43.1,
  Pandora: 40.7, Pan: 14.1, Daphnis: 4.9, Aegaeon: 0.3,
  Methone: 1.6, Anthe: 1.0, Pallene: 2.5, Telesto: 12.4,
  Helene: 17.6, Miranda: 235.8, Ariel: 578.9,
  Umbriel: 584.7, Titania: 788.9, Oberon: 761.4, Puck: 81,
  Triton: 1353.4, Nereid: 170, Proteus: 210, Charon: 606,
  Nix: 23, Hydra: 30.5, Eris: 1163, Haumea: 816, Makemake: 715,
  Gonggong: 615, Quaoar: 555, Sedna: 497.5, Orcus: 455,
  Salacia: 423, Varda: 370, Ixion: 325, Varuna: 334, Chiron: 100,
  Chariklo: 124, Pholus: 190, Hidalgo: 38,
};

function requiredNumber(value, path) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid body data at ${path}: expected a finite number`);
  }
  return value;
}

function normalizeBody(body, path) {
  if (!body || typeof body.name !== "string") {
    throw new Error(`Invalid body data at ${path}: name is required`);
  }
  const render = body.render ?? {};
  const physicalRadiusKm = body.radius?.equatorial?.value ??
    body.radius_km ??
    KNOWN_RADII_KM[body.name];
  const orbit = body.orbit;
  if (orbit && orbit.epoch_jd === undefined) {
    for (const key of [
      "semi_major_axis_au",
      "eccentricity",
      "inclination_deg",
      "longitude_ascending_node_deg",
      "longitude_periapsis_deg",
      "mean_longitude_deg",
    ]) {
      requiredNumber(orbit[key], `${path}.orbit.${key}`);
    }
  }
  return {
    ...body,
    id: body.id ?? body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    render: {
      radius: requiredNumber(
        physicalRadiusKm
          ? physicalRadiusKm / 149597870.7 * 30
          : render.radius ?? 1,
        `${path}.render.radius`
      ),
      color: render.color ?? 0xffffff,
    },
    orbit,
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === "\"") {
      if (quoted && text[i + 1] === "\"") {
        field += "\"";
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field.trim());
    rows.push(row);
  }
  return rows;
}

function numberFrom(value) {
  const match = value?.replaceAll(",", "").match(/[-+]?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parseSaturnMoonRows(text, source) {
  const rows = parseCsv(text);
  const isDetailed = source.endsWith("_3.csv");
  return rows.slice(1).flatMap((row) => {
    const name = (isDetailed ? row[1] : row[0])?.replace(/^[♠♦♣‡]/, "").trim();
    if (!name || name.startsWith("S/2004 S 3") || name.includes("Ring moonlets")) return [];
    const diameter = numberFrom(isDetailed ? row[5] : row[1]);
    const semiMajorAxisKm = numberFrom(isDetailed ? row[7] : row[3]);
    const periodDays = numberFrom(isDetailed ? row[8] : row[4]);
    const inclination = numberFrom(isDetailed ? row[9] : "0") ?? 0;
    const eccentricity = numberFrom(isDetailed ? row[10] : "0") ?? 0;
    if (!semiMajorAxisKm || !periodDays) return [];
    return [normalizeBody({
      name,
      parent: "Saturn",
      radius_km: diameter ? diameter / 2 : 1,
      classification: "Saturnian moon",
      render: { color: 0xb6b1a7 },
      orbit: {
        semi_major_axis_au: semiMajorAxisKm / 149597870.7,
        eccentricity,
        inclination_deg: inclination,
        longitude_ascending_node_deg: 0,
        longitude_periapsis_deg: 0,
        mean_longitude_deg: 0,
        rates: { mean_longitude_deg: 360 * 36525 / periodDays },
      },
    }, `${source}:${name}`)];
  });
}

async function loadSaturnMoons() {
  const records = await Promise.all(SATURN_MOON_SOURCES.map(async (path) => {
    const response = await fetch(new URL(path, import.meta.url));
    if (!response.ok) throw new Error(`Unable to load moon data ${path} (${response.status})`);
    return parseSaturnMoonRows(await response.text(), path);
  }));
  return records.flat();
}

const CANONICAL_BASE =
  (typeof location !== "undefined" ? new URLSearchParams(location.search).get("heliosdb") : null) ||
  "https://zeropbc.github.io/HeliosDB";

// Flatten a canonical HeliosDB record (physical/orbital/discovery/provenance/
// render sections) into the legacy engine shape normalizeBody expects.
function adaptCanonical(entry, body, byId) {
  const phys = body.physical ?? {};
  const orb = body.orbital ?? {};
  const lan = orb.longitude_ascending_node_deg ?? 0;
  const aop = orb.argument_periapsis_deg ?? 0;
  const period = orb.orbital_period_days;
  const colorHex = body.render?.color_hex;
  return {
    id: entry.id,
    name: entry.name,
    parent: body.parent_id ? (byId[body.parent_id]?.name ?? null) : null,
    classification: entry.classification,
    radius_km: phys.radius_km ?? null,
    render: {
      color: colorHex ? parseInt(colorHex.slice(1), 16) : undefined,
      radius: body.render?.radius ?? undefined,
    },
    orbit: orb.semi_major_axis_au == null ? undefined : {
      semi_major_axis_au: orb.semi_major_axis_au,
      eccentricity: orb.eccentricity ?? 0,
      inclination_deg: orb.inclination_deg ?? 0,
      longitude_ascending_node_deg: lan,
      longitude_periapsis_deg: (lan + aop) % 360,
      mean_longitude_deg: orb.mean_longitude_deg ?? 0,
      ...(period ? { rates: { mean_longitude_deg: (360 * 36525) / period } } : {}),
    },
  };
}

// Supplement legacy data with canonical bodies the engine doesn't ship
// (outer irregulars etc.). Never throws: without a reachable snapshot the
// engine runs on legacy data exactly as before.
async function loadCanonicalSupplement(known) {
  try {
    const knownNames = new Set(known.map((body) => body.name));
    const indexResponse = await fetch(`${CANONICAL_BASE}/data/index.json`);
    if (!indexResponse.ok) return [];
    const index = await indexResponse.json();
    if (!Array.isArray(index)) return [];
    const byId = Object.fromEntries(index.map((entry) => [entry.id, entry]));
    const missing = index.filter((entry) => !knownNames.has(entry.name));
    const loaded = await Promise.all(missing.map(async (entry) => {
      const response = await fetch(`${CANONICAL_BASE}/data/bodies/${entry.id}.json`);
      if (!response.ok) return null;
      return adaptCanonical(entry, await response.json(), byId);
    }));
    return loaded
      .filter(Boolean)
      .map((body) => normalizeBody(body, `canonical:${body.name}`));
  } catch {
    return [];
  }
}

export async function loadBodies() {
  const manifestResponse = await fetch(MANIFEST_URL, { cache: "no-store" });
  if (!manifestResponse.ok) {
    throw new Error(`Unable to load body manifest (${manifestResponse.status})`);
  }
  const paths = await manifestResponse.json();
  if (!Array.isArray(paths)) {
    throw new Error("Body manifest must be an array of JSON paths");
  }
  const loaded = await Promise.all(paths.map(async (path) => {
    const response = await fetch(new URL(`../bodies/${path}`, import.meta.url), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Unable to load body data ${path} (${response.status})`);
    }
    const data = await response.json();
    return Array.isArray(data)
      ? data.map((body, index) => normalizeBody(body, `${path}[${index}]`))
      : normalizeBody(data, path);
  }));
  const bodies = loaded.flat();
  const knownNames = new Set(bodies.map((body) => body.name));
  const saturnMoons = await loadSaturnMoons();
  const legacy = [...bodies, ...saturnMoons.filter((body) => !knownNames.has(body.name))];
  return [...legacy, ...(await loadCanonicalSupplement(legacy))];
}
