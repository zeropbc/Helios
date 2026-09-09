import { z } from "zod";

export const terrainComponentSchema = z.object({
  type: z.literal("terrain"),
  type_classification: z.string().optional(),
});
export type TerrainComponent = z.infer<typeof terrainComponentSchema>;
