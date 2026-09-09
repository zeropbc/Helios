# Helios Data Specification — what we actually need

I would **not** make one gigantic universal JSON schema where every object has every possible field. That becomes horrifying once we get to galaxies, asteroids, black holes, spacecraft, etc.

Instead:

```text
data/
├── stars/
│   ├── sol.json
│   ├── proxima-centauri.json
│   └── sirius.json
├── planets/
│   ├── earth.json
│   └── mars.json
├── moons/
│   └── ...
├── asteroids/
│   └── ...
├── comets/
│   └── ...
├── galaxies/
│   └── ...
├── nebulae/
│   └── ...
└── systems/
    └── alpha-centauri.json
```

But the **schema itself is component-oriented**, not type-oriented.

---

# 1. Every object needs an immutable identity

Something like:

```json
{
  "id": "star/proxima-centauri",

  "identity": {
    "name": "Proxima Centauri",
    "designations": [
      "Alpha Centauri C",
      "GJ 551",
      "HIP 70890"
    ],
    "classification": {
      "primary": "star",
      "subtype": "red_dwarf",
      "spectral_type": "M5.5 Ve",
      "variable_type": "UV_CETI"
    }
  }
}
```

### Important distinction

`classification` tells Helios **what something is**.

It must **not** determine what the renderer does with it.

So:

```json
"type": "star"
```

doesn't mean:

> instantiate `StarRenderer`

It means:

> this object is classified as a star.

The actual behavior comes from components.

That's exactly the architectural direction you've already established.

---

# 2. Provenance needs to be first-class

Your example currently puts `"source"` next to individual values.

That's useful, but I think we should go further.

Every scientifically meaningful measurement should be capable of carrying:

```json
{
  "value": 0.1221,
  "uncertainty": 0.0022,
  "unit": "M_sun",
  "reference": "suarez-mascareno-2025"
}
```

And then have a top-level bibliography:

```json
"sources": {
  "suarez-mascareno-2025": {
    "type": "paper",
    "citation": "Suárez Mascareño et al. (2025)",
    "doi": "...",
    "accessed": "2026-09-09"
  }
}
```

That gives us **actual scientific provenance**, rather than strings scattered throughout the file.

And crucially:

```json
"source": "gaia-dr3"
```

should identify the source dataset, while the actual citation metadata lives elsewhere.

---

# 3. Measurements need a standard representation

This is probably one of the most important parts of the SPEC.

Instead of:

```json
"mass_solar_masses": 0.1221
```

I'd standardize on:

```json
"mass": {
  "value": 0.1221,
  "unit": "M_sun",
  "uncertainty": {
    "plus": 0.0022,
    "minus": 0.0022
  },
  "source": "suarez-mascareno-2025"
}
```

And allow:

```json
"uncertainty": 0.0022
```

for symmetric uncertainty.

For asymmetric measurements:

```json
"uncertainty": {
  "plus": 700,
  "minus": 400
}
```

This lets Helios represent actual astronomical data rather than pretending every measurement is an exact number.

---

# 4. Units must be explicit

**Never infer units from field names.**

Bad:

```json
"temperature": 3042
```

Good:

```json
"temperature": {
  "value": 3042,
  "unit": "K"
}
```

We should define a controlled unit vocabulary:

```text
m
km
AU
pc
ly
kg
M_earth
M_jupiter
M_sun
R_earth
R_jupiter
R_sun
K
deg
rad
m/s
km/s
mas
mas/yr
arcsec/yr
day
yr
Myr
Gyr
mag
```

Internally, Helios can convert everything into canonical SI/astronomical units.

---

# 5. Coordinates need epochs and reference frames

This is a big one.

Your:

```json
"right_ascension": "14h 29m 42.946s",
"declination": "-62° 40' 46.141\""
```

is human-readable, but the engine shouldn't have to parse astronomical prose.

I'd use:

```json
"position": {
  "frame": "ICRS",
  "epoch": "J2016.0",

  "right_ascension": {
    "value": 217.4289417,
    "unit": "deg"
  },

  "declination": {
    "value": -62.6794836,
    "unit": "deg"
  }
}
```

Then:

```json
"proper_motion": {
  "ra": {
    "value": -3775.75,
    "unit": "mas/yr"
  },
  "dec": {
    "value": 765.54,
    "unit": "mas/yr"
  }
}
```

This becomes extremely important once Helios starts propagating stellar positions.

---

# 6. Orbital data should be its own component

For Proxima:

```json
"components": {
  "orbit": {
    "type": "keplerian",
    "primary": "star/alpha-centauri-ab",

    "semi_major_axis": {
      "value": 8700,
      "unit": "AU"
    },

    "eccentricity": 0.50,

    "inclination": {
      "value": 107.6,
      "unit": "deg"
    },

    "longitude_of_ascending_node": {
      "value": 126,
      "unit": "deg"
    },

    "argument_of_periastron": {
      "value": 72.3,
      "unit": "deg"
    },

    "period": {
      "value": 547000,
      "unit": "yr"
    },

    "epoch": "..."
  }
}
```

Then the renderer doesn't care whether this is:

