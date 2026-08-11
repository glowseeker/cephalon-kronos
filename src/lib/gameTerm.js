/**
 * gameTerm.js  -  runtime resolution of game-sourced strings from the DE
 * manifest dict files (dict.{locale}.json).
 *
 * The dict is downloaded by main.rs (check_exports) and loaded by the
 * monitoring contexts, which register it here via registerGameDict().
 * Components call resolveGameTerm('/Lotus/Language/...', locale) directly;
 * no hand-translated copies of these strings exist in the locale files.
 */

let _dict = {}
let _locale = 'en'

/**
 * Register the current locale's dict (called by the monitoring contexts
 * whenever a new dict is loaded).
 */
export function registerGameDict(dict, locale) {
  if (dict && typeof dict === 'object') {
    _dict = dict
    _locale = locale || 'en'
  }
}

/**
 * Resolve a Lotus language path in the current locale's dict.
 * Returns the localized string, or null when unavailable.
 */
export function resolveGameTerm(path, locale) {
  const dict = _dict
  if (!path) return null
  let v = dict[path]
  if (v === undefined || v === null || v === '') v = dict[path.replace(/^\//, '')]
  if (v === undefined || v === null || v === '') {
    if (import.meta.env?.DEV) {
      console.warn(`[resolveGameTerm] MISSING ${path} in dict for locale "${_locale}"`)
    }
    return null
  }
  return v
}

/** Current registered locale (for debugging). */
export function getGameDictLocale() {
  return _locale
}
