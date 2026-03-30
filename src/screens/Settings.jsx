/**
 * Settings.jsx
 *
 * Interface for global application configuration and monitoring control.
 *
 * RESPONSIBILITIES
 * ─────────────────────────────────────────
 * 1. Theme Management (via ThemeContext): Allows switching between predefined
 *    Warframe-themed colour palettes.
 * 2. Monitoring Control (via MonitoringContext): Starts/stops the worldstate
 *    polling and inventory scan process.
 * 3. Status Display: Shows real-time backend connection status and last
 *    update timestamps.
 */
import { useState } from 'react'
import { Wifi, WifiOff, RefreshCw, Palette } from 'lucide-react'
import { PageLayout, Card, Button } from '../components/UI'
import { useTheme } from '../contexts/ThemeContext'
import { useMonitoring } from '../contexts/MonitoringContext'
import { formatLastUpdate } from '../lib/warframeUtils'

export default function SettingsScreen() {
  const { theme, setTheme, themes } = useTheme()
  const { isMonitoring, startMonitoring, stopMonitoring, manualRefresh, lastUpdate, statusText } = useMonitoring()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleStart = async () => {
    setLoading(true)
    setError(null)
    try {
      await startMonitoring()
    } catch (err) {
      setError(err?.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageLayout title="Settings">
      <div className="space-y-6">

        {/* Theme Selector */}
        <Card glow>
          <div className="flex items-center gap-3 mb-4">
            <Palette className="text-kronos-accent" size={24} />
            <h2 className="text-xl font-semibold">Theme</h2>
          </div>
          <p className="text-sm text-kronos-dim mb-4">
            Choose your interface theme based on Warframe's official themes
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                data-theme={t.id}
                className={`
                  p-4 rounded-lg text-center transition-all duration-200
                  ${theme === t.id
                    ? 'ring-2 ring-white'
                    : 'hover:ring-1 hover:ring-white/50'
                  }
                `}
                style={{
                  backgroundColor: t.id === theme
                    ? 'var(--color-accent)'
                    : 'var(--color-panel)'
                }}
              >
                <div className="font-medium text-sm" style={{
                  color: theme === t.id ? '#000' : 'var(--color-accent)'
                }}>
                  {t.name}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Monitoring Section */}
        <Card glow>
          <h2 className="text-xl font-semibold mb-4">Game Monitoring</h2>

          {/* Connection status badge */}
          <div className="flex items-center gap-3 mb-6">
            {isMonitoring ? (
              <><Wifi className="text-green-500" size={24} /><span className="text-green-500 font-medium">Active</span></>
            ) : (
              <><WifiOff className="text-zinc-500" size={24} /><span className="text-zinc-500 font-medium">Offline</span></>
            )}
          </div>

          <div className="flex gap-4 items-start">

            {/* Prerequisites */}
            <Card className="flex-1 bg-black/20">
              <h3 className="font-medium mb-2 text-sm text-zinc-300">Prerequisites</h3>
              <ul className="text-xs text-zinc-500 space-y-1">
                <li>• Warframe must be running</li>
                <li>• You must be logged in</li>
                <li>• JSON output path must be reachable</li>
              </ul>
            </Card>

            {/* Status */}
            <Card className="flex-1 bg-black/20">
              <h3 className="font-medium mb-2 text-sm text-zinc-300">Status</h3>
              <p className="text-xs text-kronos-accent font-mono break-words">{statusText}</p>
              {lastUpdate && (
                <p className="text-xs text-zinc-600 mt-2">
                  Last update: {formatLastUpdate(lastUpdate)}
                </p>
              )}
              {error && (
                <p className="text-xs text-red-400 mt-2">Error: {error}</p>
              )}
            </Card>

            {/* Buttons */}
            <div className="w-1/3 flex flex-col gap-2">
              <Button onClick={handleStart} disabled={loading || isMonitoring} className="w-full">
                {loading
                  ? <RefreshCw className="animate-spin" size={18} />
                  : 'Start Monitoring'
                }
              </Button>
              <Button
                onClick={stopMonitoring}
                disabled={!isMonitoring}
                className="w-full bg-red-500/10 hover:bg-red-600"
              >
                Stop
              </Button>
              <Button variant="secondary" onClick={manualRefresh} className="w-full">
                Manual Refresh
              </Button>
            </div>
          </div>
        </Card>

      </div>
    </PageLayout>
  )
}