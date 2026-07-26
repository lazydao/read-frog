import type { TabProcessingState } from "@/types/tab-processing-state"
import { browser } from "#imports"
import { tabProcessingStateSchema } from "@/types/tab-processing-state"
import {
  parseTabIdFromStorageKey,
  TAB_PROCESSING_STATE_KEY_PREFIX,
} from "@/utils/constants/storage-keys"
import { logger } from "@/utils/logger"
import {
  clearTabProcessingState,
  getTabProcessingState,
  isTabProcessingStateInUrlScope,
} from "./tab-processing-state"

type ActionIconSize = 16 | 32 | 48
type ActionIconPathMap = Record<ActionIconSize, string>

const DEFAULT_ACTION_ICON_PATHS: ActionIconPathMap = {
  16: "/icon/16.png",
  32: "/icon/32.png",
  48: "/icon/48.png",
}

async function updateActionIcon(tabId: number, state: TabProcessingState | null) {
  const processing = state?.status === "processing"
  const done = state?.status === "done"
  const badgeText = processing ? "…" : done ? "✓" : ""

  await Promise.all([
    browser.action.setIcon({
      tabId,
      path: DEFAULT_ACTION_ICON_PATHS,
    }),
    browser.action.setBadgeText({
      tabId,
      text: badgeText,
    }),
    ...(processing || done
      ? [
          browser.action.setBadgeBackgroundColor({
            tabId,
            color: processing ? "#F59E0B" : "#0A3658",
          }),
        ]
      : []),
  ])
}

async function clearActionStateAfterNavigation(tabId: number) {
  await clearTabProcessingState(tabId)
  await updateActionIcon(tabId, null)
}

export function registerActionIconListeners() {
  browser.storage.session.onChanged.addListener(async (changes) => {
    await Promise.allSettled(
      Object.entries(changes).map(async ([storageKey, change]) => {
        if (!storageKey.startsWith(TAB_PROCESSING_STATE_KEY_PREFIX.replace("session:", ""))) {
          return
        }

        const tabId = parseTabIdFromStorageKey(storageKey)
        if (Number.isNaN(tabId)) return

        const parsed = tabProcessingStateSchema.safeParse(change.newValue)
        await updateActionIcon(tabId, parsed.success ? parsed.data : null)
      }),
    )
  })

  browser.webNavigation.onCommitted.addListener(async (details) => {
    if (details.frameId !== 0) return

    try {
      await clearActionStateAfterNavigation(details.tabId)
    } catch (error) {
      logger.warn("Failed to reset action icon after navigation", {
        error,
        tabId: details.tabId,
      })
    }
  })

  // Safari does not expose onHistoryStateUpdated. Keep the background worker
  // alive there while retaining SPA badge resets in Chromium and Firefox.
  browser.webNavigation.onHistoryStateUpdated?.addListener(async (details) => {
    if (details.frameId !== 0) return

    try {
      const state = await getTabProcessingState(details.tabId)
      if (isTabProcessingStateInUrlScope(state, details.url)) return
      await clearActionStateAfterNavigation(details.tabId)
    } catch (error) {
      logger.warn("Failed to reset action icon after history navigation", {
        error,
        tabId: details.tabId,
      })
    }
  })

  browser.tabs.onRemoved.addListener((tabId) => {
    void clearTabProcessingState(tabId)
  })
}

export async function initializeActionIcons() {
  const tabs = await browser.tabs.query({})

  await Promise.all(
    tabs.map(async (tab) => {
      if (typeof tab.id !== "number") return

      try {
        const state = await getTabProcessingState(tab.id)
        if (!isTabProcessingStateInUrlScope(state, tab.url)) {
          await clearTabProcessingState(tab.id)
          await updateActionIcon(tab.id, null)
          return
        }

        await updateActionIcon(tab.id, state)
      } catch (error) {
        logger.warn("Failed to initialize action icon for tab", { error, tabId: tab.id })
      }
    }),
  )
}
