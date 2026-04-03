/**
 * Checklist.jsx
 *
 * A personal task tracker for daily and weekly Warframe activities.
 *
 * DATA STORAGE
 * ─────────────────────────────────────────
 * - Task definitions are hardcoded in the `tasks` array.
 * - Completion status and visibility preferences are persisted to
 *   `localStorage`.
 * - Standing values and ranks are read from inventoryData.Affiliations.
 * - Focus is read from inventoryData.DailyFocus.
 *
 * FEATURES
 * ─────────────────────────────────────────
 * - Separate sections for Daily, Weekly, and Standings.
 * - Progress counters for all categories.
 * - Ability to hide/show individual tasks.
 * - Auto-resets based on time (daily/weekly).
 */
import { useState, useEffect, useMemo } from 'react'
import { Check, Circle, Eye, EyeOff } from 'lucide-react'
import { PageLayout } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'
import { invoke } from '@tauri-apps/api/tauri'

const tasks = [
  { id: 'baro', label: 'Baro Ki\'Teer', reset: 'baro' },
  { id: 'sortie', label: 'Sortie', reset: 'daily' },
  { id: 'foundry', label: 'Check Foundry', reset: 'daily' },
  { id: 'syndicates', label: 'Syndicate Standing', reset: 'daily' },
  { id: 'focus', label: 'Daily Focus Cap', reset: 'daily' },
  { id: 'steel_path', label: 'Steel Path Incursions', reset: 'daily' },
  { id: 'acrithis_daily', label: 'Acrithis Daily', reset: 'daily' },
  { id: 'ticker', label: 'Ticker\'s Railjack Crew', reset: 'daily' },
  { id: 'marie', label: 'Marie\'s Shop', reset: 'daily' },
  { id: 'grandmother', label: 'Grandmother\'s Tokens', reset: 'other' },
  { id: 'yonta_daily', label: 'Yonta: Daily Voidplumes', reset: 'other' },
  { id: 'voca', label: 'Loid: Voca', reset: 'other' },
  { id: 'nightwave', label: 'Nightwave Missions', reset: 'weekly' },
  { id: 'nightwave_spend', label: 'Nightwave Shop', reset: 'weekly' },
  { id: 'ayatan', label: "Maroo's Ayatan Hunt", reset: 'weekly' },
  { id: 'clem', label: "Help Clem", reset: 'weekly' },
  { id: 'narmer', label: 'Help Kahl: Break Narmer', reset: 'weekly' },
  { id: 'archon', label: 'Archon Hunt', reset: 'weekly' },
  { id: 'circuit', label: 'Duviri Circuit', reset: 'weekly' },
  { id: 'circuit_sp', label: 'Duviri Circuit SP', reset: 'weekly' },
  { id: 'pulses', label: 'Pulses: Netracell & Archimedea', reset: 'weekly' },
  { id: 'calendar', label: '1999 Calendar', reset: 'weekly' },
  { id: 'invigorations', label: 'Helminth Invigoration', reset: 'weekly' },
  { id: 'descendia', label: 'Descendia', reset: 'weekly' },
  { id: 'descendia_sp', label: 'Descendia SP', reset: 'weekly' },
  { id: 'palladino', label: 'Palladino\'s Shop', reset: 'weekly' },
  { id: 'yonta_weekly', label: 'Yonta: Weekly Shop', reset: 'weekly' },
  { id: 'acrithis_weekly', label: 'Acrithis Weekly', reset: 'weekly' },
  { id: 'teshin', label: 'Teshin Shop', reset: 'weekly' },
  { id: 'bird3', label: 'Bird 3 Shop', reset: 'weekly' },
  { id: 'nightcap', label: 'Nightcap Shop', reset: 'weekly' },
]

