// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { PageTranslationManager } from "../page-translation"

const {
  mockDeepQueryTopLevelSelector,
  mockSendMessage,
  mockTranslateWalkedElement,
  mockValidateTranslationConfigAndToast,
  mockWalkAndLabelElement,
} = vi.hoisted(() => ({
  mockDeepQueryTopLevelSelector: vi.fn<(...args: any[]) => any>(),
  mockWalkAndLabelElement: vi.fn<(...args: any[]) => any>(),
  mockTranslateWalkedElement: vi.fn<(...args: any[]) => any>(),
  mockValidateTranslationConfigAndToast: vi.fn<(...args: any[]) => any>(),
  mockSendMessage: vi.fn<(...args: any[]) => any>(),
}))

vi.mock("@/utils/host/dom/filter", () => ({
  hasNoWalkAncestor: vi.fn<(...args: any[]) => any>().mockReturnValue(false),
  isDontWalkIntoAndDontTranslateAsChildElement: vi
    .fn<(...args: any[]) => any>()
    .mockReturnValue(false),
  isDontWalkIntoButTranslateAsChildElement: vi.fn<(...args: any[]) => any>().mockReturnValue(false),
  isHTMLElement: (node: unknown) => node instanceof HTMLElement,
}))

vi.mock("@/utils/host/dom/find", () => ({
  deepQueryTopLevelSelector: mockDeepQueryTopLevelSelector,
}))

vi.mock("@/utils/host/dom/traversal", () => ({
  walkAndLabelElement: mockWalkAndLabelElement,
}))

vi.mock("@/utils/host/translate/node-manipulation", () => ({
  removeAllTranslatedWrapperNodes: vi.fn<(...args: any[]) => any>(),
  translateWalkedElement: mockTranslateWalkedElement,
}))

vi.mock("@/utils/host/translate/translate-variants", () => ({
  translateTextForPageTitle: vi.fn<(...args: any[]) => any>().mockResolvedValue(null),
}))

vi.mock("@/utils/host/translate/webpage-context", () => ({
  getOrCreateWebPageContext: vi.fn<(...args: any[]) => any>().mockResolvedValue(null),
}))

vi.mock("@/utils/host/translate/translate-text", () => ({
  validateTranslationConfigAndToast: mockValidateTranslationConfigAndToast,
}))

vi.mock("@/utils/logger", () => ({
  logger: {
    error: vi.fn<(...args: any[]) => any>(),
    info: vi.fn<(...args: any[]) => any>(),
    warn: vi.fn<(...args: any[]) => any>(),
  },
}))

vi.mock("@/utils/message", () => ({
  sendMessage: mockSendMessage,
}))

class MockIntersectionObserver {
  observe = vi.fn<(...args: any[]) => any>()
  unobserve = vi.fn<(...args: any[]) => any>()
  disconnect = vi.fn<(...args: any[]) => any>()
}

async function flushDomUpdates(): Promise<void> {
  await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await Promise.resolve()
}

describe("pageTranslationManager mutation observer root", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    document.head.innerHTML = ""
    document.body.innerHTML = "<main>Route A body</main>"

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver)

    mockDeepQueryTopLevelSelector.mockReturnValue([])
    mockValidateTranslationConfigAndToast.mockReturnValue(true)
    mockSendMessage.mockImplementation((name: string) =>
      Promise.resolve(name === "getInitialConfig" ? DEFAULT_CONFIG : undefined),
    )
  })

  it("keeps observing after a router replaces the body node (Turbo Drive)", async () => {
    const manager = new PageTranslationManager()
    await manager.start()
    await flushDomUpdates()
    mockWalkAndLabelElement.mockClear()

    // Body-replacing SPA visit: the soft URL-change path deliberately keeps
    // observers attached instead of restarting, so the mutation observer must
    // be rooted where it survives the swap (documentElement, not the body
    // node captured at start()).
    const newBody = document.createElement("body")
    newBody.innerHTML = "<main>Route B body</main>"
    document.documentElement.replaceChild(newBody, document.body)
    await flushDomUpdates()

    // The swap itself must be walked like any inserted subtree...
    expect(mockWalkAndLabelElement).toHaveBeenCalledWith(
      newBody,
      expect.any(String),
      DEFAULT_CONFIG,
    )

    // ...and content inserted into the NEW body afterwards must still be seen.
    mockWalkAndLabelElement.mockClear()
    const lateParagraph = document.createElement("p")
    lateParagraph.textContent = "Late route B content"
    newBody.appendChild(lateParagraph)
    await flushDomUpdates()

    expect(mockWalkAndLabelElement).toHaveBeenCalledWith(
      lateParagraph,
      expect.any(String),
      DEFAULT_CONFIG,
    )

    manager.stop()
  })
})
