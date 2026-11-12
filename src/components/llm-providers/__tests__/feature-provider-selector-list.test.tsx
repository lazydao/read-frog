// @vitest-environment jsdom
import type { Config } from "@/types/config/config"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { createStore, Provider } from "jotai"
import { describe, expect, it, vi } from "vitest"
import { FeatureProviderSelectorList } from "@/components/llm-providers/feature-provider-selector-list"
import { configAtom } from "@/utils/atoms/config"
import { DEFAULT_CONFIG } from "@/utils/constants/config"

vi.mock("@/components/llm-providers/provider-selector", () => ({
  default: () => <div>ProviderSelector</div>,
}))

function cloneConfig(config: Config): Config {
  return JSON.parse(JSON.stringify(config)) as Config
}

function renderWithConfig(config: Config) {
  const store = createStore()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  store.set(configAtom, config)
  render(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <FeatureProviderSelectorList />
      </Provider>
    </QueryClientProvider>,
  )
}

describe("featureProviderSelectorList feature rows", () => {
  it("renders one provider row per core feature only", () => {
    renderWithConfig(cloneConfig(DEFAULT_CONFIG))

    // The test i18n facade resolves keys to themselves, so the row labels are
    // the raw feature label keys.
    for (const featureKey of ["pageTranslation", "videoSubtitles"]) {
      expect(
        screen.getByText(`options.apiProviders.featureProviders.features.${featureKey}`),
      ).toBeInTheDocument()
    }
    for (const featureKey of ["selectionTranslation", "inputTranslation", "noteSuggestion"]) {
      expect(
        screen.queryByText(`options.apiProviders.featureProviders.features.${featureKey}`),
      ).not.toBeInTheDocument()
    }
  })
})