const AFFILIATION_TAGS = {
  steel: 'SteelMeridianSyndicate',
  perrin: 'PerrinSyndicate',
  arbiters: 'ArbitersSyndicate',
  suda: 'CephalonSudaSyndicate',
  veil: 'RedVeilSyndicate',
  newloka: 'NewLokaSyndicate',
  simaris: 'LibrarySyndicate',
  ostron: 'CetusSyndicate',
  quills: 'QuillsSyndicate',
  solaris: 'SolarisSyndicate',
  vox: 'VoxSyndicate',
  ventkids: 'VentKidsSyndicate',
  entrati: 'EntratiSyndicate',
  necraloid: 'NecraloidSyndicate',
  cavia: 'EntratiLabSyndicate',
  holdfasts: 'ZarimanSyndicate',
  hex: 'HexSyndicate',
  conclave: 'ConclaveSyndicate',
  event: 'EventSyndicate',
}

const NO_RANK_SYNDICATES = ['simaris']

// Maps shorthand tag → ExportSyndicates key
const TAG_TO_EXPORT_KEY = {
  steel: 'SteelMeridianSyndicate',
  perrin: 'PerrinSyndicate',
  arbiters: 'ArbitersSyndicate',
  suda: 'CephalonSudaSyndicate',
  veil: 'RedVeilSyndicate',
  newloka: 'NewLokaSyndicate',
  conclave: 'ConclaveSyndicate',
  simaris: 'LibrarySyndicate',
  ostron: 'CetusSyndicate',
  quills: 'QuillsSyndicate',
  solaris: 'SolarisSyndicate',
  vox: 'VoxSyndicate',
  ventkids: 'VentKidsSyndicate',
  entrati: 'EntratiSyndicate',
  necraloid: 'NecraloidSyndicate',
  cavia: 'EntratiLabSyndicate',
  holdfasts: 'ZarimanSyndicate',
  hex: 'HexSyndicate',
}

const toHex = (val) => '#' + val.slice(4).toLowerCase()

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')
}

function relativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRgb(hex1))
  const l2 = relativeLuminance(hexToRgb(hex2))
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function darkenBgForContrast(bg, fg, minRatio = 3.5) {
  if (contrastRatio(bg, fg) >= minRatio) return bg
  let rgb = hexToRgb(bg)
  const fgLum = relativeLuminance(hexToRgb(fg))
  // If fg is dark, lighten bg; if fg is light, darken bg
  const step = fgLum > 0.2 ? -8 : 8
  for (let i = 0; i < 30; i++) {
    rgb = { r: rgb.r + step, g: rgb.g + step, b: rgb.b + step }
    const candidate = rgbToHex(rgb)
    if (contrastRatio(candidate, fg) >= minRatio) return candidate
  }
  return rgbToHex(rgb)
}

// Icons that can't be loaded from ExportTextIcons (no matching iconKey) use local PNGs
const LOCAL_ICONS = {
  ostron: 'FactionOstron.png',
  quills: 'FactionQuills.png',
  solaris: 'FactionSolarisUnited.png',
  vox: 'FactionVoxSolaris.png',
  entrati: 'FactionEntrati.png',
  necraloid: 'FactionNecraloid.png',
  cavia: 'FactionCavia.png',
  holdfasts: 'FactionHoldfasts.png',
  hex: 'FactionHex.png',
}

// Icons that load from ExportTextIcons via CDN
const CDN_ICONS = {
  steel: 'MERIDIAN',
  perrin: 'PERRIN',
  arbiters: 'HEXIS',
  suda: 'SUDA',
  veil: 'REDVEIL',
  newloka: 'LOKA',
  conclave: 'CONCLAVE',
  simaris: 'SIMARIS',
  ventkids: 'VENTKIDS',
}

// Non-syndicate entries that need manual config (focus schools etc.)
const EXTRA_CONFIG = {
  focus: { accent: 'var(--color-accent)', iconKey: 'FOCUS' },
  zenurik: { accent: 'var(--color-accent)', iconKey: 'ZENURIK_CLEAN' },
  naramon: { accent: 'var(--color-accent)', iconKey: 'NARAMON_CLEAN' },
  vazarin: { accent: 'var(--color-accent)', iconKey: 'VAZARIN_CLEAN' },
  madurai: { accent: 'var(--color-accent)', iconKey: 'MADURAI_CLEAN' },
  unairu: { accent: 'var(--color-accent)', iconKey: 'UNAIRU_CLEAN' },
}

