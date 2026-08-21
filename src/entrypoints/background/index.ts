import "@/utils/zod-config"
import type { Config, UiLanguage } from "@/types/config/config"
import type { ThemeMode } from "@/types/config/theme"
import { browser, defineBackground } from "#imports"
import { DEFAULT_THEME_MODE, themeModeSchema } from "@/types/config/theme"
import { storageAdapter } from "@/utils/atoms/storage-adapter"
import { setLocalConfig } from "@/utils/config/storage"
import { CONFIG_STORAGE_KEY, THEME_STORAGE_KEY } from "@/utils/constants/config"
import { initI18n, setUiLanguage } from "@/utils/i18n"
import { logger } from "@/utils/logger"
import { onMessage, sendMessage } from "@/utils/message"
import { openOptionsPage } from "@/utils/navigation"
import { runAiSegmentSubtitles } from "./ai-segmentation"
import { dispatchBackgroundStreamPort } from "./background-stream"
import { initializeActionIcons, registerActionIconListeners } from "./browser-action-icon"
import { ensureInitializedConfig } from "./config"
import {
  cleanupAllAiSegmentationCache,
  cleanupAllSummaryCache,
  cleanupAllTranslationCache,
  setUpDatabaseCleanup,
} from "./db-cleanup"
import { setupIframeInjection } from "./iframe-injection"
import { setupLLMGenerateTextMessageHandlers } from "./llm-generate-text"
import { proxyFetch } from "./proxy-fetch"
import { setUpSubtitlesTranslationQueue, setUpWebPageTranslationQueue } from "./translation-queues"
import { translationMessage } from "./translation-signal"

async function broadcastConfigChanged(config: Config): Promise<void> {
  const tabs = await browser.tabs.query({})
  await Promise.all([
    // runtime.sendMessage reaches open extension pages such as popup/options.
    sendMessage("configChanged", config).catch(() => undefined),
    ...tabs.flatMap((tab) =>
      typeof tab.id === "number"
        ? [sendMessage("configChanged", config, tab.id).catch(() => undefined)]
        : [],
    ),
  ])
}

async function broadcastThemeModeChanged(themeMode: ThemeMode): Promise<void> {
  const tabs = await browser.tabs.query({})
  await Promise.all([
    sendMessage("themeModeChanged", themeMode).catch(() => undefined),
    ...tabs.flatMap((tab) =>
      typeof tab.id === "number"
        ? [sendMessage("themeModeChanged", themeMode, tab.id).catch(() => undefined)]
        : [],
    ),
  ])
}

export default defineBackground({
  type: "module",
  main: () => {
    logger.info("Hello background!", { id: browser.runtime.id })

    browser.runtime.onInstalled.addListener(async (details) => {
      await ensureInitializedConfig()
      logger.info("[Background] Extension installed or updated", { reason: details.reason })
    })

    onMessage("getInitialConfig", async () => {
      return await ensureInitializedConfig()
    })

    onMessage("setConfig", async (message) => {
      await setLocalConfig(message.data)
    })

    onMessage("getThemeMode", async () => {
      return await storageAdapter.get(THEME_STORAGE_KEY, DEFAULT_THEME_MODE, themeModeSchema)
    })

    onMessage("setThemeMode", async (message) => {
      await storageAdapter.set(THEME_STORAGE_KEY, message.data, themeModeSchema)
    })

    onMessage("openPage", async (message) => {
      const { url, active } = message.data
      logger.info("openPage", { url, active })
      await browser.tabs.create({ url, active: active ?? true })
    })

    onMessage("openOptionsPage", async (message) => {
      logger.info("openOptionsPage", message.data)
      await openOptionsPage(message.data)
    })

    onMessage("aiSegmentSubtitles", async (message) => {
      try {
        return await runAiSegmentSubtitles(message.data)
      } catch (error) {
        logger.error("[Background] aiSegmentSubtitles failed", error)
        throw error
      }
    })

    browser.runtime.onConnect.addListener((port) => {
      dispatchBackgroundStreamPort(port)
    })

    onMessage("clearAllTranslationRelatedCache", async () => {
      await cleanupAllTranslationCache()
      await cleanupAllSummaryCache()
    })

    onMessage("clearAiSegmentationCache", async () => {
      await cleanupAllAiSegmentationCache()
    })

    translationMessage()
    registerActionIconListeners()

    // Initialize action icons asynchronously
    void initializeActionIcons()

    void setUpWebPageTranslationQueue()
    void setUpSubtitlesTranslationQueue()
    void setUpDatabaseCleanup()

    proxyFetch()
    setupLLMGenerateTextMessageHandlers()

    // Setup on-demand iframe injection after page translation is enabled.
    setupIframeInjection()

    // Bootstrap i18n for background-resolved strings.
    let currentUiLanguage: UiLanguage | undefined
    void (async () => {
      const config = await ensureInitializedConfig()
      currentUiLanguage = config?.uiLanguage ?? "auto"
      await initI18n(currentUiLanguage)
    })()

    // Keep background-resolved strings in the selected language when it changes.
    storageAdapter.watch<Config>(CONFIG_STORAGE_KEY, (newConfig) => {
      void broadcastConfigChanged(newConfig).catch((error) =>
        logger.warn("Failed to broadcast config change", error),
      )
      if (newConfig.uiLanguage === currentUiLanguage) return
      currentUiLanguage = newConfig.uiLanguage
      void setUiLanguage(newConfig.uiLanguage)
    })

    storageAdapter.watch<ThemeMode>(THEME_STORAGE_KEY, (newThemeMode) => {
      void broadcastThemeModeChanged(newThemeMode).catch((error) =>
        logger.warn("Failed to broadcast theme mode change", error),
      )
    })
  },
})
