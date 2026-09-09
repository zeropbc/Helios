import { z } from "zod";

export const atmosphereComponentSchema = z.object({
  type: z.literal("atmosphere"),
  composition: z
    .record(
      z.string(),
      z.object({
        fraction: z.number().min(0).max(1).optional(),
      })
    )
    .optional(),
  surface_pressure: z
    .object({
      value: z.number(),
      unit: z.enum(["Pa", "bar", "atm"]),
    })
    .optional(),
});
export type AtmosphereComponent = z.infer<typeof atmosphereComponentSchema>;
