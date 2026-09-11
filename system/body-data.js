const MANIFEST_URL = "/bodies/manifest.json";

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
      radius: requiredNumber(render.radius ?? 1, `${path}.render.radius`),
      color: render.color ?? 0xffffff,
    },
    orbit,
  };
}

export async function loadBodies() {
  const manifestResponse = await fetch(MANIFEST_URL);
  if (!manifestResponse.ok) {
    throw new Error(`Unable to load body manifest (${manifestResponse.status})`);
  }
  const paths = await manifestResponse.json();
  if (!Array.isArray(paths)) {
    throw new Error("Body manifest must be an array of JSON paths");
  }
  const bodies = await Promise.all(paths.map(async (path) => {
    const response = await fetch(`/bodies/${path}`);
    if (!response.ok) {
      throw new Error(`Unable to load body data ${path} (${response.status})`);
    }
    return normalizeBody(await response.json(), path);
  }));
  return bodies;
}
