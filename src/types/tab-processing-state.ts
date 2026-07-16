import { z } from "zod"

export const tabProcessingFeatureSchema = z.enum(["page", "subtitles"])

export const tabProcessingStateSchema = z.object({
  status: z.enum(["processing", "done"]),
  features: z.array(tabProcessingFeatureSchema),
  url: z.string().optional(),
})

export type TabProcessingFeature = z.infer<typeof tabProcessingFeatureSchema>
export type TabProcessingState = z.infer<typeof tabProcessingStateSchema>
