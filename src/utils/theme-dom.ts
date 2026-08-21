import type { ThemeMode } from "@/types/config/theme"

export function isDarkMode(themeMode: ThemeMode = "system"): boolean {
  if (themeMode === "system") {
    return (
      typeof window !== "undefined" &&
      (window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false)
    )
  }
  return themeMode === "dark"
}

export function applyTheme(target: HTMLElement, theme: "light" | "dark") {
  target.classList.remove("light", "dark")
  target.classList.add(theme)
  target.style.colorScheme = theme
}
