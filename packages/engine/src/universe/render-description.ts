import { ObjectInstance } from "../universe/universe.js";

/**
 * The renderer-facing description of an object. It is derived purely from
 * components — never from identity.classification. A body with a
 * light_source component produces a light point; a body with orbit +
 * terrain produces a solid orb, etc.
 */

export type RenderKind =
  | "light_point"
  | "solid"
  | "system_root"
  | "bare";

export interface RenderDescription {
  kind: RenderKind;
  /** Effective temperature (K) when a light source is present. */
  temperatureK?: number;
  /** Luminance (W) when a light source is present. */
  luminosityW?: number;
  /** True radius in meters (converted from measurement.radius). */
  radiusM?: number;
  hasOrbit: boolean;
  hasAtmosphere: boolean;
  hasTerrain: boolean;
  hasOcean: boolean;
  primary?: string;
}

const R_EARTH = 6.378137e6;

export function describeRender(inst: ObjectInstance): RenderDescription {
  const comps = inst.components;
  const light = comps.get("light_source");
  const orbit = comps.get("orbit");
  const atmosphere = comps.get("atmosphere");
  const terrain = comps.get("terrain");
  const ocean = comps.get("ocean");

  const radiusMeasurement = inst.object.measurements?.radius;
  const radiusM = radiusMeasurement
    ? radiusMeasurement.value * R_EARTH
    : undefined;

  const isSystemContainer = inst.object.identity.classification.primary === "system";

  return {
    kind: isSystemContainer
      ? "system_root"
      : light
        ? "light_point"
        : radiusM !== undefined || terrain || ocean
          ? "solid"
          : "bare",
    temperatureK: light && light.type === "light_source"
      ? light.effectiveTemperatureK
      : undefined,
    luminosityW: light && light.type === "light_source"
      ? light.luminosityW
      : undefined,
    radiusM,
    hasOrbit: !!orbit,
    hasAtmosphere: !!atmosphere,
    hasTerrain: !!terrain,
    hasOcean: !!ocean,
    primary: orbit && orbit.type === "orbit" ? orbit.primary : undefined,
  };
}