import { z } from "zod";

export const visualRenderSchema = z.object({
  model: z.string().optional(),
  surface: z
    .object({
      material: z.string().optional(),
    })
    .optional(),
  color: z
    .object({
      mode: z.string().optional(),
      value: z.string().optional(),
    })
    .optional(),
  scale: z
    .object({
      mode: z.enum(["physical", "logarithmic", "arbitrary"]).optional(),
    })
    .optional(),
});
export type VisualRender = z.infer<typeof visualRenderSchema>;

export const visualSchema = z.object({
  render: visualRenderSchema.optional(),
});
export type Visual = z.infer<typeof visualSchema>;
