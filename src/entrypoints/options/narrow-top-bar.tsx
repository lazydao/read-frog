import { SidebarTrigger } from "@/components/ui/base-ui/sidebar"
import { i18n } from "@/utils/i18n"

/**
 * Below `md` the sidebar becomes an off-canvas sheet that starts closed, taking the whole nav with
 * it. This bar is the only visible way back — the sidebar's own collapse toggle lives inside the
 * sheet, so without this the sidebar is reachable only through the ⌘/Ctrl+B shortcut.
 */
export function NarrowTopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-12 items-center gap-0.5 border-b bg-background/85 px-2 backdrop-blur md:hidden">
      <SidebarTrigger aria-label={i18n.t("options.sidebar.toggle")} />
    </header>
  )
}
