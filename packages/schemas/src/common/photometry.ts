import { z } from "zod";
import { UnitSchema, uncertaintySchema } from "./measurement.js";

export const magnitudeEntrySchema = z.object({
  value: z.number(),
  unit: UnitSchema,
  uncertainty: uncertaintySchema.optional(),
  source: z.string().optional(),
});
export type MagnitudeEntry = z.infer<typeof magnitudeEntrySchema>;

export const photometrySchema = z.object({
  apparent: z.record(z.string(), magnitudeEntrySchema).optional(),
  absolute: z.record(z.string(), magnitudeEntrySchema).optional(),
});
export type Photometry = z.infer<typeof photometrySchema>;
