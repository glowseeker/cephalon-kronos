import { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import { parseInventory } from '../lib/inventoryParser'
import { parseWorldstate } from '../lib/worldstateParser'
import { getRelicRewards, getAllRelicRewards, getRewardInventoryContext, parseRelicName } from '../lib/relicParser'
import { listen, emit } from '@tauri-apps/api/event'
import { getPrice } from '../lib/wfmCache'
import { resolveNode } from '../lib/warframeUtils'
import { getSetting } from '../lib/settings'

const ORACLE_API = 'https://oracle.browse.wf/worldState.json'

// ── Pure helper: array/object → keyed map ─────────────────────────────────────
function toMap(data, key) {
  if (!data) return {}
  let arr = data
  if (typeof data === 'object' && !Array.isArray(data)) {
    if (key && data[key]) arr = data[key]
    else {
      const keys = Object.keys(data)
      if (keys.length === 1) arr = data[keys[0]]
    }
  }
  if (Array.isArray(arr)) {
    const map = {}
    for (const item of arr) {
      const k = item.uniqueName || item.ItemType || item.name || item.regionIndex
      if (k !== undefined) map[k] = item
    }
    return map
  }
  return arr || {}
}

const cleanOcrText = (s) => s
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip diacritics: É→E, Ï→I, etc.
  .toUpperCase()
  .replace(/[^A-Z0-9 ]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const ARBY_TIERS = {
  SolNode450: "S",
  SolNode106: "S",
  SolNode25: "S",
  SolNode719: "S",
  SolNode64: "S",
  SolNode147: "A",
  SolNode23: "A",
  SolNode172: "A",
  SolNode167: "B",
  ClanNode24: "B",
  SolNode149: "B",
  ClanNode22: "B",
  ClanNode18: "B",
  SolNode164: "B",
  SolNode707: "B",
  SolNode211: "B",
  SolNode42: "B",
  SolNode195: "B",
  SolNode408: "B",
  SolNode402: "B",
  SolNode412: "C",
  ClanNode2: "C",
  SolNode46: "C",
  ClanNode8: "C",
  SolNode212: "C",
  SolNode22: "C",
  SolNode224: "C",
  SolNode26: "C",
  ClanNode6: "C",
  SolNode122: "C",
  SolNode72: "C",
  SolNode130: "D",
  ClanNode15: "D",
  SolNode85: "D",
  SolNode18: "D",
  SolNode305: "D",
  ClanNode4: "D",
  SolNode125: "D",
}

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

const MonitoringContext = createContext(null)

export function MonitoringProvider({ children }) {
  const [exportData, setExportData] = useState(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [monitorResult, setMonitorResult] = useState('idle') // 'idle' | 'success' | 'error'
  const [autoStart, setAutoStartState] = useState(localStorage.getItem('autoStartMonitoring') === 'true')
  const autoStartRef = useRef(autoStart)

  const setAutoStart = useCallback((val) => {
    const v = !!val
    setAutoStartState(v)
    autoStartRef.current = v
    localStorage.setItem('autoStartMonitoring', String(v))
  }, [])

  const [lastUpdate, setLastUpdate] = useState(localStorage.getItem('lastUpdate') || null)
  const [rawInventory, setRawInventory] = useState(null)
  const [inventoryData, setInventoryData] = useState(undefined)
  const [isInventoryLoading, setIsInventoryLoading] = useState(false)
  const [worldState, setWorldState] = useState(null)
  const [statusText, setStatusText] = useState('Initializing…')
  const [spIncursions, setSpIncursions] = useState(null)
  const [arbys, setArbys] = useState(null)
  const [descendiaDescs, setDescendiaDescs] = useState({ penance: {}, missionType: {} })
  const intervalRef = useRef(null)
  const busyRef = useRef(false)
  const notifiedRef = useRef({
    arbitration: new Set(),
    foundry: new Set(),
    syndicate: new Set(),
    syndicateWaste: { lastNotify: 0 },
    mastery: {},
    checklist: {},
    voidTraces: false
  })

  // ── Derived lookup maps ──────────────────────────────────────────────────────
  const dict = useMemo(() => exportData?.['dict.en'] ?? {}, [exportData])
  const suppDict = useMemo(() => exportData?.['supp-dict-en'] ?? {}, [exportData])
  const EC = useMemo(() => toMap(exportData?.ExportChallenges, 'ExportChallenges'), [exportData])
  const ERg = useMemo(() => {
    const data = exportData?.ExportRegions
    if (!data) return {}
    const map = {}
    const process = (r) => {
      if (!r || typeof r !== 'object') return
      if (r.uniqueName) map[r.uniqueName] = r
      if (r.name) map[r.name] = r
      if (r.regionIndex !== undefined) map[`SolNode${r.regionIndex}`] = r
    }
    if (Array.isArray(data)) {
      data.forEach(process)
    } else if (typeof data === 'object') {
      if (Array.isArray(data.ExportRegions)) {
        data.ExportRegions.forEach(process)
      } else {
        Object.entries(data).forEach(([k, v]) => {
          if (k !== 'ExportRegions') map[k] = v
          process(v)
        })
      }
    }
    return map
  }, [exportData])
  const ES = useMemo(() => exportData?.ExportSyndicates ?? {}, [exportData])
  const ENW = useMemo(() => toMap(exportData?.ExportNightwave, 'rewards'), [exportData])
  const ENWRawRewards = useMemo(() => exportData?.ExportNightwave?.rewards || [], [exportData])
  const ExportImages = useMemo(() => exportData?.ExportImages ?? {}, [exportData])
  const ExportTextIcons = useMemo(() => exportData?.ExportTextIcons ?? {}, [exportData])

  // Mastery progress (0-100) computed once and shared between the notification
  // logic and Mastery.jsx so neither has to recalculate independently.
  const masteryProgress = useMemo(() => {
    if (!inventoryData) return 0
    const currentRank = inventoryData.account?.mastery_rank
    if (currentRank == null) return 0
    const getXPForRank = (r) => r <= 0 ? 0 : r <= 30 ? r * r * 2500 : 2250000 + (r - 30) * 147500
    const getXPNeededFor = (r) => r <= 30 ? (2 * r - 1) * 2500 : 147500
    const itemCats = ['warframes', 'primary', 'secondary', 'melee', 'kitgunChambers', 'zawStrikes', 'amps',
      'sentinels', 'companion_weapons', 'moaHeads', 'houndHeads', 'beasts',
      'archwings', 'archweapons', 'necramechs', 'plexus', 'kdrives']
    const itemXP = itemCats.reduce((sum, cat) =>
      sum + (inventoryData[cat] ?? []).reduce((s, i) => s + (i.mastery_xp || 0), 0), 0)
    const intrinsicXP = (inventoryData.intrinsics ?? []).reduce((s, i) => s + (i.mastery_xp || 0), 0)
    const sc = inventoryData.starchart ?? {}
    const totalXP = itemXP + intrinsicXP + (sc.origin_xp ?? 0) + (sc.steel_path_xp ?? 0)
    const xpAtCurrent = getXPForRank(currentRank)
    const xpNeeded = getXPNeededFor(currentRank + 1)
    const xpIntoRank = Math.max(0, totalXP - xpAtCurrent)
    return xpNeeded > 0 ? Math.min(100, (xpIntoRank / xpNeeded) * 100) : 100
  }, [inventoryData])

  const { EI, nameToImage, uniqueNameToName } = useMemo(() => {
    if (!exportData || !dict) return { EI: {}, nameToImage: {}, uniqueNameToName: {} }
    const tableNames = [
      'ExportWeapons', 'ExportWarframes', 'ExportSentinels',
      'ExportResources', 'ExportArcanes', 'ExportUpgrades',
      'ExportNightwave', 'ExportBoosterPacks', 'ExportRecipes', 'ExportCustoms', 'ExportGear'
    ]
    const EI = {}
    const nameToImage = {}
    const uniqueNameToName = {}
    const toBrowseWf = (p) => p ? `https://browse.wf${p.startsWith('/') ? '' : '/'}${p}` : null

    const indexEntry = (e, k, t) => {
      const un = e.uniqueName || e.ItemType || k
      if (!un) return
      const url = toBrowseWf(e.icon ?? e.texture ?? '')
      if (url) EI[un] = url
      const nameKey = e.name ?? e.displayName ?? (t === 'ExportRecipes' ? e.resultType : '')
      uniqueNameToName[un] = nameKey
      const locKey = uniqueNameToName[un]
      if (locKey) {
        const resolved = (dict[locKey] || dict['/' + locKey] || '').replace(/<[^>]*>/g, '').trim()
        if (resolved && !resolved.startsWith('/')) { if (url) nameToImage[resolved.toLowerCase()] = url }
      }
    }

    tableNames.forEach(tbl => {
      const data = exportData[tbl]
      if (!data) return
      if (Array.isArray(data)) data.forEach(e => indexEntry(e, null, tbl))
      else if (typeof data === 'object') {
        const nested = data[tbl] ?? (Object.keys(data).length === 1 && typeof Object.values(data)[0] === 'object' ? Object.values(data)[0] : null)
        if (Array.isArray(nested)) nested.forEach(e => indexEntry(e, null, tbl))
        else Object.entries(data).forEach(([k, v]) => indexEntry(v, k, tbl))
      }
    })
    return { EI, nameToImage, uniqueNameToName }
  }, [exportData, dict])

  const globalRewardPool = useMemo(() => getAllRelicRewards(exportData), [exportData])

  // ── Notification Logic ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!inventoryData) return
    const position = getSetting('notif_position', 'top-right')

    const RANK_CAPS = {
      5: 132000, 4: 99000, 3: 70000, 2: 44000, 1: 22000, 0: 5000,
      [-1]: -22000, [-2]: -44000
    }
    const getCumulativePreviousCaps = (rank) => {
      if (rank <= 0) return 0
      if (rank >= 5) return 5000 + 22000 + 44000 + 70000 + 99000
      if (rank === 4) return 5000 + 22000 + 44000 + 70000
      if (rank === 3) return 5000 + 22000 + 44000
      if (rank === 2) return 5000 + 22000
      if (rank === 1) return 5000
      return 0
    }

    // 1. Void Traces
    if (getSetting('notif_void_traces_enabled', false)) {
      const { void_traces, void_traces_max } = inventoryData.account || {}
      if (void_traces && void_traces_max && void_traces >= void_traces_max) {
        if (!notifiedRef.current.voidTraces) {
          invoke('show_notification', {
            title: 'Void Traces Capped',
            message: `You have reached the maximum capacity of ${void_traces_max} Void Traces.`,
            image: '/IconRelic.png',
            position
          }).catch(console.error)
          notifiedRef.current.voidTraces = true
        }
      } else {
        notifiedRef.current.voidTraces = false
      }
    }

    // 2. Syndicate Rank Capped
    if (getSetting('notif_syndicate_enabled', false)) {
      const affiliations = inventoryData.Affiliations || [];
      const MAIN_SYNDICATE_TAGS = new Set([
        'SteelMeridianSyndicate', 'PerrinSyndicate', 'ArbitersSyndicate',
        'CephalonSudaSyndicate', 'RedVeilSyndicate', 'NewLokaSyndicate'
      ]);
      const MAX_SYNDICATE_RANK = 5; // Assuming Rank 5 is the absolute max

      affiliations.forEach(aff => {
        // Check if it's one of the 6 main syndicates
        if (!MAIN_SYNDICATE_TAGS.has(aff.Tag)) {
          return; // Skip if not a main syndicate
        }

        const rank = aff.Title ?? 0;
        const total = aff.Standing ?? 0;
        const cap = RANK_CAPS[rank] ?? 22000; // Cap for the current rank
        const previousCaps = getCumulativePreviousCaps(rank);
        const earned = Math.max(0, total - previousCaps);

        // Trigger notification ONLY if it's the MAX rank AND the cap for that rank is met.
        // Also, ensure we haven't already notified for this syndicate tag.
        if (rank === MAX_SYNDICATE_RANK && earned >= cap && cap > 0) {
          if (!notifiedRef.current.syndicate.has(aff.Tag)) {
            invoke('show_notification', {
              title: 'Syndicate Capped',
              message: `You have reached the maximum standing for ${aff.Tag.replace('Syndicate', '')}.`,
              image: '/IconMastery.png',
              position
            }).catch(console.error);
            notifiedRef.current.syndicate.add(aff.Tag);
          }
        } else {
          // If not maxed or not capped, remove from notified set to allow future notifications if they become maxed again
          notifiedRef.current.syndicate.delete(aff.Tag);
        }
      });
    }

    // 3. Foundry Completion
    if (getSetting('notif_foundry_enabled', false)) {
      const recipes = inventoryData.craftable || []
      recipes.forEach(item => {
        if (item.isCrafting && item.remainingTime <= 0) {
          if (!notifiedRef.current.foundry.has(item.uniqueName)) {
            invoke('show_notification', {
              title: 'Foundry Complete',
              message: `${item.name} is ready to claim!`,
              image: item.image || '/IconFoundry.png',
              position
            }).catch(console.error)
            notifiedRef.current.foundry.add(item.uniqueName)
          }
        }
      })
    }

    // 4. S-Tier Arbitration
    if (getSetting('notif_arbitration_enabled', false) && arbys && Object.keys(ERg).length > 0) {
      const current = getCurrentArby(arbys, ERg, dict)
      if (current) {
        const grade = ARBY_TIERS[current.node] || 'F'
        if (grade === 'S') {
          if (!notifiedRef.current.arbitration.has(current.ts)) {
            invoke('show_notification', {
              title: 'S-Tier Arbitration Active',
              message: `${resolveNode(current.type, dict, ERg)} on ${resolveNode(current.node, dict, ERg)}`,
              image: '/IconDashboard.png',
              position
            }).catch(console.error)
            notifiedRef.current.arbitration.add(current.ts)
          }
        }
      }
    }

    // 5. Syndicate Waste Reminder
    // Fires when the player's pledged syndicate has enemies with standing > 0.
    // Playing any mission would drain that enemy standing to zero, wasting it.
    // The user should spend it on items first.
    if (getSetting('notif_syndicate_waste_enabled', false)) {
      const pledgedTag = inventoryData.SupportedSyndicate // e.g. "SteelMeridianSyndicate"
      const affiliations = inventoryData.Affiliations || []

      // Find the config entry whose AFFILIATION_TAGS value matches the pledged tag
      const AFFILIATION_TAGS = {
        steel: 'SteelMeridianSyndicate', perrin: 'PerrinSyndicate',
        arbiters: 'ArbitersSyndicate', suda: 'CephalonSudaSyndicate',
        veil: 'RedVeilSyndicate', newloka: 'NewLokaSyndicate',
      }
      const pledgedShortTag = Object.entries(AFFILIATION_TAGS).find(([, v]) => v === pledgedTag)?.[0]

      if (pledgedShortTag) {
        // ES is ExportSyndicates — build enemy tags from alignments
        const pledgedExportData = ES?.[pledgedTag]
        const TAG_TO_EXPORT_KEY = {
          steel: 'SteelMeridianSyndicate', perrin: 'PerrinSyndicate',
          arbiters: 'ArbitersSyndicate', suda: 'CephalonSudaSyndicate',
          veil: 'RedVeilSyndicate', newloka: 'NewLokaSyndicate',
        }
        const exportKeyToShort = Object.fromEntries(Object.entries(TAG_TO_EXPORT_KEY).map(([k, v]) => [v, k]))
        const enemyShortTags = pledgedExportData?.alignments
          ? Object.entries(pledgedExportData.alignments)
            .filter(([, v]) => v < 0)
            .map(([k]) => exportKeyToShort[k])
            .filter(Boolean)
          : []

        // Check if any enemy syndicate has standing > 0
        const enemiesWithStanding = enemyShortTags
          .map(tag => {
            const affTag = AFFILIATION_TAGS[tag]
            const aff = affiliations.find(a => a.Tag === affTag)
            return aff && (aff.Standing ?? 0) > 0 ? tag : null
          })
          .filter(Boolean)

        const now = Date.now()
        if (enemiesWithStanding.length > 0 && now - notifiedRef.current.syndicateWaste.lastNotify > 30 * 60 * 1000) {
          const names = enemiesWithStanding.join(', ')
          invoke('show_notification', {
            title: 'Syndicate Standing at Risk',
            message: `Opposing syndicate${enemiesWithStanding.length > 1 ? 's' : ''} (${names}) have standing, use before its 0`,
            image: '/IconMastery.png'
          }).catch(console.error)
          notifiedRef.current.syndicateWaste.lastNotify = now
        }
        if (enemiesWithStanding.length === 0) notifiedRef.current.syndicateWaste.lastNotify = 0
      }
    }

    // 6. Mastery Progress
    // Replicates the XP calculation from Mastery.jsx using the same item data.
    // Fires once when progress crosses the configured threshold percentage.
    if (getSetting('notif_mastery_enabled', false)) {
      const threshold = parseInt(getSetting('notif_mastery_percent', 75))
      const currentRank = inventoryData.account?.mastery_rank
      if (currentRank != null) {
        const key = `${currentRank}_${threshold}`
        if (masteryProgress >= threshold && !notifiedRef.current.mastery[key]) {
          invoke('show_notification', {
            title: 'Mastery Progress',
            message: `You are ${masteryProgress}% of the way to Mastery Rank ${currentRank + 1}.`,
            image: '/IconMastery.png',
            position
          }).catch(console.error)
          notifiedRef.current.mastery[key] = true
        }
      }
    }
  }, [inventoryData, arbys, ERg, dict, ES, masteryProgress])

  // When the global reward pool is (re-)computed, write a baseline Tesseract wordlist
  // containing every word that can ever appear in a relic reward name.
  useEffect(() => {
    if (!globalRewardPool || globalRewardPool.length === 0) return
    const wordSet = new Set()
    for (const item of globalRewardPool) {
      const name = (item.name || '').trim()
      if (name) name.split(/\s+/).forEach(w => { if (w.length > 1) wordSet.add(w) })
    }
    if (wordSet.size > 0) {
      invoke('write_ocr_wordlist', { words: [...wordSet] }).catch(() => { })
    }
  }, [globalRewardPool])

  const applyRaw = useCallback((raw, ts, exports = exportData) => {
    if (!raw) return
    setRawInventory(raw)
    if (!exports) return
    try {
      const parsed = parseInventory(raw, exports)
      setInventoryData(parsed || null)
    } catch (err) {
      setInventoryData(null)
    }
    const tsStr = String(ts ?? Date.now())
    setLastUpdate(tsStr)
    localStorage.setItem('lastUpdate', tsStr)
  }, [exportData])

  useEffect(() => {
    ; (async () => {
      try {
        setStatusText('Checking updates & assets…')
        await Promise.all([
          invoke('check_exports'),
          invoke('check_media_assets')
        ])

        setStatusText('Loading resources…')
        const [exports, spiText, arbText, descText] = await Promise.all([
          invoke('load_all_exports'),
          invoke('load_txt_file', { name: 'sp-incursions.txt' }),
          invoke('load_txt_file', { name: 'arbys.txt' }),
          invoke('load_txt_file', { name: 'descendia.txt' }),
        ])

        setExportData(exports)
        setSpIncursions(spiText || '')
        setArbys(arbText || '')

        // Parse Descendia descriptions
        if (descText) {
          const penance = {}
          const missionType = {}
          let currentSection = null
          descText.split('\n').forEach(line => {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith('#')) return
            if (trimmed.startsWith('# Mission')) {
              currentSection = 'missionType'
              return
            }
            const colonIdx = trimmed.indexOf(':')
            if (colonIdx > 0) {
              const key = trimmed.slice(0, colonIdx)
              const desc = trimmed.slice(colonIdx + 1).trim()
              if (currentSection === 'missionType') {
                missionType[key] = desc
              } else {
                penance[key] = desc
              }
            }
          })
          setDescendiaDescs({ penance, missionType })
        }

        setStatusText('Loading inventory…')
        const result = await invoke('load_cached_inventory')
        if (result) {
          applyRaw(result[0], result[1], exports)
          setStatusText('Loaded cached data')
        } else {
          setStatusText('No cached data – start monitoring in Settings')
          setInventoryData(null)
        }
      } catch (err) {
        setStatusText(`Startup failed: ${err}`)
        setInventoryData(null)
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps


  const fetchWorldstate = useCallback(async () => {
    try {
      const ws = await fetch(ORACLE_API).then(r => r.ok ? r.json() : null)
      if (ws && dict) {
        const parsed = parseWorldstate(ws, { dict, suppDict, ERg, EC, EI, nameToImage, uniqueNameToName, ES, ENWRawRewards, ExportImages })
        setWorldState(parsed)
      }
    } catch (err) { }
  }, [dict, suppDict, EC, ERg, EI, nameToImage, uniqueNameToName, ES, ENWRawRewards, ExportImages])

  useEffect(() => {
    if (Object.keys(dict || {}).length > 0) {
      fetchWorldstate()
      const iv = setInterval(fetchWorldstate, 60000)
      return () => clearInterval(iv)
    }
  }, [fetchWorldstate, dict])

  const callApiHelper = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setIsInventoryLoading(true)
    try {
      const raw = await invoke('call_api_helper')
      if (raw) {
        applyRaw(raw, Date.now())
        setMonitorResult('success')
        setStatusText('Monitoring active')
      } else {
        setMonitorResult('error')
        setStatusText('API helper returned no data')
      }
    } catch (err) {
      setMonitorResult('error')
      setStatusText(`Error: ${err}`)
    } finally {
      busyRef.current = false
      setIsInventoryLoading(false)
    }
  }, [applyRaw])

  const startMonitoring = useCallback(async (intervalMs = 180_000) => {
    if (isMonitoring) return
    setIsMonitoring(true)
    try { await callApiHelper() } catch { }
    intervalRef.current = setInterval(() => callApiHelper().catch(() => { }), intervalMs)
  }, [isMonitoring, callApiHelper])

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setIsMonitoring(false)
    setMonitorResult('idle')
    setStatusText('Monitoring stopped')
  }, [])

  const manualRefresh = useCallback(() => callApiHelper(), [callApiHelper])

  const fissureStateRef = useRef({ squad_relics: [] })
  const ocrActiveRef = useRef(false)

  useEffect(() => {
    if (!exportData) return
    const subs = []

    const levenshtein = (a, b) => {
      const tmp = []
      for (let i = 0; i <= a.length; i++) { tmp[i] = [i] }
      for (let j = 0; j <= b.length; j++) { tmp[0][j] = j }
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          tmp[i][j] = Math.min(tmp[i - 1][j] + 1, tmp[i][j - 1] + 1, tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
        }
      }
      return tmp[a.length][b.length]
    }

    const wordSimilarity = (s1, s2) => {
      if (s1 === s2) return 1.0
      const dist = levenshtein(s1, s2)
      const maxLen = Math.max(s1.length, s2.length)
      return 1.0 - (dist / maxLen)
    }

    subs.push(listen('scanner-relic-phase-start', (e) => {
      const { squad_size } = e.payload
      ocrActiveRef.current = true
      invoke('show_overlay_window', { label: 'overlay-relic' }).catch(() => { })
      invoke('relay_event', { event: 'overlay-squad-size', payload: { squad_size } }).catch(() => { })
    }))

    subs.push(listen('fissure-relic-phase', (e) => {
      const { squad_relics, squad_size } = e.payload
      const resolved = squad_relics.map(r => ({
        ...r, ...parseRelicName(r.unique_name), rewards: getRelicRewards(r.unique_name, exportData)
      }))
      fissureStateRef.current.squad_relics = resolved
      invoke('relay_event', { event: 'overlay-update-relics', payload: { squad_relics: resolved, squad_size } }).catch(() => { })

      // Build the Tesseract wordlist from all words appearing in the reward pool.
      // With squad relics known we have at most 24 candidates -- a tiny, precise
      // vocabulary that dramatically narrows what Tesseract considers valid output.
      const wordSet = new Set()
      for (const relic of resolved) {
        for (const rew of (relic.rewards || [])) {
          const name = (rew.name || '').trim()
          if (name) name.split(/\s+/).forEach(w => { if (w.length > 1) wordSet.add(w) })
        }
      }
      if (wordSet.size > 0) {
        invoke('write_ocr_wordlist', { words: [...wordSet] }).catch(err =>
          console.log(`[MonitoringContext] write_ocr_wordlist failed: ${err}`)
        )
      }
    }))

    subs.push(listen('fissure-reward-phase', async (e) => {
      const { local_reward, squad_size } = e.payload
      if (!local_reward) return
      const baseItem = fissureStateRef.current.squad_relics.flatMap(r => r.rewards).find(r => r.uniqueName === local_reward) || {}
      const platPrice = await getPrice(local_reward, baseItem.name, baseItem.ducats)
      const reward = { uniqueName: local_reward, ...baseItem, platPrice }
      invoke('relay_event', { event: 'overlay-update-reward', payload: { local_reward: reward, squad_size } }).catch(() => { })
    }))

    subs.push(listen('fissure-ocr-band', async (e) => {
      const { text, slot_results, is_debug } = e.payload
      if (!ocrActiveRef.current && !is_debug) return
      if (is_debug) ocrActiveRef.current = true
      if (!slot_results) return


      for (const res of slot_results) {
        const ocrText = cleanOcrText(res.text || '');
        if (ocrText.length < 3) continue;

        // Build candidate pool (squad relics if available, else global)
        let candidates = [];
        const currentRelics = fissureStateRef.current.squad_relics || [];
        if (currentRelics.length > 0 && !is_debug) {
          const seen = new Set();
          for (const r of currentRelics) {
            if (r.rewards) r.rewards.forEach(rew => {
              if (!seen.has(rew.uniqueName)) {
                candidates.push(rew);
                seen.add(rew.uniqueName);
              }
            });
          }
        } else {
          // Only keep items that can actually appear in relic reward UI
          candidates = (globalRewardPool || []).filter(item => {
            if (!item || !item.name) return false;
            const n = item.name.toUpperCase();
            return n.includes('PRIME') || n.includes('BLUEPRINT') || n === 'FORMA BLUEPRINT' ||
              n.includes('SLIVER') || n.includes('FRAGMENT') || n.includes('AYATAN') ||
              n.includes('STAR') || n.includes('REQUIEM') || n.includes('ADAPTER');
          });
        }

        const cleanOcrNoSpace = ocrText.replace(/\s/g, '');
        let bestMatch = null;
        let bestScore = -1;

        for (const item of candidates) {
          if (!item || !item.name) continue;
          const cleanItemName = item.name.toUpperCase().replace(/[^A-Z0-9]/g, ' ')
          const cleanItemNoSpace = cleanItemName.replace(/\s/g, '');

          let score = 0
          const ocrWords = ocrText.split(' ').filter(w => w.length > 0)
          const candWords = cleanItemName.split(' ').filter(w => w.length > 0)
          if (candWords.length === 0) continue;

          // 1. Direct Subset/Exact checks
          if (ocrText === cleanItemName || ocrText === cleanItemNoSpace || cleanOcrNoSpace === cleanItemNoSpace) {
            score = 1.3;
          } else if (ocrText.includes(cleanItemName) || cleanOcrNoSpace.includes(cleanItemNoSpace)) {
            score = 1.1;
          } else {
            // 2. Glue-Aware Word-by-word matching
            let totalWeightedSim = 0;
            let totalWeight = 0;

            for (let i = 0; i < candWords.length; i++) {
              const cw = candWords[i];
              let bestWordSim = 0;

              // Check standalone words
              for (const ow of ocrWords) {
                const sim = wordSimilarity(ow, cw);
                if (sim > bestWordSim) bestWordSim = sim;
              }

              // GLUE CHECK: If the candidate word is stuck to another word (e.g. MIRAGPRIME)
              // we check the best similarity of any SUBSTRING of the mangled OCR
              if (bestWordSim < 0.85) {
                for (const ow of ocrWords) {
                  if (ow.length > cw.length && ow.includes(cw)) {
                    bestWordSim = Math.max(bestWordSim, 0.9);
                  }
                }
              }

              let weight = 1.0;
              if (i === 0) weight = 8.0; // The Name is king
              else if (cw === 'PRIME') weight = 0.5;
              else if (cw === 'BLUEPRINT') weight = 0.3;

              totalWeightedSim += (bestWordSim * weight);
              totalWeight += weight;
            }

            score = totalWeightedSim / totalWeight;

            // 3. Penalty: zero the score only if NO significant word is a match.
            // We check if at least one 'meaningful' word from the candidate exists in OCR.
            const meaningfulWords = candWords.filter(w => w.length > 3 && w !== 'PRIME' && w !== 'BLUEPRINT');
            const hasAnyMeaningfulMatch = meaningfulWords.length === 0 || meaningfulWords.some(mw =>
              ocrWords.some(ow => ow.includes(mw) || mw.includes(ow) || wordSimilarity(ow, mw) > 0.8)
            );

            if (!hasAnyMeaningfulMatch && score < 0.95) score = 0;
          }

          if (score > bestScore) {
            bestScore = score;
            bestMatch = item;
          }
        }

        if (bestMatch && bestScore >= 0.60) {
          const platPrice = await getPrice(bestMatch.uniqueName, bestMatch.name, bestMatch.ducats || 0);
          const inventory = getRewardInventoryContext(bestMatch.uniqueName, inventoryData, exportData);
          invoke('relay_event', {
            event: 'overlay-update-ocr',
            payload: { slot: res.slot, confirmed_reward: bestMatch.name, item: { ...bestMatch, icon: EI[bestMatch.uniqueName], platPrice, inventory } }
          }).catch(() => { });
          if (import.meta.env.DEV) console.log(`[MonitoringContext] Slot ${res.slot} MATCHED: "${ocrText}" -> ${bestMatch.name} (Score: ${bestScore.toFixed(3)})`);
        } else {
          if (import.meta.env.DEV) console.log(`[MonitoringContext] Slot ${res.slot} failed match: "${ocrText}" (Best: ${bestMatch?.name || 'None'}, Score: ${bestScore.toFixed(3)})`);
        }
      }

    }))

    subs.push(listen('fissure-reward-closed', () => {
      ocrActiveRef.current = false
    }))

    return () => { subs.forEach(p => p.then(f => f())) }
  }, [exportData, inventoryData, globalRewardPool, EI])

  return (
    <MonitoringContext.Provider value={{
      exportData, spIncursions, arbys, descendiaDescs,
      dict, suppDict, EC, ERg, EI, nameToImage, uniqueNameToName, ES, ENW, ENWRawRewards, ExportImages, ExportTextIcons, arbyTiers: ARBY_TIERS,
      isMonitoring, monitorResult, autoStart, setAutoStart, lastUpdate, rawInventory, inventoryData, isInventoryLoading, worldState, setWorldState, statusText,
      masteryProgress,
      startMonitoring, stopMonitoring, manualRefresh, callApiHelper
    }}>
      {children}
    </MonitoringContext.Provider>
  )
}

export const useMonitoring = () => useContext(MonitoringContext)