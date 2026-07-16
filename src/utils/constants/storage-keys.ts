export const TRANSLATION_STATE_KEY_PREFIX = "session:translationState" as const

export const TAB_PROCESSING_STATE_KEY_PREFIX = "session:tabProcessingState" as const

export function getTranslationStateKey(tabId: number): `session:translationState.${number}` {
  return `${TRANSLATION_STATE_KEY_PREFIX}.${tabId}` as const
}

export function getTabProcessingStateKey(tabId: number): `session:tabProcessingState.${number}` {
  return `${TAB_PROCESSING_STATE_KEY_PREFIX}.${tabId}` as const
}

export function parseTabIdFromStorageKey(key: string): number {
  const parts = key.split(".")
  return Number.parseInt(parts[1] ?? "", 10)
}

export const DETECTED_CODE_STATE_KEY_PREFIX = "session:detectedCode" as const

export function getDetectedCodeStateKey(tabId: number): `session:detectedCode.${number}` {
  return `${DETECTED_CODE_STATE_KEY_PREFIX}.${tabId}` as const
}
