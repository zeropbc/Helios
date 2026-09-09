import { z } from "zod";
import { uncertaintySchema, UnitSchema } from "./measurement.js";

export const physicalMeasurementSchema = z.object({
  value: z.number(),
  unit: UnitSchema,
  uncertainty: uncertaintySchema.optional(),
  source: z.string().optional(),
});
export type PhysicalMeasurement = z.infer<typeof physicalMeasurementSchema>;

export const massSchema = physicalMeasurementSchema;
export type Mass = z.infer<typeof massSchema>;

export const radiusSchema = physicalMeasurementSchema;
export type Radius = z.infer<typeof radiusSchema>;

export const effectiveTemperatureSchema = physicalMeasurementSchema;
export type EffectiveTemperature = z.infer<typeof effectiveTemperatureSchema>;

export const luminositySchema = physicalMeasurementSchema;
export type Luminosity = z.infer<typeof luminositySchema>;

export const densitySchema = z.object({
  value: z.number(),
  unit: z.enum(["kg/m^3", "g/cm^3"]),
  uncertainty: uncertaintySchema.optional(),
  source: z.string().optional(),
});
export type Density = z.infer<typeof densitySchema>;

export const albedoSchema = z.object({
  value: z.number().min(0).max(1),
  uncertainty: uncertaintySchema.optional(),
  source: z.string().optional(),
});
export type Albedo = z.infer<typeof albedoSchema>;

export const surfaceGravitySchema = z.object({
  value: z.number(),
  unit: z.enum(["m/s^2", "g"]),
  uncertainty: uncertaintySchema.optional(),
  source: z.string().optional(),
});
export type SurfaceGravity = z.infer<typeof surfaceGravitySchema>;

export const rotationSchema = z.object({
  period: z
    .object({
      value: z.number(),
      unit: z.enum(["day", "hr", "yr"]),
      uncertainty: uncertaintySchema.optional(),
      source: z.string().optional(),
    })
    .optional(),
  axis_tilt: coordinateValueSchema.optional(),
  direction: z.enum(["prograde", "retrograde"]).optional(),
});
export type Rotation = z.infer<typeof rotationSchema>;

import { coordinateValueSchema } from "./measurement.js";
