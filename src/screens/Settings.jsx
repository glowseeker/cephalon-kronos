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
import { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw, Palette, Bell } from 'lucide-react'
import { PageLayout, Card, Button, Toggle } from '../components/UI'
import { useTheme } from '../contexts/ThemeContext'
import { useMonitoring } from '../contexts/MonitoringContext'
import { formatLastUpdate } from '../lib/warframeUtils'
import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'

export default function SettingsScreen() {
  const { theme, setTheme, themes } = useTheme()
  const { isMonitoring, startMonitoring, stopMonitoring, manualRefresh, lastUpdate, statusText, autoStart, setAutoStart, monitorResult } = useMonitoring()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false)

  const [notifPosition, setNotifPosition] = useState(
    () => localStorage.getItem('notif_position') || 'top-right'
  )
  const [notifSound, setNotifSound] = useState(
    () => localStorage.getItem('notif_sound') || 'notification1.ogg'
  )

  // Notification settings
  const [notifArbitrationEnabled, setNotifArbitrationEnabled] = useState(
    () => localStorage.getItem('notif_arbitration_enabled') === 'true'
  )
  const [notifArbitrationHours, setNotifArbitrationHours] = useState(
    () => parseInt(localStorage.getItem('notif_arbitration_hours')) || 24
  )
  const [notifArbitrationRemind, setNotifArbitrationRemind] = useState(
    () => parseInt(localStorage.getItem('notif_arbitration_remind')) || 30
  )

  const [notifFoundryEnabled, setNotifFoundryEnabled] = useState(
    () => localStorage.getItem('notif_foundry_enabled') === 'true'
  )
  const [notifFoundryMinutes, setNotifFoundryMinutes] = useState(
    () => parseInt(localStorage.getItem('notif_foundry_minutes')) || 5
  )

  const [notifSyndicateEnabled, setNotifSyndicateEnabled] = useState(
    () => localStorage.getItem('notif_syndicate_enabled') === 'true'
  )
  const [notifSyndicateWasteEnabled, setNotifSyndicateWasteEnabled] = useState(
    () => localStorage.getItem('notif_syndicate_waste_enabled') === 'true'
  )

  const [notifMasteryEnabled, setNotifMasteryEnabled] = useState(
    () => localStorage.getItem('notif_mastery_enabled') === 'true'
  )
  const [notifMasteryPercent, setNotifMasteryPercent] = useState(
    () => parseInt(localStorage.getItem('notif_mastery_percent')) || 50
  )

  const [notifChecklistMinutes, setNotifChecklistMinutes] = useState(
    () => parseInt(localStorage.getItem('notif_checklist_minutes')) || 60
  )

  // Listen for calibration window close from X button
  useEffect(() => {
    const unlisten = listen('calibration-closed', () => {
      setIsCalibrationOpen(false)
    })
    return () => { unlisten.then(f => f()) }
  }, [])

  // Calibration window state is managed locally — no Rust command needed
  // (is_overlay_visible was removed; we track it via toggle_calibration return value)

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

  const handleSetPosition = (pos) => {
    setNotifPosition(pos)
    localStorage.setItem('notif_position', pos)
  }

  useEffect(() => {
    // Sync current sound to Rust backend on mount
    const savedSound = localStorage.getItem('notif_sound') || 'notification1.ogg'
    invoke('set_notification_sound', { sound: savedSound }).catch(console.error)
  }, [])

  const handleSetSound = (sound) => {
    setNotifSound(sound)
    localStorage.setItem('notif_sound', sound)

    // Update Rust state for ALL future notifications
    invoke('set_notification_sound', { sound }).catch(console.error)

    // Preview sound via Rust (one-time manual play)
    if (sound !== 'none') {
      invoke('play_notification_sound', { sound }).catch(console.error)
    }
  }

  // Arbitration settings handlers
  const handleSetArbitrationEnabled = (val) => {
    setNotifArbitrationEnabled(val)
    localStorage.setItem('notif_arbitration_enabled', String(val))
  }
  const handleSetArbitrationHours = (val) => {
    setNotifArbitrationHours(val)
    localStorage.setItem('notif_arbitration_hours', String(val))
  }
  const handleSetArbitrationRemind = (val) => {
    setNotifArbitrationRemind(val)
    localStorage.setItem('notif_arbitration_remind', String(val))
  }

  // Foundry settings handlers
  const handleSetFoundryEnabled = (val) => {
    setNotifFoundryEnabled(val)
    localStorage.setItem('notif_foundry_enabled', String(val))
  }
  const handleSetFoundryMinutes = (val) => {
    setNotifFoundryMinutes(val)
    localStorage.setItem('notif_foundry_minutes', String(val))
  }

  // Syndicate settings handlers
  const handleSetSyndicateEnabled = (val) => {
    setNotifSyndicateEnabled(val)
    localStorage.setItem('notif_syndicate_enabled', String(val))
  }
  const handleSetSyndicateWasteEnabled = (val) => {
    setNotifSyndicateWasteEnabled(val)
    localStorage.setItem('notif_syndicate_waste_enabled', String(val))
  }

  // Mastery settings handlers
  const handleSetMasteryEnabled = (val) => {
    setNotifMasteryEnabled(val)
    localStorage.setItem('notif_mastery_enabled', String(val))
  }
  const handleSetMasteryPercent = (val) => {
    setNotifMasteryPercent(val)
    localStorage.setItem('notif_mastery_percent', String(val))
  }
  const handleSetChecklistMinutes = (val) => {
    setNotifChecklistMinutes(val)
    localStorage.setItem('notif_checklist_minutes', String(val))
  }

  const handleTestNotification = (position, delay = 0) => {
    setTimeout(() => {
      invoke('show_notification', {
        title: 'Foundry Complete',
        message: 'Harrow Chassis has finished crafting and is ready to claim.',
        position
      }).catch(console.error)
    }, delay)
  }

  const handleTestRelic = () => {
    invoke('show_relic_overlay', {
      rewards: [
        { name: 'Glaive Prime BP', rarity: 'Rare', price: 120, owned: 0, image: 'https://browse.wf/Lotus/Interface/Icons/Store/GlaivePrime.png' },
        { name: 'Braton Prime Stock', rarity: 'Common', price: 2, owned: 12, image: 'https://browse.wf/Lotus/Interface/Icons/Store/BratonPrime.png' },
        { name: 'Lex Prime Receiver', rarity: 'Uncommon', price: 15, owned: 3, image: 'https://browse.wf/Lotus/Interface/Icons/Store/LexPrime.png' },
        { name: 'Forma Blueprint', rarity: 'Uncommon', price: 0, owned: 45, image: 'https://browse.wf/Lotus/Interface/Icons/Store/Forma.png' },
      ]
    }).catch(console.error)
  }

  const handleHideOverlay = () => {
    invoke('hide_overlay_window', { label: 'overlay-tr' }).catch(console.error)
    invoke('hide_overlay_window', { label: 'overlay-tl' }).catch(console.error)
    invoke('hide_overlay_window', { label: 'overlay-tc' }).catch(console.error)
    invoke('hide_overlay_window', { label: 'overlay-relic' }).catch(console.error)
  }

  const handleToggleCalibrate = async () => {
    try {
      const isOpen = await invoke('toggle_calibration')
      setIsCalibrationOpen(isOpen)
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleCalibrateClose = () => {
    invoke('toggle_calibration').then(async () => {
      setIsCalibrationOpen(false)
    }).catch(console.error)
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
        <Card glow className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <Bell className="text-kronos-accent" size={24} />
            <h2 className="text-xl font-semibold uppercase tracking-tight">App Notifications</h2>
          </div>
          
          {/* Position & Sound - side by side on wide, stacked on narrow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-kronos-dim mb-3">Notification Position</p>
              <div className="grid grid-cols-3 gap-2">
                {['top-left', 'top-center', 'top-right'].map((pos) => (
                  <button
                    key={pos}
                    onClick={() => handleSetPosition(pos)}
                    className={`py-2 px-3 rounded-lg border text-xs font-black uppercase tracking-wider transition-all ${notifPosition === pos
                      ? 'bg-kronos-accent/20 border-kronos-accent text-kronos-accent'
                      : 'bg-kronos-panel/20 border-white/5 text-kronos-dim hover:border-white/20'
                      }`}
                  >
                    {pos.replace('top-', '').replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-kronos-dim mb-3">Notification Sound</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'None', value: 'none' },
                  { label: 'Sound 1', value: 'notification1.ogg' },
                  { label: 'Sound 2', value: 'notification2.ogg' },
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => handleSetSound(s.value)}
                    className={`py-2 px-3 rounded-lg border text-xs font-black uppercase tracking-wider transition-all ${notifSound === s.value
                      ? 'bg-kronos-accent/20 border-kronos-accent text-kronos-accent'
                      : 'bg-kronos-panel/20 border-white/5 text-kronos-dim hover:border-white/20'
                      }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Test buttons - always available */}
          <div className="mb-5 pt-4 border-t border-white/5">
            <p className="text-sm font-black uppercase tracking-widest text-kronos-dim mb-3">Test Notifications</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => handleTestNotification(notifPosition)}
                className="py-2 px-3 rounded-lg border text-xs font-black uppercase tracking-wider transition-all bg-kronos-panel/20 border-white/5 text-kronos-dim hover:border-white/20"
              >
                Test notification
              </button>
              <button
                onClick={() => handleTestNotification(notifPosition, 5000)}
                className="py-2 px-3 rounded-lg border text-xs font-black uppercase tracking-wider transition-all bg-kronos-panel/20 border-white/5 text-kronos-dim hover:border-white/20"
              >
                test notification in 5 seconds
              </button>
              <button
                onClick={handleTestRelic}
                className="py-2 px-3 rounded-lg border text-xs font-black uppercase tracking-wider transition-all bg-kronos-panel/20 border-white/5 text-kronos-dim hover:border-white/20"
              >
                test relic overlay
              </button>
              <button
                onClick={handleToggleCalibrate}
                className="py-2 px-3 rounded-lg border text-xs font-black uppercase tracking-wider transition-all bg-kronos-panel/20 border-white/5 text-kronos-dim hover:border-white/20"
              >
                Linux Calibration (KDE)
              </button>
            </div>
          </div>

          {/* Alert toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Arbitration */}
            <div className="p-3 bg-kronos-panel/20 rounded-lg border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-kronos-text uppercase">S-Tier Arbitration</p>
                  <p className="text-xs text-kronos-dim uppercase">Notify when a top-tier node appears</p>
                </div>
                <Toggle checked={notifArbitrationEnabled} onChange={handleSetArbitrationEnabled} />
              </div>
              {notifArbitrationEnabled && (
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5">
                  <div>
                    <p className="text-xs text-kronos-dim uppercase mb-1">Look ahead</p>
                    <select
                      value={notifArbitrationHours}
                      onChange={(e) => handleSetArbitrationHours(parseInt(e.target.value))}
                      className="w-full kronos-select"
                    >
                      <option value={6}>6 hours</option>
                      <option value={12}>12 hours</option>
                      <option value={24}>24 hours</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-kronos-dim uppercase mb-1">Remind before</p>
                    <select
                      value={notifArbitrationRemind}
                      onChange={(e) => handleSetArbitrationRemind(parseInt(e.target.value))}
                      className="w-full kronos-select"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Foundry */}
            <div className="p-3 bg-kronos-panel/20 rounded-lg border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-kronos-text uppercase">Foundry Completion</p>
                  <p className="text-xs text-kronos-dim uppercase">Alert when items are ready to claim</p>
                </div>
                <Toggle checked={notifFoundryEnabled} onChange={handleSetFoundryEnabled} />
              </div>
              {notifFoundryEnabled && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-xs text-kronos-dim uppercase mb-1">Notify when remaining duration is</p>
                  <select
                    value={notifFoundryMinutes}
                    onChange={(e) => handleSetFoundryMinutes(parseInt(e.target.value))}
                    className="w-full kronos-select"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                  </select>
                </div>
              )}
            </div>

            {/* Syndicate Standing - Capped */}
            <div className="p-3 bg-kronos-panel/20 rounded-lg border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-bold text-kronos-text uppercase">Syndicate Capped</p>
                  <p className="text-xs text-kronos-dim uppercase">Notify when any syndicate reaches max daily standing</p>
                </div>
                <Toggle checked={notifSyndicateEnabled} onChange={handleSetSyndicateEnabled} />
              </div>
            </div>

            {/* Syndicate Standing - Waste */}
            <div className="p-3 bg-kronos-panel/20 rounded-lg border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-bold text-kronos-text uppercase">Syndicate Waste Reminder</p>
                  <p className="text-xs text-kronos-dim uppercase">Notify when opponent of pledged faction has standing (max 2/day)</p>
                  <p className="text-[10px] text-kronos-dim mt-1">(see your pledged syndicate in checklist tab)</p>
                </div>
                <Toggle checked={notifSyndicateWasteEnabled} onChange={handleSetSyndicateWasteEnabled} />
              </div>
            </div>

            {/* Mastery */}
            <div className="p-3 bg-kronos-panel/20 rounded-lg border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-kronos-text uppercase">Mastery Progress</p>
                  <p className="text-xs text-kronos-dim uppercase">Notify when percentage is reached</p>
                </div>
                <Toggle checked={notifMasteryEnabled} onChange={handleSetMasteryEnabled} />
              </div>
              {notifMasteryEnabled && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-xs text-kronos-dim uppercase mb-1">Notify at</p>
                  <select
                    value={notifMasteryPercent}
                    onChange={(e) => handleSetMasteryPercent(parseInt(e.target.value))}
                    className="w-full kronos-select"
                  >
                    <option value={50}>50%</option>
                    <option value={75}>75%</option>
                    <option value={90}>90%</option>
                    <option value={99}>99%</option>
                  </select>
                </div>
              )}
            </div>

            {/* Checklist Task Reminders */}
            <div className="p-3 bg-kronos-panel/20 rounded-lg border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-kronos-text uppercase">Task Reminders</p>
                  <p className="text-xs text-kronos-dim uppercase">Notify before checklist tasks reset</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-xs text-kronos-dim uppercase mb-1">Notify before reset</p>
                <select
                  value={notifChecklistMinutes}
                  onChange={(e) => handleSetChecklistMinutes(parseInt(e.target.value))}
                  className="w-full kronos-select"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </div>
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