* a star orbiting another star
* a planet orbiting a star
* a moon orbiting a planet
* a spacecraft orbiting Earth

**OrbitComponent is OrbitComponent.**

That's exactly what your component architecture is designed for.

---

# 7. Stellar physics becomes components

For a star:

```json
"components": {
  "light_source": {
    "luminosity": {
      "value": 0.0017,
      "unit": "L_sun"
    },

    "effective_temperature": {
      "value": 3042,
      "unit": "K"
    },

    "spectrum": {
      "type": "blackbody"
    }
  },

  "atmosphere": {
    ...
  },

  "orbit": {
    ...
  }
}
```

This is beautiful because **a star doesn't need special engine knowledge**.

It just happens to have:

```text
LightSourceComponent
AtmosphereComponent
OrbitComponent
```

Your renderer sees those components and renders them.

---

# 8. Photometry should be structured

Instead of:

```json
"apparent_magnitude_V": 11.13
```

I'd use:

```json
"photometry": {
  "apparent": {
    "V": {
      "value": 11.13,
      "unit": "mag"
    },
    "J": {
      "value": 5.35,
      "unit": "mag",
      "uncertainty": 0.02
    }
  },

  "absolute": {
    "V": {
      "value": 15.5,
      "unit": "mag"
    }
  }
}
```

This makes it possible to add:

```text
U
B
V
R
I
J
H
K
Gaia G
Gaia BP
Gaia RP
WISE W1...
```

without inventing new JSON fields forever.

---

# 9. Variable stars need their own data

Proxima's flare behavior shouldn't just be prose:

```json
"variable": {
  "type": "UV_CETI",
  "activity": "eruptive"
}
```

Potentially:

```json
"variability": {
  "type": "flare",
  "classification": "UV_CETI",
  "period": null
}
```

Later we can support actual light curves:

```json
"light_curve": {
  "dataset": "...",
  "band": "V"
}
```

That's where Helios could eventually become *ridiculously* cool.

---

# 10. Relationships need to be explicit

This is another major one.

Proxima isn't just:

> a star

It's:

```text
Alpha Centauri
├── Alpha Centauri A
├── Alpha Centauri B
└── Proxima Centauri
    ├── Proxima b
    └── Proxima d
```

So data should support:

```json
"relationships": {
  "parent": "system/alpha-centauri",
  "companions": [
    "star/alpha-centauri-a",
    "star/alpha-centauri-b"
  ],
  "children": [
    "planet/proxima-centauri-b",
    "planet/proxima-centauri-d"
  ]
}
```

But I'd actually prefer **references rather than embedding entire child objects**.

That means Proxima b exists in:

```text
data/planets/proxima-centauri-b.json
```

and Proxima only references it.

No duplicated information.

---

# 11. Discovery information

Your discovery section is good:

```json
"discovery": {
  "date": "1915",
  "discoverer": "Robert T. A. Innes",
  "institution": "Union Observatory"
}
```

I'd make it more flexible:

```json
"discovery": {
  "date": "1915",
  "discoverer": [
    "Robert T. A. Innes"
  ],
  "institution": "Union Observatory",
  "method": "proper_motion"
}
```

Because for exoplanets and deep-space objects, discovery can involve multiple people, instruments, surveys, or detection methods.

---

# 12. Status is essential

Especially for exoplanets.

We need to distinguish:

```json
"status": "confirmed"
```

from:

```json
"status": "candidate"
```

and:

```json
"status": "disputed"
```

and:

```json
"status": "retracted"
```

Potential vocabulary:

```text
confirmed
candidate
disputed
retracted
historical
hypothetical
```

This prevents Helios from accidentally presenting a controversial object as established fact.

---

# 13. Human-readable notes are fine—but never engine-critical

This:

```json
"notes": {
  "flare_activity": "...",
  "visibility": "...",
  "energy_output": "..."
}
```

is totally fine.

But the engine must **never need to parse prose**.

So:

```json
"visibility": "Too faint for naked eye"
```

is UI information.

While:

```json
"apparent_magnitude": 11.13
```

is computational data.

---

# 14. Visual/rendering data

This is where the data package becomes more than a scientific database.

For example:

```json
"visual": {
  "render": {
    "model": "star",

    "surface": {
      "material": "stellar"
    },

    "color": {
      "mode": "blackbody"
    },

    "scale": {
      "mode": "physical"
    }
  }
}
```

And eventually:

```json
"assets": {
  "textures": {
    "albedo": "assets/stars/proxima/albedo.ktx2",
    "surface": "..."
  }
}
```

**But assets should be optional.**

A star JSON with no textures should still render.

---

# 15. We need schema versioning

Every entry should begin with:

```json
{
  "$schema": "https://helios.zero/.../star.schema.json",
  "schema_version": "1.0"
}
```

Because two years from now you're going to look at this and go:

> “Why the fuck did I name this field that?”

And Helios needs to survive that.

---

# 16. Validation needs to be part of the project

This is probably the biggest missing piece from the concept.

The workflow should literally be:

```text
Contributor
    │
    ▼
creates proxima-centauri.json
    │
    ▼
helios validate data/
    │
    ├── ❌ invalid
    │
    └── ✅ valid
          │
          ▼
      helios index
          │
          ▼
      runtime database
          │
          ▼
        renderer
```

