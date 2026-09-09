import { z } from "zod";
import {
  coordinateValueSchema,
  uncertaintySchema,
  UnitSchema,
} from "./measurement.js";

export const positionSchema = z.object({
  frame: z.string().default("ICRS"),
  epoch: z.string().optional(),
  right_ascension: coordinateValueSchema.optional(),
  declination: coordinateValueSchema.optional(),
  distance: coordinateValueSchema.optional(),
  x: coordinateValueSchema.optional(),
  y: coordinateValueSchema.optional(),
  z: coordinateValueSchema.optional(),
});
export type Position = z.infer<typeof positionSchema>;

export const properMotionSchema = z.object({
  frame: z.string().default("ICRS"),
  ra: coordinateValueSchema.optional(),
  dec: coordinateValueSchema.optional(),
  radial_velocity: coordinateValueSchema.optional(),
});
export type ProperMotion = z.infer<typeof properMotionSchema>;

export const parallaxSchema = z.object({
  value: z.number(),
  unit: UnitSchema,
  uncertainty: uncertaintySchema.optional(),
  source: z.string().optional(),
});
export type Parallax = z.infer<typeof parallaxSchema>;

export const keplerianOrbitSchema = z.object({
  type: z.literal("keplerian"),
  primary: z.string(),
  semi_major_axis: z
    .object({
      value: z.number(),
      unit: UnitSchema,
      uncertainty: uncertaintySchema.optional(),
      source: z.string().optional(),
    })
    .optional(),
  eccentricity: z.number().min(0).max(1).optional(),
  inclination: coordinateValueSchema.optional(),
  longitude_of_ascending_node: coordinateValueSchema.optional(),
  argument_of_periapsis: coordinateValueSchema.optional(),
  mean_longitude: coordinateValueSchema.optional(),
  period: z
    .object({
      value: z.number(),
      unit: UnitSchema,
      uncertainty: uncertaintySchema.optional(),
      source: z.string().optional(),
    })
    .optional(),
  epoch: z.string().optional(),
});
export type KeplerianOrbit = z.infer<typeof keplerianOrbitSchema>;

export const orbitSchema = keplerianOrbitSchema;
export type Orbit = z.infer<typeof orbitSchema>;
