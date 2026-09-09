import { z } from "zod";

export const variabilitySchema = z.object({
  type: z.string(),
  classification: z.string().optional(),
  period: z
    .object({
      value: z.number(),
      unit: z.enum(["day", "yr", "hr"]),
    })
    .nullable()
    .optional(),
});
export type Variability = z.infer<typeof variabilitySchema>;
