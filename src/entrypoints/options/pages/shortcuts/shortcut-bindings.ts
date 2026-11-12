import type { Config } from "@/types/config/config"
import { i18n } from "@/utils/i18n"
import { isSameShortcut } from "@/utils/shortcut"

/** One recorded key combination on the Shortcuts page, by the id of its row. */
export interface ShortcutBinding {
  id: string
  title: string
  shortcut: string
}

/**
 * Every key combination TransFrog listens for on a page. They all hear the same keystrokes, so
 * two of them on one key would both run. Hover translation is in only while it uses a custom
 * shortcut: its other hotkeys are a single key or a long press, not a combination.
 */
export function getShortcutBindings(config: Config): ShortcutBinding[] {
  const { node } = config.pageTranslation
  return [
    {
      id: "page-translation-shortcut",
      title: i18n.t("options.shortcuts.pageTranslation.title"),
      shortcut: config.pageTranslation.page.shortcut,
    },
    {
      id: "translation-mode-shortcut",
      title: i18n.t("options.shortcuts.translationMode.title"),
      shortcut: config.pageTranslation.modeShortcut,
    },
    {
      id: "subtitles-toggle-shortcut",
      title: i18n.t("options.shortcuts.subtitlesToggle.title"),
      shortcut: config.videoSubtitles.toggleShortcut,
    },
    ...(node.hotkey === "custom"
      ? [
          {
            id: "node-translation-shortcut",
            title: i18n.t("options.shortcuts.nodeTranslation.title"),
            shortcut: node.shortcut,
          },
        ]
      : []),
  ]
}

/** The other binding already on these keys, if one is. */
export function findShortcutOwner(
  bindings: ShortcutBinding[],
  id: string,
  shortcut: string,
): ShortcutBinding | undefined {
  return bindings.find((binding) => binding.id !== id && isSameShortcut(binding.shortcut, shortcut))
}
