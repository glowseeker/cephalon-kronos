/**
 * Dashboard.jsx
 *
 * The primary landing screen. Displays live worldstate data including fissures,
 * open-world cycles, sorties, events, and the 1999 calendar.
 *
 * DATA SOURCES
 * ─────────────────────────────────────────
 * 1. MonitoringContext (useMonitoring):
 *    - dict/suppDict: Localisation
 *    - ERg/EC: Static game data (Regions, Challenges)
 *    - spIncursions/arbys: Fetched by backend from browse.wf
 * 2. Oracle API (fetch):
 *    - worldState.json: Raw live game state
 *    - location-bounties: Open-world bounty rotations
 *    - bounty-cycle: Zariman/1999 faction state
 *
 * PROCESSING
 * ─────────────────────────────────────────
 * Raw worldstate JSON is passed to parseWorldstate() from worldstateParser.js.
 * Cycle timers are computed locally in worldstateParser.js.
 * Arbitration and Incursion logic (epoch-based rotation) is handled by local
 * helpers in this file.
 */
import { useState, useEffect, useMemo } from 'react'
import { PageLayout, Card, Button, CardHeader, Tabs, Modal } from '../components/UI'
import {
  Clock, Zap, AlertCircle, Target, Package,
  Coins, Newspaper, DollarSign, Sparkles, RefreshCw,
  Swords, Activity, Bell, ShoppingBag, Shield,
  Calendar, Moon, LayoutDashboard, ChevronDown, ChevronUp, X,
  Settings, CheckCircle2, MoreHorizontal, Trophy, Star
} from 'lucide-react'
import { useMonitoring } from '../contexts/MonitoringContext'
import {
  resolveNode,
  resolveMissionType,
  resolveRewardText,
  resolveAnyImage,
  resolveChallenge,
  resolveChallengeDesc,
  resolveChallengeFlavour,
  timeRemaining,
  timeSince
} from '../lib/warframeUtils'
import { parseWorldstate } from '../lib/worldstateParser'

const ORACLE_API = 'https://oracle.browse.wf/worldState.json'
const LOCATION_BOUNTIES_API = 'https://oracle.browse.wf/location-bounties'
const BOUNTY_CYCLE_API = 'https://oracle.browse.wf/bounty-cycle'

// ── arbys.txt helpers ──────────────────────────────────────────────────────────
function parseArbyLine(line, ERg, dict) {
  const parts = line.split(',')
  if (parts.length < 2) return null
  const tsSec = parseInt(parts[0], 10)
  const nodeKey = parts[1].trim()
  const entry = ERg[nodeKey]

  return {
    ts: tsSec * 1000,
    node: nodeKey,
    type: entry?.missionName || entry?.missionType || 'Unknown Mission'
  }
}

function getCurrentArby(arbys, ERg, dict) {
  if (!arbys) return null
  const now = Date.now()
  const lines = arbys.split('\n').map(l => l.trim()).filter(Boolean)
  let best = null
  for (const line of lines) {
    const entry = parseArbyLine(line, ERg, dict)
    if (!entry || isNaN(entry.ts)) continue
    const GRACE_PERIOD = 300000 // 5 minutes
    if (entry.ts <= (now + GRACE_PERIOD)) best = entry
    else break
  }
  return best
}

function getUpcomingArbies(arbys, ERg, dict, arbyTiers, count = 5) {
  if (!arbys) return []
  const now = Date.now()
  const lines = arbys.split('\n').map(l => l.trim()).filter(Boolean)
  const results = []
  for (const line of lines) {
    const entry = parseArbyLine(line, ERg, dict)
    if (entry && !isNaN(entry.ts) && entry.ts > now) {
      entry.grade = arbyTiers?.[entry.node] || 'F'
      results.push(entry)
      if (results.length >= count) break
    }
  }
  return results
}

// ── sp-incursions.txt helpers ──────────────────────────────────────────────────
function getSpIncursionNodes(spIncursions) {
  if (!spIncursions) return []

  const lines = spIncursions.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return []

  // browse.wf logic:
  // today = Math.trunc(Date.now() / 86400000) * 86400
  // index = (today - epochDay) / 86400
  const todaySec = Math.floor(Date.now() / 86400000) * 86400
  const firstLineParts = lines[0].split(';')
  const epochDay = parseInt(firstLineParts[0], 10)

  const index = Math.floor((todaySec - epochDay) / 86400)

  if (index >= 0 && index < lines.length) {
    const match = lines[index]
    const nodesPart = match.includes(';') ? match.split(';')[1] : match.split(',').slice(1).join(',')
    return nodesPart.split(',').map(n => n.trim()).filter(Boolean)
  }

  return []
}


