import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { loadSettings, getSetting, onSettingsChanged } from '../lib/settings'
import { loadLocale } from '../lib/i18n'

/**
 * UiContext — UI chrome (interface) translation.
 *
 * The `ui` section of src/lib/i18n/{locale}.json holds app-interface strings
 * (nav labels, sync states, settings chrome).  The UI locale defaults to the
 * game locale but can be overridden with a separate `uiLocale` setting.
 *
 * Every key falls back to English, so a partially-translated locale never
 * renders raw keys.
 */
const UiContext = createContext(null)

export function UiProvider({ children }) {
  const [state, setState] = useState({ ui: {}, locale: 'en', ready: false, i18nData: null })
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        await loadSettings()
        if (cancelled) return
        const locale = getSetting('uiLocale') || getSetting('gameLocale') || 'en'
        // English UI chrome still comes from en.json — the "no fallback" rule only
        // governs game-sourced terms (resolved from the DE manifest dict), not the
        // ui/settings/eras/etc. strings in this file. Returning null for English
        // wipes the entire ui object and makes every t() fall back to the raw key.
        const locData = await loadLocale(locale)
        const enData = null
        if (cancelled) return
        // No EN base merge — only use locale data. Game-sourced terms
        // are resolved at runtime from the DE manifest dict files.
        const merged = { ...(locData?.ui || {}) }
        // Flatten top-level sections into flat dotted-key lookup.
        // Flat ui.<section>.<key> entries (the canonical, translated form) win
        // over legacy nested section objects; nested values only fill keys that
        // have no flat counterpart (e.g. eras.Lith/Meso/... which exist only
        // nested).
        for (const section of ['relics', 'rivens', 'mastery', 'collectibles', 'settings', 'adversaries', 'eras']) {
          const locSection = locData?.[section]
          if (locSection && typeof locSection === 'object') {
            for (const k of Object.keys(locSection)) {
              const flatKey = `${section}.${k}`
              if (!(flatKey in merged)) merged[flatKey] = locSection[k]
            }
          }
        }
        setState({ ui: merged, locale, ready: true, i18nData: locData || enData })
      } catch {
        if (cancelled) return
        setState({ ui: {}, locale: 'en', ready: true, i18nData: null })
      }
    }

    load()
    const unsub = onSettingsChanged(() => load())
    return () => { cancelled = true; unsub() }
  }, [])

  const t = useCallback((key, params) => {
    if (!key) return ''
    let v = stateRef.current.ui[key]
    if (v == null || v === '') v = key
    if (params && typeof params === 'object') {
      for (const [k, val] of Object.entries(params)) {
        v = v.split(`{${k}}`).join(String(val ?? ''))
      }
    }
    return v
  }, [])

  return (
    <UiContext.Provider value={{ t, ...state }}>
      {children}
    </UiContext.Provider>
  )
}

export function useUi() {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('useUi must be used within a UiProvider')
  return ctx
}
