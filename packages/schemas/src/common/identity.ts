import { z } from "zod";
import { uncertaintySchema, UnitSchema } from "./measurement.js";

export const statusSchema = z.enum([
  "confirmed",
  "candidate",
  "disputed",
  "retracted",
  "historical",
  "hypothetical",
]);
export type Status = z.infer<typeof statusSchema>;

export const classificationSchema = z.object({
  primary: z.string(),
  subtype: z.string().optional(),
  spectral_type: z.string().optional(),
  variable_type: z.string().optional(),
});
export type Classification = z.infer<typeof classificationSchema>;

export const identitySchema = z.object({
  name: z.string(),
  designations: z.array(z.string()).optional(),
  classification: classificationSchema,
});
export type Identity = z.infer<typeof identitySchema>;

export const discoverySchema = z.object({
  date: z.string().optional(),
  discoverer: z.union([z.string(), z.array(z.string())]).optional(),
  institution: z.string().optional(),
  method: z.string().optional(),
});
export type Discovery = z.infer<typeof discoverySchema>;

export const relationshipSchema = z.object({
  parent: z.string().optional(),
  companions: z.array(z.string()).optional(),
  children: z.array(z.string()).optional(),
});
export type Relationship = z.infer<typeof relationshipSchema>;

export const bibliographyEntrySchema = z.object({
  type: z.string(),
  citation: z.string(),
  doi: z.string().optional(),
  url: z.string().optional(),
  accessed: z.string().optional(),
});
export type BibliographyEntry = z.infer<typeof bibliographyEntrySchema>;

export const getObservationSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: valueSchema,
    unit: UnitSchema,
    uncertainty: uncertaintySchema.optional(),
    source: z.string().optional(),
  });
