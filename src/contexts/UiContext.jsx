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
        const locData = locale === 'en' ? null : await loadLocale(locale)
        const enData = locale === 'en' ? locData : null
        if (cancelled) return
        // No EN base merge — only use locale data. Game-sourced terms
        // are resolved at runtime from the DE manifest dict files.
        const merged = { ...(locData?.ui || {}) }
        // Flatten top-level sections into flat dotted-key lookup
        for (const section of ['relics', 'rivens', 'mastery', 'collectibles', 'settings', 'adversaries', 'eras']) {
          const locSection = locData?.[section]
          if (locSection && typeof locSection === 'object') {
            for (const k of Object.keys(locSection)) merged[`${section}.${k}`] = locSection[k]
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
