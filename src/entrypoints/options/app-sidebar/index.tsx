import { Sidebar, SidebarContent } from "@/components/ui/base-ui/sidebar"
import { CollapseToggle } from "./collapse-toggle"
import { FeaturesNav } from "./features-nav"
import { SettingsNav } from "./settings-nav"

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="transition-all group-data-[state=expanded]:px-2">
        <SettingsNav />
        <FeaturesNav />
      </SidebarContent>
      <CollapseToggle />
    </Sidebar>
  )
}
