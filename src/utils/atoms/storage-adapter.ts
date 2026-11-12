import type { ZodSchema } from "zod"
import { storage } from "#imports"
import { CONFIG_STORAGE_KEY, THEME_STORAGE_KEY } from "@/utils/constants/config"
import { isContentScriptContext } from "@/utils/content-script-context"
import { onMessage, sendMessage } from "@/utils/message"
import { isNonNullish } from "@/utils/utils"

type BackgroundOwnedKey = typeof CONFIG_STORAGE_KEY | typeof THEME_STORAGE_KEY

/**
 * The configuration and the theme belong to the background. A content script
 * reaches them through messages instead of extension storage; every other key
 * and every other context uses storage directly.
 */
function isBackgroundOwnedKey(key: string): key is BackgroundOwnedKey {
  return (key === CONFIG_STORAGE_KEY || key === THEME_STORAGE_KEY) && isContentScriptContext()
}

async function getFromBackground(key: BackgroundOwnedKey): Promise<unknown> {
  return key === CONFIG_STORAGE_KEY
    ? await sendMessage("getInitialConfig", undefined)
    : await sendMessage("getThemeMode", undefined)
}

// The messaging layer allows one listener per message type in a context, so
// every watcher of a key shares that listener.
const backgroundWatchers = new Map<BackgroundOwnedKey, Set<(value: unknown) => void>>()

function watchFromBackground(key: BackgroundOwnedKey, callback: (value: unknown) => void) {
  let watchers = backgroundWatchers.get(key)
  if (!watchers) {
    const created = new Set<(value: unknown) => void>()
    watchers = created
    backgroundWatchers.set(key, created)
    const notify = (value: unknown) => created.forEach((watcher) => watcher(value))
    if (key === CONFIG_STORAGE_KEY) onMessage("configChanged", (message) => notify(message.data))
    else onMessage("themeModeChanged", (message) => notify(message.data))
  }
  watchers.add(callback)
  return () => {
    watchers.delete(callback)
  }
}

export const storageAdapter = {
  async get<T>(key: string, fallback: T, schema: ZodSchema<T>): Promise<T> {
    const value = isBackgroundOwnedKey(key)
      ? await getFromBackground(key)
      : await storage.getItem<T>(`local:${key}`)
    if (isNonNullish(value)) {
      const parsedValue = schema.safeParse(value)
      if (parsedValue.success) {
        return parsedValue.data
      }
    }
    return fallback
  },
  async set<T>(key: string, value: T, schema: ZodSchema<T>) {
    const parsedValue = schema.safeParse(value)
    if (!parsedValue.success) {
      throw new Error(parsedValue.error.message)
    }
    if (!isBackgroundOwnedKey(key)) {
      await storage.setItem(`local:${key}`, parsedValue.data)
    } else if (key === CONFIG_STORAGE_KEY) {
      await sendMessage("setConfig", parsedValue.data as never)
    } else {
      await sendMessage("setThemeMode", parsedValue.data as never)
    }
  },
  async setMeta(key: string, meta: Record<string, unknown>) {
    // The background stamps its own metadata when it persists these keys.
    if (isBackgroundOwnedKey(key)) return
    await storage.setMeta(`local:${key}`, meta)
  },
  // oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- T preserves caller callback typing for typed storage values.
  watch<T>(key: string, callback: (newValue: T) => void) {
    if (isBackgroundOwnedKey(key)) {
      return watchFromBackground(key, (newValue) => {
        if (isNonNullish(newValue)) callback(newValue as T)
      })
    }
    const unwatch = storage.watch<T>(`local:${key}`, (newValue) => {
      if (isNonNullish(newValue)) callback(newValue)
    })
    return unwatch
  },
}
