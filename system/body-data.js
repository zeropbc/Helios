const MANIFEST_URL = new URL("../bodies/manifest.json", import.meta.url);
const KNOWN_RADII_KM = {
  Moon: 1737.4, Phobos: 11.27, Deimos: 6.2,
  Io: 1821.6, Europa: 1560.8, Ganymede: 2634.1, Callisto: 2410.3,
  Amalthea: 83.5, Metis: 21.5, Thebe: 49.3, Himalia: 69.8, Elara: 43,
  Mimas: 198.2, Enceladus: 252.1, Tethys: 531.1, Dione: 561.4,
  Rhea: 763.8, Titan: 2574.7, Iapetus: 734.5, Janus: 89.5,
  Epimetheus: 58.1, Phoebe: 106.5, Miranda: 235.8, Ariel: 578.9,
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
  if (orbit) {
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
    id: body.id ?? body.name.toLowerCase().replaceAll(" ", "-"),
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
  return loaded.flat();
}
