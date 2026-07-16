import { describe, expect, it } from "vitest"
import { ANALYTICS_FEATURE, ANALYTICS_SURFACE } from "@/types/analytics"
import {
  buildFeatureUsedEventProperties,
  getLatencyMs,
  trackFeatureUsed,
} from "@/utils/analytics"

describe("analytics compatibility helpers", () => {
  it("derives latency in milliseconds and clamps negative durations", () => {
    expect(getLatencyMs(0, 999)).toBe(999)
    expect(getLatencyMs(0, 1_500)).toBe(1_500)
    expect(getLatencyMs(10, 0)).toBe(0)
  })

  it("builds the legacy feature payload for internal callers", () => {
    expect(
      buildFeatureUsedEventProperties({
        feature: ANALYTICS_FEATURE.PAGE_TRANSLATION,
        surface: ANALYTICS_SURFACE.POPUP,
        outcome: "success",
        startedAt: 0,
        finishedAt: 1_500,
      }),
    ).toEqual({
      feature: ANALYTICS_FEATURE.PAGE_TRANSLATION,
      surface: ANALYTICS_SURFACE.POPUP,
      outcome: "success",
      latency_ms: 1_500,
    })
  })

  it("keeps tracking calls as local no-ops", async () => {
    await expect(
      trackFeatureUsed({
        feature: ANALYTICS_FEATURE.PAGE_TRANSLATION,
        surface: ANALYTICS_SURFACE.POPUP,
        outcome: "success",
        startedAt: 0,
      }),
    ).resolves.toBeUndefined()
  })
})
