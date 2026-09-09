import { z } from "zod";
import { effectiveTemperatureSchema, luminositySchema } from "../common/physics.js";

export const lightSourceComponentSchema = z.object({
  type: z.literal("light_source"),
  luminosity: luminositySchema,
  effective_temperature: effectiveTemperatureSchema,
  spectrum: z
    .object({
      type: z.string(),
    })
    .optional(),
});
export type LightSourceComponent = z.infer<typeof lightSourceComponentSchema>;
