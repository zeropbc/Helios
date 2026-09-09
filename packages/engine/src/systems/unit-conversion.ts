import { Unit } from "@helios/schemas";

/**
 * Converts astronomically-observable units into a canonical SI-based
 * internal representation. All engine computation happens in canonical
 * units; JSON data is only ever interpreted through this layer.
 */

export interface Canonical {
  value: number;
  unit: "m" | "kg" | "s" | "K" | "deg" | "W" | "Pa" | "m/s" | "Wm^-2";
}

const FACTORS: Record<Unit, { toBase: number; base: Canonical["unit"] }> = {
  // length → m
  m: { toBase: 1, base: "m" },
  km: { toBase: 1e3, base: "m" },
  AU: { toBase: 149597870700, base: "m" },
  pc: { toBase: 3.0856775814913673e16, base: "m" },
  ly: { toBase: 9.4607304725808e15, base: "m" },
  R_earth: { toBase: 6378137.0, base: "m" },
  R_jupiter: { toBase: 69911000.0, base: "m" },
  R_sun: { toBase: 6.957e8, base: "m" },
  // mass → kg
  kg: { toBase: 1, base: "kg" },
  M_earth: { toBase: 5.9722e24, base: "kg" },
  M_jupiter: { toBase: 1.89813e27, base: "kg" },
  M_sun: { toBase: 1.98841e30, base: "kg" },
  // time → s
  day: { toBase: 86400, base: "s" },
  yr: { toBase: 31557600, base: "s" },
  Myr: { toBase: 3.15576e13, base: "s" },
  Gyr: { toBase: 3.15576e16, base: "s" },
  // temperature → K
  K: { toBase: 1, base: "K" },
  // angle → deg (kept in degrees for geographic/astrometric semantics)
  deg: { toBase: 1, base: "deg" },
  rad: { toBase: 180 / Math.PI, base: "deg" },
  mas: { toBase: 1e-3 / 3600, base: "deg" },
  // speed → m/s
  "m/s": { toBase: 1, base: "m" },
  "km/s": { toBase: 1e3, base: "m" },
  "mas/yr": { toBase: 1e-3 / 3600 / 31557600, base: "deg" },
  "arcsec/yr": { toBase: 1 / 3600 / 31557600, base: "deg" },
  // luminosity → W
  L_sun: { toBase: 3.828e26, base: "W" },
  W: { toBase: 1, base: "W" },
  // flux density → Jy (opaque, treated as canonical)
  Jy: { toBase: 1, base: "W" },
  // photometric magnitude (opaque, no linear conversion)
  mag: { toBase: 1, base: "W" },
};

export class UnitConverter {
  static toCanonical(value: number, unit: Unit): Canonical | null {
    const f = FACTORS[unit];
    if (!f) return null;
    // Speeds are their own canonical dimension.
    if (unit === "m/s") return { value, unit: "m/s" };
    if (unit === "km/s") return { value: value * 1e3, unit: "m/s" };
    if (unit === "mas/yr" || unit === "arcsec/yr") {
      // angular velocity: keep in deg/s explicitly
      return { value: value * f.toBase, unit: "deg" };
    }
    return { value: value * f.toBase, unit: f.base };
  }

  static fromCanonical(canonical: Canonical, unit: Unit): number | null {
    const f = FACTORS[unit];
    if (!f) return null;
    if (unit === "m/s") return canonical.value;
    if (unit === "km/s") return canonical.value / 1e3;
    if (unit === "mas/yr" || unit === "arcsec/yr") {
      return canonical.value / f.toBase;
    }
    return canonical.value / f.toBase;
  }
}