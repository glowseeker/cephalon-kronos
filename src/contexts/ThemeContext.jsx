import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { emit, listen } from '@tauri-apps/api/event'
import { appWindow } from '@tauri-apps/api/window'

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
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('kronos-theme') || 'vitruvian'
  })
  
  // Use a ref to keep track of the current theme for the listener closure
  const themeRef = useRef(theme)
  useEffect(() => {
    themeRef.current = theme
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('kronos-theme', theme)
  }, [theme])

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
