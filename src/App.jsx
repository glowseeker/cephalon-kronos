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
import { useState, lazy, Suspense } from 'react'
import { useMonitoring } from './contexts/MonitoringContext'
import { formatLastUpdate } from './lib/warframeUtils'
import {
  LayoutDashboard,
  Package,
  Trophy,
  SquarePen,
  Map,
  ClipboardList,
  Settings,
  Info,
  Pyramid,
  Book
} from 'lucide-react'

import { ThemeProvider } from './contexts/ThemeContext'
import { MonitoringProvider } from './contexts/MonitoringContext'

const Dashboard      = lazy(() => import('./screens/Dashboard'))
const Inventory      = lazy(() => import('./screens/Inventory'))
const Mastery        = lazy(() => import('./screens/Mastery'))
const Notes          = lazy(() => import('./screens/Notes'))
const Maps           = lazy(() => import('./screens/Maps'))
const Checklist      = lazy(() => import('./screens/Checklist'))
const SettingsScreen = lazy(() => import('./screens/Settings'))
const About          = lazy(() => import('./screens/About'))
const Rivens         = lazy(() => import('./screens/Rivens'))
const Relics         = lazy(() => import('./screens/Relics'))

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'inventory', icon: Package, label: 'Inventory' },
  { id: 'rivens', icon: Book, label: 'Rivens' },
  { id: 'relics', icon: Pyramid, label: 'Relics' },
  { id: 'mastery', icon: Trophy, label: 'Mastery' },
  { id: 'notes', icon: SquarePen, label: 'Notes' },
  { id: 'maps', icon: Map, label: 'Maps' },
  { id: 'checklist', icon: ClipboardList, label: 'Checklist' },
  { id: 'settings', icon: Settings, label: 'Settings' },
  { id: 'about', icon: Info, label: 'About' },

]

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const { isMonitoring, lastUpdate } = useMonitoring()

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
      <nav className="glass-panel w-20 border-r flex flex-col items-center py-6 gap-4">
        {/* Logo */}
        <div className="mb-4">
          <div className="w-12 h-12 from-kronos-accent to-kronos-accent-secondary rounded-lg flex items-center justify-center glow-border">
            <Pyramid
              size={36}
              strokeWidth={1.75}
              className="text-kronos-accent"
            />
          </div>
        </div>

        {/* Nav Items */}
        <div className="flex-1 flex flex-col gap-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`
                  w-12 h-12 rounded-lg flex items-center justify-center
                  transition-all duration-200 relative group
                  ${isActive
                    ? 'bg-kronos-accent/20 text-kronos-accent glow-border'
                    : 'text-kronos-dim hover:text-kronos-text hover:bg-kronos-panel/60'
                  }
                `}
              >
                <Icon size={20} />

                {/* Tooltip */}
                <div className="absolute left-full ml-3 px-3 py-2 glass-panel rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[9999] glow-border">
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Monitoring status and last update */}
        <div className="mt-auto flex flex-col items-center gap-2">
          <div className="text-xs text-kronos-dim text-center whitespace-nowrap">
            Last update:
            <br />
            {formatLastUpdate(lastUpdate)}
          </div>
          <div
            className={`w-3 h-3 rounded-full transition-all duration-300 relative group
              ${isMonitoring
                ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                : 'bg-gray-600'
              }
            `}
          >
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 glass-panel rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[9999] glow-border">
              <span className="text-sm font-medium">{isMonitoring ? 'Monitoring' : 'Not Monitoring'}</span>
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