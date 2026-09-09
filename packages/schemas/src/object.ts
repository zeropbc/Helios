import { z } from "zod";
import { identitySchema, relationshipSchema, discoverySchema, statusSchema, bibliographyEntrySchema } from "./common/identity.js";
import { positionSchema, properMotionSchema, parallaxSchema } from "./common/astrometry.js";
import { massSchema, radiusSchema, rotationSchema, densitySchema, albedoSchema, surfaceGravitySchema } from "./common/physics.js";
import { photometrySchema } from "./common/photometry.js";
import { variabilitySchema } from "./common/variability.js";
import { visualSchema } from "./common/visual.js";
import { orbitComponentSchema } from "./components/orbit.js";
import { lightSourceComponentSchema } from "./components/light-source.js";
import { atmosphereComponentSchema } from "./components/atmosphere.js";
import { terrainComponentSchema } from "./components/terrain.js";
import { oceanComponentSchema } from "./components/ocean.js";

const componentSchema = z.discriminatedUnion("type", [
  orbitComponentSchema,
  lightSourceComponentSchema,
  atmosphereComponentSchema,
  terrainComponentSchema,
  oceanComponentSchema,
]);

export const measurementsSchema = z.object({
  parallax: parallaxSchema.optional(),
  position: positionSchema.optional(),
  proper_motion: properMotionSchema.optional(),
  mass: massSchema.optional(),
  radius: radiusSchema.optional(),
  density: densitySchema.optional(),
  albedo: albedoSchema.optional(),
  surface_gravity: surfaceGravitySchema.optional(),
  rotation: rotationSchema.optional(),
  photometry: photometrySchema.optional(),
  effective_temperature: z
    .object({
      value: z.number(),
      unit: z.literal("K"),
      uncertainty: z.any().optional(),
      source: z.string().optional(),
    })
    .optional(),
});
export type Measurements = z.infer<typeof measurementsSchema>;

export const derivedSchema = z.record(z.string(), z.any()).optional();

export const heliosObjectSchema = z.object({
  $schema: z.string().optional(),
  schema_version: z.string(),
  id: z.string(),
  type: z.string(),
  identity: identitySchema,
  status: statusSchema.optional(),
  classification: z.any().optional(),
  measurements: measurementsSchema.optional(),
  derived: derivedSchema,
  components: z.record(z.string(), componentSchema).optional(),
  relationships: relationshipSchema.optional(),
  discovery: discoverySchema.optional(),
  sources: z.record(z.string(), bibliographyEntrySchema).optional(),
  visual: visualSchema.optional(),
  variable: z.any().optional(),
  variability: variabilitySchema.optional(),
  notes: z.record(z.string(), z.string()).optional(),
});

export type HeliosObject = z.infer<typeof heliosObjectSchema>;

export const heliosObjectListSchema = z.array(heliosObjectSchema);
export type HeliosObjectList = z.infer<typeof heliosObjectListSchema>;
