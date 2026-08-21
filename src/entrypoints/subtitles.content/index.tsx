import "@/utils/zod-config"
import { defineContentScript } from "#imports"
import { initI18n } from "@/utils/i18n"
import { sendMessage } from "@/utils/message"

declare global {
  interface Window {
    __READ_FROG_SUBTITLES_INJECTED__?: boolean
  }
}

export default defineContentScript({
  matches: ["*://*.youtube.com/*", "*://*.youtube-nocookie.com/*"],
  allFrames: true,
  cssInjectionMode: "manifest",
  async main(ctx) {
    if (window.__READ_FROG_SUBTITLES_INJECTED__) return
    window.__READ_FROG_SUBTITLES_INJECTED__ = true

    const config = await sendMessage("getInitialConfig", undefined)
    if (!config?.videoSubtitles?.enabled) {
      window.__READ_FROG_SUBTITLES_INJECTED__ = false
      return
    }

    await initI18n(config.uiLanguage)

    ctx.onInvalidated(() => {
      window.__READ_FROG_SUBTITLES_INJECTED__ = false
    })

    const { bootstrapSubtitlesRuntime } = await import("./runtime")
    bootstrapSubtitlesRuntime()
  },
})
