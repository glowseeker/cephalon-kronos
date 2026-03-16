import { createContext, useContext, useState, useEffect } from 'react'

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
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('kronos-theme') || 'vitruvian'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('kronos-theme', theme)
  }, [theme])

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
