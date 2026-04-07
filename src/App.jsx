/**
 * App.jsx
 *
 * Application entrypoint and shell.
 *
 * STRUCTURE
 * ─────────────────────────────────────────
 * <App>
 *   <ThemeProvider>   - provides CSS variable overrides for the active colour theme
 *   <MonitoringProvider> - manages Tauri IPC calls, worldstate polling, and parsed data
 *     <AppContent>    - renders the sidebar + the currently selected screen
 *
 * ROUTING
 * ─────────────────────────────────────────
 * There is no client-side router.  Navigation is a simple `currentScreen` state
 * string that selects from the SCREENS map.  All screens are lazy-loaded so
 * they don't increase the initial bundle size.
 *
 * DATA FLOW
 * ─────────────────────────────────────────
 * MonitoringContext fetches exports and inventory through Tauri commands on the
 * Rust backend, parses them with inventoryParser.js and worldstateParser.js,
 * and exposes the results via React context.  Screens read from that context.
 */
import { useState, lazy, Suspense, useRef, useEffect } from 'react'
import { Tooltip } from './components/UI'
import { useMonitoring } from './contexts/MonitoringContext'
import { formatLastUpdate } from './lib/warframeUtils'
import { ThemeProvider } from './contexts/ThemeContext'
import { MonitoringProvider } from './contexts/MonitoringContext'

const Dashboard = lazy(() => import('./screens/Dashboard'))
const Inventory = lazy(() => import('./screens/Inventory'))
const Mastery = lazy(() => import('./screens/Mastery'))
const Notes = lazy(() => import('./screens/Notes'))
const Maps = lazy(() => import('./screens/Maps'))
const Checklist = lazy(() => import('./screens/Checklist'))
const SettingsScreen = lazy(() => import('./screens/Settings'))
const About = lazy(() => import('./screens/About'))
const Rivens = lazy(() => import('./screens/Rivens'))
const Relics = lazy(() => import('./screens/Relics'))

const NAV_ITEMS = [
  { id: 'dashboard', icon: '/IconDashboard.png', label: 'Dashboard' },
  { id: 'inventory', icon: '/IconInventory.png', label: 'Inventory' },
  { id: 'rivens', icon: '/IconRiven.png', label: 'Rivens' },
  { id: 'relics', icon: '/IconRelic.png', label: 'Relics' },
  { id: 'mastery', icon: '/IconMastery.png', label: 'Mastery' },
  { id: 'notes', icon: '/IconNotes.png', label: 'Notes' },
  { id: 'maps', icon: '/IconMap.png', label: 'Maps' },
  { id: 'checklist', icon: '/IconChecklist.png', label: 'Checklist' },
  { id: 'settings', icon: '/IconSettings.png', label: 'Settings' },
  { id: 'about', icon: '/IconInfo.png', label: 'About' },
]

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const { isMonitoring, lastUpdate, monitorResult } = useMonitoring()

  const screens = {
    dashboard: <Dashboard />,
    inventory: <Inventory />,
    rivens: <Rivens />,
    relics: <Relics />,
    mastery: <Mastery />,
    notes: <Notes />,
    maps: <Maps />,
    checklist: <Checklist />,
    settings: <SettingsScreen />,
    about: <About />,
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Navigation */}
      <nav className="glass-panel w-20 border-r flex flex-col items-center py-6 gap-4 z-40 relative flex-shrink-0">
        {/* Logo */}
        <div className="mb-4 flex-shrink-0">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden">
            <img
              src="/IconKronos.png"
              alt="Cephalon Kronos"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Nav Items — scrollable, portal tooltip escapes overflow */}
        <div className="flex-1 w-full overflow-y-auto py-2 nav-scrollbar">
          <div className="flex flex-col gap-6 items-center min-h-min pb-4">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id
              const isImg = typeof item.icon === 'string'

              return (
                <div key={item.id} className="relative">
                  <Tooltip content={item.label}>
                    <button
                      onClick={() => setActiveTab(item.id)}
                      className={`
                        w-12 h-12 flex items-center justify-center rounded-lg
                        transition-all duration-200 flex-shrink-0
                        ${isActive
                          ? 'bg-kronos-accent/10 text-kronos-accent shadow-[0_0_15px_rgba(var(--kronos-accent-rgb),0.2)]'
                          : 'text-kronos-dim hover:bg-white/5 hover:text-white'
                        }
                      `}
                    >
                      {isImg ? (
                        <div
                          className="w-7 h-7 flex-shrink-0 transition-colors duration-200"
                          style={{
                            backgroundColor: isActive ? 'var(--color-accent, #5590ab)' : 'currentColor',
                            maskImage: `url(${item.icon})`,
                            WebkitMaskImage: `url(${item.icon})`,
                            maskSize: 'contain',
                            WebkitMaskSize: 'contain',
                            maskRepeat: 'no-repeat',
                            WebkitMaskRepeat: 'no-repeat',
                            maskPosition: 'center',
                            WebkitMaskPosition: 'center',
                            opacity: isActive ? 1 : 0.6
                          }}
                        />
                      ) : (
                        <item.icon size={22} strokeWidth={1.5} />
                      )}
                    </button>
                  </Tooltip>
                </div>
              )
            })}
          </div>
        </div>

        {/* Monitoring status and last update — fixed at bottom */}
        <div className="mt-auto flex-shrink-0 flex flex-col items-center gap-4 pt-4 border-t border-white/5 w-full">
          <div className="text-xs text-kronos-dim text-center whitespace-nowrap">
            Last update:
            <br />
            {formatLastUpdate(lastUpdate)}
          </div>
          <div
            className={`w-3 h-3 rounded-full transition-all duration-300 relative group
              ${monitorResult === 'success'
                ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                : monitorResult === 'error'
                  ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                  : 'bg-gray-600'
              }
            `}
          >
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 glass-panel rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[9999] shadow-2xl bg-kronos-bg border border-white/10 font-black uppercase text-[10px] tracking-widest text-kronos-accent">
              <span className="font-medium">
                {monitorResult === 'success' ? 'Monitoring' : monitorResult === 'error' ? 'Connection Error' : 'Not Monitoring'}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden bg-kronos-bg">
        <Suspense fallback={
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-kronos-accent/20 border-t-kronos-accent rounded-full animate-spin" />
          </div>
        }>
          {screens[activeTab]}
        </Suspense>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <MonitoringProvider>
        <AppContent />
      </MonitoringProvider>
    </ThemeProvider>
  )
}