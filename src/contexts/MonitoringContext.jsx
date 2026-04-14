import { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import { parseInventory } from '../lib/inventoryParser'
import { parseWorldstate } from '../lib/worldstateParser'

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

const ARBY_TIERS = {
  SolNode106: "S", SolNode147: "S", SolNode149: "S", ClanNode22: "S",
  SolNode25: "A", SolNode224: "A", SolNode195: "A", SolNode42: "A",
  ClanNode24: "A", ClanNode6: "A", SolNode707: "B", SolNode125: "B",
  ClanNode4: "B", SolNode412: "B", SolNode719: "B", SolNode22: "B",
  SolNode211: "B", ClanNode8: "B", SolNode72: "B", SolNode212: "B",
  SolNode46: "B", SolNode130: "C", ClanNode15: "C", SolNode408: "C",
  SolNode402: "C", SolNode26: "C", SolNode18: "C", SolNode305: "C",
  SolNode185: "C", SolNode43: "C", SolNode64: "C", SolNode122: "C",
  SolNode167: "C", SolNode164: "C", ClanNode18: "C", SolNode85: "D",
  ClanNode2: "D", SolNode172: "D", ClanNode0: "D", SolNode17: "D",
  SettlementNode11: "D", SolNode23: "D", SolNode450: "B",
}

const MonitoringContext = createContext(null)

export function MonitoringProvider({ children }) {
  const [exportData, setExportData] = useState(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [monitorResult, setMonitorResult] = useState('idle') // 'idle' | 'success' | 'error'
  const [autoStart, setAutoStartState] = useState(localStorage.getItem('autoStartMonitoring') === 'true')
  const [lastUpdate, setLastUpdate] = useState(localStorage.getItem('lastUpdate') || null)
  const [rawInventory, setRawInventory] = useState(null)
  const [inventoryData, setInventoryData] = useState(undefined)
  const [isUpdating, setIsUpdating] = useState(false)
  const [worldState, setWorldState] = useState(null)
  const [statusText, setStatusText] = useState('Initializing…')
  const [spIncursions, setSpIncursions] = useState(null)
  const [arbys, setArbys] = useState(null)
  const [descendiaDescs, setDescendiaDescs] = useState({ penance: {}, missionType: {} })
  const intervalRef = useRef(null)
  const busyRef = useRef(false)
  const autoStartRef = useRef(autoStart)
  const notifiedRef = useRef({
    arbitration: new Set(),
    foundry: new Set(),
    syndicate: new Set(),
    syndicateWaste: { lastNotify: 0, count: 0 },
    mastery: {},
    checklist: {}
  })

  const isInventoryLoading = useMemo(() => {
    return (inventoryData === undefined) || (!!rawInventory && !inventoryData) || isUpdating;
  }, [inventoryData, rawInventory, isUpdating]);

  const setAutoStart = useCallback((val) => {
    const v = !!val
    setAutoStartState(v)
    autoStartRef.current = v
    localStorage.setItem('autoStartMonitoring', String(v))
  }, [])

  // ── Derived lookup maps ──────────────────────────────────────────────────────
  // All computed once when exportData loads; consumers just destructure from context.
  const dict = useMemo(() => exportData?.['dict.en'] ?? {}, [exportData])
  const suppDict = useMemo(() => exportData?.['supp-dict-en'] ?? {}, [exportData])

  const EC = useMemo(() => toMap(exportData?.ExportChallenges, 'ExportChallenges'), [exportData])

  const ERg = useMemo(() => {
    const data = exportData?.ExportRegions
    if (!data) return {}
    const map = {}
    if (Array.isArray(data)) {
      for (const r of data) {
        const key = r.uniqueName || r.name || `SolNode${r.regionIndex}`
        if (key) map[key] = r
      }
    } else if (typeof data === 'object') {
      Object.entries(data).forEach(([k, v]) => { if (k !== 'ExportRegions') map[k] = v })
      if (Array.isArray(data.ExportRegions)) {
        for (const r of data.ExportRegions) {
          const key = r.uniqueName || r.name || `SolNode${r.regionIndex}`
          if (key) map[key] = r
        }
      }
    }
    return map
  }, [exportData])

  const ES = useMemo(() => exportData?.ExportSyndicates ?? {}, [exportData])
  const ENW = useMemo(() => toMap(exportData?.ExportNightwave, 'rewards'), [exportData])
  const ENWRawRewards = useMemo(() => exportData?.ExportNightwave?.rewards || [], [exportData])
  const ExportImages = useMemo(() => exportData?.ExportImages ?? {}, [exportData])
  const ExportTextIcons = useMemo(() => exportData?.ExportTextIcons ?? {}, [exportData])

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

    const toBrowseWf = (path) => {
      if (!path || path.startsWith('http')) return null
      if (path.includes('/')) return `https://browse.wf${path.startsWith('/') ? '' : '/'}${path}`
      return null
    }

    const indexEntry = (e, keyFromMap, tableSource) => {
      if (!e || typeof e !== 'object') return
      const un = e.uniqueName || e.ItemType || keyFromMap
      if (!un) return
      const url = toBrowseWf(e.icon ?? e.texture ?? '')
      if (url) EI[un] = url
      
      // Use direct name if available, otherwise if it's a recipe, try to inherit from result
      let nameKey = e.name ?? e.displayName ?? ''
      if (!nameKey && tableSource === 'ExportRecipes' && e.resultType) {
        // We'll resolve this in a second pass or check if already indexed
        nameKey = e.resultType 
      }
      
      uniqueNameToName[un] = nameKey
      const locKey = uniqueNameToName[un]
      if (locKey) {
        const resolved = (dict[locKey] || dict['/' + locKey] || '').replace(/<[^>]*>/g, '').trim()
        if (resolved && !resolved.startsWith('/')) { if (url) nameToImage[resolved.toLowerCase()] = url }
        if (!locKey.startsWith('/')) { if (url) nameToImage[locKey.toLowerCase()] = url }
      }
    }

    for (const tbl of tableNames) {
      const data = exportData[tbl]
      if (!data) continue
      if (Array.isArray(data)) { data.forEach(e => indexEntry(e, null, tbl)); continue }
      if (typeof data === 'object') {
        const nested = data[tbl] ?? (Object.keys(data).length === 1 && typeof Object.values(data)[0] === 'object' ? Object.values(data)[0] : null)
        if (Array.isArray(nested)) nested.forEach(e => indexEntry(e, null, tbl))
        else Object.entries(data).forEach(([k, v]) => indexEntry(v, k, tbl))
      }
    }

    // Second pass for recipes to resolve names AND icons that point to uniqueNames (resultType)
    if (exportData.ExportRecipes) {
      Object.entries(exportData.ExportRecipes).forEach(([un, e]) => {
        const target = e.resultType
        if (!target) return
        
        // Inherit name mapping if missing or internal
        if (uniqueNameToName[target] && (!uniqueNameToName[un] || uniqueNameToName[un].startsWith('/Lotus/'))) {
          uniqueNameToName[un] = uniqueNameToName[target]
        }
        
        // Inherit icon if recipe doesn't have one
        if (!EI[un] && EI[target]) {
          EI[un] = EI[target]
        }
      })
    }
    return { EI, nameToImage, uniqueNameToName }
  }, [exportData, dict])

  const applyRaw = useCallback((raw, ts, exports = exportData) => {
    if (!raw) return
    setRawInventory(raw)
    if (!exports) return
    try {
      const parsed = parseInventory(raw, exports)
      setInventoryData(parsed || null)
    } catch (err) {
      console.error('[MonitoringContext] parseInventory failed:', err)
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
          const [data, timestamp] = result
          // Note: parseWorldstate call in applyRaw handles its own logic
          applyRaw(data, timestamp, exports)
          setStatusText('Loaded cached data')
        } else {
          setStatusText('No cached data – start monitoring in Settings')
          setInventoryData(null)
        }
      } catch (err) {
        console.warn('Startup failed:', err)
        setStatusText(`Startup failed: ${err}`)
        setInventoryData(null)
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchWorldstate = useCallback(async () => {
    try {
      const ws = await fetch(ORACLE_API).then(r => r.ok ? r.json() : null)
      if (ws && dict && suppDict && EC && ERg && EI) {
        const parsed = parseWorldstate(ws, { dict, suppDict, ERg, EC, EI, nameToImage, uniqueNameToName, ES, ENWRawRewards, ExportImages })
        setWorldState(parsed)
      }
    } catch (err) {
      console.warn('Worldstate fetch failed:', err)
    }
  }, [dict, suppDict, EC, ERg, EI, nameToImage, uniqueNameToName, ES, ENWRawRewards, ExportImages])

  useEffect(() => {
    if (Object.keys(dict || {}).length > 0) {
      fetchWorldstate()
      const iv = setInterval(fetchWorldstate, 60000)
      return () => clearInterval(iv)
    }
  }, [fetchWorldstate, dict])

  useEffect(() => {
    if (rawInventory && exportData && inventoryData === undefined) {
      applyRaw(rawInventory, lastUpdate, exportData)
    }
  }, [rawInventory, exportData, inventoryData, lastUpdate, applyRaw])

  // Check notification conditions
  useEffect(() => {
    if (!inventoryData) return
    const settings = {
      arbitrationEnabled: localStorage.getItem('notif_arbitration_enabled') === 'true',
      arbitrationHours: parseInt(localStorage.getItem('notif_arbitration_hours')) || 24,
      arbitrationRemind: parseInt(localStorage.getItem('notif_arbitration_remind')) || 30,
      foundryEnabled: localStorage.getItem('notif_foundry_enabled') === 'true',
      foundryMinutes: parseInt(localStorage.getItem('notif_foundry_minutes')) || 5,
      syndicateEnabled: localStorage.getItem('notif_syndicate_enabled') === 'true',
      syndicateWasteEnabled: localStorage.getItem('notif_syndicate_waste_enabled') === 'true',
      masteryEnabled: localStorage.getItem('notif_mastery_enabled') === 'true',
      masteryPercent: parseInt(localStorage.getItem('notif_mastery_percent')) || 50,
      checklistMinutes: parseInt(localStorage.getItem('notif_checklist_minutes')) || 60,
    }
    const doNotify = async (title, message, image = null) => {
      const pos = localStorage.getItem('notif_position') || 'top-right'
      await invoke('show_notification', { title, message, image, position: pos }).catch(() => {})
    }

    // Foundry: only notify if remaining time > threshold at scan time
    if (settings.foundryEnabled) {
      const foundryItems = inventoryData?.foundry ?? []
      const now = Date.now() / 1000 // Unix timestamp in seconds
      for (const item of foundryItems) {
        if (item.ready) continue // Skip already ready items
        const finishTime = item.finishTime ?? 0
        if (finishTime <= 0) continue
        const remainingSeconds = finishTime - now
        const thresholdSeconds = settings.foundryMinutes * 60
        // Only notify if remaining time is GREATER than threshold
        // (i.e., item will finish AFTER the notification would fire)
        if (remainingSeconds > thresholdSeconds && remainingSeconds <= (24 * 3600)) {
          const itemId = item.uniqueName || item.name || String(finishTime)
          if (!notifiedRef.current.foundry.has(itemId)) {
            notifiedRef.current.foundry.add(itemId)
            const timeLeft = Math.round(remainingSeconds / 60)
            doNotify('Foundry Progress', `${item.name || 'Item'} will be ready in ${timeLeft} minutes`)
          }
        }
      }
    }

    // Syndicate Capped: check if any syndicate is at max standing
    if (settings.syndicateEnabled) {
      const affiliations = inventoryData?.Affiliations || {}
      for (const [tag, aff] of Object.entries(affiliations)) {
        const standing = aff.Standing || 0
        const rank = aff.Title || 0
        // Get rank cap for this rank
        const syndInfo = ES[tag]
        const caps = syndInfo?.ranks?.[rank]?.standing
        if (caps !== undefined) {
          const rankCap = Math.abs(caps)
          if (standing >= rankCap && standing > 0) {
            if (!notifiedRef.current.syndicate.has(tag)) {
              notifiedRef.current.syndicate.add(tag)
              const name = syndInfo?.name || tag
              doNotify('Syndicate Capped', `${name} has reached max daily standing`)
            }
          }
        }
      }
    }

    // Waste Reminder: check opponent of pledged faction
    if (settings.syndicateWasteEnabled) {
      const pledged = inventoryData?.SupportedSyndicate
      if (pledged) {
        const opponentTag = { 
          'Steel Meridian': 'Perrin Seqments', 
          'Perrin Seqments': 'Steel Meridian', 
          'Arbiters of Hexis': 'The Society', 
          'The Society': 'Arbiters of Hexis',
          'New Loka': 'Red Veil', 
          'Red Veil': 'New Loka',
          'Cephalon Suda': 'The Vigilant', 
          'The Vigilant': 'Cephalon Suda' 
        }[pledged]
        if (opponentTag) {
          const aff = inventoryData?.Affiliations?.[opponentTag]
          const opponentStanding = aff?.Standing || 0
          const opponentRank = aff?.Title || 0
          const oppSyndInfo = ES[opponentTag]
          const oppCaps = oppSyndInfo?.ranks?.[opponentRank]?.standing
          if (oppCaps !== undefined) {
            const oppRankCap = Math.abs(oppCaps)
            // Notify if opponent has more than 50% of rank cap
            if (oppRankCap > 0 && opponentStanding > oppRankCap * 0.5) {
              const now = Date.now()
              const sixHours = 6 * 60 * 60 * 1000
              const wasteData = notifiedRef.current.syndicateWaste
              if (now - wasteData.lastNotify > sixHours && wasteData.count < 2) {
                const oppName = oppSyndInfo?.name || opponentTag
                const pledgedName = ES[pledged]?.name || pledged
                wasteData.lastNotify = now
                wasteData.count++
                doNotify('Standing Waste Warning', `${oppName} (enemy of ${pledgedName}) has ${opponentStanding.toLocaleString()} standing`)
              }
            }
          }
        }
      }
    }

    // Checklist tasks: notify before daily/weekly reset
    const checklistTasks = window.__checklistTasks
    if (checklistTasks && checklistTasks.length > 0) {
      const thresholdMs = settings.checklistMinutes * 60 * 1000
      const cooldownMs = Math.min(settings.checklistMinutes * 30 * 1000, 30 * 60 * 1000) // 30% of threshold, max 30min
      const nowMs = Date.now()
      for (const task of checklistTasks) {
        if (!task.notifEnabled) continue
        const timeUntilReset = task.nextResetTime - nowMs
        // Notify if less than threshold left and not yet notified for this cycle
        if (timeUntilReset > 0 && timeUntilReset <= thresholdMs) {
          const lastNotified = notifiedRef.current.checklist[task.id] || 0
          // Only notify if haven't notified within the cooldown for this task
          if (nowMs - lastNotified > cooldownMs) {
            notifiedRef.current.checklist[task.id] = nowMs
            const timeLeft = Math.round(timeUntilReset / 60000)
            doNotify('Task Reminder', `${task.label} resets in ${timeLeft} minutes`)
          }
        }
        // Clear notification state if reset has passed
        if (timeUntilReset <= 0 && notifiedRef.current.checklist[task.id]) {
          delete notifiedRef.current.checklist[task.id]
        }
      }
    }
  }, [inventoryData, ES])

  const callApiHelper = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setIsUpdating(true)
    try {
      setStatusText('Launching warframe-api-helper…')
      // Fetch everything concurrently: inventory + text updates
      const [raw, spiText, arbText] = await Promise.all([
        invoke('call_api_helper'),
        invoke('load_txt_file', { name: 'sp-incursions.txt' }),
        invoke('load_txt_file', { name: 'arbys.txt' }),
      ])

      if (spiText) setSpIncursions(spiText)
      if (arbText) setArbys(arbText)

      if (raw) {
        applyRaw(raw, Date.now())
        setStatusText(`Updated - ${new Date().toLocaleTimeString()}`)
        setMonitorResult('success')
      } else {
        setStatusText('Helper returned no data')
        setMonitorResult('error')
      }
    } catch (err) {
      setStatusText(`Error: ${String(err)}`)
      setMonitorResult('error')
      throw err
    } finally {
      busyRef.current = false
      setIsUpdating(false)
    }
  }, [applyRaw])

  const manualRefresh = useCallback(async () => {
    if (busyRef.current) return
    try {
      setStatusText('Refreshing…')
      await callApiHelper()
    } catch (err) {
      setStatusText(`Refresh failed: ${err?.message ?? err}`)
    }
  }, [callApiHelper])

  const startMonitoring = useCallback(async (intervalMs = 180_000) => {
    if (isMonitoring) return
    setIsMonitoring(true)
    setStatusText('Starting monitoring…')
    try { await callApiHelper() } catch { /* will retry */ }
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => callApiHelper().catch(() => { }), intervalMs)
  }, [isMonitoring, callApiHelper])

  // Auto-start monitoring once on launch if the user preference is enabled
  const autoStartFiredRef = useRef(false)
  useEffect(() => {
    if (autoStartRef.current && exportData && !isMonitoring && !autoStartFiredRef.current) {
      autoStartFiredRef.current = true
      startMonitoring()
    }
  }, [exportData, isMonitoring, startMonitoring])

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setIsMonitoring(false)
    setMonitorResult('idle')
    setStatusText('Monitoring stopped')
  }, [])

  return (
    <MonitoringContext.Provider value={{
      exportData, spIncursions, arbys, descendiaDescs,
      dict, suppDict, EC, ERg, EI, nameToImage, uniqueNameToName, ES, ENW, ENWRawRewards, ExportImages, ExportTextIcons, arbyTiers: ARBY_TIERS,
      isMonitoring, monitorResult, autoStart, setAutoStart, lastUpdate, rawInventory, inventoryData, isInventoryLoading, worldState, setWorldState, statusText,
      startMonitoring, stopMonitoring, manualRefresh, callApiHelper,
      notifSettings: {
        arbitrationEnabled: localStorage.getItem('notif_arbitration_enabled') === 'true',
        arbitrationHours: parseInt(localStorage.getItem('notif_arbitration_hours')) || 24,
        arbitrationRemind: parseInt(localStorage.getItem('notif_arbitration_remind')) || 30,
        foundryEnabled: localStorage.getItem('notif_foundry_enabled') === 'true',
        foundryMinutes: parseInt(localStorage.getItem('notif_foundry_minutes')) || 5,
        syndicateEnabled: localStorage.getItem('notif_syndicate_enabled') === 'true',
        syndicateWasteEnabled: localStorage.getItem('notif_syndicate_waste_enabled') === 'true',
        masteryEnabled: localStorage.getItem('notif_mastery_enabled') === 'true',
        masteryPercent: parseInt(localStorage.getItem('notif_mastery_percent')) || 50,
      },
      notifiedRef
    }}>
      {children}
    </MonitoringContext.Provider>
  )
}

export function useMonitoring() {
  return useContext(MonitoringContext)
}

export default MonitoringContext