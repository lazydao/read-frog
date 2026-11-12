import type { ContentScriptContext } from "#imports"
import type { ThemeMode } from "@/types/config/theme"
import { kebabCase } from "case-anything"
import { Provider as JotaiProvider } from "jotai"
import { useHydrateAtoms } from "jotai/utils"
import ReactDOM from "react-dom/client"
import { createShadowRootUi } from "#imports"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { ToastProvider } from "@/components/ui/base-ui/toast"
import { baseThemeModeAtom } from "@/utils/atoms/theme"
import { APP_NAME } from "@/utils/constants/app"
import { CONTENT_UI_CSS } from "@/utils/content-ui-css"
import { LocaleBoundary } from "@/utils/i18n/locale-boundary"
import { ShadowWrapperContext } from "@/utils/react-shadow-host/create-shadow-host"
import { insertShadowRootUIWrapperInto, keepShadowHostRendered } from "@/utils/shadow-root"
import { getLocalThemeMode } from "@/utils/theme"

function HydrateAtoms({
  initialValues,
  children,
}: {
  initialValues: [[typeof baseThemeModeAtom, ThemeMode]]
  children: React.ReactNode
}) {
  useHydrateAtoms(initialValues)
  return children
}

/**
 * The content runtime's one corner-toast surface. Upstream renders its toasts
 * inside the selection toolbar's UI; this fork has no toolbar, so page
 * translation mounts this instead. Top frame only: every part of the runtime
 * shares one `toastManager`, and a toast raised in an iframe has no room there.
 */
export async function mountContentToasts(ctx: ContentScriptContext): Promise<void> {
  const themeMode = await getLocalThemeMode()

  const ui = await createShadowRootUi(ctx, {
    name: `${kebabCase(APP_NAME)}-toasts`,
    position: "overlay",
    anchor: "body",
    css: CONTENT_UI_CSS,
    onMount: (container, _shadow, shadowHost) => {
      // The wrapper is what ThemeProvider puts `.dark` on. A toast portalled to
      // the shadow root itself would sit beside it and keep the light tokens.
      const wrapper = insertShadowRootUIWrapperInto(container, shadowHost)
      const root = ReactDOM.createRoot(wrapper)
      root.render(
        <ShadowWrapperContext value={wrapper}>
          <JotaiProvider>
            <HydrateAtoms initialValues={[[baseThemeModeAtom, themeMode]]}>
              <ThemeProvider container={wrapper}>
                <LocaleBoundary>
                  <ToastProvider
                    portalProps={{ container: wrapper }}
                    viewportProps={{ className: "z-2147483647" }}
                  />
                </LocaleBoundary>
              </ThemeProvider>
            </HydrateAtoms>
          </JotaiProvider>
        </ShadowWrapperContext>,
      )
      return root
    },
    onRemove: (root) => {
      root?.unmount()
    },
  })

  ui.mount()
  ctx.onInvalidated(keepShadowHostRendered(ui.shadowHost))
}
