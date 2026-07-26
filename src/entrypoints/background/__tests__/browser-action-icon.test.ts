import { beforeEach, describe, expect, it, vi } from "vitest"
import { browser, storage } from "#imports"
import { getTabProcessingStateKey } from "@/utils/constants/storage-keys"

const setIconMock = vi.fn<(...args: any[]) => any>()
const setBadgeTextMock = vi.fn<(...args: any[]) => any>()
const setBadgeBackgroundColorMock = vi.fn<(...args: any[]) => any>()
const storageGetItemMock = vi.fn<(...args: any[]) => any>()
const storageRemoveItemMock = vi.fn<(...args: any[]) => any>()
const storageOnChangedAddListenerMock = vi.fn<(...args: any[]) => any>()
const webNavigationOnCommittedAddListenerMock = vi.fn<(...args: any[]) => any>()
const webNavigationOnHistoryStateUpdatedAddListenerMock = vi.fn<(...args: any[]) => any>()
const tabsOnRemovedAddListenerMock = vi.fn<(...args: any[]) => any>()

const DEFAULT_ACTION_ICON_PATHS = {
  16: "/icon/16.png",
  32: "/icon/32.png",
  48: "/icon/48.png",
}

function getStorageChangeListener() {
  const listener = storageOnChangedAddListenerMock.mock.calls.at(-1)?.[0]
  if (!listener) throw new Error("Expected storage.session.onChanged listener")
  return listener as (changes: Record<string, { newValue?: unknown }>) => Promise<void>
}

function getOnCommittedListener() {
  const listener = webNavigationOnCommittedAddListenerMock.mock.calls.at(-1)?.[0]
  if (!listener) throw new Error("Expected webNavigation.onCommitted listener")
  return listener as (details: { tabId: number; frameId: number; url: string }) => Promise<void>
}

async function setupSubject() {
  const { registerActionIconListeners } = await import("../browser-action-icon")
  registerActionIconListeners()
}

describe("browser action icon", () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    browser.action.setIcon = setIconMock
    browser.action.setBadgeText = setBadgeTextMock
    browser.action.setBadgeBackgroundColor = setBadgeBackgroundColorMock
    browser.storage.session.onChanged.addListener = storageOnChangedAddListenerMock
    browser.webNavigation.onCommitted.addListener = webNavigationOnCommittedAddListenerMock
    browser.webNavigation.onHistoryStateUpdated.addListener =
      webNavigationOnHistoryStateUpdatedAddListenerMock
    browser.tabs.onRemoved.addListener = tabsOnRemovedAddListenerMock
    storage.getItem = storageGetItemMock
    storage.removeItem = storageRemoveItemMock

    setIconMock.mockResolvedValue(undefined)
    setBadgeTextMock.mockResolvedValue(undefined)
    setBadgeBackgroundColorMock.mockResolvedValue(undefined)
    storageGetItemMock.mockResolvedValue(undefined)
    storageRemoveItemMock.mockResolvedValue(undefined)

    const { resetTabProcessingRuntimeForTests } = await import("../tab-processing-state")
    resetTabProcessingRuntimeForTests()
  })

  it("shows a processing badge while translation requests are running", async () => {
    await setupSubject()

    await getStorageChangeListener()({
      "tabProcessingState.42": {
        newValue: {
          status: "processing",
          features: ["page"],
          url: "https://example.com/article",
        },
      },
    })

    expect(setIconMock).toHaveBeenCalledWith({
      tabId: 42,
      path: DEFAULT_ACTION_ICON_PATHS,
    })
    expect(setBadgeTextMock).toHaveBeenCalledWith({ tabId: 42, text: "…" })
    expect(setBadgeBackgroundColorMock).toHaveBeenCalledWith({
      tabId: 42,
      color: "#F59E0B",
    })
  })

  it("shows a native completed badge matching the processing badge size", async () => {
    await setupSubject()

    await getStorageChangeListener()({
      "tabProcessingState.42": {
        newValue: {
          status: "done",
          features: ["subtitles"],
          url: "https://www.youtube.com/watch?v=abc",
        },
      },
    })

    expect(setIconMock).toHaveBeenCalledWith({
      tabId: 42,
      path: DEFAULT_ACTION_ICON_PATHS,
    })
    expect(setBadgeTextMock).toHaveBeenCalledWith({ tabId: 42, text: "✓" })
    expect(setBadgeBackgroundColorMock).toHaveBeenCalledWith({
      tabId: 42,
      color: "#0A3658",
    })
  })

  it("returns to the default icon after a top-frame navigation", async () => {
    await setupSubject()

    await getOnCommittedListener()({
      tabId: 42,
      frameId: 0,
      url: "https://example.com/next",
    })

    expect(storageRemoveItemMock).toHaveBeenCalledWith(getTabProcessingStateKey(42))
    expect(setIconMock).toHaveBeenCalledWith({
      tabId: 42,
      path: DEFAULT_ACTION_ICON_PATHS,
    })
    expect(setBadgeTextMock).toHaveBeenCalledWith({ tabId: 42, text: "" })
  })

  it("ignores iframe navigation", async () => {
    await setupSubject()

    await getOnCommittedListener()({
      tabId: 42,
      frameId: 7,
      url: "https://embed.example.net/frame",
    })

    expect(storageRemoveItemMock).not.toHaveBeenCalled()
    expect(setIconMock).not.toHaveBeenCalled()
  })

  it("registers listeners when history navigation events are unavailable", async () => {
    const historyStateUpdated = browser.webNavigation.onHistoryStateUpdated
    ;(browser.webNavigation as { onHistoryStateUpdated?: unknown }).onHistoryStateUpdated =
      undefined

    try {
      await expect(setupSubject()).resolves.toBeUndefined()
      expect(webNavigationOnCommittedAddListenerMock).toHaveBeenCalledOnce()
      expect(webNavigationOnHistoryStateUpdatedAddListenerMock).not.toHaveBeenCalled()
    } finally {
      ;(browser.webNavigation as { onHistoryStateUpdated?: unknown }).onHistoryStateUpdated =
        historyStateUpdated
    }
  })
})
