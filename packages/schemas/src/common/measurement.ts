import { z } from "zod";

export const UNIT_LIST = [
  "m",
  "km",
  "AU",
  "pc",
  "ly",
  "kg",
  "M_earth",
  "M_jupiter",
  "M_sun",
  "R_earth",
  "R_jupiter",
  "R_sun",
  "L_sun",
  "K",
  "deg",
  "rad",
  "m/s",
  "km/s",
  "mas",
  "mas/yr",
  "arcsec/yr",
  "day",
  "yr",
  "Myr",
  "Gyr",
  "mag",
  "W",
  "Jy",
] as const;

export const UnitSchema = z.enum(UNIT_LIST);
export type Unit = z.infer<typeof UnitSchema>;

export const uncertaintySchema = z.union([
  z.number().nonnegative(),
  z.object({
    plus: z.number().nonnegative(),
    minus: z.number().nonnegative(),
  }),
]);
export type Uncertainty = z.infer<typeof uncertaintySchema>;

export const measurementSchema = z.object({
  value: z.number(),
  unit: UnitSchema,
  uncertainty: uncertaintySchema.optional(),
  source: z.string().optional(),
});
export type Measurement = z.infer<typeof measurementSchema>;

export const coordinateValueSchema = z.object({
  value: z.number(),
  unit: UnitSchema,
  uncertainty: uncertaintySchema.optional(),
  source: z.string().optional(),
});
export type CoordinateValue = z.infer<typeof coordinateValueSchema>;

export const derivedMeasurementSchema = z.object({
  value: z.number(),
  unit: UnitSchema,
  method: z.string(),
  source: z.string().optional(),
});
export type DerivedMeasurement = z.infer<typeof derivedMeasurementSchema>;

export const measurementOrDerivedSchema = z.union([
  measurementSchema,
  derivedMeasurementSchema,
]);
export type MeasurementOrDerived = z.infer<typeof measurementOrDerivedSchema>;
