import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { emit, listen } from '@tauri-apps/api/event'
import { appWindow } from '@tauri-apps/api/window'
import { loadSettings, getSetting, setSetting } from '../lib/settings'

const ThemeContext = createContext()

export const THEMES = [
  { id: 'vitruvian', name: 'Vitruvian' },
  { id: 'baruuk', name: 'Baruuk' },
  { id: 'conquera', name: 'Conquera' },
  { id: 'corpus', name: 'Corpus' },
  { id: 'darklotus', name: 'Dark Lotus' },
  { id: 'deadlock', name: 'Deadlock' },
  { id: 'equinox', name: 'Equinox' },
  { id: 'fortuna', name: 'Fortuna' },
  { id: 'grineer', name: 'Grineer' },
  { id: 'legacy', name: 'Legacy' },
  { id: 'lunar', name: 'Lunar Renewal' },
  { id: 'pom2', name: 'POM-2' },
  { id: 'stalker', name: 'Stalker' },
  { id: 'harrier', name: 'Harrier' },
]

export function ThemeProvider({ children }) {
  const [loaded, setLoaded] = useState(false)
  const [theme, setThemeState] = useState('vitruvian') // Start with default, update after load
  
  const themeRef = useRef('vitruvian')
  
  // Load settings and set theme on mount
  useEffect(() => {
    loadSettings().then(() => {
      const saved = getSetting('kronos-theme', 'vitruvian')
      setThemeState(saved)
      themeRef.current = saved
      document.documentElement.setAttribute('data-theme', saved)
      setLoaded(true)
    }).catch(err => {
      console.error('Failed to load settings:', err)
      setLoaded(true)
    })
  }, [])
  
  useEffect(() => {
    if (!loaded) return // Don't save until loaded
    themeRef.current = theme
    document.documentElement.setAttribute('data-theme', theme)
    setSetting('kronos-theme', theme) // Persist theme change
  }, [theme, loaded])

  const setTheme = (newTheme, remote = false) => {
    if (newTheme === themeRef.current) return
    setThemeState(newTheme)
    if (!remote) {
      emit('theme-changed', newTheme)
    }
  }

  // Set up listeners once on mount
  useEffect(() => {
    const unlistens = []

    // 1. Listen for theme changes from other windows
    listen('theme-changed', (event) => {
      if (event.payload !== themeRef.current) {
        setTheme(event.payload, true)
      }
    }).then(un => unlistens.push(un))

    const isMain = appWindow.label === 'main'
    
    if (isMain) {
      // 2. Main window responds to sync requests
      listen('request-theme', () => {
        emit('theme-changed', themeRef.current)
      }).then(un => unlistens.push(un))
    } else {
      // 3. Overlay windows request current theme on start
      emit('request-theme', {})
    }

    return () => {
      unlistens.forEach(un => un())
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
