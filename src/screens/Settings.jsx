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
import { Wifi, WifiOff, RefreshCw, Palette, Bell } from 'lucide-react'
import { PageLayout, Card, Button, Toggle } from '../components/UI'
import { useTheme } from '../contexts/ThemeContext'
import { useMonitoring } from '../contexts/MonitoringContext'
import { formatLastUpdate } from '../lib/warframeUtils'

export default function SettingsScreen() {
  const { theme, setTheme, themes } = useTheme()
  const { isMonitoring, startMonitoring, stopMonitoring, manualRefresh, lastUpdate, statusText, autoStart, setAutoStart, monitorResult } = useMonitoring()
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

        {/* Theme Selector - Leaner version */}
        <Card glow className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Palette className="text-kronos-accent" size={20} />
              <h2 className="text-lg font-semibold uppercase tracking-tight">Theme</h2>
            </div>
            <p className="text-[10px] text-kronos-dim uppercase font-bold">
              Current: {themes.find(t => t.id === theme)?.name}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                data-theme={t.id}
                title={t.name}
                className={`
                  min-h-[56px] p-2 rounded-lg border transition-all duration-200 relative group flex items-center justify-center text-center
                  ${theme === t.id
                    ? 'border-white ring-2 ring-white/30 scale-[1.02]'
                    : 'border-white/5 hover:border-white/20 hover:scale-[1.01]'
                  }
                `}
                style={{
                  backgroundColor: 'var(--color-bg)',
                }}
              >
                <div className="absolute inset-0 rounded-lg opacity-10 group-hover:opacity-20 transition-opacity" style={{ backgroundColor: `var(--color-accent)` }} />
                <span className="relative text-xs font-bold uppercase tracking-tight leading-tight" style={{ color: 'var(--color-accent)' }}>
                  {t.name}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* Notifications (Placeholder for Overlay System) */}
        <Card glow className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="text-kronos-accent" size={20} />
            <h2 className="text-lg font-semibold uppercase tracking-tight">App Notifications</h2>
          </div>
          <p className="text-[11px] text-kronos-dim mb-4 uppercase font-bold tracking-wide">
            Configure overlay alerts for game events (Coming Soon)
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-50 pointer-events-none">
            {[
              { label: 'S-Tier Arbitration', desc: 'Notify when a top-tier node appears' },
              { label: 'Foundry Completion', desc: 'Alert when items are ready to claim' },
              { label: 'Syndicate Standing', desc: 'Notify when daily standing is capped' },
              { label: 'Mastery Progress', desc: 'Alert at 50% / 90% toward next rank' },
            ].map((notif, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-kronos-panel/20 rounded-lg border border-white/5">
                <div>
                  <p className="text-xs font-bold text-kronos-text uppercase">{notif.label}</p>
                  <p className="text-[9px] text-kronos-dim uppercase">{notif.desc}</p>
                </div>
                <Toggle checked={false} onChange={() => {}} />
              </div>
            ))}
          </div>
        </Card>

        {/* Monitoring Section */}
        <Card glow>
          <h2 className="text-xl font-semibold mb-4">Game Monitoring</h2>

          {/* Connection status badge */}
          <div className="flex items-center gap-3 mb-6">
            {monitorResult === 'success' ? (
              <><Wifi className="text-green-500" size={24} /><span className="text-green-500 font-medium">Active</span></>
            ) : monitorResult === 'error' ? (
              <><WifiOff className="text-red-500" size={24} /><span className="text-red-500 font-medium">Error</span></>
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
              <div className="mt-4 pt-4 border-t border-white/5">
                <Toggle
                  checked={autoStart}
                  onChange={setAutoStart}
                  label="Auto-start on launch"
                  description="Start monitoring automatically when the app opens"
                />
              </div>
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