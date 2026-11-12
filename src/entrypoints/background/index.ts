import "@/utils/zod-config"
import type { Config, UiLanguage } from "@/types/config/config"
import type { ThemeMode } from "@/types/config/theme"
import { browser, defineBackground } from "#imports"
import { DEFAULT_THEME_MODE, themeModeSchema } from "@/types/config/theme"
import { storageAdapter } from "@/utils/atoms/storage-adapter"
import { selectFreshTranslateProviders } from "@/utils/config/default-translate-provider"
import { setLocalConfig } from "@/utils/config/storage"
import { CONFIG_STORAGE_KEY, THEME_STORAGE_KEY } from "@/utils/constants/config"
import { initI18n, setUiLanguage } from "@/utils/i18n"
import { ensureInstalledAtRecorded } from "@/utils/install-time"
import { logger } from "@/utils/logger"
import { onMessage, sendMessage } from "@/utils/message"
import { openOptionsPage } from "@/utils/navigation"
import { ensureRemoteSiteRulesLoaded } from "@/utils/site-rules/active"
import { runAiSegmentSubtitles } from "./ai-segmentation"
import { dispatchBackgroundStreamPort } from "./background-stream"
import { initializeActionIcons, registerActionIconListeners } from "./browser-action-icon"
import { ensureInitializedConfig, isFreshInstalledConfig } from "./config"
import {
  cleanupAllAiSegmentationCache,
  cleanupAllSummaryCache,
  cleanupAllTranslationCache,
  setUpDatabaseCleanup,
} from "./db-cleanup"
import { setupGlossaryMessageHandlers } from "./glossary"
import { setupHostedAiStatusHandler } from "./hosted-ai-status"
import { setupIframeInjection } from "./iframe-injection"
import { setupLLMGenerateTextMessageHandlers } from "./llm-generate-text"
import { setupPageTranslationHandlers } from "./page-translation"
import { proxyFetch } from "./proxy-fetch"
import { setUpSiteRulesUpdate } from "./site-rules-update"
import { setupSubtitlesTranslationHandlers } from "./subtitles-translation"
import { translationMessage } from "./translation-signal"
import { setupVideoSummaryHandlers } from "./video-summary"

async function broadcastToTabs(send: (tabId: number) => Promise<unknown>): Promise<void> {
  const tabs = await browser.tabs.query({})
  await Promise.all(
    tabs.flatMap((tab) =>
      typeof tab.id === "number" ? [send(tab.id).catch(() => undefined)] : [],
    ),
  )
}

async function broadcastConfigChanged(config: Config): Promise<void> {
  await broadcastToTabs((tabId) => sendMessage("configChanged", config, tabId))
}

async function broadcastThemeModeChanged(themeMode: ThemeMode): Promise<void> {
  await broadcastToTabs((tabId) => sendMessage("themeModeChanged", themeMode, tabId))
}

export default defineBackground({
  type: "module",
  main: () => {
    logger.info("Hello background!", { id: browser.runtime.id })

    browser.runtime.onInstalled.addListener(async (details) => {
      // First, and for every reason rather than just "install": this is the only place the
      // install time is ever recorded, and it must not be lost to a service worker dying
      // during the slower work below.
      await ensureInstalledAtRecorded()

      await ensureInitializedConfig()
      logger.info("[Background] Extension installed or updated", { reason: details.reason })

      // Deliberately last: probing Google Translate can hang for seconds on networks that
      // block it, and nothing above should wait for that. Awaiting inside the listener
      // keeps the service worker alive until the probe settles. Guarded by the config
      // actually being new rather than by the install reason: reloading an unpacked
      // extension reports "install" while the developer's provider choice is still in
      // storage, and a config rebuilt from defaults after failing validation during an
      // update deserves the same provider selection a fresh install gets.
      if (await isFreshInstalledConfig()) {
        await selectFreshTranslateProviders()
      }
    })

    // Content scripts read and write configuration and theme through these
    // handlers instead of touching extension storage themselves.
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

    // Synchronous: all translation and summary handlers register in the first turn of
    // the SW so wake-triggering messages are never dropped during init.
    setupPageTranslationHandlers()
    setupSubtitlesTranslationHandlers()
    setupVideoSummaryHandlers()
    void setUpDatabaseCleanup()
    setUpSiteRulesUpdate()
    void ensureRemoteSiteRulesLoaded()

    // Start config and i18n initialization without delaying synchronous listener
    // registration. Consumers that materialize localized config-derived data await
    // this shared barrier before reading it.
    let currentUiLanguage: UiLanguage | undefined
    const backgroundReady = (async () => {
      const config = await ensureInitializedConfig()
      currentUiLanguage = config?.uiLanguage ?? "auto"
      await initI18n(currentUiLanguage)
    })()

    proxyFetch()
    setupHostedAiStatusHandler()
    setupGlossaryMessageHandlers()
    setupLLMGenerateTextMessageHandlers()

    // Setup on-demand iframe injection after page translation is enabled.
    setupIframeInjection()

    // Keep background-resolved strings in the selected language when it changes,
    // and tell content scripts, which do not watch extension storage themselves.
    storageAdapter.watch<Config>(CONFIG_STORAGE_KEY, (newConfig) => {
      void broadcastConfigChanged(newConfig).catch((error) =>
        logger.warn("Failed to broadcast config change", error),
      )
      void (async () => {
        await backgroundReady
        if (newConfig.uiLanguage === currentUiLanguage) return
        currentUiLanguage = newConfig.uiLanguage
        await setUiLanguage(newConfig.uiLanguage)
      })()
    })

    storageAdapter.watch<ThemeMode>(THEME_STORAGE_KEY, (newThemeMode) => {
      void broadcastThemeModeChanged(newThemeMode).catch((error) =>
        logger.warn("Failed to broadcast theme mode change", error),
      )
    })
  },
})
