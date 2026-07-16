import { Icon } from "@iconify/react"
import { Link, useLocation } from "react-router"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/base-ui/sidebar"
import { i18n } from "@/utils/i18n"

const NAV_ITEMS = [
  { path: "/", icon: "tabler:adjustments-horizontal", label: "options.general.title" },
  { path: "/api-providers", icon: "tabler:api", label: "options.apiProviders.title" },
  { path: "/translation", icon: "ri:translate", label: "options.translation.title" },
  { path: "/site-rules", icon: "tabler:world-cog", label: "options.siteRules.title" },
  { path: "/video-subtitles", icon: "tabler:subtitles", label: "options.videoSubtitles.title" },
] as const

export function SettingsNav() {
  const { pathname } = useLocation()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{i18n.t("options.sidebar.settings")}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {NAV_ITEMS.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                render={<Link to={item.path} />}
                isActive={pathname === item.path}
              >
                <Icon icon={item.icon} />
                <span>{i18n.t(item.label)}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