Validation should catch things like:

```text
missing id
invalid schema version
unknown component
invalid unit
RA outside 0–360°
declination outside −90°–+90°
negative mass
eccentricity > 1
missing orbit primary
broken object reference
duplicate designation
invalid uncertainty
missing source
```

That is what makes the “just add a JSON” dream actually work.

---

# 17. Data should be completely decoupled from the engine

This should become a **hard Helios rule**:

> The engine MUST NOT contain astronomical object definitions.

No:

```cpp
if (name == "Earth") ...
```

No:

```cpp
Planet earth;
```

No:

```cpp
switch (body.type) {
    case Planet:
```

Instead:

```cpp
auto object = universe.load("star/proxima-centauri");
```

and the JSON determines what components exist.

That's consistent with your existing architecture and is honestly the part I'd defend most aggressively in the SPEC.

---

# The final architecture

I'd structure the SPEC around **six layers**:

```text
                    HELIOS DATA
                         │
          ┌──────────────┴──────────────┐
          │                             │
       Identity                     Provenance
          │                             │
          └──────────────┬──────────────┘
                         │
                    Measurements
                         │
          ┌──────────────┼──────────────┐
          │              │              │
       Astrometry     Photometry      Physics
          │              │              │
          └──────────────┼──────────────┘
                         │
                    Components
                         │
       ┌─────────┬───────┼────────┬──────────┐
       │         │       │        │          │
     Orbit    Atmosphere Light   Ocean     Terrain
       │
       ▼
   Relationships
       │
       ▼
   Universe Graph
       │
       ▼
    Renderer
```

And the killer feature:

### Adding Proxima Centauri

```bash
cp proxima-centauri.json data/stars/
helios validate data/stars/proxima-centauri.json
```

**Done.**

No C++.

No renderer modification.

No new class.

No recompilation of astronomical knowledge into the engine.

Just:

```text
JSON → validated data → components → universe → renderer
```

That is the version of Helios where someone can hand you a **50-page astronomical data sheet**, turn it into a JSON entry, drop it into `data/`, and suddenly Helios knows that object exists.

And that is *much* more powerful than simply making a giant Proxima JSON.

The real SPEC should therefore define **the contract between scientific data and the engine**. The Proxima entry becomes our reference implementation/test case.

One more important scientific-design choice: don't make the JSON itself the ultimate truth for computed quantities. Store **observations/measurements + provenance + uncertainty**, and let Helios derive things like distance from parallax when appropriate. That prevents a file from simultaneously claiming contradictory values while giving the engine enough information to reproduce the calculation. For naming/designations, maintaining aliases separately from physical classification also fits established astronomical practice; the IAU explicitly treats nomenclature and designations as a standardized problem, while SIMBAD uses hierarchical object classifications. ([iau.org][1])
[1]: https://www.iau.org/WG311/WG311/Home.aspx?utm_source=chatgpt.com "Commission B2 WG Designations & Nomenclature — Functional"


> **Data Model: Observed vs Derived vs Rendered**

Something like:

```text
observed
    ↓
derived
    ↓
components
    ↓
runtime representation
    ↓
renderer
```

For example, don't necessarily treat:

```json
"distance": {
  "value": 4.2465,
  "unit": "ly"
}
```

as an independent truth if it can be derived from a parallax measurement.

Instead:

```json
"measurements": {
  "parallax": {
    "value": 768.7,
    "unit": "mas",
    "uncertainty": 0.3,
    "source": "gaia-dr3"
  }
}
```

and then:

```json
"derived": {
  "distance": {
    "value": 4.24,
    "unit": "ly",
    "method": "parallax_inverse"
  }
}
```

That distinction is **huge** once you start importing catalog data.

**The data specification MUST be extensible without requiring modification of existing object schemas or engine code.**

Because that's really the promise your entire architecture is making.

You eventually want:

```text
proxima.json
earth.json
sagittarius-a-star.json
andromeda.json
some-random-comet.json
voyager-1.json
```

to all enter the same universe through the same machinery.

And the engine should basically go:

> “Cool. What components do you have?”

rather than:

> “Ah yes, Andromeda. I have a special `AndromedaRenderer` for this.”

💀

### Overall

I'd call this **SPEC-quality architecture**, not just “a good JSON format.”

The six-layer model at the end is especially strong because it makes the intended dependency direction extremely clear: identity/provenance → measurements → scientific domains → components → relationships → universe → renderer. 

The next logical step isn't adding another 40 fields to Proxima.

It's turning this into the actual **formal Helios Data Specification**:

```text
SPEC.md
schemas/
├── common.schema.json
├── object.schema.json
├── components/
│   ├── orbit.schema.json
│   ├── atmosphere.schema.json
│   ├── light-source.schema.json
│   ├── terrain.schema.json
│   └── ...
└── domains/
    ├── star.schema.json
    ├── planet.schema.json
    └── ...
```

Then **Proxima Centauri becomes the reference implementation**, not the schema itself.

That is a *much* more future-proof direction.
