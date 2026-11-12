import themeCSS from "@/assets/styles/theme.css?inline"
import { OVERLAY_SHADOW_ROOT_CSS } from "@/utils/shadow-root"

// The shared content runtime bundles the theme once for its shadow-root UI
// instead of letting WXT emit and fetch a stylesheet per content script. Same
// order and `:root` → `:host` rewrite as WXT's loader.
function toShadowCss(css: string) {
  return css.replaceAll(":root", ":host")
}

export const CONTENT_UI_CSS = `${OVERLAY_SHADOW_ROOT_CSS}\n${toShadowCss(themeCSS)}`
