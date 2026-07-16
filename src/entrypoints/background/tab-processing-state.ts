import type { TabProcessingFeature, TabProcessingState } from "@/types/tab-processing-state"
import { storage } from "#imports"
import { tabProcessingStateSchema } from "@/types/tab-processing-state"
import { getTabProcessingStateKey } from "@/utils/constants/storage-keys"

interface RuntimeTabProcessingState {
  activeRequests: Map<number, TabProcessingFeature>
  processedFeatures: Set<TabProcessingFeature>
  url?: string
}

export interface TabProcessingToken {
  id: number
  tabId: number
}

const runtimeStates = new Map<number, RuntimeTabProcessingState>()
const transitionQueues = new Map<number, Promise<void>>()
let nextTokenId = 1

export function normalizeTabProcessingUrl(url: string | undefined): string | undefined {
  if (!url) return undefined

  try {
    const parsed = new URL(url)
    parsed.hash = ""
    return parsed.href
  } catch {
    return url.split("#", 1)[0]
  }
}

export function isTabProcessingStateInUrlScope(
  state: TabProcessingState | null | undefined,
  url: string | undefined,
): boolean {
  if (!state?.url || !url) return false
  return state.url === normalizeTabProcessingUrl(url)
}

export async function getTabProcessingState(tabId: number): Promise<TabProcessingState | null> {
  const stored = await storage.getItem<unknown>(getTabProcessingStateKey(tabId))
  const parsed = tabProcessingStateSchema.safeParse(stored)
  return parsed.success ? parsed.data : null
}

function enqueueTransition(tabId: number, transition: () => Promise<void>): Promise<void> {
  const previous = transitionQueues.get(tabId) ?? Promise.resolve()
  const current = previous.catch(() => {}).then(transition)
  transitionQueues.set(tabId, current)

  const cleanup = () => {
    if (transitionQueues.get(tabId) === current) transitionQueues.delete(tabId)
  }
  void current.then(cleanup, cleanup)

  return current
}

async function getOrCreateRuntimeState(
  tabId: number,
  url: string | undefined,
): Promise<RuntimeTabProcessingState> {
  const normalizedUrl = normalizeTabProcessingUrl(url)
  const current = runtimeStates.get(tabId)

  if (current && (!normalizedUrl || current.url === normalizedUrl)) {
    return current
  }

  if (current && normalizedUrl && current.url !== normalizedUrl) {
    const reset = {
      activeRequests: new Map<number, TabProcessingFeature>(),
      processedFeatures: new Set<TabProcessingFeature>(),
      url: normalizedUrl,
    }
    runtimeStates.set(tabId, reset)
    return reset
  }

  const stored = await getTabProcessingState(tabId)
  const storedInScope = !normalizedUrl || isTabProcessingStateInUrlScope(stored, normalizedUrl)
  const state: RuntimeTabProcessingState = {
    activeRequests: new Map(),
    processedFeatures: new Set(storedInScope && stored?.status === "done" ? stored.features : []),
    url: normalizedUrl ?? stored?.url,
  }
  runtimeStates.set(tabId, state)
  return state
}

async function persistRuntimeState(tabId: number, state: RuntimeTabProcessingState): Promise<void> {
  const features = [...new Set([...state.processedFeatures, ...state.activeRequests.values()])]

  if (state.activeRequests.size === 0 && features.length === 0) {
    await storage.removeItem(getTabProcessingStateKey(tabId))
    return
  }

  await storage.setItem<TabProcessingState>(getTabProcessingStateKey(tabId), {
    status: state.activeRequests.size > 0 ? "processing" : "done",
    features,
    url: state.url,
  })
}

export async function beginTabProcessing(
  tabId: number,
  feature: TabProcessingFeature,
  url?: string,
): Promise<TabProcessingToken> {
  const token = { id: nextTokenId++, tabId }

  await enqueueTransition(tabId, async () => {
    const state = await getOrCreateRuntimeState(tabId, url)
    state.activeRequests.set(token.id, feature)
    await persistRuntimeState(tabId, state)
  })

  return token
}

export async function finishTabProcessing(
  token: TabProcessingToken,
  success: boolean,
): Promise<void> {
  await enqueueTransition(token.tabId, async () => {
    const state = runtimeStates.get(token.tabId)
    const feature = state?.activeRequests.get(token.id)
    if (!state || !feature) return

    state.activeRequests.delete(token.id)
    if (success) {
      state.processedFeatures.add(feature)
    }
    await persistRuntimeState(token.tabId, state)
  })
}

export async function clearTabProcessingState(tabId: number): Promise<void> {
  await enqueueTransition(tabId, async () => {
    runtimeStates.delete(tabId)
    await storage.removeItem(getTabProcessingStateKey(tabId))
  })
}

export function resetTabProcessingRuntimeForTests(): void {
  runtimeStates.clear()
  transitionQueues.clear()
  nextTokenId = 1
}
