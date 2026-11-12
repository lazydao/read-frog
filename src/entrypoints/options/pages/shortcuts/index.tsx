import { i18n } from "@/utils/i18n"
import { PageLayout } from "../../components/page-layout"
import { NodeTranslationHotkey } from "./node-translation-hotkey"
import { PageTranslationShortcut } from "./page-translation-shortcut"
import { SubtitlesToggleShortcut } from "./subtitles-toggle-shortcut"
import { TranslationModeShortcut } from "./translation-mode-shortcut"

/** The reading shortcuts in one flat list, narrowing scope as the list goes down. */
export function ShortcutsPage() {
  return (
    <PageLayout
      title={i18n.t("options.shortcuts.title")}
      description={i18n.t("options.shortcuts.pageDescription")}
      innerClassName="flex flex-col gap-6"
    >
      <PageTranslationShortcut />
      <TranslationModeShortcut />
      <SubtitlesToggleShortcut />
      <NodeTranslationHotkey />
    </PageLayout>
  )
}