function buildSyndicateConfig(exportSyndicates) {
  const config = { ...EXTRA_CONFIG }
  // Build exportKey → tag reverse map for alignment lookups
  const exportKeyToTag = {}
  for (const [tag, exportKey] of Object.entries(TAG_TO_EXPORT_KEY)) {
    exportKeyToTag[exportKey] = tag
  }
  for (const [tag, exportKey] of Object.entries(TAG_TO_EXPORT_KEY)) {
    const data = exportSyndicates?.[exportKey]
    let bg = data?.backgroundColour?.value ? toHex(data.backgroundColour.value) : '#1a1a2e'
    const accent = data?.colour?.value ? toHex(data.colour.value) : '#a0a0a0'
    bg = darkenBgForContrast(bg, accent)
    // Parse alignments → { ally_tag: true, enemy_tag: true }
    const allies = {}
    const enemies = {}
    if (data?.alignments) {
      for (const [otherKey, value] of Object.entries(data.alignments)) {
        const otherTag = exportKeyToTag[otherKey]
        if (!otherTag) continue
        if (value > 0) allies[otherTag] = true
        else if (value < 0) enemies[otherTag] = true
      }
    }
    config[tag] = { bg, accent, allies, enemies }
    if (LOCAL_ICONS[tag]) config[tag].localIcon = LOCAL_ICONS[tag]
    if (CDN_ICONS[tag]) config[tag].iconKey = CDN_ICONS[tag]
  }
  return config
}

const FOCUS_SCHOOLS = [
  { id: 'zenurik', label: 'Zenurik', key: 'AP_POWER' },
  { id: 'naramon', label: 'Naramon', key: 'AP_ATTACK' },
  { id: 'vazarin', label: 'Vazarin', key: 'AP_WARD' },
  { id: 'madurai', label: 'Madurai', key: 'AP_TACTIC' },
  { id: 'unairu', label: 'Unairu', key: 'AP_DEFENSE' },
]

const standings = [
  // Focus total
  { id: 'focus_total', label: 'Daily Focus', color: 'focus' },

  // Focus schools
  ...FOCUS_SCHOOLS.map(s => ({ id: s.id, label: s.label, color: s.id, focusKey: s.key })),

  // Faction Syndicates
  { id: 'steel', label: 'Steel Meridian', tag: 'steel' },
  { id: 'perrin', label: 'Perrin Sequence', tag: 'perrin' },
  { id: 'arbiters', label: 'Arbiters of Hexis', tag: 'arbiters' },
  { id: 'suda', label: 'Cephalon Suda', tag: 'suda' },
  { id: 'veil', label: 'Red Veil', tag: 'veil' },
  { id: 'newloka', label: 'New Loka', tag: 'newloka' },

  // Cephalon Simaris
  { id: 'simaris', label: 'Cephalon Simaris', tag: 'simaris' },

  // Open World - Cetus
  { id: 'ostron', label: 'Ostron', tag: 'ostron' },
  { id: 'quills', label: 'The Quills', tag: 'quills' },

  // Open World - Fortuna
  { id: 'solaris', label: 'Solaris United', tag: 'solaris' },
  { id: 'vox', label: 'Vox Solaris', tag: 'vox' },
  { id: 'ventkids', label: 'Ventkids', tag: 'ventkids' },

  // Open World - Necralisk
  { id: 'entrati', label: 'Entrati', tag: 'entrati' },
  { id: 'necraloid', label: 'Necraloid', tag: 'necraloid' },
  { id: 'cavia', label: 'Cavia', tag: 'cavia' },

  // Zariman
  { id: 'holdfasts', label: 'Holdfasts', tag: 'holdfasts' },
  { id: 'hex', label: 'The Hex', tag: 'hex' },

  // Other
  { id: 'conclave', label: 'Conclave', tag: 'conclave' },
]

