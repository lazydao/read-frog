import { beforeEach, describe, expect, it, vi } from "vitest"
import { storage } from "#imports"
import { getTabProcessingStateKey } from "@/utils/constants/storage-keys"
import {
  beginTabProcessing,
  clearTabProcessingState,
  finishTabProcessing,
  getTabProcessingState,
  resetTabProcessingRuntimeForTests,
} from "../tab-processing-state"

const storedValues = new Map<string, unknown>()

describe("tab processing state", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storedValues.clear()
    resetTabProcessingRuntimeForTests()

    storage.getItem = vi.fn<(key: string) => Promise<unknown>>(async (key) => storedValues.get(key))
    storage.setItem = vi.fn<(key: string, value: unknown) => Promise<void>>(async (key, value) => {
      storedValues.set(key, value)
    })
    storage.removeItem = vi.fn<(key: string) => Promise<void>>(async (key) => {
      storedValues.delete(key)
    })
  })

  it("moves from processing to done after a successful page translation", async () => {
    const token = await beginTabProcessing(42, "page", "https://example.com/article#comments")

    expect(await getTabProcessingState(42)).toEqual({
      status: "processing",
      features: ["page"],
      url: "https://example.com/article",
    })

    await finishTabProcessing(token, true)

    expect(await getTabProcessingState(42)).toEqual({
      status: "done",
      features: ["page"],
      url: "https://example.com/article",
    })
  })

  it("stays processing until all concurrent page and subtitle requests finish", async () => {
    const pageToken = await beginTabProcessing(42, "page", "https://example.com/video")
    const subtitleToken = await beginTabProcessing(42, "subtitles", "https://example.com/video")

    await finishTabProcessing(pageToken, true)
    expect(await getTabProcessingState(42)).toEqual({
      status: "processing",
      features: ["page", "subtitles"],
      url: "https://example.com/video",
    })

    await finishTabProcessing(subtitleToken, true)
    expect(await getTabProcessingState(42)).toEqual({
      status: "done",
      features: ["page", "subtitles"],
      url: "https://example.com/video",
    })
  })

  it("returns to idle when the only request fails", async () => {
    const token = await beginTabProcessing(42, "page", "https://example.com")
    await finishTabProcessing(token, false)

    expect(await getTabProcessingState(42)).toBeNull()
    expect(storedValues.has(getTabProcessingStateKey(42))).toBe(false)
  })

  it("ignores a stale completion after navigation clears the tab", async () => {
    const token = await beginTabProcessing(42, "subtitles", "https://example.com/old")
    await clearTabProcessingState(42)
    await finishTabProcessing(token, true)

    expect(await getTabProcessingState(42)).toBeNull()
  })
})