function GradeBadge({ grade, className = "" }) {
  const colors = {
    S: 'bg-yellow-400 text-black',
    A: 'bg-green-500 text-white',
    B: 'bg-blue-500 text-white',
    C: 'bg-zinc-500 text-white',
    D: 'bg-red-500 text-white',
    F: 'bg-red-900 text-white',
  }
  return (
    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${colors[grade] || colors.F} ${className}`}>
      {grade}
    </span>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const {
    exportData, spIncursions, arbys, descendiaDescs,
    dict, suppDict, EC, ERg, EI, nameToImage, uniqueNameToName, arbyTiers,
    rawInventory, ES, ENWRawRewards, ExportImages,
  } = useMonitoring()
  const [worldstate, setWorldstate] = useState(null)
  const [locationBounties, setLocationBounties] = useState(null)
  const [bountyCycle, setBountyCycle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastFetch, setLastFetch] = useState(null)
  const [fissureTab, setFissureTab] = useState('normal')
  const [archimedeaTab, setArchimedeaTab] = useState('deep')
  const [bountyTab, setBountyTab] = useState('holdfasts')
  const [showBaroModal, setShowBaroModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [calendarDate, setCalendarDate] = useState(new Date(1999, 11, 1)) // Default to Dec 1999
  const [selected1999Month, setSelected1999Month] = useState(0)
  const [selected1999Day, setSelected1999Day] = useState(-1)
  const [initialized1999, setInitialized1999] = useState(false)
  const [hiddenCards, setHiddenCards] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard_hidden_cards')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [descendiaTab, setDescendiaTab] = useState('normal')

  useEffect(() => {
    localStorage.setItem('dashboard_hidden_cards', JSON.stringify(hiddenCards))
  }, [hiddenCards])

  useEffect(() => {
    if (!initialized1999 && worldstate?.calendar1999?.length > 0) {
      const cal = worldstate.calendar1999[0]
      const year = new Date().getFullYear()
      const jan1 = new Date(year, 0, 1)
      const days = (cal.days || []).map(d => {
        const dDate = new Date(jan1)
        dDate.setDate(d.day)
        return { ...d, date: dDate }
      }).sort((a, b) => a.day - b.day)
      const firstEventDay = days.findIndex(d => d.events?.length > 0)
      if (firstEventDay !== -1) {
        setSelected1999Day(firstEventDay)
      }
      setInitialized1999(true)
    }
  }, [worldstate, initialized1999])

  const toggleCard = (id) => {
    setHiddenCards(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const isVisible = (id) => !hiddenCards.includes(id)




  const fetchWorldstate = async () => {
    setLoading(true)
    try {
      const [wsOracle, loc, cycle] = await Promise.all([
        fetch(ORACLE_API).then(r => r.ok ? r.json() : null),
        fetch(LOCATION_BOUNTIES_API).then(r => r.ok ? r.json() : null),
        fetch(BOUNTY_CYCLE_API).then(r => r.ok ? r.json() : null),
      ])

      if (wsOracle) {
        const parsed = parseWorldstate(wsOracle, { dict, suppDict, ERg, EC, EI, nameToImage, uniqueNameToName, bountyCycle: cycle, ES, ENWRawRewards, ExportImages })
        setWorldstate(parsed)
      }
      if (loc) setLocationBounties(loc)
      if (cycle) setBountyCycle(cycle)

      setLastFetch(Date.now())
    } catch (err) {
      console.error('Fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (Object.keys(dict).length > 0) {
      fetchWorldstate()
      const iv1 = setInterval(fetchWorldstate, 60_000)
      return () => clearInterval(iv1)
    }
  }, [dict])

  // ── Derived data ─────────────────────────────────────────────────────────────
  const currentArbyRaw = useMemo(() => getCurrentArby(arbys, ERg, dict), [arbys, ERg, dict])
  const currentArby = useMemo(() => currentArbyRaw ? { ...currentArbyRaw, grade: arbyTiers?.[currentArbyRaw.node] || 'F' } : null, [currentArbyRaw, arbyTiers])
  const upcomingArbies = useMemo(() => getUpcomingArbies(arbys, ERg, dict, arbyTiers, 5), [arbys, ERg, dict, arbyTiers])

  const timers = [
    { label: 'Cetus', data: worldstate?.cetusCycle, getState: d => d.state },
    { label: 'Orb Vallis', data: worldstate?.vallisCycle, getState: d => d.state },
    {
      label: 'Cambion Drift', data: worldstate?.cambionCycle, getState: d =>
        typeof d.active === 'boolean' ? (d.active ? 'Fass' : 'Vome') : (d.active || d.state || '?')
    },
    { label: 'Zariman', data: worldstate?.zarimanCycle, getState: d => d.state },
    { label: 'Duviri', data: worldstate?.duviriCycle, getState: d => d.state },
    { label: 'Daily Reset', data: { expiry: new Date(new Date().setUTCHours(24, 0, 0, 0)) }, getState: () => 'Reset' },
  ].filter(t => t.data)

  const spIncursionNodes = useMemo(() => {
    return getSpIncursionNodes(spIncursions)
  }, [spIncursions])

  const fissureTabs = [
    { id: 'normal', label: 'Normal' },
    { id: 'steel', label: 'Steel Path' },
    { id: 'storm', label: 'Void Storm' },
  ]

  const visibleFissures = useMemo(() => {
    if (!worldstate?.fissures && !worldstate?.voidStorms) return []
    const now = new Date()
    const all = [...(worldstate?.fissures || []), ...(worldstate?.voidStorms || [])]
    return all
      .filter(f => {
        const exp = f.expiry?.$date?.$numberLong
          ? new Date(parseInt(f.expiry.$date.$numberLong, 10))
          : new Date(f.expiry)
        if (exp <= now) return false
        if (fissureTab === 'normal') return !f.isStorm && !f.isHard
        if (fissureTab === 'steel') return f.isHard && !f.isStorm
        if (fissureTab === 'storm') return f.isStorm
        return false
      })
      .sort((a, b) => a.tierNum - b.tierNum)
  }, [worldstate, fissureTab])

  const archimedeaTabs = [
    { id: 'deep', label: 'Deep' },
    { id: 'temporal', label: 'Temporal' },
  ]

  const bountyTabs = [
    { id: 'holdfasts', label: 'Holdfasts' },
    { id: 'cavia', label: 'Cavia' },
    { id: 'hex', label: 'Hex' },
    { id: 'cetus', label: 'Cetus' },
    { id: 'deimos', label: 'Deimos' },
    { id: 'vallis', label: 'Vallis' },
  ]

  const renderBounties = () => {
    if (!locationBounties || !bountyCycle) {
      return <div className="min-h-[80px] flex items-center justify-center"><p className="text-xs text-kronos-dim italic">Loading bounties data…</p></div>
    }

    let items = []

    if (bountyTab === 'holdfasts' || bountyTab === 'cavia') {
      const key = bountyTab === 'holdfasts' ? 'ZarimanSyndicate' : 'EntratiLabSyndicate'
      const data = bountyCycle.bounties?.[key] || []
      items = data.map(b => {
        const nodeName = b.node ? resolveNode(b.node, dict, ERg) : ''
        const entry = b.node ? ERg[b.node] : null
        const mType = entry ? resolveMissionType(entry.missionName || entry.missionType, dict, ERg) : ''
        return {
          name: b.challenge ? resolveChallenge(b.challenge, dict, EC) : 'Unknown Bounty',
          desc: b.challenge ? resolveChallengeFlavour(b.challenge, dict, EC, ERg) : '',
          obj: b.challenge ? resolveChallengeDesc(b.challenge, dict, EC, ERg) : '',
          node: mType ? `${nodeName} (${mType})` : nodeName,
          tier: b.rot ? `Rotation ${b.rot}` : ''
        }
      })
    } else if (bountyTab === 'hex') {
      const data = bountyCycle.bounties?.HexSyndicate || []
      items = data.map(b => {
        const allyName = b.ally ? resolveNode(b.ally, dict, ERg) : ''
        let obj = b.challenge ? resolveChallengeDesc(b.challenge, dict, EC, ERg, b.ally) : ''
        let flavour = b.challenge ? resolveChallengeFlavour(b.challenge, dict, EC, ERg, b.ally) : ''
        const mTypeMatch = b.challenge?.match(/\/(Vania|Hex|1999)([A-Z][a-z]+)/)
        const mTypeRaw = mTypeMatch ? mTypeMatch[2] : ''
        const mType = resolveMissionType(mTypeRaw, dict, ERg)
        return {
          name: b.challenge ? resolveChallenge(b.challenge, dict, EC) : 'Unknown Bounty',
          desc: flavour,
          obj: obj,
          node: mType ? `${allyName} (${mType})` : allyName,
          tier: b.rot ? `Rotation ${b.rot}` : ''
        }
      })
    } else if (bountyTab === 'cetus') {
      const data = locationBounties.CetusSyndicate || {}
      Object.entries(data).forEach(([key, list]) => {
        if (Array.isArray(list)) {
          const main = list[0] ? resolveChallenge(list[0], dict, EC).replace(/^Cetus\s+/i, '') : 'Bounty'
          const stages = list.map(p => resolveChallenge(p, dict, EC).replace(/^Cetus\s+/i, '')).join('\n')
          items.push({ name: main, desc: '', obj: stages, node: '', tier: key.replace('Tent', 'Pool ') })
        }
      })
    } else if (bountyTab === 'deimos') {
      const data = locationBounties.EntratiSyndicate || {}
      Object.entries(data).forEach(([key, list]) => {
        if (Array.isArray(list)) {
          const main = list[0] ? resolveChallenge(list[0], dict, EC).replace(/^Deimos\s+/i, '') : 'Bounty'
          const stages = list.map(p => resolveChallenge(p, dict, EC).replace(/^Deimos\s+/i, '')).join('\n')
          items.push({ name: main, desc: '', obj: stages, node: '', tier: key.replace('Chamber', 'Vault ').replace('Tent', 'Pool ') })
        }
      })
    } else if (bountyTab === 'vallis') {
      const data = locationBounties.SolarisSyndicate || {}
      Object.entries(data).forEach(([key, list]) => {
        if (Array.isArray(list)) {
          const main = list[0] ? resolveChallenge(list[0], dict, EC).replace(/^Venus\s+/i, '').replace(/^Solaris\s+/i, '') : 'Bounty'
          const stages = list.map(p => resolveChallenge(p, dict, EC).replace(/^Venus\s+/i, '').replace(/^Solaris\s+/i, '')).join('\n')
          items.push({ name: main, desc: '', obj: stages, node: '', tier: key.replace('Bounty', '').replace(/([A-Z])/g, ' $1').trim() })
        }
      })
    }

    if (items.length === 0) return <div className="min-h-[80px] flex items-center justify-center"><p className="text-xs text-kronos-dim italic">No bounties available…</p></div>

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
        {items.map((it, idx) => (
          <div key={idx} className="bg-kronos-panel/40 p-3 rounded flex flex-col gap-1 border border-transparent hover:border-kronos-accent/30 transition-all">
            <div className="flex justify-between items-start gap-2">
              <p className="text-xs font-bold text-kronos-accent uppercase leading-tight flex-1">{it.name}</p>
              <span className="text-[9px] text-kronos-dim uppercase bg-kronos-panel/60 px-1 rounded">{it.tier}</span>
            </div>
            {it.desc && <p className="text-[10px] text-kronos-text font-medium leading-tight">{it.desc}</p>}
            {it.obj && <p className="text-[10px] text-kronos-text/60 italic leading-tight whitespace-pre-line">{it.obj}</p>}
            {it.node && <p className="text-[10px] text-kronos-dim mt-auto pt-1 font-medium">{it.node}</p>}
          </div>
        ))}
      </div>
    )
  }

  const renderArchimedea = () => {
    if (!worldstate?.archimedeas) return <p className="text-xs text-kronos-dim italic text-center py-4">No Archimedea data…</p>
    const typeKey = archimedeaTab === 'deep' ? 'CT_LAB' : 'CT_HEX'
    const data = worldstate.archimedeas.find(a => a.type === typeKey) || worldstate.archimedeas[0]
    if (!data) return <p className="text-xs text-kronos-dim italic text-center py-4">No data for this type…</p>

    return (
      <div className="space-y-4 mt-2">
        <div className="space-y-1.5">
          {data.missions.map((m, idx) => (
            <div key={idx} className="bg-kronos-panel/40 p-3 rounded-lg text-center w-full">
              {/* Mission type + deviation single line */}
              <p className="text-[12px] font-black uppercase mb-2 leading-tight tracking-wide">
                <span className="text-kronos-accent">
                  {m.missionType}
                </span>
                {m.deviation && (
                  <>
                    <span className="text-kronos-dim/50 font-normal mx-2">-</span>
                    <span className="relative group/devtip font-bold normal-case text-kronos-text cursor-help">
                      {m.deviation.name}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-kronos-panel rounded-lg text-[12px] opacity-0 group-hover/devtip:opacity-100 transition-opacity z-50 shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-white/5 pointer-events-none block font-normal text-left">
                        <span className="font-bold text-kronos-accent uppercase block mb-1.5 border-b border-white/5 pb-1">{m.deviation.name}</span>
                        <span className="text-kronos-text leading-relaxed block">{m.deviation.description}</span>
                      </span>
                    </span>
                  </>
                )}
              </p>
              {/* Risks - 2-column grid for better space usage */}
              <div className="grid grid-cols-2 gap-1.5">
                {m.risks?.map((r, ri) => (
                  <div
                    key={ri}
                    className={`relative group/risktip text-[12px] text-kronos-dim bg-black/30 px-3 py-1.5 rounded-md cursor-help border border-white/5 hover:border-kronos-accent/30 transition-colors ${m.risks.length === 3 && ri === 2 ? 'col-span-2' : ''}`}
                  >
                    <span className="font-bold text-kronos-text/90 uppercase tracking-tight">{r.name}</span>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-kronos-panel rounded-lg text-[12px] opacity-0 group-hover/risktip:opacity-100 transition-opacity z-50 shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-white/5 pointer-events-none block text-left">
                      <span className="font-bold text-kronos-accent uppercase block mb-1.5 border-b border-white/5 pb-1">{r.name}</span>
                      <span className="text-kronos-text leading-relaxed block">{r.description}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Personal Modifiers - 2-column grid */}
        {data.personalModifiers?.length > 0 && (
          <div className="pt-2 border-t border-white/5">
            <p className="text-[10px] text-kronos-dim uppercase font-bold mb-3 tracking-widest text-center">Personal Modifiers</p>
            <div className="grid grid-cols-2 gap-1.5">
              {data.personalModifiers.map((pm, pi) => (
                <div key={pi} className="relative group/pmtip text-[11px] text-kronos-text text-center p-2.5 cursor-help block bg-black/20 rounded-lg border border-white/5 hover:border-kronos-accent/30 transition-colors">
                  <span className="font-bold uppercase tracking-wide">{pm.name}</span>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-kronos-panel rounded-lg text-[12px] opacity-0 group-hover/pmtip:opacity-100 transition-opacity z-50 shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-white/5 pointer-events-none block text-left font-normal">
                    <span className="font-bold text-kronos-accent uppercase block mb-1.5 border-b border-white/5 pb-1">{pm.name}</span>
                    <span className="text-kronos-text leading-relaxed block">{pm.description}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderNightwave = () => {
    const nw = worldstate?.nightwave
    if (!nw) return <p className="text-xs text-kronos-dim italic text-center py-4">Nightwave inactive…</p>

    const affiliationTag = nw.affiliationTag || ''
    const hasInventory = rawInventory !== null && Object.keys(rawInventory || {}).length > 0
    const affiliations = hasInventory ? (rawInventory?.Affiliations || []) : []
    const nwAffiliation = affiliations.find(a => a.Tag === affiliationTag)
    const nwStandingTotal = nwAffiliation?.Standing ?? 0
    const currentRank = nwAffiliation?.Title ?? nw.phase ?? 0
    const miscItems = hasInventory ? (rawInventory?.MiscItems || []) : []
    const credCount = hasInventory ? (miscItems.find(i => i.ItemType === nw.credType)?.ItemCount ?? 0) : 0
    const STANDING_PER_LEVEL = 10000
    const standingInLevel = hasInventory ? Math.max(0, nwStandingTotal - (currentRank * STANDING_PER_LEVEL)) : 0
    const categories = ['Daily', 'Weekly', 'Elite Weekly']
    const grouped = (nw.challenges || []).reduce((acc, c) => {
      let cat = 'Daily'
      if (c.isElite || c.xp >= 7000) cat = 'Elite Weekly'
      else if (c.xp >= 4500) cat = 'Weekly'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(c)
      return acc
    }, {})

    const rewardTiers = nw.rewards || []
    const progressPercent = Math.min(100, (standingInLevel / STANDING_PER_LEVEL) * 100)
    const effectiveRank = hasInventory ? currentRank : -1

    return (
      <div className="space-y-3">
        {/* Top section: Status + Rewards in 2 columns */}
        <div className="flex gap-3">
          {/* Left: Status info */}
          <div className="w-1/4 bg-kronos-panel/40 p-3 rounded-lg border border-white/5 flex flex-col">
            <p className="text-sm font-bold text-kronos-accent uppercase tracking-tight text-center mb-3">{nw.name}</p>
            <div className="flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-kronos-dim uppercase">Rank</span>
                <span className="text-[14px] font-black text-kronos-accent">{currentRank}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-kronos-dim uppercase">Ends</span>
                <span className="text-[14px] text-kronos-text">{timeRemaining(nw.expiry)}</span>
              </div>
              {hasInventory && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-kronos-dim uppercase">Creds</span>
                    <span className="text-[14px] font-bold text-kronos-text">{credCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-kronos-dim uppercase">Standing</span>
                    <span className="text-[14px] font-black text-kronos-accent">{standingInLevel.toLocaleString()} / {STANDING_PER_LEVEL.toLocaleString()}</span>
                  </div>
                  <div className="relative h-5 bg-black/40 rounded overflow-hidden">
                    <div
                      className="absolute top-0 left-0 bottom-0 bg-kronos-accent"
                      style={{ width: `${progressPercent}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-2">
                      <span className="text-[10px] font-black text-black">{currentRank}</span>
                      <span className="text-[10px] font-black text-white">{currentRank + 1}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Rewards scrollable */}
          {rewardTiers.length > 0 && (
            <div className="flex-1 bg-kronos-panel/20 p-3 rounded-lg border border-white/5 overflow-hidden">
              <div
                className="h-[220px] overflow-x-auto custom-scrollbar"
                onWheel={e => {
                  e.stopPropagation()
                  e.currentTarget.scrollLeft += e.deltaY
                }}
              >
                <div className="flex gap-6 items-stretch pb-2 h-full">
                  {rewardTiers.map((r, ri) => {
                    const isUnlocked = ri < effectiveRank
                    const isCurrent = ri === effectiveRank
                    return (
                      <div
                        key={ri}
                        className={`relative flex-shrink-0 transition-all flex flex-col items-center ${isCurrent ? 'ring-2 ring-kronos-accent rounded p-1 m-1' : ''}`}
                      >
                        <span className={`text-[9px] font-black uppercase mb-1 ${isCurrent ? 'text-kronos-accent' : 'text-kronos-dim/60'}`}>Rank {ri + 1}</span>
                        <div className="w-36 h-full flex items-center justify-center">
                          <img
                            src={r.image}
                            alt={r.name}
                            className={`max-w-full max-h-full object-contain ${isUnlocked ? 'grayscale opacity-60' : ''}`}
                            onError={e => { e.target.style.display = 'none'; e.target.onerror = null }}
                          />
                        </div>
                        <p className="text-[9px] font-bold text-kronos-text uppercase leading-tight text-center mt-2 max-w-[120px] whitespace-normal break-words">{r.name}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Challenges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {categories.flatMap(cat =>
            (grouped[cat] || []).map((c, idx) => (
              <div key={`${cat}-${idx}`} className="bg-kronos-panel/40 p-2 rounded border border-white/5 hover:border-kronos-accent/20 transition-all">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${cat === 'Elite Weekly' ? 'bg-yellow-500/20 text-yellow-400' : cat === 'Weekly' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                    {cat}
                  </span>
                  <span className="text-[10px] text-kronos-accent font-black">{c.xp.toLocaleString()} XP</span>
                </div>
                <p className="text-sm font-bold text-kronos-text leading-tight mb-1.5">{c.name}</p>
                <p className="text-xs text-kronos-dim/80 leading-relaxed">{c.desc}</p>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  const renderCircuit = () => {
    if (!worldstate?.circuit?.length) return <p className="text-xs text-kronos-dim italic text-center py-4">No Circuit data…</p>

    const groups = worldstate.circuit.reduce((acc, c) => {
      if (!acc[c.category]) acc[c.category] = []
      acc[c.category].push(...c.choices)
      return acc
    }, {})

    const getCircuitImage = (ch) => {
      const byUnique = resolveAnyImage(ch.uniqueName, EI, nameToImage)
      if (byUnique) return byUnique
      const byName = nameToImage[ch.name.toLowerCase()]
      if (byName) return byName
      const partialMatch = Object.entries(nameToImage).find(([k]) => k.includes(ch.name.toLowerCase().replace(/\s+/g, '')))
      return partialMatch ? partialMatch[1] : null
    }

    return (
      <div className="space-y-4 mt-2">
        {Object.entries(groups).map(([cat, choices], idx) => (
          <div key={idx} className="bg-kronos-panel/40 p-2.5 rounded border border-transparent hover:border-kronos-accent/20 transition-all">
            <p className="text-[11px] font-black text-kronos-accent uppercase mb-2 tracking-widest text-center">{cat}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {choices.map((ch, ci) => {
                const img = getCircuitImage(ch)
                return (
                  <div key={ci} className="bg-black/20 p-3 rounded flex flex-col items-center gap-2 text-center min-h-[90px] w-full sm:w-[calc(50%-8px)] md:w-[calc(33.333%-11px)]">
                    <div className="w-14 h-14 flex items-center justify-center">
                      {img ? (
                        <img
                          src={img}
                          alt=""
                          className="max-w-full max-h-full object-contain"
                          onError={e => { e.target.style.display = 'none'; e.target.onerror = null }}
                        />
                      ) : (
                        <div className="w-full h-full bg-kronos-panel/40 rounded flex items-center justify-center">
                          <Package size={20} className="text-kronos-dim/30" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-kronos-text font-medium leading-tight">{ch.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const render1999 = () => {
    const seasonsArr = worldstate?.calendar1999 || []
    const now = Date.now()
    const cal = seasonsArr.find(s => {
      const start = s.activation instanceof Date ? s.activation.getTime() : new Date(s.activation).getTime()
      const end = s.expiry instanceof Date ? s.expiry.getTime() : new Date(s.expiry).getTime()
      return now >= start && now < end
    }) || seasonsArr[0]

    if (!cal) return <p className="text-xs text-kronos-dim italic text-center py-4">No 1999 data…</p>

    const seasonMap = {
      'CST_WINTER': { name: 'Winter', color: 'text-blue-300', months: ['OCTOBER', 'NOVEMBER', 'DECEMBER'] },
      'CST_SPRING': { name: 'Spring', color: 'text-green-300', months: ['JANUARY', 'FEBRUARY', 'MARCH'] },
      'CST_SUMMER': { name: 'Summer', color: 'text-yellow-300', months: ['APRIL', 'MAY', 'JUNE'] },
      'CST_FALL': { name: 'Autumn', color: 'text-orange-300', months: ['OCTOBER', 'NOVEMBER', 'DECEMBER'] }
    }
    const seasonInfo = seasonMap[cal.season] || { name: cal.season, color: 'text-kronos-accent', months: [] }
    const seasonMonths = seasonInfo.months

    const year = new Date().getFullYear()
    const jan1 = new Date(year, 0, 1)

    const allDays = (cal.days || []).map(d => {
      const dDate = new Date(jan1)
      dDate.setDate(d.day)
      const mName = dDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase()
      return { ...d, date: dDate, monthName: mName }
    }).sort((a, b) => a.day - b.day)

    const nextExpiry = cal.expiry instanceof Date ? cal.expiry : new Date(cal.expiry)

    const typeColors = {
      'CET_CHALLENGE': 'bg-orange-400',
      'CET_REWARD': 'bg-green-400',
      'CET_UPGRADE': 'bg-blue-400',
      'CET_BIRTHDAY': 'bg-pink-400',
    }
    const borderColors = {
      'CET_CHALLENGE': 'border-orange-400 text-orange-300',
      'CET_REWARD': 'border-green-400  text-green-300',
      'CET_UPGRADE': 'border-blue-400   text-blue-300',
      'CET_BIRTHDAY': 'border-pink-400   text-pink-300',
    }
    const fillColors = {
      'CET_CHALLENGE': 'bg-orange-400 border-orange-400 text-kronos-bg',
      'CET_REWARD': 'bg-green-400  border-green-400  text-kronos-bg',
      'CET_UPGRADE': 'bg-blue-400   border-blue-400   text-kronos-bg',
      'CET_BIRTHDAY': 'bg-pink-400   border-pink-400   text-kronos-bg',
    }
    const typeLabels = {
      'CET_CHALLENGE': 'Challenge',
      'CET_REWARD': 'Reward',
      'CET_UPGRADE': 'Upgrade',
      'CET_BIRTHDAY': 'Birthday',
    }
    const typeIcons = {
      'CET_CHALLENGE': Target,
      'CET_REWARD': Package,
      'CET_UPGRADE': Zap,
      'CET_BIRTHDAY': Star,
    }

    const goToMonth = (idx) => {
      setSelected1999Month(idx)
      const targetMonth = seasonMonths[idx]
      const targetIdx = allDays.findIndex(d => d.monthName === targetMonth)
      setSelected1999Day(targetIdx !== -1 ? targetIdx : -1)
    }

    const displayMonth = seasonMonths[selected1999Month] || ''
    const monthDays = allDays.filter(d => d.monthName === displayMonth)
    const selectedDay = selected1999Day >= 0 ? allDays[selected1999Day] : null

    const MONTH_NAMES = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
    const monthIndex = MONTH_NAMES.indexOf(displayMonth)
    const firstOfMonth = monthIndex >= 0 ? new Date(year, monthIndex, 1) : null
    const startOffset = firstOfMonth ? (firstOfMonth.getDay() + 6) % 7 : 0
    const daysInMonth = firstOfMonth ? new Date(year, monthIndex + 1, 0).getDate() : 0

    const dayByDom = {}
    for (const d of monthDays) dayByDom[d.date.getDate()] = d

    const todayDom = new Date().getMonth() === monthIndex ? new Date().getDate() : -1

    return (
      <div className="space-y-3 mt-1">
        {/* Season header */}
        <div className="flex items-center justify-between px-1">
          <p className={`text-sm font-black uppercase tracking-widest ${seasonInfo.color}`}>{seasonInfo.name} Season</p>
          <p className="text-[10px] text-kronos-dim font-mono">{timeRemaining(nextExpiry)} remaining</p>
        </div>

        {/* Month tabs */}
        <div className="flex gap-1.5">
          {seasonMonths.map((m, idx) => (
            <button
              key={m}
              onClick={() => goToMonth(idx)}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${selected1999Month === idx
                ? 'bg-kronos-accent text-kronos-bg'
                : 'text-kronos-dim hover:text-kronos-text bg-kronos-panel/40 hover:bg-kronos-panel/70'
                }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Grid + Detail side-by-side */}
        <div className="flex gap-3">
          {/* Calendar grid */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-7 mb-2 bg-zinc-800/50 rounded px-1 py-2">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div key={i} className="text-center text-[9px] font-black uppercase text-kronos-dim/50 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`blank-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dom = i + 1
                const dayData = dayByDom[dom]
                const isToday = dom === todayDom
                const isSelected = selectedDay && selectedDay.date.getDate() === dom && selectedDay.monthName === displayMonth
                const hasEvents = !!dayData?.events?.length

                const eventType = dayData?.events?.[0]?.type
                const bc = borderColors[eventType] || 'border-kronos-dim/40 text-kronos-text'
                const fc = fillColors[eventType] || 'bg-kronos-accent border-kronos-accent text-kronos-bg'
                return hasEvents ? (
                  <button
                    key={dom}
                    onClick={() => setSelected1999Day(allDays.indexOf(dayData))}
                    className="aspect-square flex items-center justify-center cursor-pointer"
                  >
                    <div className={`w-4 h-4 flex items-center justify-center rounded text-[11px] font-bold transition-all border ${isSelected ? fc : bc}`}>
                      {dom}
                    </div>
                  </button>
                ) : (
                  <div className="aspect-square flex items-center justify-center text-kronos-dim/30 text-[11px] font-bold">{dom}</div>
                )
              })}
            </div>
          </div>

          {/* Detail panel */}
          <div className="w-44 flex-shrink-0">
            {selectedDay && selectedDay.monthName === displayMonth ? (() => {
              const grouped = selectedDay.events.reduce((acc, ev) => {
                const type = ev.type
                if (!acc[type]) acc[type] = []
                acc[type].push(ev)
                return acc
              }, {})

              return (
                <div className="space-y-2">
                  <div className="bg-kronos-panel/40 rounded-lg p-2.5 border border-white/5">
                    <p className="text-xl font-black text-kronos-accent leading-none">
                      {selectedDay.date.getDate()}
                    </p>
                    <p className="text-[9px] text-kronos-dim uppercase tracking-widest mt-0.5">
                      {selectedDay.date.toLocaleDateString('en-US', { weekday: 'long' })}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(grouped).map(([type, events]) => (
                      <div key={type} className="bg-kronos-panel/40 rounded-lg p-2 border border-white/5">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${typeColors[type] || 'bg-kronos-accent'}`} />
                          <span className="text-[9px] font-black uppercase tracking-wider text-kronos-dim">{typeLabels[type] || type}</span>
                        </div>
                        <div className="space-y-1 pl-1">
                          {events.map((ev, ei) => (
                            <div key={ei} className="min-w-0">
                              <p className="text-[12px] font-bold text-kronos-text leading-tight">{ev.name}</p>
                              {ev.description && (
                                <p className="text-[12px] text-kronos-dim/70 leading-tight mt-0.5">{ev.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })() : (
              <div className="h-full flex items-center justify-center">
                <p className="text-[10px] text-kronos-dim/40 italic text-center">Select a<br />day</p>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 px-1 pt-1 border-t border-white/5">
          {Object.entries(typeLabels).map(([k, label]) => (
            <div key={k} className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${typeColors[k]}`} />
              <span className="text-[9px] text-kronos-dim uppercase tracking-wider">{label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const [showDescendiaModal, setShowDescendiaModal] = useState(false)
  const [expandedWeek, setExpandedWeek] = useState(0)

  const renderDescendia = () => {
    if (!worldstate?.descendia?.length) return <p className="text-xs text-kronos-dim italic text-center py-4">No Descendia data…</p>
    const current = worldstate.descendia[0]

    return (
      <div className="mt-2">
        <div className="mb-2">
          <Tabs tabs={[{ id: 'normal', label: 'Normal' }, { id: 'steelpath', label: 'Steel Path' }]} activeTab={descendiaTab} onChange={setDescendiaTab} fullWidth />
        </div>
        <div className="space-y-1 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
          {current.stages.map((s) => {
            const penanceDesc = descendiaDescs.penance[s.penanceRaw] || null
            const missionDesc = descendiaDescs.missionType[s.missionTypeRaw] || null
            const isSpecial = s.isMarie || s.isLyon || s.isBoss

            if (s.isMarie) {
              return (
                <div key={s.index} className="p-2 rounded bg-kronos-accent/15 border border-kronos-accent/25 flex items-center gap-2">
                  <span className="text-[9px] font-black text-kronos-dim bg-kronos-panel/60 px-1.5 py-0.5 rounded w-6 text-center flex-shrink-0">{s.index}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-kronos-accent uppercase">Marie&apos;s Sanctuary</p>
                    <p className="text-[9px] text-kronos-dim uppercase truncate">{s.penance}</p>
                  </div>
                  <span className="text-[8px] font-black text-kronos-accent bg-kronos-accent/15 px-1.5 py-0.5 rounded flex-shrink-0">CP</span>
                </div>
              )
            }
            if (s.isLyon) {
              return (
                <div key={s.index} className="p-2 rounded bg-kronos-accent/15 border border-kronos-accent/25 flex items-center gap-2">
                  <span className="text-[9px] font-black text-kronos-dim bg-kronos-panel/60 px-1.5 py-0.5 rounded w-6 text-center flex-shrink-0">{s.index}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-kronos-accent uppercase">Lyon&apos;s Sanctuary</p>
                    <p className="text-[9px] text-kronos-dim uppercase truncate">{s.penance}</p>
                  </div>
                  <span className="text-[8px] font-black text-kronos-accent bg-kronos-accent/15 px-1.5 py-0.5 rounded flex-shrink-0">CP</span>
                </div>
              )
            }
            if (s.isBoss) {
              return (
                <div key={s.index} className="p-2 rounded bg-kronos-accent/15 border border-kronos-accent/25 flex items-center gap-2">
                  <span className="text-[9px] font-black text-kronos-dim bg-kronos-panel/60 px-1.5 py-0.5 rounded w-6 text-center flex-shrink-0">{s.index}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-kronos-accent uppercase">Roathe&apos;s Oblivion</p>
                    <p className="text-[9px] text-kronos-dim uppercase truncate">{s.penance}</p>
                  </div>
                  <span className="text-[8px] font-black text-kronos-accent bg-kronos-accent/15 px-1.5 py-0.5 rounded flex-shrink-0">CP</span>
                </div>
              )
            }

            return (
              <div key={s.index} className="p-1.5 rounded bg-kronos-panel/30 flex items-center gap-1.5">
                <span className="text-[9px] font-black text-kronos-dim bg-kronos-panel/60 px-1.5 py-0.5 rounded w-6 text-center flex-shrink-0">{s.index}</span>
                <div className="relative group/desc flex-1 min-w-0 p-1 rounded bg-kronos-panel/40 cursor-help">
                  <p className="text-[10px] font-bold text-kronos-text uppercase truncate">{s.missionType}</p>
                  {missionDesc && (
                    <div className="absolute left-0 bottom-full mb-1 w-64 p-3 bg-kronos-panel rounded-lg text-[11px] opacity-0 group-hover/desc:opacity-100 transition-opacity z-50 shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-white/5 pointer-events-none">
                      <p className="text-kronos-accent font-bold mb-1">{s.missionType}</p>
                      <p className="text-kronos-text/80">{missionDesc}</p>
                    </div>
                  )}
                </div>
                <div className="relative group/desc2 flex-1 min-w-0 p-1 rounded bg-kronos-panel/20 cursor-help">
                  <p className="text-[10px] text-kronos-dim uppercase truncate">{s.penance}</p>
                  {penanceDesc && (
                    <div className="absolute right-0 bottom-full mb-1 w-64 p-3 bg-kronos-panel rounded-lg text-[11px] opacity-0 group-hover/desc2:opacity-100 transition-opacity z-50 shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-white/5 pointer-events-none">
                      <p className="text-kronos-accent font-bold mb-1">{s.penance}</p>
                      <p className="text-kronos-text/80">{penanceDesc}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-kronos-dim font-mono mt-2 text-right">{timeRemaining(current.expiry)} REMAINING</p>
      </div>
    )
  }

  const DescendiaModal = () => {
    if (!worldstate?.descendia?.length) return null
    const upcoming = worldstate.descendia.slice(1, 5)

    return (
      <Modal
        isOpen={showDescendiaModal}
        onClose={() => setShowDescendiaModal(false)}
        title="Upcoming Rotations"
        maxWidth="max-w-md"
      >
        <div className="space-y-2">
          {upcoming.map((set, setIdx) => {
            const isExpanded = expandedWeek === setIdx
            const label = setIdx === 0 ? 'Next Week' : `In ${setIdx + 1} Weeks`

            return (
              <div key={setIdx} className="bg-kronos-panel/20 rounded-lg border border-transparent hover:border-kronos-accent/10 transition-all overflow-hidden">
                <button
                  onClick={() => setExpandedWeek(isExpanded ? -1 : setIdx)}
                  className="w-full flex items-center justify-between p-3 transition-colors hover:bg-kronos-accent/5"
                >
                  <div className="text-left">
                    <p className="text-[10px] font-black text-kronos-accent uppercase tracking-widest">{label}</p>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-kronos-dim" /> : <ChevronDown size={16} className="text-kronos-dim" />}
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                    {set.stages.map((s) => (
                      <div key={s.index} className={`p-2 rounded flex justify-between items-center gap-2 ${s.isCheckpoint ? 'bg-kronos-accent/10 border border-kronos-accent/20' : 'bg-black/20'}`}>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-kronos-text uppercase truncate">{s.missionType}{s.isBoss ? ' - Roathe' : ''}</p>
                          <p className="text-[9px] text-kronos-dim truncate uppercase">{s.penance}</p>
                        </div>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${s.isCheckpoint ? 'text-kronos-accent bg-kronos-accent/20' : 'text-kronos-dim bg-kronos-panel/40'}`}>
                          {s.isCheckpoint ? `CHECKPOINT ${s.index}` : `INF. ${s.index}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="p-3 mt-4 bg-kronos-panel/10 text-center rounded border border-white/5">
          <p className="text-[9px] text-kronos-dim uppercase font-bold tracking-widest">Rotations update weekly</p>
        </div>
      </Modal>
    )
  }

  const renderAlerts = () => {
    if (!worldstate?.alerts?.length) return (
      <Card glow className="p-3">
        <CardHeader icon={Bell} title="Alerts" />
        <p className="text-xs text-kronos-dim italic text-center py-4">No active alerts…</p>
      </Card>
    )
    return (
      <Card glow className="p-3">
        <CardHeader icon={Bell} title="Alerts" />
        <div className="space-y-1.5">
          {worldstate.alerts.map((a, idx) => (
            <div key={idx} className="bg-kronos-panel/40 rounded p-2 border border-transparent hover:border-kronos-accent/20 transition-all">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-black text-kronos-accent uppercase tracking-wider">{a.missionType}</span>
                <span className="text-[10px] text-kronos-dim font-mono">{timeRemaining(a.expiry)}</span>
              </div>
              <p className="text-[11px] font-bold text-kronos-text uppercase leading-none mb-1">{a.node}</p>
              <div className="flex justify-between items-end">
                <span className="text-[9px] text-kronos-dim uppercase font-bold">{a.faction} (Lv {a.minLevel}-{a.maxLevel})</span>
                <span className="text-[10px] text-blue-400 font-bold uppercase">{a.rewardText}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  const renderBaro = () => {
    const vt = worldstate?.voidTrader
    if (!vt) return null

    return (
      <Card glow className="p-3">
        <CardHeader
          icon={ShoppingBag}
          title="Baro Ki'Teer"
          action={vt.active && vt.inventory?.length > 0 ? (
            <button
              onClick={() => setShowBaroModal(true)}
              className="text-[10px] bg-kronos-accent/20 text-kronos-accent font-bold px-2 py-0.5 rounded uppercase hover:bg-kronos-accent/30 transition-colors"
            >
              Inventory
            </button>
          ) : null}
        />
        <div className="bg-kronos-panel/40 rounded p-2">
          <p className="text-sm font-bold text-kronos-text uppercase">{vt.node}</p>
          <p className="text-xs text-kronos-dim mt-0.5 font-mono">
            {vt.active ? 'Departing in ' + timeRemaining(vt.expiry) : 'Arriving in ' + timeRemaining(vt.activation)}
          </p>
        </div>
      </Card>
    )
  }

  const BaroModal = () => {
    const vt = worldstate?.voidTrader
    const inventory = vt?.inventory

    return (
      <Modal
        isOpen={showBaroModal}
        onClose={() => setShowBaroModal(false)}
        title="Baro Ki'Teer Inventory"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {inventory?.map((item, idx) => (
            <div key={idx} className="bg-kronos-panel/40 p-2 rounded flex items-center gap-3 border border-transparent hover:border-kronos-accent/20 transition-all">
              <div className="w-12 h-12 bg-black/40 rounded flex items-center justify-center p-1 flex-shrink-0">
                <img src={resolveAnyImage(item.uniqueName, EI, nameToImage)} alt="" className="max-w-full max-h-full object-contain" onError={e => { e.target.style.display = 'none'; e.target.onerror = null }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-kronos-text uppercase truncate" title={item.item}>{item.item}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] flex items-center gap-1 font-bold text-yellow-400">
                    {item.ducats} <span className="text-kronos-dim text-[8px] uppercase">Ducats</span>
                  </span>
                  <span className="text-[10px] flex items-center gap-1 font-bold text-blue-400">
                    {item.credits.toLocaleString()} <span className="text-kronos-dim text-[8px] uppercase">Credits</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    )
  }

  const renderEvents = () => {
    if (!worldstate?.events?.length && !worldstate?.globalBoosters?.length) return null
    return (
      <Card glow className="p-3 border-kronos-accent/30">
        <CardHeader icon={Activity} title="Events" />
        <div className="space-y-2.5">
          {/* Global Boosters */}
          {worldstate?.globalBoosters?.map((b, idx) => (
            <div key={`booster-${idx}`} className="space-y-1 pb-2 border-kronos-panel/40 last:border-0">
              <div className="flex justify-between items-start">
                <p className="text-xs font-black text-kronos-accent uppercase tracking-widest">{b.name}</p>
                <span className="text-[10px] text-kronos-dim font-mono">{timeRemaining(b.expiry)} LEFT</span>
              </div>
            </div>
          ))}

          {/* Regular Events */}
          {worldstate.events.map((e, idx) => (
            <div key={idx} className="space-y-1 pb-2 border-b border-kronos-panel/40 last:border-0">
              <div className="flex justify-between items-start">
                <p className="text-xs font-black text-kronos-accent uppercase tracking-widest">{e.name}</p>
                <span className="text-[10px] text-kronos-dim font-mono">{timeRemaining(e.expiry)} LEFT</span>
              </div>

              {(e.rewards?.length > 0 || e.mainReward) && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                  {e.rewards?.map((r, ri) => (
                    <span key={ri} className="text-[9px] text-kronos-accent font-bold uppercase">{r}</span>
                  ))}
                  {e.mainReward && (
                    <span className="text-[9px] text-blue-400 font-bold uppercase">{e.mainReward}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    )
  }

  const renderSPIncursions = () => {
    const incursions = worldstate?.incursions || worldstate?.steelPath?.incursions
    // Fallback expiry: Next day 00:00 UTC
    const todaySec = Math.floor(Date.now() / 86400000) * 86400
    const nextReset = (todaySec + 86400) * 1000
    const expiry = incursions?.expiry || nextReset

    if (spIncursionNodes.length === 0) {
      return <p className="text-xs text-kronos-dim italic">No incursions found for today…</p>
    }
    return (
      <div className="space-y-1.5">
        {spIncursionNodes.map((n, idx) => {
          const entry = ERg[n]
          const nodeName = resolveNode(n, dict, ERg)
          const mType = entry ? resolveMissionType(entry.missionName || entry.missionType, dict, ERg) : 'Unknown Mission'
          const faction = entry ? resolveNode(entry.faction, dict, ERg) : 'Unknown Faction'
          const planet = entry ? resolveNode(entry.regionName || entry.systemName, dict, ERg) : ''
          const planetStr = (planet && planet !== 'Unknown Node') ? `, ${planet}` : ''

          return (
            <div key={idx} className="bg-kronos-panel/40 rounded p-2 flex justify-between items-center group border border-transparent hover:border-kronos-accent/20 transition-all">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-0.5 flex-wrap">
                  <span className="text-[11px] font-black text-kronos-accent uppercase tracking-wider leading-none">
                    {mType}
                  </span>
                  <span className="text-[11px] text-kronos-dim font-bold uppercase leading-none">
                    - {faction}
                  </span>
                </div>
                <div className="text-[10px] text-kronos-text uppercase mt-1 opacity-80 flex items-center gap-1">
                  <span className="text-kronos-accent/60">@</span>
                  <span className="truncate">{nodeName}{planetStr}</span>
                </div>
              </div>
              <div className="flex flex-col items-end flex-shrink-0 ml-2">
                <span className="text-[10px] text-kronos-accent font-black px-2 py-0.5 bg-kronos-accent/10 rounded-full">
                  5 Essence
                </span>
              </div>
            </div>
          )
        })}
        {expiry && (
          <p className="text-[10px] text-kronos-dim mt-2 text-right font-mono tracking-tighter">
            ROTATES IN {timeRemaining(expiry).toUpperCase()}
          </p>
        )}
      </div>
    )
  }

  if (loading && !worldstate) {
    return (
      <PageLayout
        title="Dashboard"
        extra={(
          <Button variant="ghost" onClick={fetchWorldstate} disabled={loading} className="h-12 w-12 !p-0 !px-0 !py-0">
            <RefreshCw size={28} strokeWidth={3} className="animate-spin text-kronos-accent" />
          </Button>
        )}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <RefreshCw size={64} strokeWidth={2} className="text-kronos-accent animate-spin" />
          <p className="text-kronos-dim font-medium">Loading worldstate...</p>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Dashboard"
      extra={(
        <div className="flex items-center gap-3 relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full transition-all border ${showSettings
              ? 'bg-kronos-accent/20 border-kronos-accent text-kronos-accent shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]'
              : 'bg-kronos-panel/40 border-white/5 text-kronos-text hover:border-kronos-accent/30'
              }`}
            title="Dashboard Settings"
          >
            <Settings size={18} className={showSettings ? 'animate-spin-slow' : ''} />
          </button>

          {showSettings && (
            <div className="absolute top-full right-0 mt-2 w-64 glass-panel border border-kronos-accent/20 rounded-lg p-4 z-[110] shadow-2xl">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-kronos-accent/10">
                <span className="text-xs font-bold uppercase tracking-wider text-kronos-accent">Visible Cards</span>
                <button onClick={() => setShowSettings(false)} className="text-kronos-dim hover:text-white"><X size={14} /></button>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {[
                  { id: 'bounty', label: 'Bounties' },
                  { id: 'news', label: 'Latest News' },
                  { id: 'timers', label: 'World Timers' },
                  { id: 'arb', label: 'Arbitration' },
                  { id: 'nightwave', label: 'Nightwave' },
                  { id: 'inv', label: 'Invasions' },
                  { id: 'fiss', label: 'Fissures' },
                  { id: 'baro', label: 'Baro Ki\'Teer' },
                  { id: 'arch', label: 'Archimedea' },
                  { id: '1999', label: '1999 Calendar' },
                  { id: 'inf', label: 'SP Incursions' },
                  { id: 'desc', label: 'Descendia' },
                  { id: 'sortie', label: 'Sorties' },
                  { id: 'hunt', label: 'Archon Hunts' },
                  { id: 'circuit', label: 'The Circuit' },
                  { id: 'deal', label: 'Daily Deals' },
                  { id: 'alerts', label: 'Alerts' },
                  { id: 'event', label: 'Events' },
                ].map(card => (
                  <label key={card.id} className="flex items-center justify-between group cursor-pointer">
                    <span className="text-xs text-kronos-dim group-hover:text-kronos-text transition-colors">{card.label}</span>
                    <input
                      type="checkbox"
                      checked={isVisible(card.id)}
                      onChange={() => toggleCard(card.id)}
                      className="accent-kronos-accent w-3 h-3 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {lastFetch && (
            <span className="text-[10px] text-kronos-dim uppercase font-bold tracking-tighter">
              Synced: {new Date(lastFetch).toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="ghost"
            onClick={fetchWorldstate}
            disabled={loading}
            className="h-9 w-9 !p-0 hover:bg-kronos-accent/10 transition-colors"
          >
            <RefreshCw
              size={18}
              strokeWidth={3}
              className={`${loading ? 'animate-spin' : ''} text-kronos-accent`}
            />
          </Button>
        </div>
      )}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-4">
        {/* Bounties - Full Width */}
        {isVisible('bounty') && (
          <div className="lg:col-span-3">
            <Card glow className="p-3">
              <CardHeader icon={Shield} title="Bounties" />
              <Tabs tabs={bountyTabs} activeTab={bountyTab} onChange={setBountyTab} className="mb-2" fullWidth />
              {renderBounties()}
            </Card>
          </div>
        )}

        {/* Nightwave - Spans Full Width */}
        {isVisible('nightwave') && (
          <div className="lg:col-span-3">
            <Card glow className="p-3">
              <CardHeader icon={Moon} title="Nightwave" />
              {renderNightwave()}
            </Card>
          </div>
        )}

        {/* ── Col 1 ── */}
        <div className="space-y-4">
          {isVisible('alerts') && renderAlerts()}

          {/* World Timers */}
          {isVisible('timers') && timers.length > 0 && (
            <Card glow className="p-3">
              <CardHeader icon={Clock} title="World Timers" />
              <div className="grid grid-cols-2 gap-2">
                {timers.map(({ label, data, getState }) => (
                  <div key={label} className="bg-kronos-panel/40 rounded p-2 flex flex-col gap-0.5">
                    <p className="text-[10px] text-kronos-dim uppercase tracking-wider leading-none">{label}</p>
                    <p className="text-sm font-bold uppercase text-kronos-accent leading-tight">{getState(data)}</p>
                    <p className="text-xs text-kronos-dim font-mono">{timeRemaining(data.expiry)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {isVisible('baro') && renderBaro()}

          {/* Arbitration */}
          {isVisible('arb') && (
            <Card glow className="p-3">
              <CardHeader icon={Coins} title="Arbitration" />
              {currentArby ? (
                <div className="space-y-2">
                  <div className="bg-kronos-panel/40 rounded p-2 flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-kronos-dim uppercase mb-0.5">Current</p>
                      <p className="text-sm font-bold text-kronos-accent truncate">{resolveNode(currentArby.type, dict, ERg)}</p>
                      <p className="text-sm font-bold truncate">{resolveNode(currentArby.node, dict, ERg)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                      <span className="text-[12px] text-kronos-dim font-mono">
                        {timeRemaining(currentArby.ts + 3600000)}
                      </span>
                      <GradeBadge grade={currentArby.grade} />
                    </div>
                  </div>
                  {upcomingArbies.length > 0 && (
                    <div>
                      <p className="text-[10px] text-kronos-dim uppercase font-bold mb-1">Upcoming</p>
                      <div className="space-y-1">
                        {upcomingArbies.map((a, i) => (
                          <div key={i} className="bg-kronos-panel/40 rounded p-1.5 flex justify-between items-center text-xs uppercase">
                            <span className="font-bold truncate">{resolveNode(a.type, dict, ERg)} - {resolveNode(a.node, dict, ERg)}</span>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <span className="text-kronos-dim font-mono">
                                {new Date(a.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <GradeBadge grade={a.grade} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : <p className="text-xs text-kronos-dim italic">Loading data…</p>}
            </Card>
          )}

          {isVisible('deal') && worldstate?.dailyDeals?.[0] && (() => {
            const deal = worldstate.dailyDeals[0];
            const left = Math.max(0, deal.total - deal.sold);
            const isSoldOut = left === 0;
            return (
              <Card glow className="p-3">
                <CardHeader icon={DollarSign} title="Darvo's Deal" />
                <div className="flex gap-4 items-start">
                  <div className="w-14 h-14 bg-kronos-panel/40 rounded flex items-center justify-center p-1 border border-kronos-panel flex-shrink-0">
                    <img
                      src={resolveAnyImage(deal, EI, nameToImage)}
                      alt=""
                      className="max-w-full max-h-full object-contain"
                      onError={e => { e.target.style.display = 'none'; e.target.onerror = null }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold leading-tight text-sm text-kronos-text truncate" title={deal.item}>
                      {deal.item}
                    </p>

                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-sm text-kronos-dim line-through decoration-red-500/50">{deal.originalPrice}</span>
                      <span className="text-sm text-kronos-accent font-black">{deal.salePrice}</span>
                      <span className="text-sm font-bold text-kronos-text">Platinum</span>
                      <span className="text-sm text-kronos-dim">(-{deal.discount}%)</span>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-kronos-dim font-bold uppercase tracking-wider">
                        {left}/{deal.total} In Stock {isSoldOut && <span className="text-red-500 font-black ml-1">(SOLD OUT)</span>}
                      </span>
                      <span className="text-[10px] text-kronos-dim font-mono uppercase">{timeRemaining(deal.expiry)} LEFT</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })()}
        </div>

        {/* ── Col 2 ── */}
        <div className="space-y-4">
          {isVisible('event') && renderEvents()}
          {/* SP Incursions */}
          {isVisible('inf') && (
            <Card glow className="p-3">
              <CardHeader icon={Zap} title="SP Incursions" />
              {isVisible('inf') && renderSPIncursions()}
            </Card>
          )}

          {/* Sortie */}
          {isVisible('sortie') && worldstate?.sortie && (
            <Card glow className="p-3">
              <CardHeader icon={Target} title="Sortie" />
              <p className="text-sm font-bold text-kronos-accent mb-2 uppercase">{worldstate.sortie.boss}</p>
              <div className="space-y-1.5">
                {worldstate.sortie.variants.map((v, idx) => (
                  <div key={idx} className="bg-kronos-panel/40 rounded p-2">
                    <p className="text-sm font-bold text-kronos-text uppercase">{v.node}</p>
                    <p className="text-xs text-kronos-dim mt-0.5">{v.missionType} - {v.modifier}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-kronos-dim mt-2 text-right">{timeRemaining(worldstate.sortie.expiry)}</p>
            </Card>
          )}

          {/* Archon Hunt */}
          {isVisible('hunt') && worldstate?.archonHunt && (
            <Card glow className="p-3">
              <CardHeader icon={AlertCircle} title="Archon Hunt" />
              <p className="text-sm font-bold text-red-400 mb-2 uppercase">{worldstate.archonHunt.boss}</p>
              <div className="space-y-1.5">
                {worldstate.archonHunt.missions.map((m, idx) => (
                  <div key={idx} className="bg-kronos-panel/40 rounded p-2">
                    <p className="text-sm font-bold text-kronos-text uppercase">{m.node}</p>
                    <p className="text-xs text-kronos-dim mt-0.5">{m.type}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-kronos-dim mt-2 text-right">{timeRemaining(worldstate.archonHunt.expiry)}</p>
            </Card>
          )}

          {/* Archimedea */}
          {isVisible('arch') && (
            <Card glow className="p-3 border-kronos-accent/30">
              <CardHeader icon={Activity} title="Archimedea" />
              <Tabs tabs={archimedeaTabs} activeTab={archimedeaTab} onChange={setArchimedeaTab} className="mb-2" fullWidth />
              {renderArchimedea()}
            </Card>
          )}

          {/* Descendia */}
          {isVisible('desc') && (
            <Card glow className="p-3">
              <CardHeader
                icon={LayoutDashboard}
                title="Descendia"
                action={
                  <button
                    onClick={() => setShowDescendiaModal(true)}
                    className="p-1 hover:bg-kronos-accent/10 rounded transition-colors text-kronos-dim hover:text-kronos-accent"
                    title="Preview Upcoming Rotations"
                  >
                    <Calendar size={16} />
                  </button>
                }
              />
              {renderDescendia()}
            </Card>
          )}
        </div>

        {/* ── Col 3 ── */}
        <div className="space-y-4">
          {/* Duviri Circuit */}
          {isVisible('circuit') && (
            <Card glow className="p-3">
              <CardHeader icon={Sparkles} title="The Circuit" />
              {renderCircuit()}
            </Card>
          )}

          {/* 1999 Calendar */}
          {isVisible('1999') && (
            <Card glow className="p-3">
              <CardHeader icon={Calendar} title="1999 Calendar" />
              {render1999()}
            </Card>
          )}

          {/* Void Fissures */}
          {isVisible('fiss') && (
            <Card glow className="p-3">
              <CardHeader icon={Package} title="Void Fissures" />
              <Tabs tabs={fissureTabs} activeTab={fissureTab} onChange={setFissureTab} className="mb-2" fullWidth />
              <div className="space-y-1">
                {visibleFissures.map((f, idx) => (
                  <div key={idx} className="bg-kronos-panel/40 rounded p-1.5 flex justify-between items-center uppercase">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{f.tier} - {f.missionType}</span>
                      <span className="text-[10px] text-kronos-dim leading-none mt-0.5">{f.node}</span>
                    </div>
                    <span className="text-xs text-kronos-dim font-mono">{timeRemaining(f.expiry)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Invasions */}
          {isVisible('inv') && worldstate?.invasions?.length > 0 && (
            <Card glow className="p-3">
              <CardHeader icon={Swords} title="Invasions" />
              <div className="space-y-2">
                {worldstate.invasions.filter(i => !i.completed).slice(0, 4).map((inv, idx) => {
                  return (
                    <div key={idx} className="bg-kronos-panel/40 rounded p-2">
                      <p className="text-[10px] font-bold text-center mb-1 uppercase text-kronos-dim">{inv.node}</p>

                      <div className="flex items-center gap-2 mb-2">
                        {/* Attacker */}
                        <div className="flex-1 flex flex-col items-center text-center min-w-0">
                          <div className="h-11 flex flex-col items-center justify-end mb-1">
                            {inv.attacker.rewardText && (
                              <>
                                <span className="text-[9px] text-blue-400 font-bold leading-tight truncate w-full">{inv.attacker.rewardText}</span>
                                <div className="w-8 h-8 flex items-center justify-center">
                                  <img src={resolveAnyImage(inv.attacker.reward, EI, nameToImage)} alt="" className="max-w-full max-h-full object-contain" />
                                </div>
                              </>
                            )}
                          </div>
                          <span className="text-[8px] text-kronos-dim uppercase font-bold truncate w-full">{inv.attacker.faction}</span>
                        </div>

                        <div className="text-[10px] font-black text-kronos-dim mt-auto mb-0.5">VS</div>

                        {/* Defender */}
                        <div className="flex-1 flex flex-col items-center text-center min-w-0">
                          <div className="h-11 flex flex-col items-center justify-end mb-1">
                            {inv.defender.rewardText && (
                              <>
                                <span className="text-[9px] text-red-400 font-bold leading-tight truncate w-full">{inv.defender.rewardText}</span>
                                <div className="w-8 h-8 flex items-center justify-center">
                                  <img src={resolveAnyImage(inv.defender.reward, EI, nameToImage)} alt="" className="max-w-full max-h-full object-contain" />
                                </div>
                              </>
                            )}
                          </div>
                          <span className="text-[8px] text-kronos-dim uppercase font-bold truncate w-full">{inv.defender.faction}</span>
                        </div>
                      </div>

                      <div className="bg-zinc-800 rounded-full h-1 overflow-hidden relative">
                        <div className="bg-blue-500 h-full absolute left-0" style={{ width: `${inv.completion}%` }} />
                        <div className="bg-red-500 h-full absolute right-0" style={{ width: `${100 - inv.completion}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Latest News */}
          {isVisible('news') && worldstate?.news && (
            <Card glow className="p-3">
              <CardHeader icon={Newspaper} title="Latest News" />
              <div className="space-y-2">
                {worldstate.news.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="text-xs">
                    {item.link ? (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold hover:text-kronos-accent transition-colors block leading-tight"
                      >
                        {item.message}
                      </a>
                    ) : (
                      <p className="font-bold leading-tight">{item.message}</p>
                    )}
                    <p className="text-[10px] text-kronos-dim mt-0.5 font-mono">{timeSince(item.date)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
      <DescendiaModal />
      <BaroModal />
    </PageLayout >
  )
}