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
import { useState, useEffect } from 'react'
import { Check, Circle, Eye, EyeOff } from 'lucide-react'
import { PageLayout } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'
import { convertFileSrc, invoke } from '@tauri-apps/api/tauri'

const tasks = [
  // Daily Resets
  { id: 'sortie', label: 'Sortie', reset: 'daily', hidden: false },
  { id: 'craft_forma', label: 'Craft Forma / Collect', reset: 'daily', hidden: false },
  { id: 'factions', label: 'Faction Syndicates', reset: 'daily', hidden: false },
  { id: 'focus', label: 'Focus Cap', reset: 'daily', hidden: false },
  { id: 'steel_path', label: 'Steel Path Incursions', reset: 'daily', hidden: false },
  { id: 'acrithis', label: 'Acrithis Daily', reset: 'daily', hidden: false },
  { id: 'ticker', label: 'Ticker Crew', reset: 'daily', hidden: false },
  { id: 'marie', label: 'Marie Shop', reset: 'daily', hidden: false },

  // Weekly Resets
  { id: 'nightwave', label: 'Nightwave Missions', reset: 'weekly', hidden: false },
  { id: 'nightwave_spend', label: 'Nightwave Creds', reset: 'weekly', hidden: false },
  { id: 'ayatan', label: "Maroo's Ayatan Hunt", reset: 'weekly', hidden: false },
  { id: 'clem', label: "Help Clem", reset: 'weekly', hidden: false },
  { id: 'narmer', label: 'Break Narmer', reset: 'weekly', hidden: false },
  { id: 'archon', label: 'Archon Hunt', reset: 'weekly', hidden: false },
  { id: 'circuit', label: 'Duviri Circuit', reset: 'weekly', hidden: false },
  { id: 'circuit_sp', label: 'Duviri Circuit SP', reset: 'weekly', hidden: false },
  { id: 'pulses', label: 'Search Pulses', reset: 'weekly', hidden: false },
  { id: 'calendar', label: '1999 Calendar', reset: 'weekly', hidden: false },
  { id: 'invigorations', label: 'Helminth Invigoration', reset: 'weekly', hidden: false },
  { id: 'descendia', label: 'Descendia', reset: 'weekly', hidden: false },
  { id: 'descendia_sp', label: 'Descendia SP', reset: 'weekly', hidden: false },
  { id: 'paladino', label: 'Paladino (Riven)', reset: 'weekly', hidden: false },
  { id: 'yonta', label: 'Archimedian Yonta', reset: 'weekly', hidden: false },
  { id: 'acridies', label: 'Acrithis Weekly', reset: 'weekly', hidden: false },
  { id: 'teshin', label: 'Teshin Shop', reset: 'weekly', hidden: false },
  { id: 'bird3', label: 'Bird 3 (Shard)', reset: 'weekly', hidden: false },

  // Other (Barzo Ki'Teer weekend + 8h timers)
  { id: 'baro', label: 'Baro Ki\'Teer', reset: 'other', hidden: false },
  { id: 'grandmother', label: 'Grandmother Tokens', reset: 'other', hidden: false },
  { id: 'voidplumes', label: 'Yonta Voidplumes', reset: 'other', hidden: false },
  { id: 'voca', label: 'Loid Voca', reset: 'other', hidden: false },
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

const NO_STANDING_SYNDICATES = []
const NO_RANK_SYNDICATES = ['simaris']

const SYNDICATE_CONFIG = {
  steel: { bg: '#2C3F46', accent: '#f9bc93', iconKey: 'MERIDIAN' },
  perrin: { bg: '#3D4963', accent: '#92dbff', iconKey: 'PERRIN' },
  arbiters: { bg: '#374045', accent: '#cfe1e4', iconKey: 'HEXIS' },
  suda: { bg: '#3D375D', accent: '#fbfed0', iconKey: 'SUDA' },
  veil: { bg: '#3D1839', accent: '#fe8a88', iconKey: 'REDVEIL' },
  newloka: { bg: '#2A3C2E', accent: '#c2ffbf', iconKey: 'LOKA' },
  conclave: { bg: '#1a1a1a', accent: '#ffffff', iconKey: 'CONCLAVE' },
  simaris: { bg: '#5F3C0D', accent: '#ebd18f', iconKey: 'SIMARIS' },
  ostron: { bg: '#B74624', accent: '#e8ddaf', localIcon: 'FactionOstron.png' },
  quills: { bg: '#b43419', accent: '#F7FACB', localIcon: 'FactionQuills.png' },
  solaris: { bg: '#5F3C0D', accent: '#e8ddaf', localIcon: 'FactionSolarisUnited.png' },
  vox: { bg: '#4A2B18', accent: '#F2E5A7', localIcon: 'FactionVoxSolaris.png' },
  ventkids: { bg: '#B97EF9', accent: '#FFF58F', iconKey: 'VENTKIDS' },
  entrati: { bg: '#4E5360', accent: '#FFC12F', localIcon: 'FactionEntrati.png' },
  necraloid: { bg: '#333334', accent: '#BA9E5E', localIcon: 'FactionNecraloid.png' },
  cavia: { bg: '#282624', accent: '#A5A394', localIcon: 'FactionCavia.png' },
  holdfasts: { bg: '#21242e', accent: '#a9b5cc', localIcon: 'FactionHoldfasts.png' },
  hex: { bg: '#556033', accent: '#171b0e', localIcon: 'FactionHex.png' },
  focus: { accent: 'var(--color-accent)', iconKey: 'FOCUS' },
  zenurik: { accent: 'var(--color-accent)', iconKey: 'ZENURIK_CLEAN' },
  naramon: { accent: 'var(--color-accent)', iconKey: 'NARAMON_CLEAN' },
  vazarin: { accent: 'var(--color-accent)', iconKey: 'VAZARIN_CLEAN' },
  madurai: { accent: 'var(--color-accent)', iconKey: 'MADURAI_CLEAN' },
  unairu: { accent: 'var(--color-accent)', iconKey: 'UNAIRU_CLEAN' },
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

const TaskCard = ({ task, completed, onToggle }) => {
  return (
    <div
      className={`p-3 rounded-lg border transition-all cursor-pointer ${completed
        ? 'bg-kronos-accent/10 border-kronos-accent/30'
        : 'bg-kronos-panel/40 border-white/5 hover:border-white/20'
        }`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {completed ? (
            <Check className="text-kronos-accent" size={18} />
          ) : (
            <Circle className="text-kronos-dim" size={18} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-[14px] ${completed ? 'line-through text-kronos-dim' : ''}`}>
            {task.label}
          </span>
        </div>
      </div>
    </div>
  )
}

const StandingCard = ({ standing, affiliation, earnedStanding, rankCap, dailyCap, hasStanding, iconUrl, localIconUrl }) => {
  const rank = affiliation?.Title ?? 0
  const tagKey = standing.tag || standing.color
  const config = SYNDICATE_CONFIG[tagKey] || { bg: '#1a1a2e', accent: '#a0a0a0' }
  const isNegative = rank < 0
  const progress = isNegative
    ? Math.min(100, Math.max(0, (Math.abs(rankCap) - Math.abs(earnedStanding)) / Math.abs(rankCap) * 100))
    : Math.min(100, (earnedStanding / rankCap) * 100)

  if (!hasStanding) {
    return (
      <div className="rounded-lg p-2 border" style={{ backgroundColor: config.bg, borderColor: 'rgba(var(--color-accent-rgb), 0.2)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {iconUrl && <img src={iconUrl} alt="" className="w-8 h-8 object-contain" />}
            {localIconUrl && <img src={localIconUrl} alt="" className="w-8 h-8 object-contain" />}
            <span className="text-[12px]" style={{ color: config.accent }}>{standing.label}</span>
          </div>
          {rank !== 0 && (
            <span className="text-[12px] opacity-60">Rank {rank}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg p-2 border" style={{ backgroundColor: config.bg, borderColor: 'rgba(var(--color-accent-rgb), 0.2)' }}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {iconUrl && <img src={iconUrl} alt="" className="w-8 h-8 object-contain" />}
          {localIconUrl && <img src={localIconUrl} alt="" className="w-8 h-8 object-contain" />}
          <span className="text-[12px] text-kronos-text" style={{ color: config.accent }}>{standing.label}</span>
        </div>
        {rank !== 0 && (
          <span className="text-[12px] opacity-60">Rank {rank}</span>
        )}
      </div>
      <div className="h-1 bg-black/40 rounded-full overflow-hidden mb-1">
        <div
          className="h-full transition-all"
          style={{ width: `${progress}%`, backgroundColor: config.accent }}
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[14px] font-mono" style={{ color: config.accent }}>
          {earnedStanding.toLocaleString()}
        </span>
        <span className="text-[10px] opacity-60">/ {rankCap.toLocaleString()}</span>
      </div>
    </div>
  )
}

export default function Checklist() {
  const { inventoryData, ExportTextIcons } = useMonitoring()
  const [completed, setCompleted] = useState({})
  const [showHiddenDaily, setShowHiddenDaily] = useState(false)
  const [showHiddenWeekly, setShowHiddenWeekly] = useState(false)
  const [showHiddenOther, setShowHiddenOther] = useState(false)
  const [hiddenMap, setHiddenMap] = useState({})
  const [cdnBase, setCdnBase] = useState('')
  const [assetsPath, setAssetsPath] = useState('')

  useEffect(() => {
    invoke('get_cdn_base_url').then(setCdnBase).catch(() => { })
    invoke('get_assets_path').then(path => {
      if (path) {
        setAssetsPath(convertFileSrc(path))
      }
    }).catch(() => { })
  }, [])

  const masteryRank = inventoryData?.account?.mastery_rank || 16
  const affiliations = inventoryData?.Affiliations || []
  const focusXP = inventoryData?.FocusXP || {}
  const dailyFocus = inventoryData?.DailyFocus || 0

  const getIconUrl = (iconKey) => {
    if (!iconKey || !ExportTextIcons || !cdnBase) return null
    const iconData = ExportTextIcons[iconKey]
    if (!iconData) return null
    const path = iconData.DIT_AUTO || Object.values(iconData)[0]
    if (!path) return null
    return cdnBase + path
  }

  const getLocalIconUrl = (iconKey, localIcon) => {
    if (!localIcon || !assetsPath) return null
    return assetsPath + '/' + localIcon
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
      return { earned: 0, cap: 0, daily: getFocusDailyCap(), hasStanding: true, isFocusTotal: true }
    }
    if (standing.focusKey) {
      const earned = focusXP?.[standing.focusKey] || 0
      return { earned, cap: 0, daily: 0, hasStanding: true, isFocusSchool: true }
    }
    if (NO_STANDING_SYNDICATES.includes(standing.tag)) {
      return { earned: 0, cap: 0, daily: 0, hasStanding: false }
    }
    const aff = getAffiliation(standing.tag)
    if (aff) {
      const total = aff.Standing ?? 0
      if (NO_RANK_SYNDICATES.includes(standing.tag)) {
        return { earned: total, cap: 125000, daily: getDailyCap(), hasStanding: true }
      }
      const rank = aff.Title ?? 0
      const earned = getEarnedStanding(total, rank)
      const cap = getRankCap(rank)
      return { earned, cap, daily: getDailyCap(), hasStanding: true }
    }
    return { earned: 0, cap: 24000, daily: getDailyCap(), hasStanding: true }
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

  const dailyTasks = tasks.filter(t => t.reset === 'daily')
  const weeklyTasks = tasks.filter(t => t.reset === 'weekly')
  const otherTasks = tasks.filter(t => t.reset === 'other')

  const getVisible = (taskList, showHidden) => taskList.filter(t => showHidden || !hiddenMap[t.id])

  const dailyCompleted = getVisible(dailyTasks, showHiddenDaily).filter(t => completed[t.id]).length
  const weeklyCompleted = getVisible(weeklyTasks, showHiddenWeekly).filter(t => completed[t.id]).length
  const otherCompleted = getVisible(otherTasks, showHiddenOther).filter(t => completed[t.id]).length

  const Section = ({ title, colorDot, taskList, showHidden, setShowHidden, completedCount }) => (
    <div>
      <div className="bg-kronos-panel/40 rounded-lg p-3 border border-white/5 flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${colorDot}`} />
          <span className="text-[14px] font-semibold text-kronos-text">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[18px] font-bold text-kronos-accent">
            {completedCount}/{getVisible(taskList, showHidden).length}
          </span>
          <button
            onClick={() => setShowHidden(!showHidden)}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
          >
            {showHidden ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {taskList.map(task => {
          if (!showHidden && hiddenMap[task.id]) return null
          return (
            <div key={task.id} className="relative group">
              <TaskCard
                task={task}
                completed={completed[task.id] || false}
                onToggle={() => toggleTask(task.id)}
              />
              <button
                onClick={() => toggleHidden(task.id)}
                className="absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-black/50 transition-all"
              >
                {hiddenMap[task.id] ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <PageLayout title="Checklist" subtitle="Track daily and weekly activities">
      {/* Standings Section - Full Width */}
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
            return (
              <div key={standing.id} className="rounded-lg p-2 border" style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.1)', borderColor: 'rgba(var(--color-accent-rgb), 0.2)' }}>
                <div className="flex items-center gap-2 mb-1">
                  {iconUrl && <img src={iconUrl} alt="" className="w-7 h-7 object-contain" />}
                  <span className="text-[14px]" style={{ color: config.accent }}>{standing.label}</span>
                </div>
                <div className="text-[14px] font-mono" style={{ color: config.accent }}>
                  {standing.id === 'focus_total' ? `${dailyFocus.toLocaleString()} left` : earned.toLocaleString()}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Standings Section */}
      <div className="mb-6">
        <div className="rounded-lg p-3 border flex items-center justify-between mb-3" style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.1)', borderColor: 'rgba(var(--color-accent-rgb), 0.3)' }}>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-kronos-accent" />
            <span className="text-[14px] font-semibold text-kronos-text">Standings</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {standings.filter(s => !s.id.startsWith('focus') && !s.focusKey).map(standing => {
            const { earned, cap, daily, hasStanding } = getStandingData(standing)
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
                hasStanding={hasStanding}
                iconUrl={iconUrl}
                localIconUrl={localIconUrl}
              />
            )
          })}
        </div>
      </div>

      {/* Daily / Weekly Row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Section
          title="Daily"
          colorDot="bg-blue-400"
          taskList={dailyTasks}
          showHidden={showHiddenDaily}
          setShowHidden={setShowHiddenDaily}
          completedCount={dailyCompleted}
        />
        <Section
          title="Weekly"
          colorDot="bg-purple-400"
          taskList={weeklyTasks}
          showHidden={showHiddenWeekly}
          setShowHidden={setShowHiddenWeekly}
          completedCount={weeklyCompleted}
        />
      </div>

      {/* Other Section - Baro + 8h timers */}
      <Section
        title="Other"
        colorDot="bg-amber-400"
        taskList={otherTasks}
        showHidden={showHiddenOther}
        setShowHidden={setShowHiddenOther}
        completedCount={otherCompleted}
      />
    </PageLayout>
  )
}
