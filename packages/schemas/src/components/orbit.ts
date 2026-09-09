import { z } from "zod";
import { orbitSchema } from "../common/astrometry.js";

export const orbitComponentSchema = z.object({
  type: z.literal("orbit"),
  orbit: orbitSchema,
});
export type OrbitComponent = z.infer<typeof orbitComponentSchema>;
