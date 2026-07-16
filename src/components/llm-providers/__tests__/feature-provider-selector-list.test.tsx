// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { createStore, Provider } from "jotai"
import { describe, expect, it, vi } from "vitest"
import { FeatureProviderSelectorList } from "@/components/llm-providers/feature-provider-selector-list"
import { configAtom } from "@/utils/atoms/config"
import { DEFAULT_CONFIG } from "@/utils/constants/config"

vi.mock("@/components/llm-providers/provider-selector", () => ({
  default: () => <div>ProviderSelector</div>,
}))

describe("FeatureProviderSelectorList", () => {
  it("renders only page and subtitle provider rows by default", () => {
    const config = structuredClone(DEFAULT_CONFIG)
    const providerId = config.providersConfig[0].id
    config.selectionToolbar.customActions = [
      {
        id: "legacy-action",
        name: "Legacy Action",
        providerId,
        enabled: true,
        icon: "tabler:sparkles",
        systemPrompt: "You are helpful.",
        prompt: "Do something.",
        outputSchema: [],
      },
    ]

    const store = createStore()
    store.set(configAtom, config)
    render(
      <Provider store={store}>
        <FeatureProviderSelectorList />
      </Provider>,
    )

    expect(screen.getAllByText("ProviderSelector")).toHaveLength(2)
    expect(screen.queryByText("Legacy Action")).not.toBeInTheDocument()
  })
})
