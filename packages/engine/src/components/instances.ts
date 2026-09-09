import { HeliosObject, Unit } from "@helios/schemas";
import { UnitConverter } from "../systems/unit-conversion.js";

/**
 * Runtime component instances. Each is constructed from a validated JSON
 * component block. The engine NEVER branches on identity.classification —
 * only on the presence and shape of these components.
 */

export type ComponentType =
  | "orbit"
  | "light_source"
  | "atmosphere"
  | "terrain"
  | "ocean";

export interface ComponentInstance {
  readonly type: ComponentType;
}

export interface OrbitComponentInstance extends ComponentInstance {
  type: "orbit";
  primary: string;
  semiMajorAxisM?: number;
  eccentricity?: number;
  inclinationDeg?: number;
  longitudeOfAscendingNodeDeg?: number;
  argumentOfPeriapsisDeg?: number;
  periodS?: number;
  epoch?: string;
}

export interface LightSourceComponentInstance extends ComponentInstance {
  type: "light_source";
  luminosityW: number;
  effectiveTemperatureK: number;
  spectrum: string;
}

export interface AtmosphereComponentInstance extends ComponentInstance {
  type: "atmosphere";
  composition: Record<string, number>;
  surfacePressurePa?: number;
}

export interface TerrainComponentInstance extends ComponentInstance {
  type: "terrain";
  class: string;
}

export interface OceanComponentInstance extends ComponentInstance {
  type: "ocean";
}

export type AnyComponentInstance =
  | OrbitComponentInstance
  | LightSourceComponentInstance
  | AtmosphereComponentInstance
  | TerrainComponentInstance
  | OceanComponentInstance;

export function createComponentInstances(
  obj: HeliosObject
): Map<string, AnyComponentInstance> {
  const out = new Map<string, AnyComponentInstance>();
  const components = obj.components ?? {};
  for (const [name, comp] of Object.entries(components)) {
    if (!comp) continue;
    switch (comp.type) {
      case "orbit": {
        const orbit = comp.orbit;
        const a = orbit.semi_major_axis
          ? UnitConverter.toCanonical(orbit.semi_major_axis.value, orbit.semi_major_axis.unit)
          : undefined;
        const period = orbit.period
          ? UnitConverter.toCanonical(orbit.period.value, orbit.period.unit)
          : undefined;
        const incl = asDeg(orbit.inclination);
        const node = asDeg(orbit.longitude_of_ascending_node);
        const periapsis = asDeg(orbit.argument_of_periapsis);
        out.set(name, {
          type: "orbit",
          primary: orbit.primary,
          semiMajorAxisM: a?.value,
          eccentricity: orbit.eccentricity,
          inclinationDeg: incl,
          longitudeOfAscendingNodeDeg: node,
          argumentOfPeriapsisDeg: periapsis,
          periodS: period?.value,
          epoch: orbit.epoch,
        });
        break;
      }
      case "light_source": {
        const lum = UnitConverter.toCanonical(comp.luminosity.value, comp.luminosity.unit);
        out.set(name, {
          type: "light_source",
          luminosityW: lum?.value ?? comp.luminosity.value,
          effectiveTemperatureK: comp.effective_temperature.value,
          spectrum: comp.spectrum?.type ?? "blackbody",
        });
        break;
      }
      case "atmosphere": {
        const composition: Record<string, number> = {};
        for (const [gas, spec] of Object.entries(comp.composition ?? {})) {
          if (spec.fraction !== undefined) composition[gas] = spec.fraction;
        }
        const pressurePa = comp.surface_pressure
          ? toPressurePa(comp.surface_pressure.value, comp.surface_pressure.unit)
          : undefined;
        out.set(name, {
          type: "atmosphere",
          composition,
          surfacePressurePa: pressurePa,
        });
        break;
      }
      case "terrain":
        out.set(name, {
          type: "terrain",
          class: comp.type_classification ?? "unknown",
        });
        break;
      case "ocean":
        out.set(name, { type: "ocean" });
        break;
    }
  }
  return out;
}

function asDeg(v: { value: number; unit: Unit } | undefined): number | undefined {
  if (!v) return undefined;
  const c = UnitConverter.toCanonical(v.value, v.unit);
  return c ? c.value : v.value;
}

type PressureUnit = "Pa" | "bar" | "atm";
function toPressurePa(value: number, unit: PressureUnit): number {
  switch (unit) {
    case "Pa": return value;
    case "bar": return value * 1e5;
    case "atm": return value * 101325;
  }
}