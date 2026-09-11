# Helios

Helios is a browser-based scientific solar-system visualizer built around
real-time J2000 orbital mechanics, physical body dimensions, and
data-driven astronomy records. It is intentionally a no-build, no-Node
application: a static web server is enough to run it.

> Helios is an evolving scientific visualization, not a substitute for a
> high-precision ephemeris package. Body records and orbital models should
> always be checked against their cited source and epoch.

## Features

- J2000 ecliptic orbital elements with eccentricity, inclination, node,
  periapsis, epoch, and secular rates
- Live date-based Kepler propagation
- Three-dimensional orbital planes instead of a flat solar-system diagram
- Physical body radii converted from kilometers into the scene's AU scale
- Data-driven body loading from JSON records
- Planet, dwarf-planet, centaur, moon, and satellite records
- Pluto and its known major satellites
- Jupiter's atmospheric bands, Great Red Spot, and thin ring system
- Saturn rings and procedural surface treatments for major planets
- Adaptive DOM labels with browser-antialiased text
- Label visibility threshold of one light-year
- Search across names, aliases, and classifications
- Configurable MPC minor-planet/comet catalog integration
- Instanced rendering path for very large minor-body catalogs
- Static deployment compatible with GitHub Pages

## Run locally

Helios must be served over HTTP because body records are loaded with
`fetch()`. Python is the only local runtime required:

```sh
./server.sh
```

Then open <http://127.0.0.1:8080/>.

The server accepts `HOST` and `PORT`:

```sh
HOST=0.0.0.0 PORT=8080 ./server.sh
```

You can also pass the port explicitly:

```sh
./server.sh --port 6969
```

Opening `index.html` directly with a `file://` URL is not supported by
browser module and fetch security rules.

## Repository layout

```text
.
├── bodies/                 Body JSON records and the browser manifest
│   ├── manifest.json
│   ├── moons.json
│   └── <Body>/<Body>.json
├── bodies/sun/             Sun mesh, material, and lighting
├── config/                 Camera, renderer, time, units, and catalog config
├── core/                   App bootstrap, loop, camera, controls, renderer
├── fx/                     Post-processing and glow effects
├── math/                   J2000 and Kepler orbital calculations
├── system/                 Body loading, orbiting, meshes, and catalog paths
├── sky/                    Starfield geometry and background
├── index.html              Static browser entry point
├── main.js                 Application bootstrap
├── server.sh               Python static server
└── styles.css              UI and DOM label styles
```

## Body data contract

Every body is listed in [bodies/manifest.json](./bodies/manifest.json).
Manifest entries may point to either a single JSON object or a JSON array.
This makes large contributed groups, such as moons, easy to add without
changing engine code.

The minimum useful record is:

```json
{
  "name": "Example",
  "radius_km": 100,
  "aliases": ["Example object"],
  "classification": "minor body",
  "render": {
    "color": 11184810
  },
  "orbit": {
    "semi_major_axis_au": 2.5,
    "eccentricity": 0.1,
    "inclination_deg": 5,
    "longitude_ascending_node_deg": 80,
    "longitude_periapsis_deg": 120,
    "mean_longitude_deg": 40
  }
}
```

For a body orbiting another body, add `"parent": "Parent name"`.
Parent positions are resolved in the loaded body graph.

Records that need an epoch-specific mean anomaly may use:

```json
{
  "epoch_jd": 2451545,
  "mean_anomaly_deg": 30,
  "mean_motion_deg_per_day": 0.2,
  "semi_major_axis_au": 1.5,
  "eccentricity": 0.1,
  "inclination_deg": 2,
  "longitude_ascending_node_deg": 40,
  "longitude_periapsis_deg": 100
}
```

## Units and coordinate system

The engine keeps physical values in astronomy-friendly units at the data
boundary:

- Distance: kilometers, astronomical units, light-years, and parsecs
- Angles: degrees in JSON, radians internally
- Time: Julian Date and Julian centuries from J2000.0
- Scene scale: 30 scene units per astronomical unit

The J2000 reference epoch is Julian Date 2451545.0, corresponding to
2000-01-01 12:00 TT. Orbital positions are transformed from J2000 ecliptic
elements into Three.js coordinates with real inclinations and ascending
nodes.

See [config/units.js](./config/units.js) and
[math/kepler.js](./math/kepler.js).

## Catalog integration

The MPC integration is opt-in. It is disabled by default because MPC
catalogs are independently updated external datasets with their own
distribution terms.

To use a permitted local copy:

1. Place the permitted `MPCORB.DAT` and `AllCometEls.txt` files under
   `catalog/`.
2. Set `enabled: true` in [config/catalog.js](./config/catalog.js).
3. Serve Helios through `server.sh`.

Minor bodies are rendered through `THREE.InstancedMesh`; they are not added
as individual scene graph objects. This is essential for large catalogs.

The Kuiper Belt, Asteroid Belt, and Oort Cloud are intentionally reserved
for a later population model rather than being represented by inaccurate
static placeholders.

## Performance model

Helios separates visual fidelity from object count:

- Named bodies use shared low-overhead sphere geometry and individual
  physically-derived materials.
- Orbital positions are throttled instead of being recalculated more often
  than the display needs.
- Labels are HTML overlays rather than low-resolution canvas textures.
- Catalog populations use instancing and can be capped in configuration.
- Pixel ratio is clamped to avoid silently multiplying GPU cost on high-DPI
  displays.

For very large populations, the next performance step is streaming and
GPU-side propagation rather than creating one mesh per body.

## GitHub Pages

The project is deployable from the repository root on the `main` branch.
Assets and body records use relative/module-derived URLs so the site works
both at `/` locally and at `/Helios/` on GitHub Pages.

If a deployment appears blank, inspect the browser console and network tab
first. A missing `/Helios/` path prefix on an asset request usually means
the deployed HTML or a data loader has regressed to a root-relative URL.

## Contributing a body

1. Add a validated JSON record under `bodies/<Name>/<Name>.json`, or append
   to an appropriate JSON array.
2. Add its path to `bodies/manifest.json`.
3. Use physical radii and orbital elements with their source epoch.
4. Avoid display-only scale exaggeration in scientific records.
5. Run `git diff --check` and test through the static server.

## License and data provenance

See [LICENSE](./LICENSE). External astronomical catalogs remain subject to
their own terms. Contributors should record the source, epoch, uncertainty,
and coordinate frame for new scientific records.
