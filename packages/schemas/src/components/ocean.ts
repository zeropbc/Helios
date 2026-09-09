import { z } from "zod";

export const oceanComponentSchema = z.object({
  type: z.literal("ocean"),
});
export type OceanComponent = z.infer<typeof oceanComponentSchema>;
