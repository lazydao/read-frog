import type { ThemeMode } from "@/types/config/theme"
import { atom } from "jotai"
import { DEFAULT_THEME_MODE } from "@/types/config/theme"
import { logger } from "../logger"
import { onMessage, sendMessage } from "../message"

// Private base atom. Only export this for top-level hydration before ThemeProvider mounts.
export const baseThemeModeAtom = atom<ThemeMode>(DEFAULT_THEME_MODE)

// Public atom with read/write - persistence always goes through background messaging.
export const themeModeAtom = atom(
  (get) => get(baseThemeModeAtom),
  async (get, set, newValue: ThemeMode) => {
    const prev = get(baseThemeModeAtom)
    set(baseThemeModeAtom, newValue)
    try {
      await sendMessage("setThemeMode", newValue)
    } catch (error) {
      console.error("Failed to persist themeMode through background:", newValue, error)
      set(baseThemeModeAtom, prev)
    }
  },
)

baseThemeModeAtom.onMount = (setAtom: (newValue: ThemeMode) => void) => {
  void sendMessage("getThemeMode", undefined).then((value) => setAtom(value ?? DEFAULT_THEME_MODE))
  const removeThemeModeChangedListener = onMessage("themeModeChanged", (message) => {
    setAtom(message.data)
  })

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      logger.info("baseThemeModeAtom onMount handleVisibilityChange when: ", new Date())
      void sendMessage("getThemeMode", undefined).then((value) =>
        setAtom(value ?? DEFAULT_THEME_MODE),
      )
    }
  }
  document.addEventListener("visibilitychange", handleVisibilityChange)

  return () => {
    removeThemeModeChangedListener()
    document.removeEventListener("visibilitychange", handleVisibilityChange)
  }
}
