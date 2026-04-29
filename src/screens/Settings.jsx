// Remove duplicate - using App.jsx version instead
import { useState, useEffect } from 'react'
import { Palette, Bell, Clock, AlertTriangle, Star, CheckCircle, Settings as SettingsIcon, Zap, Save, RefreshCw, Play, X, FolderOpen, Scan } from 'lucide-react'
import { open as openDialog } from '@tauri-apps/api/dialog'
import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'
import { getSetting, setSetting } from '../lib/settings'
import { useTheme } from '../contexts/ThemeContext'
import { useMonitoring } from '../contexts/MonitoringContext'
import { formatLastUpdate } from '../lib/warframeUtils'
import { PageLayout, Card, Button, Toggle } from '../components/UI'

export default function SettingsScreen() {
  const { theme, setTheme, themes } = useTheme()
  const { isMonitoring, startMonitoring, stopMonitoring, manualRefresh, lastUpdate, statusText, autoStart, setAutoStart, monitorResult } = useMonitoring()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false)
  const [isScannerRunning, setIsScannerRunning] = useState(false)

  // Notification settings
  const [notifPosition, setNotifPosition] = useState(
    () => getSetting('notif_position', 'top-right')
  )
  const [notifSound, setNotifSound] = useState(
    () => getSetting('notif_sound', 'notification1.ogg')
  )

  const [notifArbitrationEnabled, setNotifArbitrationEnabled] = useState(
    () => getSetting('notif_arbitration_enabled', false)
  )
  const [notifArbitrationHours, setNotifArbitrationHours] = useState(
    () => parseInt(getSetting('notif_arbitration_hours', 24))
  )
  const [notifArbitrationRemind, setNotifArbitrationRemind] = useState(
    () => parseInt(getSetting('notif_arbitration_remind', 30))
  )

  const [notifFoundryEnabled, setNotifFoundryEnabled] = useState(
    () => getSetting('notif_foundry_enabled', false)
  )
  const [notifFoundryMinutes, setNotifFoundryMinutes] = useState(
    () => parseInt(getSetting('notif_foundry_minutes', 5))
  )

  const [notifSyndicateEnabled, setNotifSyndicateEnabled] = useState(
    () => getSetting('notif_syndicate_enabled', false)
  )
  const [notifSyndicateWasteEnabled, setNotifSyndicateWasteEnabled] = useState(
    () => getSetting('notif_syndicate_waste_enabled', false)
  )

  const [notifMasteryEnabled, setNotifMasteryEnabled] = useState(
    () => getSetting('notif_mastery_enabled', false)
  )
  const [notifMasteryPercent, setNotifMasteryPercent] = useState(
    () => parseInt(getSetting('notif_mastery_percent', 50))
  )

  const [notifChecklistMinutes, setNotifChecklistMinutes] = useState(
    () => parseInt(getSetting('notif_checklist_minutes', 60))
  )

  // Fissure Overlay Settings
  const [fissureOverlayEnabled, setFissureOverlayEnabled] = useState(
    () => getSetting('fissure_overlay_enabled')
  )
  const [eeLogPath, setEeLogPath] = useState(
    () => getSetting('ee_log_path', '')
  )
  const [debugSquadSize, setDebugSquadSize] = useState(4)

  // Listen for calibration window close from X button
  useEffect(() => {
    const unlisten = listen('calibration-closed', () => {
      setIsCalibrationOpen(false)
    })
    return () => { unlisten.then(f => f()) }
  }, [])

  // Poll scanner status
  useEffect(() => {
    let interval
    if (fissureOverlayEnabled) {
      interval = setInterval(() => {
        invoke('is_scanning').then(setIsScannerRunning).catch(() => setIsScannerRunning(false))
      }, 2000)
    } else {
      setIsScannerRunning(false)
    }
    return () => clearInterval(interval)
  }, [fissureOverlayEnabled])

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

  const handleSetPosition = async (pos) => {
    setNotifPosition(pos)
    await setSetting('notif_position', pos)
  }

  useEffect(() => {
    // Sync current sound to Rust backend on mount
    const savedSound = getSetting('notif_sound', 'notification1.ogg')
    invoke('set_notification_sound', { sound: savedSound }).catch(console.error)
  }, [])

  const handleSetSound = async (sound) => {
    setNotifSound(sound)
    await setSetting('notif_sound', sound)

    // Update Rust state for ALL future notifications
    await invoke('set_notification_sound', { sound }).catch(console.error)

    // Preview sound via Rust (one-time manual play)
    if (sound !== 'none') {
      await invoke('play_notification_sound', { sound }).catch(console.error)
    }
  }

  // Arbitration settings handlers
  const handleSetArbitrationEnabled = async (val) => {
    setNotifArbitrationEnabled(val)
    await setSetting('notif_arbitration_enabled', val)
  }
  const handleSetArbitrationHours = async (val) => {
    setNotifArbitrationHours(val)
    await setSetting('notif_arbitration_hours', val)
  }
  const handleSetArbitrationRemind = async (val) => {
    setNotifArbitrationRemind(val)
    await setSetting('notif_arbitration_remind', val)
  }

  // Foundry settings handlers
  const handleSetFoundryEnabled = async (val) => {
    setNotifFoundryEnabled(val)
    await setSetting('notif_foundry_enabled', val)
  }
  const handleSetFoundryMinutes = async (val) => {
    setNotifFoundryMinutes(val)
    await setSetting('notif_foundry_minutes', val)
  }

  // Syndicate settings handlers
  const handleSetSyndicateEnabled = async (val) => {
    setNotifSyndicateEnabled(val)
    await setSetting('notif_syndicate_enabled', val)
  }
  const handleSetSyndicateWasteEnabled = async (val) => {
    setNotifSyndicateWasteEnabled(val)
    await setSetting('notif_syndicate_waste_enabled', val)
  }

  // Mastery settings handlers
  const handleSetMasteryEnabled = async (val) => {
    setNotifMasteryEnabled(val)
    await setSetting('notif_mastery_enabled', val)
  }
  const handleSetMasteryPercent = async (val) => {
    setNotifMasteryPercent(val)
    await setSetting('notif_mastery_percent', val)
  }
  const handleSetChecklistMinutes = async (val) => {
    setNotifChecklistMinutes(val)
    await setSetting('notif_checklist_minutes', val)
  }

  // Fissure Overlay handlers
  const handleSetFissureEnabled = async (val) => {
    setFissureOverlayEnabled(val)
    await setSetting('fissure_overlay_enabled', val)
    if (val && eeLogPath) {
      invoke('start_log_scanner', { path: eeLogPath }).catch(console.error)
    } else {
      invoke('stop_log_scanner').catch(console.error)
    }
  }

  const handleBrowseLog = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: 'Game Log', extensions: ['log'] }]
      })
      if (selected) {
        setEeLogPath(selected)
        await setSetting('ee_log_path', selected)
        if (fissureOverlayEnabled) {
          invoke('start_log_scanner', { path: selected }).catch(console.error)
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleCaptureDebugOcr = async () => {
    try {
      await invoke('start_debug_ocr_session', { squadSize: debugSquadSize })
    } catch (err) {
      alert(`Debug OCR Failed: ${err}`)
    }
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

        {/* Fissure Relic Overlay */}
        <Card glow className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Scan className="text-kronos-accent" size={28} />
              <h2 className="text-xl font-black uppercase tracking-tight">Fissure Rewards Overlay</h2>
            </div>
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
              <span className="text-[10px] font-black uppercase tracking-widest text-kronos-dim">Enable Scanner</span>
              <Toggle checked={fissureOverlayEnabled} onChange={handleSetFissureEnabled} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-3 bg-kronos-panel/20 rounded-lg border border-white/5">
              <p className="text-xs text-kronos-dim uppercase mb-2 font-bold tracking-wider">EE.log Path Configuration</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={eeLogPath}
                  readOnly
                  placeholder="Select your Warframe EE.log file..."
                  className="flex-1 glass-panel rounded-lg px-4 py-2 text-xs font-mono focus:outline-none focus:glow-border"
                />
                <Button variant="secondary" onClick={handleBrowseLog} className="px-3">
                  <FolderOpen size={16} className="mr-2" />
                  Browse
                </Button>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row gap-6 text-[10px] text-zinc-500 uppercase leading-relaxed font-bold">
                <div>
                  <p className="text-zinc-400 mb-1 tracking-widest">Common Windows Path:</p>
                  <p className="font-mono text-kronos-accent/70">AppData\Local\Warframe\EE.log</p>
                </div>
                <div>
                  <p className="text-zinc-400 mb-1 tracking-widest">Common Linux Path:</p>
                  <p className="font-mono text-kronos-accent/70">steamapps/compatdata/230410/pfx/drive_c/users/steamuser/AppData/Local/Warframe/EE.log</p>
                </div>
              </div>
            </div>

            {fissureOverlayEnabled && (
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center gap-3">
                  <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
                    {[2, 3, 4].map(size => (
                      <button
                        key={size}
                        onClick={() => setDebugSquadSize(size)}
                        className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-black transition-all ${debugSquadSize === size ? 'bg-kronos-accent text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  <Button variant="ghost" onClick={handleCaptureDebugOcr} className="text-[10px] font-black uppercase py-1 px-4 border-white/5 text-kronos-dim hover:text-white h-10">
                    Test Relic Recognition (4s)
                  </Button>
                </div>
                <p className="text-[10px] text-zinc-500 italic px-1 leading-relaxed">
                  Select squad size, click test, then switch to your screenshot. The overlay will appear after 4s and capture the screen.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Monitoring Section */}
        <Card glow className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-500 ${monitorResult === 'success' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.7)]' :
                monitorResult === 'error' ? 'bg-red-500   shadow-[0_0_8px_rgba(239,68,68,0.7)]' :
                  'bg-zinc-600'
              }`} />
            <h2 className="text-xl font-black uppercase tracking-tight">Game Monitoring</h2>
          </div>

          {/* Status widget */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-kronos-panel/30 rounded-xl p-4 border border-white/5 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-kronos-dim">Status</p>
              <p className="text-xs text-kronos-accent font-mono break-words leading-relaxed min-h-[2rem]">
                {statusText || (isMonitoring ? 'Monitoring active' : 'Not monitoring')}
              </p>
              {lastUpdate && (
                <p className="text-[10px] text-zinc-600 font-mono">
                  Last update: {formatLastUpdate(lastUpdate)}
                </p>
              )}
              {error && <p className="text-[10px] text-red-400 font-mono">Error: {error}</p>}
            </div>

            <div className="bg-kronos-panel/30 rounded-xl p-4 border border-white/5 flex flex-col justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-kronos-dim mb-3">Options</p>
              <Toggle
                checked={autoStart}
                onChange={setAutoStart}
                label="Auto-start on launch"
                description="Start monitoring when the app opens"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleStart}
              disabled={loading || isMonitoring}
              className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${isMonitoring
                  ? 'bg-green-500/10 border-green-500/30 text-green-400 cursor-not-allowed'
                  : loading
                    ? 'bg-kronos-panel/20 border-white/5 text-kronos-dim cursor-not-allowed'
                    : 'bg-kronos-accent/20 border-kronos-accent/40 text-kronos-accent hover:bg-kronos-accent/30'
                }`}
            >
              {loading
                ? <span className="flex items-center justify-center gap-2"><RefreshCw size={12} className="animate-spin" /> Starting</span>
                : isMonitoring ? '● Active' : 'Start'
              }
            </button>
            <button
              onClick={stopMonitoring}
              disabled={!isMonitoring}
              className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${isMonitoring
                  ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                  : 'bg-kronos-panel/20 border-white/5 text-kronos-dim/40 cursor-not-allowed'
                }`}
            >
              Stop
            </button>
            <button
              onClick={manualRefresh}
              disabled={!isMonitoring}
              className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${isMonitoring
                  ? 'bg-kronos-panel/40 border-white/10 text-kronos-text hover:border-kronos-accent/30 hover:text-kronos-accent'
                  : 'bg-kronos-panel/20 border-white/5 text-kronos-dim/40 cursor-not-allowed'
                }`}
            >
              Refresh
            </button>
          </div>
        </Card>

      </div>
    </PageLayout>
  )
}