const formatTimeLeft = (ms) => {
  if (!ms || ms <= 0 || isNaN(ms)) return 'Now'
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const TaskCard = ({ task, completed, hidden, onToggle, onHide, timeLeft, nextResetTime }) => {
  const resetLabels = { daily: 'Daily', weekly: 'Weekly', biweekly: 'Biweekly', other: '8h', baro: 'Trader' }
  const getIntervalMs = (resetType) => {
    if (resetType === 'daily') return 24 * 60 * 60 * 1000
    if (resetType === 'weekly') return 7 * 24 * 60 * 60 * 1000
    if (resetType === 'biweekly') return 14 * 24 * 60 * 60 * 1000
    if (resetType === 'other') return 8 * 60 * 60 * 1000
    if (resetType === 'baro') return 14 * 24 * 60 * 60 * 1000
    return 24 * 60 * 60 * 1000
  }
  const intervalMs = getIntervalMs(task.reset)
  const displayTime = completed && nextResetTime
    ? `next: ${formatTimeLeft(nextResetTime + intervalMs - Date.now())}`
    : timeLeft
  return (
    <div
      className={`p-3 rounded-lg border transition-all ${completed
        ? 'bg-kronos-accent/10 border-kronos-accent/30'
        : hidden
          ? 'opacity-30'
          : ''
      }`}
      style={{
        backgroundColor: completed 
          ? 'rgba(var(--color-accent-rgb), 0.1)' 
          : hidden 
            ? undefined 
            : 'rgba(var(--color-panel-rgb, 26, 26, 46), 0.4)',
        borderColor: completed
          ? 'rgba(var(--color-accent-rgb), 0.3)'
          : hidden
            ? 'rgba(255,255,255,0.05)'
            : 'rgba(255,255,255,0.05)',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[14px] ${completed ? 'line-through text-kronos-dim' : ''}`}>
          {task.label}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded text-kronos-accent" style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.2)' }}>
            {resetLabels[task.reset]}
          </span>
          <button
            onClick={onHide}
            className="p-1 rounded hover:bg-white/10"
            title={hidden ? 'Show' : 'Hide'}
          >
            {hidden ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-kronos-dim">{displayTime}</span>
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-white/10"
        >
          {completed ? (
            <Check className="text-kronos-accent" size={16} />
          ) : (
            <Circle className="text-kronos-dim" size={16} />
          )}
        </button>
      </div>
    </div>
  )
}

const ColorFilters = ({ config }) => {
  const colors = [...new Set(Object.values(config).map(c => c.accent).filter(c => c && !c.startsWith('var')))]
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
        {colors.map(color => {
          const { r, g, b } = hexToRgb(color)
          const rn = (r / 255).toFixed(4)
          const gn = (g / 255).toFixed(4)
          const bn = (b / 255).toFixed(4)
          const id = 'cf-' + color.slice(1)
          return (
            <filter key={id} id={id} colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" result="lum" />
              <feColorMatrix type="matrix" in="lum" values={`${rn} 0 0 0 0  ${gn} 0 0 0 0  ${bn} 0 0 0 0  0 0 0 1 0`} />
            </filter>
          )
        })}
      </defs>
    </svg>
  )
}

const TintedIcon = ({ src, size = 'w-8 h-8', accent }) => {
  if (accent?.startsWith?.('var')) {
    return <img src={src} alt="" className={`${size} object-contain flex-shrink-0`} style={{ filter: 'brightness(0) invert(1)' }} />
  }
  const filterId = accent ? `url(#cf-${accent.slice(1)})` : undefined
  return (
    <img
      src={src}
      alt=""
      className={`${size} object-contain flex-shrink-0`}
      style={{ filter: filterId }}
    />
  )
}
const FACTION_TAGS = new Set(['steel', 'perrin', 'arbiters', 'suda', 'veil', 'newloka'])

const StandingCard = ({ standing, affiliation, earnedStanding, rankCap, dailyCap, iconUrl, localIconUrl, supportedSyndicate, syndicateConfig, hoveredTag, onHover }) => {
  const rank = affiliation?.Title ?? 0
  const tagKey = standing.tag || standing.color
  const config = syndicateConfig[tagKey] || { bg: '#1a1a2e', accent: '#a0a0a0' }
  const isNegative = rank < 0
  const progress = isNegative
    ? Math.min(100, Math.max(0, (Math.abs(rankCap) - Math.abs(earnedStanding)) / Math.abs(rankCap) * 100))
    : Math.min(100, (earnedStanding / rankCap) * 100)
  const isPledged = supportedSyndicate === AFFILIATION_TAGS[standing.tag]
  const isFaction = FACTION_TAGS.has(tagKey)
  const isAlly = hoveredTag && config.allies?.[hoveredTag]
  const isEnemy = hoveredTag && config.enemies?.[hoveredTag]
  const isDimmed = hoveredTag && tagKey !== hoveredTag && !isAlly && !isEnemy
  const overlayBadge = isAlly ? '+' : isEnemy ? '−' : null
  const hoverBg = isAlly ? '#166534' : isEnemy ? '#991b1b' : null
  const iconSrc = iconUrl || localIconUrl

  const handleMouseEnter = () => { if (isFaction) onHover?.(tagKey) }
  const handleMouseLeave = () => { if (isFaction) onHover?.(null) }

  return (
    <div
      className="rounded-lg border relative overflow-hidden transition-all duration-200 flex min-w-[280px]"
      style={{
        backgroundColor: hoverBg || config.bg,
        borderColor: config.accent + '44',
        opacity: isDimmed ? 0.3 : 1,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {overlayBadge && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <span className="text-[150px] font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">{overlayBadge}</span>
        </div>
      )}

      {/* Icon column — full card height, tinted with accent */}
      {iconSrc && (
        <div
          className="w-24 flex-shrink-0 flex items-center justify-center p-2"
          style={{ backgroundColor: config.accent + '22', borderRight: `1px solid ${config.accent}44` }}
        >
          <TintedIcon src={iconSrc} accent={config.accent} size="w-20 h-20" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 p-3 flex flex-col gap-1.5">
        {/* Row 1: Name — Rank X */}
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-mono font-bold truncate" style={{ color: config.accent }}>
            {standing.label}{isPledged ? ' ★' : ''}
          </span>
          {rank !== 0 && (
            <span className="text-[11px] flex-shrink-0 font-mono font-bold" style={{ color: config.accent, opacity: 0.6 }}>
              Rank {rank}
            </span>
          )}
        </div>

        {/* Row 2: Progress bar */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, backgroundColor: config.accent }}
          />
        </div>

        {/* Row 3: total / max */}
        <span className="text-[12px] font-mono font-bold" style={{ color: config.accent, opacity: 0.8 }}>
          {earnedStanding.toLocaleString()}
          <span style={{ opacity: 0.5 }}> / {rankCap.toLocaleString()}</span>
        </span>

        {/* Row 4: daily remaining */}
        {dailyCap > 0 && (
          <span className="text-[11px] font-mono font-bold" style={{ color: config.accent, opacity: 0.5 }}>
            Daily: {dailyCap.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  )
}

export default function Checklist() {
  const { inventoryData, ExportTextIcons, worldState, ES } = useMonitoring()
  const supportedSyndicate = inventoryData?.SupportedSyndicate || null
  const SYNDICATE_CONFIG = useMemo(() => buildSyndicateConfig(ES), [ES])
  const [hoveredTag, setHoveredTag] = useState(null)

  const [completed, setCompleted] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('checklist_completed') || '{}')
    } catch { return {} }
  })
  const [hiddenMap, setHiddenMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('checklist_hidden') || '{}')
    } catch { return {} }
  })
  const [showHiddenTasks, setShowHiddenTasks] = useState(false)
  const [cdnBase, setCdnBase] = useState('')

  useEffect(() => {
    localStorage.setItem('checklist_completed', JSON.stringify(completed))
  }, [completed])

  useEffect(() => {
    localStorage.setItem('checklist_hidden', JSON.stringify(hiddenMap))
  }, [hiddenMap])

  useEffect(() => {
    invoke('get_cdn_base_url').then(setCdnBase).catch(() => { })
  }, [])

  const hasInventory = !!inventoryData
  const masteryRank = hasInventory ? (inventoryData?.account?.mastery_rank || 16) : 16
  const affiliations = hasInventory ? (inventoryData?.Affiliations || []) : []
  const focusXP = hasInventory ? (inventoryData?.FocusXP || {}) : {}
  const dailyFocus = hasInventory ? (inventoryData?.DailyFocus || 0) : 0
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const getNextReset = (taskId, resetType) => {
    if (taskId === 'baro' && worldState?.voidTrader) {
      const vt = worldState.voidTrader
      if (vt.active && vt.expiryMs) {
        return vt.expiryMs
      }
      if (!vt.active && vt.activationMs) {
        return vt.activationMs
      }
      return 0
    }
    if (taskId === 'sortie' && worldState?.sortie?.expiry) {
      const expiry = worldState.sortie.expiry
      if (expiry instanceof Date && !isNaN(expiry.getTime())) return expiry.getTime()
      return 0
    }
    if (taskId === 'steel_path' && worldState?.incursions?.expiry) {
      const expiry = worldState.incursions.expiry
      if (expiry instanceof Date && !isNaN(expiry.getTime())) return expiry.getTime()
      return 0
    }
    if (taskId === 'archon' && worldState?.archonHunt?.expiry) {
      const expiry = worldState.archonHunt.expiry
      if (expiry instanceof Date && !isNaN(expiry.getTime())) return expiry.getTime()
      return 0
    }
    if (taskId === 'nightwave' && worldState?.nightwave?.expiry) {
      const expiry = worldState.nightwave.expiry
      if (expiry instanceof Date && !isNaN(expiry.getTime())) return expiry.getTime()
      return 0
    }
    if (resetType === 'daily') {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
      tomorrow.setUTCHours(0, 0, 0, 0)
      return tomorrow.getTime()
    }
    if (resetType === 'weekly') {
      const now = new Date()
      const nextSunday = new Date(now)
      nextSunday.setUTCDate(nextSunday.getUTCDate() + (7 - nextSunday.getUTCDay()) % 7)
      nextSunday.setUTCHours(0, 0, 0, 0)
      if (nextSunday.getTime() <= now.getTime()) {
        nextSunday.setUTCDate(nextSunday.getUTCDate() + 7)
      }
      return nextSunday.getTime()
    }
    if (resetType === 'biweekly') {
      const now = new Date()
      const next = new Date(now)
      next.setUTCHours(0, 0, 0, 0)
      const dayOfCycle = Math.floor((next.getTime() - 1709251200000) / (14 * 24 * 60 * 60 * 1000))
      const nextCycle = new Date(1709251200000 + (dayOfCycle + 1) * 14 * 24 * 60 * 60 * 1000)
      return nextCycle.getTime()
    }
    if (resetType === 'other') {
      const now = new Date()
      const next = new Date(now)
      next.setUTCHours(next.getUTCHours() + 8 - (next.getUTCHours() % 8), 0, 0, 0)
      if (next.getTime() <= now.getTime()) {
        next.setUTCHours(next.getUTCHours() + 8)
      }
      return next.getTime()
    }
    return 0
  }

  const formatTimeLeft = (ms) => {
    if (!ms || ms <= 0 || isNaN(ms)) return 'Now'
    const days = Math.floor(ms / (1000 * 60 * 60 * 24))
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const getIconUrl = (iconKey) => {
    if (!iconKey || !ExportTextIcons || !cdnBase) return null
    const iconData = ExportTextIcons[iconKey]
    if (!iconData) return null
    const path = iconData.DIT_AUTO || Object.values(iconData)[0]
    if (!path) return null
    return cdnBase + path
  }

  const getLocalIconUrl = (iconKey, localIcon) => {
    if (!localIcon) return null
    return '/' + localIcon
  }

  const getAffiliation = (tagKey) => {
    const tag = AFFILIATION_TAGS[tagKey]
    return affiliations.find(a => a.Tag === tag)
  }

  const RANK_CAPS = {
    5: 132000, 4: 99000, 3: 70000, 2: 44000, 1: 22000, 0: 5000,
    [-1]: -22000, [-2]: -44000
  }

  const getRankCap = (rank) => RANK_CAPS[rank] ?? 22000

  const getCumulativePreviousCaps = (rank) => {
    if (rank <= 0) return 0
    if (rank >= 5) return 5000 + 22000 + 44000 + 70000 + 99000
    if (rank === 4) return 5000 + 22000 + 44000 + 70000
    if (rank === 3) return 5000 + 22000 + 44000
    if (rank === 2) return 5000 + 22000
    if (rank === 1) return 5000
    return 0
  }

  const getEarnedStanding = (totalStanding, rank) => {
    if (rank < 0) {
      return getRankCap(rank)
    }
    const previousCaps = getCumulativePreviousCaps(rank)
    return Math.max(0, totalStanding - previousCaps)
  }

  const getDailyCap = () => 16000 + masteryRank * 500
  const getFocusDailyCap = () => 250000 + masteryRank * 5000

  const getStandingData = (standing) => {
    if (standing.id === 'focus_total') {
      return { earned: 0, cap: 0, daily: getFocusDailyCap(), isFocusTotal: true }
    }
    if (standing.focusKey) {
      const earned = focusXP?.[standing.focusKey] || 0
      return { earned, cap: 0, daily: 0, isFocusSchool: true }
    }
    const aff = getAffiliation(standing.tag)
    if (aff) {
      const total = aff.Standing ?? 0
      if (NO_RANK_SYNDICATES.includes(standing.tag)) {
        return { earned: total, cap: 125000, daily: getDailyCap() }
      }
      const rank = aff.Title ?? 0
      const earned = getEarnedStanding(total, rank)
      const cap = getRankCap(rank)
      return { earned, cap, daily: getDailyCap() }
    }
    return { earned: 0, cap: 24000, daily: getDailyCap() }
  }

  useEffect(() => {
    setHiddenMap(Object.fromEntries(tasks.map(t => [t.id, t.hidden])))
  }, [])

  const toggleTask = (taskId) => {
    setCompleted(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }))
  }

  const toggleHidden = (taskId) => {
    setHiddenMap(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  const allTasks = tasks.map(task => {
    const taskReset = getNextReset(task.id, task.reset)
    const isCompleted = completed[task.id]
    const sortReset = isCompleted ? taskReset : taskReset - now
    return {
      ...task,
      sortReset,
      nextReset: taskReset,
      nextResetTime: taskReset,
      timeLeft: formatTimeLeft(taskReset - now)
    }
  }).sort((a, b) => a.sortReset - b.sortReset)

  const visibleTasks = allTasks.filter(t => showHiddenTasks || !hiddenMap[t.id])
  const completedTasks = visibleTasks.filter(t => completed[t.id]).length

  return (
    <>
      <ColorFilters config={SYNDICATE_CONFIG} />
      <PageLayout title="Checklist" subtitle="Track daily and weekly activities">
        {/* Focus Section - Full Width */}
        {hasInventory && (
        <div className="mb-6">
          <div className="rounded-lg p-3 border flex items-center justify-between mb-3" style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.1)', borderColor: 'rgba(var(--color-accent-rgb), 0.3)' }}>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-kronos-accent" />
              <span className="text-[14px] font-semibold text-kronos-text">Focus</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {standings.filter(s => s.id === 'focus_total' || s.focusKey).map(standing => {
              const { earned } = getStandingData(standing)
              const config = SYNDICATE_CONFIG[standing.color] || { accent: '#a0a0a0' }
              const iconUrl = getIconUrl(config.iconKey)
              const dailyCap = standing.id === 'focus_total' ? getFocusDailyCap() : 0
              const cap = standing.id === 'focus_total' ? getFocusDailyCap() : 0
              const progress = cap > 0 ? Math.min(100, (dailyFocus / cap) * 100) : 0
              return (
                <div key={standing.id} className="rounded-lg border overflow-hidden flex" style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.1)', borderColor: 'rgba(var(--color-accent-rgb), 0.2)' }}>
                  {iconUrl && (
                    <div className="w-14 flex-shrink-0 flex items-center justify-center p-1.5" style={{ borderRight: '1px solid rgba(var(--color-accent-rgb), 0.15)' }}>
                      <TintedIcon src={iconUrl} accent={config.accent} size="w-10 h-10" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 p-2 flex flex-col gap-1">
                    <span className="text-[12px] font-medium truncate" style={{ color: config.accent }}>{standing.label}</span>
                    <span className="text-[14px] font-mono" style={{ color: config.accent }}>
                      {standing.id === 'focus_total' ? `${dailyFocus.toLocaleString()} left` : earned.toLocaleString()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        )}

        {/* Standings Section */}
        {hasInventory && (
        <div className="mb-6">
          <div className="rounded-lg p-3 border flex items-center justify-between mb-3" style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.1)', borderColor: 'rgba(var(--color-accent-rgb), 0.3)' }}>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-kronos-accent" />
              <span className="text-[14px] font-semibold text-kronos-text">Standings</span>
            </div>
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {standings.filter(s => !s.id.startsWith('focus') && !s.focusKey).map(standing => {
              const { earned, cap, daily } = getStandingData(standing)
              const affiliation = getAffiliation(standing.tag)
              const config = SYNDICATE_CONFIG[standing.tag] || { bg: '#1a1a2e', accent: '#a0a0a0', iconKey: null }
              const iconUrl = getIconUrl(config.iconKey)
              const localIconUrl = getLocalIconUrl(config.iconKey, config.localIcon)
              return (
                <StandingCard
                  key={standing.id}
                  standing={standing}
                  affiliation={affiliation}
                  earnedStanding={earned}
                  rankCap={cap}
                  dailyCap={daily}
                  iconUrl={iconUrl}
                  localIconUrl={localIconUrl}
                  supportedSyndicate={supportedSyndicate}
                  syndicateConfig={SYNDICATE_CONFIG}
                  hoveredTag={hoveredTag}
                  onHover={setHoveredTag}
                />
              )
            })}
          </div>
        </div>
        )}

        {/* Tasks Section - Single Grid */}
        <div className="mb-6">
          <div className="rounded-lg p-3 border flex items-center justify-between mb-3" style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.1)', borderColor: 'rgba(var(--color-accent-rgb), 0.3)' }}>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-kronos-accent" />
              <span className="text-[14px] font-semibold text-kronos-text">Tasks</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[18px] font-bold text-kronos-accent">
                {completedTasks}/{visibleTasks.length}
              </span>
              <button
                onClick={() => setShowHiddenTasks(!showHiddenTasks)}
                className="p-1.5 rounded hover:bg-white/10 transition-colors"
              >
                {showHiddenTasks ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {visibleTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                completed={completed[task.id] || false}
                hidden={hiddenMap[task.id] || false}
                onToggle={() => toggleTask(task.id)}
                onHide={() => toggleHidden(task.id)}
                timeLeft={task.timeLeft}
                nextResetTime={task.nextResetTime}
              />
            ))}
          </div>
        </div>
      </PageLayout>
    </>
  )
}