/**
 * i18n.js  -  Manual-translation domain loader.
 *
 * Loads per-locale translation tables for strings NOT in the official Warframe
 * game dictionary (dict.{locale}.json):
 *   - rivenStats: riven mod attribute names (e.g. "Damage" → "Schaden")
 *   - nameOverrides: item display names lacking dict entries (dev/test items)
 *   - eras: relic era names (Lith/Meso/Neo/…)  -  fallback when dict lacks them
 *   - peely: Peely Pix sticker mod names + descriptions (community content)
 *   - ui: Settings-screen UI chrome labels
 *
 * Files: src/lib/i18n/{locale}.json, bundled via Vite's import.meta.glob.
 * Game dict (mission names, challenge text) is resolved separately by the
 * monitoring contexts; this module only supplements it.
 */

let _cache = {}

const _loaders = import.meta.glob('./i18n/*.json', { eager: false })

/**
 * @param {string} locale  -  e.g. 'en', 'de', 'tc'
 * @returns {Promise<object>} locale data: { rivenStats, nameOverrides, eras, peely, ui }
 */
export async function loadLocale(locale = 'en') {
  if (!locale || locale === 'en') locale = 'en'
  if (_cache[locale]) return _cache[locale]
  const loader = _loaders[`./i18n/${locale}.json`]
  if (!loader && locale !== 'en') return loadLocale('en')
  if (!loader) return null
  const mod = await loader()
  _cache[locale] = mod.default ?? mod
  return _cache[locale]
}

/** Synchronous access  -  requires the locale to be pre-loaded (via loadLocale). */
export function getLocaleSync(locale = 'en') {
  if (!locale || locale === 'en') locale = 'en'
  return _cache[locale] || _cache['en'] || null
}
