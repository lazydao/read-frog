import { atom } from "jotai"

/**
 * The word being looked up, by its place in the cue's tokens. Upstream opens an
 * AI action card on a clicked word; this fork ships no such card, so nothing
 * sets it and it only keeps the subtitles' hold logic in one place.
 */
export const wordLookupAtom = atom<{ cueStart: number; index: number } | null>(null)

/** Whether the pointer is over the subtitles. */
export const subtitlesHoveredAtom = atom(false)

/**
 * Whether the subtitles hold still, while the pointer is on them or a lookup is
 * open: the box stays where it is. Whether the video pauses too is up to
 * `useHoldPlayback`, which also weighs the pause-on-hover setting.
 */
export const subtitlesHeldAtom = atom(
  (get) => get(subtitlesHoveredAtom) || get(wordLookupAtom) !== null,
)

/** Closes any lookup. Kept as the one way in so callers read as they do upstream. */
export const lookUpAtom = atom(null, (_get, set, _index: number | null) => {
  set(wordLookupAtom, null)
})
