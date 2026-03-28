import { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import { parseInventory } from '../lib/inventoryParser'

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
  const [lastUpdate, setLastUpdate] = useState(localStorage.getItem('lastUpdate') || null)
  const [rawInventory, setRawInventory] = useState(null)
  const [inventoryData, setInventoryData] = useState(undefined)
  const [statusText, setStatusText] = useState('Initializing…')
  const [spIncursions, setSpIncursions] = useState(null)
  const [arbys, setArbys] = useState(null)
  const intervalRef = useRef(null)
  const busyRef = useRef(false)

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

    const indexEntry = (e, keyFromMap) => {
      if (!e || typeof e !== 'object') return
      const un = e.uniqueName || e.ItemType || keyFromMap
      if (!un) return
      const url = toBrowseWf(e.icon ?? e.texture ?? '')
      if (url) EI[un] = url
      uniqueNameToName[un] = e.name ?? e.displayName ?? ''
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
      if (Array.isArray(data)) { data.forEach(e => indexEntry(e)); continue }
      if (typeof data === 'object') {
        const nested = data[tbl] ?? (Object.keys(data).length === 1 && typeof Object.values(data)[0] === 'object' ? Object.values(data)[0] : null)
        if (Array.isArray(nested)) nested.forEach(e => indexEntry(e))
        else Object.entries(data).forEach(([k, v]) => indexEntry(v, k))
      }
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
        const [exports, spiText, arbText] = await Promise.all([
          invoke('load_all_exports'),
          invoke('load_txt_file', { name: 'sp-incursions.txt' }),
          invoke('load_txt_file', { name: 'arbys.txt' }),
        ])

        setExportData(exports)
        setSpIncursions(spiText || '')
        setArbys(arbText || '')

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

  useEffect(() => {
    if (rawInventory && exportData && inventoryData === undefined) {
      applyRaw(rawInventory, lastUpdate, exportData)
    }
  }, [rawInventory, exportData, inventoryData, lastUpdate, applyRaw])

  const callApiHelper = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
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
      } else {
        setStatusText('Helper returned no data')
      }
    } catch (err) {
      setStatusText(`Error: ${String(err)}`)
      throw err
    } finally {
      busyRef.current = false
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

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setIsMonitoring(false)
    setStatusText('Monitoring stopped')
  }, [])

  return (
    <MonitoringContext.Provider value={{
      exportData, spIncursions, arbys,
      dict, suppDict, EC, ERg, EI, nameToImage, uniqueNameToName, ES, ENW, arbyTiers: ARBY_TIERS,
      isMonitoring, lastUpdate, rawInventory, inventoryData, statusText,
      startMonitoring, stopMonitoring, manualRefresh, callApiHelper,
    }}>
      {children}
    </MonitoringContext.Provider>
  )
}

export function useMonitoring() {
  return useContext(MonitoringContext)
}

export default MonitoringContext