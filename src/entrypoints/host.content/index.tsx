import "@/utils/zod-config"
import { defineContentScript } from "#imports"
import { initI18n } from "@/utils/i18n"
import { sendMessage } from "@/utils/message"
import {
  clearEffectiveSiteControlUrl,
  getEffectiveSiteControlUrl,
  isSiteEnabled,
} from "@/utils/site-control"

declare global {
  interface Window {
    __READ_FROG_HOST_INJECTED__?: boolean
  }
}

export default defineContentScript({
  matches: ["*://*/*", "file:///*"],
  cssInjectionMode: "manual",
  async main(ctx) {
    // Prevent double injection (manifest-based + programmatic injection)
    if (window.__READ_FROG_HOST_INJECTED__) return
    window.__READ_FROG_HOST_INJECTED__ = true

    const initialConfig = await sendMessage("getInitialConfig", undefined)
    const siteControlUrl = getEffectiveSiteControlUrl(window.location.href)

    if (!isSiteEnabled(siteControlUrl, initialConfig)) {
      window.__READ_FROG_HOST_INJECTED__ = false
      clearEffectiveSiteControlUrl()
      return
    }

    await initI18n(initialConfig?.uiLanguage)

    const { bootstrapHostContent } = await import("./runtime")
    await bootstrapHostContent(ctx, initialConfig)
  },
})
