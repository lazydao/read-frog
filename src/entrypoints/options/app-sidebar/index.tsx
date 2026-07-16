import { Sidebar, SidebarContent } from "@/components/ui/base-ui/sidebar"
import { SettingsNav } from "./settings-nav"

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="transition-all group-data-[state=expanded]:px-2">
        <SettingsNav />
      </SidebarContent>
    </Sidebar>
  )
}
