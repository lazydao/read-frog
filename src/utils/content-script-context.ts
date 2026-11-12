/**
 * Whether this code runs in a content script, on a web page's origin, rather
 * than in the background or an extension page.
 *
 * Content scripts in this fork do not read or write the configuration and the
 * theme in extension storage themselves: they ask the background, which owns
 * both. Tests run on a jsdom page origin with a mocked storage, so they keep
 * the direct path.
 */
export function isContentScriptContext(): boolean {
  if (import.meta.env.MODE === "test") return false
  return typeof location !== "undefined" && !location.protocol.endsWith("-extension:")
}
