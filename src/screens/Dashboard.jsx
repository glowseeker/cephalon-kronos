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
    if (entry.ts <= now) best = entry
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
    exportData, spIncursions, arbys,
    dict, suppDict, EC, ERg, EI, nameToImage, uniqueNameToName, arbyTiers,
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
  const [hiddenCards, setHiddenCards] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard_hidden_cards')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem('dashboard_hidden_cards', JSON.stringify(hiddenCards))
  }, [hiddenCards])

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
        const parsed = parseWorldstate(wsOracle, { dict, suppDict, ERg, EC, EI, nameToImage, uniqueNameToName, bountyCycle: cycle })
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
            <div key={idx} className="bg-kronos-panel/40 p-2.5 rounded">
              {/* Mission type + deviation single line */}
              <p className="text-[11px] font-black uppercase mb-1.5 leading-tight">
                <span className="text-kronos-accent">
                  {m.missionType}
                </span>
                {m.deviation && (
                  <>
                    <span className="text-kronos-dim/50 font-normal mx-1.5">-</span>
                    <span className="relative group/devtip font-normal normal-case text-kronos-text/70 cursor-help">
                      {m.deviation.name}
                      <span className="absolute bottom-full left-0 mb-2 w-52 p-2.5 bg-kronos-panel rounded text-[10px] opacity-0 group-hover/devtip:opacity-100 transition-opacity z-50 shadow-[0_0_20px_rgba(0,0,0,0.7)] pointer-events-none block font-normal">
                        <span className="font-bold text-kronos-accent uppercase block mb-1">{m.deviation.name}</span>
                        <span className="text-kronos-text/80 leading-snug block">{m.deviation.description}</span>
                      </span>
                    </span>
                  </>
                )}
              </p>
              {/* Risks - plain text chips, tooltip on hover with drop shadow only */}
              <div className="flex flex-wrap gap-1.5">
                {m.risks?.map((r, ri) => (
                  <span key={ri} className="relative group/risktip text-[9px] text-kronos-dim bg-black/20 px-1.5 py-0.5 rounded cursor-help">
                    {r.name}
                    <span className="absolute bottom-full left-0 mb-2 w-52 p-2.5 bg-kronos-panel rounded text-[10px] opacity-0 group-hover/risktip:opacity-100 transition-opacity z-50 shadow-[0_0_20px_rgba(0,0,0,0.7)] pointer-events-none block">
                      <span className="font-bold text-kronos-accent uppercase block mb-1">{r.name}</span>
                      <span className="text-kronos-text/80 leading-snug block">{r.description}</span>
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Personal Modifiers - 2-col grid, plain text, tooltip with drop shadow */}
        {data.personalModifiers?.length > 0 && (
          <div>
            <p className="text-[10px] text-kronos-dim uppercase font-bold mb-2 tracking-widest text-center">Personal Modifiers</p>
            <div className="grid grid-cols-2 gap-1.5">
              {data.personalModifiers.map((pm, pi) => (
                <span key={pi} className="relative group/pmtip text-[10px] text-kronos-text text-center p-1.5 cursor-help block">
                  {pm.name}
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 bg-kronos-panel rounded text-[10px] opacity-0 group-hover/pmtip:opacity-100 transition-opacity z-50 shadow-[0_0_20px_rgba(0,0,0,0.7)] pointer-events-none block text-left">
                    <span className="font-bold text-kronos-accent uppercase block mb-1">{pm.name}</span>
                    <span className="text-kronos-text/80 leading-snug block">{pm.description}</span>
                  </span>
                </span>
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

    // Group by category based on XP
    const grouped = (nw.challenges || []).reduce((acc, c) => {
      let cat = 'Daily'
      if (c.xp >= 7000 || c.isElite) cat = 'Elite Weekly'
      else if (c.xp >= 4500) cat = 'Weekly'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(c)
      return acc
    }, {})

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <p className="text-[10px] font-bold text-kronos-accent uppercase">Season {nw.season} - Phase {nw.phase}</p>
          <p className="text-[10px] text-kronos-dim font-mono">{timeRemaining(nw.expiry)} LEFT</p>
        </div>

        {/* Rewards Section */}
        {nw.rewards?.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
            {nw.rewards.map((r, ri) => (
              <div key={ri} className="bg-kronos-panel/40 p-2 rounded flex-shrink-0 w-24 flex flex-col items-center gap-1 border border-white/5 group hover:border-kronos-accent/30 transition-all">
                <div className="w-10 h-10 bg-black/20 rounded flex items-center justify-center relative overflow-hidden">
                  {r.image ? (
                    <img src={r.image} alt="" className="max-w-[120%] max-h-[120%] object-contain relative z-10 transition-transform group-hover:scale-110" />
                  ) : (
                    <Package size={16} className="text-kronos-accent opacity-50" />
                  )}
                </div>
                <p className="text-[8px] font-bold text-center leading-[1.1] line-clamp-2 uppercase h-4 overflow-hidden" title={r.name}>{r.name}</p>
                {r.itemCount > 1 && <span className="text-[8px] text-kronos-accent font-black">×{r.itemCount}</span>}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
          {Object.entries(grouped).map(([cat, tasks]) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2 pl-1">
                <span className="h-px flex-1 bg-kronos-panel/40"></span>
                <p className="text-[9px] font-black text-kronos-dim uppercase tracking-widest">{cat}</p>
                <span className="h-px flex-1 bg-kronos-panel/40"></span>
              </div>
              <div className="space-y-2">
                {tasks.map((c, idx) => (
                  <div key={idx} className="bg-kronos-panel/40 p-2.5 rounded border border-white/5 hover:border-kronos-accent/30 transition-all group">
                    <div className="flex justify-between items-start gap-3 mb-1.5">
                      <p className="text-[10px] font-bold text-kronos-accent uppercase leading-tight group-hover:text-white transition-colors">{c.name}</p>
                      <span className="text-[9px] text-kronos-accent font-black uppercase bg-kronos-accent/10 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.1)]">{c.xp} XP</span>
                    </div>
                    <p className="text-[10px] text-kronos-text/80 leading-snug">{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderCircuit = () => {
    if (!worldstate?.circuit?.length) return <p className="text-xs text-kronos-dim italic text-center py-4">No Circuit data…</p>

    // Group and flatten choices by category
    const groups = worldstate.circuit.reduce((acc, c) => {
      if (!acc[c.category]) acc[c.category] = []
      acc[c.category].push(...c.choices)
      return acc
    }, {})

    return (
      <div className="space-y-4 mt-2">
        {Object.entries(groups).map(([cat, choices], idx) => (
          <div key={idx} className="bg-kronos-panel/40 p-2.5 rounded border border-transparent hover:border-kronos-accent/20 transition-all">
            <p className="text-[11px] font-black text-kronos-accent uppercase mb-2 tracking-widest">{cat}</p>
            <div className="flex flex-wrap gap-1.5">
              {choices.map((ch, ci) => (
                <div key={ci} className="bg-black/20 px-2 py-1 rounded text-[10px] text-kronos-text font-medium">
                  {ch}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const render1999 = () => {
    const cal = worldstate?.calendar1999?.[0]
    if (!cal) return <p className="text-xs text-kronos-dim italic text-center py-4">No 1999 data…</p>

    const activationDate = new Date(cal.activation)
    const expiryDate = new Date(cal.expiry)

    // Normalize to first of month for navigation
    const minMonth = new Date(activationDate.getFullYear(), activationDate.getMonth(), 1)
    const maxMonth = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), 1)

    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    const monthName = calendarDate.toLocaleString('default', { month: 'long' })

    const canPrev = calendarDate > minMonth
    const canNext = calendarDate < maxMonth

    const prevMonth = () => canPrev && setCalendarDate(new Date(year, month - 1, 1))
    const nextMonth = () => canNext && setCalendarDate(new Date(year, month + 1, 1))

    // Filter days for the current displayed month that have events
    // We determine the date for each "day" entry. 
    // Usually "day 1" is activation. 
    const activeDays = (cal.days || []).filter(d => {
      const dDate = new Date(activationDate)
      dDate.setDate(activationDate.getDate() + (d.day - 1))
      return dDate.getMonth() === month && dDate.getFullYear() === year && (d.events?.length > 0 || d.type === 'Birthday')
    }).map(d => {
      const dDate = new Date(activationDate)
      dDate.setDate(activationDate.getDate() + (d.day - 1))
      return { ...d, date: dDate }
    })

    return (
      <div className="space-y-3 mt-2">
        <div className="flex justify-between items-center bg-kronos-panel/40 p-2 rounded border border-white/5">
          <button
            onClick={prevMonth}
            disabled={!canPrev}
            className={`p-1 rounded transition-colors ${canPrev ? 'hover:bg-kronos-accent/20 text-kronos-dim hover:text-kronos-accent' : 'opacity-20 cursor-not-allowed'}`}
          >
            <ChevronDown className="rotate-90" size={16} />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-black text-kronos-accent uppercase tracking-widest leading-none mb-1">{monthName} {year}</p>
            <p className="text-[8px] text-kronos-dim uppercase font-bold tracking-tighter">{cal.season} - YEAR {cal.year}</p>
          </div>
          <button
            onClick={nextMonth}
            disabled={!canNext}
            className={`p-1 rounded transition-colors ${canNext ? 'hover:bg-kronos-accent/20 text-kronos-dim hover:text-kronos-accent' : 'opacity-20 cursor-not-allowed'}`}
          >
            <ChevronDown className="-rotate-90" size={16} />
          </button>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
          {activeDays.length > 0 ? activeDays.map((d, idx) => (
            <div key={idx} className={`p-2.5 rounded border ${d.type === 'Birthday' ? 'bg-kronos-accent/10 border-kronos-accent/30 shadow-[0_0_15px_rgba(var(--kronos-accent-rgb),0.1)]' : 'bg-kronos-panel/40 border-white/5'}`}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-black/40 flex flex-col items-center justify-center border border-white/5">
                    <span className="text-[8px] font-black text-kronos-accent leading-none">{d.date.toLocaleString('default', { month: 'short' }).toUpperCase()}</span>
                    <span className="text-xs font-black text-white leading-none mt-0.5">{d.date.getDate()}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-kronos-text uppercase leading-none">{d.type === 'Birthday' ? '🎂 Special Event' : `Day ${d.day}`}</p>
                    <p className="text-[8px] text-kronos-dim uppercase font-bold mt-0.5">{d.date.toLocaleDateString(undefined, { weekday: 'long' })}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                {d.events?.map((ev, ei) => (
                  <div key={ei} className="flex items-start gap-3 bg-black/30 p-2 rounded-sm border border-white/5 group">
                    {ev.type === 'CET_REWARD' ? <ShoppingBag size={14} className="text-kronos-accent mt-0.5" /> :
                      ev.type === 'CET_UPGRADE' ? <Zap size={14} className="text-yellow-400 mt-0.5" /> :
                        <Target size={14} className="text-blue-400 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-black text-kronos-dim uppercase tracking-tighter leading-none mb-1">
                        {ev.type === 'CET_CHALLENGE' ? 'Challenge' : ev.type === 'CET_REWARD' ? 'Reward' : 'Upgrade'}
                      </p>
                      <p className="text-[10px] text-kronos-text font-bold leading-tight group-hover:text-kronos-accent transition-colors">{ev.name}</p>
                    </div>
                  </div>
                ))}
                {!d.events?.length && d.type === 'Birthday' && (
                  <p className="text-[10px] text-kronos-accent font-bold italic pl-1">Birthday celebration available!</p>
                )}
              </div>
            </div>
          )) : (
            <p className="text-xs text-kronos-dim italic text-center py-8">No events in {monthName}</p>
          )}
        </div>

        <div className="px-1 text-right">
          <p className="text-[9px] text-kronos-dim font-mono uppercase">Season expires: {timeRemaining(cal.expiry)}</p>
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
      <div className="space-y-2 mt-2">
        <div className="text-right px-1">
          <p className="text-[10px] text-kronos-dim font-mono uppercase">{timeRemaining(current.expiry)} REMAINING</p>
        </div>
        <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
          {current.stages.map((s, idx) => (
            <div key={idx} className="bg-kronos-panel/40 p-2 rounded flex justify-between items-center gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-kronos-text uppercase truncate">{s.name}</p>
                <p className="text-[9px] text-kronos-dim truncate uppercase">{s.level}</p>
              </div>
              <span className="text-[9px] font-black text-kronos-accent uppercase bg-kronos-accent/10 px-1.5 py-0.5 rounded flex-shrink-0">STAGE {idx + 1}</span>
            </div>
          ))}
        </div>
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
                    {set.stages.map((s, idx) => (
                      <div key={idx} className="bg-black/20 p-2 rounded flex justify-between items-center gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-kronos-text uppercase truncate">{s.name}</p>
                          <p className="text-[9px] text-kronos-dim truncate uppercase">{s.level}</p>
                        </div>
                        <span className="text-[8px] font-black text-kronos-accent uppercase bg-kronos-accent/10 px-1.5 py-0.5 rounded flex-shrink-0">STAGE {idx + 1}</span>
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

        {/* ── Col 1 ── */}
        <div className="space-y-4">
          {isVisible('alerts') && renderAlerts()}
          {/* Nightwave */}
          {isVisible('nightwave') && (
            <Card glow className="p-3">
              <CardHeader icon={Moon} title="Nightwave" />
              {renderNightwave()}
            </Card>
          )}

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
                    <a href={item.link} target="_blank" rel="noreferrer" className="font-bold hover:text-kronos-accent transition-colors block leading-tight">
                      {item.message}
                    </a>
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
    </PageLayout>
  )
}