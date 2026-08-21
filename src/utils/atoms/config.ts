import type { Config } from "@/types/config/config"
import { deepmergeCustom } from "deepmerge-ts"
import { atom } from "jotai"
import { selectAtom } from "jotai/utils"
import { DEFAULT_CONFIG } from "../constants/config"
import { logger } from "../logger"
import { onMessage, sendMessage } from "../message"

export const configAtom = atom<Config>(DEFAULT_CONFIG)

export const mergeWithArrayOverwrite = deepmergeCustom({
  // Use the last (source) array
  mergeArrays: (values) => values[values.length - 1],
})

async function getConfigFromBackground(): Promise<Config> {
  return (await sendMessage("getInitialConfig", undefined)) ?? DEFAULT_CONFIG
}

/**
 * Promise-chain queue for serializing background config writes.
 *
 * Each write chains onto the previous via `.then()`, ensuring sequential execution:
 *   Promise.resolve() → task1 → task2 → task3 → ...
 *
 * This prevents race conditions when multiple writes happen in quick succession.
 * Even if a write fails, the queue continues (see `.catch(() => {})` below).
 */
let writeQueue: Promise<void> = Promise.resolve()

/**
 * Global counter to detect stale writes.
 *
 * Each write captures its version at invocation time. After async persistence completes,
 * we compare captured vs current version to determine if this is still the latest write.
 * This prevents older writes from overwriting the optimistic UI state.
 */
let writeVersion = 0

export const writeConfigAtom = atom(null, async (get, set, patch: Partial<Config>) => {
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Optimistic update (immediate UI feedback)
  // ─────────────────────────────────────────────────────────────────────────
  const localPrev = get(configAtom)
  const optimisticNext = mergeWithArrayOverwrite(localPrev, patch)
  set(configAtom, optimisticNext)

  // Capture version for this write (used for stale-write detection later)
  const currentWriteVersion = ++writeVersion

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Queue the actual background write
  // ─────────────────────────────────────────────────────────────────────────
  // Chain onto writeQueue so writes execute in order.
  // Note: `.then(callback)` schedules callback to microtask queue (async),
  // but `writeQueue = task` assignment happens synchronously.
  const task = writeQueue.then(async () => {
    // Always read fresh from background to capture any writes that completed before us.
    // This ensures we don't lose concurrent field updates:
    //   write({x:1}) then write({y:2}) → storage ends up with {x:1, y:2}
    const persistedConfig = await getConfigFromBackground()
    const nextToPersist = mergeWithArrayOverwrite(persistedConfig, patch)

    try {
      // Background write always executes (not affected by version check).
      await sendMessage("setConfig", nextToPersist)

      // ───────────────────────────────────────────────────────────────────
      // STEP 3: Reconcile atom with persisted value (stale-write check)
      // ───────────────────────────────────────────────────────────────────
      // Only update atom if no newer writes happened since we started.
      // If a newer write exists, its optimistic update already set the correct UI state,
      // so we skip to avoid "flashing back" to this older value.
      if (currentWriteVersion === writeVersion) {
        set(configAtom, nextToPersist)
      }
    } catch (error) {
      console.error("Failed to persist config through background:", nextToPersist, error)

      // Roll back to persisted value on error, but only if we're still the latest write.
      if (currentWriteVersion === writeVersion) {
        set(configAtom, persistedConfig)
      }

      throw error
    }
  })

  // Update queue head. Use `.catch(() => {})` to ensure queue continues even if this write fails.
  writeQueue = task.catch(() => {})

  return task
})

/**
 * Initialize atom state from background and set up cross-context sync.
 *
 * This handles three sync scenarios:
 * 1. Initial load: Read from background when atom first mounts
 * 2. Cross-context updates: Listen for background config-change messages
 * 3. Tab reactivation: Reload when tab becomes visible (inactive tabs may miss messages)
 */
configAtom.onMount = (setAtom: (newValue: Config) => void) => {
  // Flag to avoid race condition: if watch fires before initial get() resolves,
  // don't overwrite the fresher watch value with the stale get() result.
  let didReceiveConfigUpdate = false

  // Initial load from background
  void getConfigFromBackground().then((value) => {
    if (!didReceiveConfigUpdate) {
      setAtom(value)
    }
  })

  // Receive changes persisted by popup, options, content scripts, or sync.
  const removeConfigChangedListener = onMessage("configChanged", (message) => {
    didReceiveConfigUpdate = true
    setAtom(message.data)
  })

  // Handle tab reactivation - inactive tabs may miss messages,
  // so we reload from background when the tab becomes visible.
  // See: https://github.com/mengxi-ream/read-frog/issues/435
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      logger.info("configAtom onMount handleVisibilityChange when: ", new Date())
      void getConfigFromBackground().then(setAtom)
    }
  }
  document.addEventListener("visibilitychange", handleVisibilityChange)

  return () => {
    removeConfigChangedListener()
    document.removeEventListener("visibilitychange", handleVisibilityChange)
  }
}

// export const configFieldAtom = <K extends Keys>(key: K) => {
//   const readAtom = selectAtom(configAtom, (c) => c[key]); // 现在是同步
//   const writeAtom = atom(null, (_get, set, val: Config[K]) =>
//     set(writeConfigAtom, { [key]: val })
//   );
//   return [readAtom, writeAtom] as const;
// };

type Keys = keyof Config

export function getConfigFieldAtom<K extends Keys>(key: K) {
  // If you don't mind "re-rendering when other fields are changed"
  // you can directly get(configAtom)[key] instead of using selectAtom.
  const sliceAtom = selectAtom(configAtom, (c) => c[key])

  return atom(
    (get) => get(sliceAtom),
    (_get, set, newVal: Partial<Config[K]>) => set(writeConfigAtom, { [key]: newVal }),
  )
}

function buildConfigFieldsAtomMap<C extends Config>(cfg: C) {
  type ValidKey = Extract<keyof C, keyof Config>
  type Map = { [K in ValidKey]: ReturnType<typeof getConfigFieldAtom<K>> }

  const res = {} as Map

  // oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- K preserves key-specific atom value inference.
  const add = <K extends ValidKey>(key: K) => {
    res[key] = getConfigFieldAtom(key)
  }

  ;(Object.keys(cfg) as ValidKey[]).forEach(add)
  return res
}

export const configFieldsAtomMap = buildConfigFieldsAtomMap(DEFAULT_CONFIG)
