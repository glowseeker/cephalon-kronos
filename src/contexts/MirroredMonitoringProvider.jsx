import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { parseInventory } from '../lib/inventoryParser'
import { loadLocale } from '../lib/i18n'
import { buildDropIndex } from '../lib/dropsParser'
import { parseWorldstate, buildArchimedeaMap } from '../lib/worldstateParser'
import { registerGameDict } from '../lib/gameTerm'
import { getAllRelicRewards } from '../lib/relicParser'
import { listen } from '@tauri-apps/api/event'
import { MonitoringContext } from './MonitoringContext'
import { getPricesBatch } from '../lib/marketEngine'
import { loadWarframeItemsMaps } from '../lib/wfcdLoader'

const OFFICIAL_API = 'https://api.warframe.com/cdn/worldState.php'
const ORACLE_API = 'https://oracle.browse.wf/worldState.json'

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
  'SolNode840': 'S', 'SolNode841': 'A', 'SolNode842': 'B', 'SolNode843': 'C',
  'SolNode844': 'D', 'ClanNode15': 'S', 'ClanNode16': 'A', 'ClanNode17': 'B',
  'ClanNode18': 'C', 'ClanNode19': 'D', 'SolNode932': 'S', 'SolNode933': 'A',
  'SolNode934': 'B', 'SolNode935': 'C', 'SolNode936': 'D',
}

export default function MirroredMonitoringProvider({ children }) {
  const [exportData, setExportData] = useState(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [monitorResult, setMonitorResult] = useState('idle')
  const [autoStart, setAutoStartState] = useState(() => localStorage.getItem('autoStartMonitoring') === 'true')
  const autoStartRef = useRef(autoStart)
  const [lastUpdate, setLastUpdate] = useState(() => localStorage.getItem('lastUpdate') || null)
  const [rawInventory, setRawInventory] = useState(null)
  const [inventoryData, setInventoryData] = useState(undefined)
  const [isInventoryLoading, setIsInventoryLoading] = useState(true)
  const [allPrices, setAllPrices] = useState(() => {
    try {
      const data = localStorage.getItem('wfm_price_cache');
      if (data) {
        const cache = JSON.parse(data);
        const prices = {};
        for (const [key, val] of Object.entries(cache)) {
          if (val && typeof val.plat === 'number') prices[key] = val.plat;
        }
        if (Object.keys(prices).length > 0) return prices;
      }
      const engineRaw = localStorage.getItem('market_engine_prices');
      if (engineRaw) {
        const { data: entries } = JSON.parse(engineRaw);
        if (entries && entries.length > 0) return Object.fromEntries(entries);
      }
    } catch { /* ignore */ }
    return {};
  })
  const allPricesRef = useRef(allPrices)
  useEffect(() => { allPricesRef.current = allPrices }, [allPrices])
  const [isPriceLoading, setIsPriceLoading] = useState(false)
  const [priceFetchProgress, setPriceFetchProgress] = useState(null)
  const [priceLastUpdated, setPriceLastUpdated] = useState(localStorage.getItem('wfm_price_last_updated') || null)
  const priceFetchRef = useRef(false)
  const [worldState, setWorldState] = useState(null)
  const [statusText, setStatusText] = useState('Initializing…')
  const [nextRetryAt, setNextRetryAt] = useState(0)
  const [spIncursions, setSpIncursions] = useState(null)
  const [arbys, setArbys] = useState(null)
  const [descendiaDesc, setDescendiaDesc] = useState({})
  const [archonModifiers, setArchonModifiers] = useState(null)
  const [arbitrationModifiers, setArbitrationModifiers] = useState(null)
  const [cardImagesPath, setCardImagesPath] = useState('')
  const [fixProgress] = useState({ phase: 'done', checking: false })
  const loadedRef = useRef(false)
  const intervalRef = useRef(null)
  const busyRef = useRef(false)
  const autoStartedRef = useRef(false)
  const processingRef = useRef(false)
  const hasCachedDataRef = useRef(false)
  const localeRef = useRef('en')
  const i18nRef = useRef(null)

  const setAutoStart = useCallback((val) => {
    const v = !!val
    setAutoStartState(v)
    autoStartRef.current = v
    localStorage.setItem('autoStartMonitoring', String(v))
  }, [])

  const PATCH_FILES = [
    ['ExportUpgrades_fixed.json', 'ExportUpgradesFixed'],
    ['ExportAvionics_fixed.json', 'ExportAvionicsFixed'],
    ['mod-icon-map.json', 'ModIconMap'],
    ['peely-pix-map.json', 'PeelyPixMap'],
    ['peely-pix-names.json', 'PeelyPixNames'],
  ]

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    // Load settings for locale + i18n translations
    import('../lib/settings').then(async ({ loadSettings, getSetting }) => {
      await loadSettings()
      localeRef.current = getSetting('gameLocale', 'en')
      i18nRef.current = await loadLocale(localeRef.current)
    })

    // Lightweight path queries - these return static paths, no file I/O
    invoke('get_card_images_path').then(setCardImagesPath).catch(() => { })

    // Check shared monitoring state
    invoke('get_monitoring_active').then(setIsMonitoring).catch(() => { })

    invoke('sidebar_load_data')
      .then(async result => {
        const exports = result.exports ? { ...result.exports } : null

        // Apply patched export files in parallel (same as main MonitoringContext)
        if (exports) {
          try {
            const results = await Promise.all(
              PATCH_FILES.map(([fname]) =>
                invoke('read_file_bytes', { relative: `data/assets/data/${fname}` }).catch(() => null),
              ),
            )
            results.forEach((bytes, idx) => {
              if (bytes) {
                const key = PATCH_FILES[idx][1]
                exports[key] = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)))
              }
            })
          } catch { /* patch file not found, skip */ }
        }

        // Await wfcd enhancement BEFORE the first render so the shell never
        // paints against raw (un-enhanced) exports. This fixes the latent
        // ReferenceError (wiSupplement referenced out of scope at the old
        // block) + the double setExportData pass (151 + 174) that caused the
        // mirrored window's inventory display race.
        if (exports) {
          const { maps: wiMaps, supplement: wiSupplement } = await loadWarframeItemsMaps()
          exports.uniqueNameToName = { ...(exports.uniqueNameToName || {}), ...wiSupplement.uniqueNameToName }
          exports.nameToImage = { ...(exports.nameToImage || {}), ...wiSupplement.nameToImage }
          exports.WI_Supplement = wiSupplement
        }

        const [spiRes, arbRes, descRes] = await Promise.allSettled([
          invoke('load_txt_file', { name: 'sp-incursions.txt' }),
          invoke('load_txt_file', { name: 'arbys.txt' }),
          invoke('load_txt_file', { name: 'descendia.txt' }),
        ])
        if (spiRes.status === 'fulfilled' && spiRes.value) setSpIncursions(spiRes.value)
        if (arbRes.status === 'fulfilled' && arbRes.value) setArbys(arbRes.value)
        if (descRes.status === 'fulfilled' && descRes.value) {
          const descMap = {}
          for (const line of descRes.value.split('\n')) {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith('#')) continue
            const sepIdx = trimmed.indexOf(': ')
            if (sepIdx > 0) {
              descMap[trimmed.slice(0, sepIdx)] = trimmed.slice(sepIdx + 2)
            }
          }
          setDescendiaDesc(descMap)
        }

        // Set exports once (after wfcd enhancement) — single render pass.
        setExportData(exports)

        if (result.inventory) {
          hasCachedDataRef.current = true
          setRawInventory(result.inventory)
        } else {
          hasCachedDataRef.current = false
        }
        if (result.inventoryTimestamp) {
          setLastUpdate(String(result.inventoryTimestamp))
          localStorage.setItem('lastUpdate', String(result.inventoryTimestamp))
        }
        setStatusText('Ready')
        setIsInventoryLoading(false)
      })
      .catch(() => {
        setStatusText('Failed to load data')
        setIsInventoryLoading(false)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-start monitoring on mount if previously enabled ──
  useEffect(() => {
    if (autoStartedRef.current) return
    autoStartedRef.current = true
    if (autoStartRef.current && !isMonitoring) {
      startMonitoringFn().catch(() => { })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Parse inventory when both exportData and rawInventory change ──
  useEffect(() => {
    if (!exportData || !rawInventory) return
    try {
      const parsed = parseInventory(rawInventory, exportData, dict, localeRef.current, i18nRef.current)
      setInventoryData(parsed)
    } catch {
      console.error('[MirroredMonitoring] parseInventory failed')
      setInventoryData(null)
    }
  }, [exportData, rawInventory])

  // ── Pre-fetch prices after inventory loads ──
  useEffect(() => {
    if (!inventoryData) return
    if (priceFetchRef.current) return
    priceFetchRef.current = true
    const items = []
    const seen = new Set()

    for (const m of (inventoryData.mods ?? [])) {
      if (!seen.has(m.unique_name)) {
        items.push({ uniqueName: m.unique_name, name: m.name, maxRank: m.max_rank ?? null })
        seen.add(m.unique_name)
      }
    }
    for (const a of (inventoryData.arcanes ?? [])) {
      if (!seen.has(a.unique_name)) {
        items.push({ uniqueName: a.unique_name, name: a.name })
        seen.add(a.unique_name)
      }
    }
    for (const set of Object.values(inventoryData.primeSets ?? {})) {
      for (const part of (set.parts ?? [])) {
        if (!seen.has(part.unique_name)) {
          items.push({ uniqueName: part.unique_name, name: part.name })
          seen.add(part.unique_name)
        }
      }
      if (set.setPath && !seen.has(set.setPath)) {
        items.push({ uniqueName: set.setPath, name: `${set.name} Set` })
        seen.add(set.setPath)
      }
    }
    for (const r of (inventoryData.relics ?? [])) {
      if (r.unique_name && !seen.has(r.unique_name)) {
        items.push({ uniqueName: r.unique_name, name: r.name })
        seen.add(r.unique_name)
      }
      for (const rew of (r.rewards ?? [])) {
        if (!seen.has(rew.uniqueName)) {
          items.push({ uniqueName: rew.uniqueName, name: rew.name })
          seen.add(rew.uniqueName)
        }
      }
    }
    if (items.length > 0) {
      setIsPriceLoading(true)
      setPriceFetchProgress({ current: 0, total: items.filter(i => i.name && !/\bForma\b/.test(i.name)).length })
      const onProgress = (p) => setPriceFetchProgress(p)
      getPricesBatch(items, onProgress).then(({ results }) => {
        setAllPrices(results)
        setIsPriceLoading(false)
        setPriceFetchProgress(null)
        priceFetchRef.current = false
        const now = Date.now()
        setPriceLastUpdated(now)
        localStorage.setItem('wfm_price_last_updated', String(now))
      }).catch(() => { setAllPrices({}); setIsPriceLoading(false); setPriceFetchProgress(null); priceFetchRef.current = false })
    } else {
      priceFetchRef.current = false
    }
  }, [inventoryData])

  // ── Subscribe to main window's data-updated event ──
  // Uses the lightweight sidebar_load_inventory (no exports) to avoid
  // re-reading all ~30 export JSON files every monitoring cycle.
  useEffect(() => {
    const unsub = listen('sidebar-data-updated', () => {
      invoke('sidebar_load_inventory')
        .then(result => {
          if (result.inventory) {
            setRawInventory(result.inventory)
          }
          if (result.inventoryTimestamp) {
            setLastUpdate(String(result.inventoryTimestamp))
            localStorage.setItem('lastUpdate', String(result.inventoryTimestamp))
          }
        })
        .catch(() => { })
    })
    return () => { unsub.then(f => f()) }
  }, [])

  // ── Sync monitoring active state with other windows ──
  useEffect(() => {
    const unsub = listen('monitoring-active-changed', async (e) => {
      const p = e.payload || {}

      if (p.active === false) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
        setIsMonitoring(false)
        setMonitorResult(p.result || 'idle')
        setStatusText(p.statusText || 'Syncing stopped')
        return
      }

      if (p.active === true) {
        setIsMonitoring(true)
        setMonitorResult(p.result || 'success')
        setStatusText(p.statusText || 'Syncing active')

        if (processingRef.current || intervalRef.current) return

        processingRef.current = true
        try {
          setNextRetryAt(Date.now() + 180_000)
          await callApiHelperFn()
          intervalRef.current = setInterval(async () => {
            setNextRetryAt(Date.now() + 180_000)
            const r = await callApiHelperFn()
            invoke('set_monitoring_active', { active: true, result: r, statusText: r === 'success' ? 'Syncing active' : r === 'cached' ? 'Game not running, using cached data' : r }).catch(() => { })
          }, 180_000)
        } finally {
          processingRef.current = false
        }
      }
    })
    return () => { unsub.then(f => f()) }
  }, [])

  // ── Archon hunt modifiers ──
  useEffect(() => {
    const unsub = listen('archon-hunt-modifiers', (e) => {
      setArchonModifiers(e.payload)
    })
    return () => { unsub.then(f => f()) }
  }, [])

  // ── Arbitration modifiers ──
  useEffect(() => {
    const unsub = listen('arbitration-modifiers', (e) => {
      setArbitrationModifiers(e.payload)
    })
    return () => { unsub.then(f => f()) }
  }, [])

  // ── Derivation helpers (same as MonitoringContext) ──
  function buildERg(ed) {
    const data = ed?.ExportRegions
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
  }

  function buildEI(ed, d) {
    if (!ed || !d) return { EI: {}, nameToImage: {}, uniqueNameToName: {} }
    const tableNames = [
      'ExportWeapons', 'ExportWarframes', 'ExportSentinels',
      'ExportResources', 'ExportArcanes', 'ExportUpgrades',
      'ExportNightwave', 'ExportBoosterPacks', 'ExportRecipes', 'ExportCustoms', 'ExportGear', 'ExportFlavour', 'ExportBundles',
      // warframe-items pre-resolved maps
      'WI_Warframes', 'WI_Weapons', 'WI_Sentinels',
      'WI_Upgrades', 'WI_Arcanes', 'WI_Resources',
      'WI_Relics', 'WI_Gear', 'WI_Customs',
      'WI_Skins', 'WI_Sigils', 'WI_Glyphs', 'WI_Fish',
    ]
    const EI = {}
    const nameToImage = {}
    const uniqueNameToName = {}
    const toBrowseWf = (p) => {
      if (!p) return null
      if (p.startsWith('http://') || p.startsWith('https://')) return p
      const clean = p.startsWith('/') ? p : '/' + p
      // content.warframe.com serves every export icon via its contentHash;
      // browse.wf only mirrors a subset, so prefer the authoritative CDN.
      const hash = ed.ExportImages?.[clean]?.contentHash
      return hash ? `https://content.warframe.com/PublicExport${clean}!${hash}` : `https://browse.wf${clean}`
    }
    const indexEntry = (e, k, t) => {
      const un = e.uniqueName || e.ItemType || k
      if (!un) return
      let iconPath = e.icon ?? e.texture
      let nameKey = e.name ?? e.displayName
      if (t === 'ExportRecipes' && e.resultType) {
        nameKey = uniqueNameToName[e.resultType] || e.resultType
        if (!iconPath) {
          const resultUn = e.resultType
          iconPath = ed.ExportImages?.[resultUn] || EI[resultUn]
          if (typeof iconPath === 'string' && iconPath.startsWith('https://browse.wf')) {
            iconPath = iconPath.replace('https://browse.wf', '')
          }
        }
      }

      if (t === 'ExportBundles' && e.components?.length && !ed.ExportImages?.[iconPath]?.contentHash) {
        // Bundle icons sometimes lack a contentHash (newer bundles aren't
        // mirrored); fall back to the first component whose icon resolves.
        const customs = ed.ExportCustoms || {}
        for (const c of e.components) {
          const cType = c.typeName || c.ItemType || ''
          const entry = customs[cType] || customs[cType.replace('/StoreItems/', '/')]
          const cIcon = entry?.icon
          if (cIcon && ed.ExportImages?.[cIcon]?.contentHash) { iconPath = cIcon; break }
        }
      }
      const url = toBrowseWf(iconPath ?? '')
      if (url) EI[un] = url
      uniqueNameToName[un] = nameKey
      const locKey = uniqueNameToName[un]
      if (locKey) {
        const resolved = (d[locKey] || d['/' + locKey] || '').replace(/<[^>]*>/g, '').trim()
        if (resolved && !resolved.startsWith('/')) { if (url) nameToImage[resolved.toLowerCase()] = url }
      }
    }
    tableNames.forEach(tbl => {
      const data = ed[tbl]
      if (!data) return
      if (Array.isArray(data)) data.forEach(e => indexEntry(e, null, tbl))
      else if (typeof data === 'object') {
        const nested = data[tbl] ?? (Object.keys(data).length === 1 && typeof Object.values(data)[0] === 'object' ? Object.values(data)[0] : null)
        if (Array.isArray(nested)) nested.forEach(e => indexEntry(e, null, tbl))
        else Object.entries(data).forEach(([k, v]) => indexEntry(v, k, tbl))
      }
    })

    // wfcd supplement fallback: English display-name → image keys, so items
    // whose localized dict key is missing (e.g. FR Dual Toxocyst/Dual Ichor
    // base names) still resolve. Localized keys above take priority.
    const wiSupp = ed.WI_Supplement?.nameToImage
    if (wiSupp) {
      for (const [k, v] of Object.entries(wiSupp)) {
        if (nameToImage[k] === undefined) nameToImage[k] = v
      }
    }
    return { EI, nameToImage, uniqueNameToName }
  }

  // ── Memoized fields (mirrors MonitoringContext) ──
  const dict = useMemo(() => exportData?.dict ?? exportData?.['dict.en'] ?? {}, [exportData])
  // Register dict for resolveGameTerm() (runtime game-term resolution)
  useEffect(() => { registerGameDict(dict, localeRef.current) }, [dict, localeRef.current])
  const suppDict = useMemo(() => exportData?.['supp-dict'] ?? exportData?.['supp-dict-en'] ?? {}, [exportData])
  const archimedeaMap = useMemo(() => buildArchimedeaMap(dict, suppDict), [dict, suppDict])
  const EC = useMemo(() => toMap(exportData?.ExportChallenges, 'ExportChallenges'), [exportData])
  const ERg = useMemo(() => buildERg(exportData), [exportData])
  const ES = useMemo(() => exportData?.ExportSyndicates ?? {}, [exportData])
  const ENW = useMemo(() => toMap(exportData?.ExportNightwave, 'rewards'), [exportData])
  const ENWRawRewards = useMemo(() => exportData?.ExportNightwave?.rewards || [], [exportData])
  const ENWAffiliationTag = useMemo(() => exportData?.ExportNightwave?.affiliationTag || null, [exportData])
  const ExportImages = useMemo(() => exportData?.ExportImages ?? {}, [exportData])
  const ExportTextIcons = useMemo(() => exportData?.ExportTextIcons ?? {}, [exportData])
  const ExportRecipes = useMemo(() => exportData?.ExportRecipes ?? {}, [exportData])
  const ExportKeys = useMemo(() => exportData?.ExportKeys ?? {}, [exportData])

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

  const eiResult = useMemo(() => buildEI(exportData, dict), [exportData, dict])
  const nameToImage = eiResult.nameToImage
  const uniqueNameToName = eiResult.uniqueNameToName
  const EI = eiResult.EI

  // ── Worldstate polling (after all memoized fields so deps are in scope) ──
  const fetchWorldstate = useCallback(async (locale) => {
    if (!locale) locale = 'en'
    try {
      const wsStr = await invoke('fetch_url', { url: OFFICIAL_API }).catch(() => null) || await invoke('fetch_url', { url: ORACLE_API }).catch(() => null)
      const ws = wsStr ? JSON.parse(wsStr) : null
      if (ws && dict) {
        const parsed = parseWorldstate(ws, {
          dict, suppDict, ERg, EC, EI, nameToImage, uniqueNameToName,
          ES, ENWRawRewards, ENWAffiliationTag, ExportImages, ExportUpgrades: exportData?.ExportUpgrades,
          ExportRecipes: exportData?.ExportRecipes, ExportKeys: exportData?.ExportKeys,
          archimedeaMap, descendiaDesc,
          completedChallengeIds: new Set(inventoryData?.account?.completedChallengeIds || []),
          locale,
        })
        setWorldState(parsed)
      }
    } catch (err) { }
  }, [dict, suppDict, EC, ERg, EI, nameToImage, uniqueNameToName, ES, ENWRawRewards, ENWAffiliationTag, ExportImages, ExportRecipes, ExportKeys, archimedeaMap, descendiaDesc, inventoryData?.account?.completedChallengeIds])

  useEffect(() => {
    if (Object.keys(dict || {}).length > 0) {
      fetchWorldstate(localeRef.current)
      const iv = setInterval(() => fetchWorldstate(localeRef.current), 60000)
      return () => clearInterval(iv)
    }
  }, [fetchWorldstate, dict])

  const globalRewardPool = useMemo(() => getAllRelicRewards(exportData, localeRef.current), [exportData, localeRef.current])
  const dropIndex = useMemo(() => buildDropIndex(exportData), [exportData])

  const applyRaw = useCallback((raw, ts, exports) => {
    if (!raw) return
    setRawInventory(raw)
    const ed = exports || exportData
    if (!ed) return
    setTimeout(() => {
      try {
        const parsed = parseInventory(raw, ed, dict, localeRef.current, i18nRef.current)
        setInventoryData(parsed || null)
      } catch {
        setInventoryData(null)
      }
      const tsStr = String(ts ?? Date.now())
      setLastUpdate(tsStr)
      localStorage.setItem('lastUpdate', tsStr)
    }, 0)
  }, [exportData, dict])

  const hasCachedData = useCallback(async () => {
    if (hasCachedDataRef.current) return true
    try {
      const result = await invoke('sidebar_load_inventory')
      return !!result?.inventory
    } catch { return false }
  }, [])

  const callApiHelperFn = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setIsInventoryLoading(true)
    try {
      const raw = await invoke('call_api_helper')
      if (raw && typeof raw === 'object' && raw.Suits) {
        applyRaw(raw, Date.now(), exportData)
        setMonitorResult('success')
        setStatusText('Syncing active')
        return 'success'
      }
      setMonitorResult('error')
      setStatusText('Inventory fetch returned no data')
      return 'error'
    } catch {
      if (await hasCachedData()) {
        hasCachedDataRef.current = true
        setMonitorResult('cached')
        setStatusText('Game not running, using cached data')
        return 'cached'
      }
      setMonitorResult('error')
      setStatusText('Could not connect to Warframe')
      return 'error'
    } finally {
      busyRef.current = false
      setIsInventoryLoading(false)
    }
  }, [applyRaw, exportData, hasCachedData])

  const startMonitoringFn = useCallback(async (intervalMs = 180_000) => {
    if (isMonitoring) return
    setIsMonitoring(true)
    const result = await callApiHelperFn()
    setNextRetryAt(Date.now() + intervalMs)
    const msg = result === 'success' ? 'Syncing active' : result === 'cached' ? 'Game not running, using cached data' : result
    invoke('set_monitoring_active', { active: true, result, statusText: msg }).catch(() => { })
    intervalRef.current = setInterval(async () => {
      setNextRetryAt(Date.now() + intervalMs)
      const r = await callApiHelperFn()
      const msg2 = r === 'success' ? 'Syncing active' : r === 'cached' ? 'Game not running, using cached data' : r
      invoke('set_monitoring_active', { active: true, result: r, statusText: msg2 }).catch(() => { })
    }, intervalMs)
  }, [isMonitoring, callApiHelperFn])

  const stopMonitoringFn = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setIsMonitoring(false)
    setNextRetryAt(0)
    setMonitorResult('idle')
    setStatusText('Syncing stopped')
    invoke('set_monitoring_active', { active: false, result: 'idle', statusText: 'Syncing stopped' }).catch(() => { })
  }, [])

  const refreshPrices = useCallback(() => {
    if (priceFetchRef.current) return Promise.resolve()
    priceFetchRef.current = true
    localStorage.removeItem('wfm_price_cache')
    if (!inventoryData) { priceFetchRef.current = false; return Promise.resolve() }
    const items = []
    const seen = new Set()
    for (const m of (inventoryData.mods ?? [])) {
      if (!seen.has(m.unique_name)) {
        items.push({ uniqueName: m.unique_name, name: m.name, maxRank: m.max_rank ?? null })
        seen.add(m.unique_name)
      }
    }
    for (const a of (inventoryData.arcanes ?? [])) {
      if (!seen.has(a.unique_name)) {
        items.push({ uniqueName: a.unique_name, name: a.name })
        seen.add(a.unique_name)
      }
    }
    for (const set of Object.values(inventoryData.primeSets ?? {})) {
      for (const part of (set.parts ?? [])) {
        if (!seen.has(part.unique_name)) {
          items.push({ uniqueName: part.unique_name, name: part.name })
          seen.add(part.unique_name)
        }
      }
      if (set.setPath && !seen.has(set.setPath)) {
        items.push({ uniqueName: set.setPath, name: `${set.name} Set` })
        seen.add(set.setPath)
      }
    }
    for (const r of (inventoryData.relics ?? [])) {
      if (r.unique_name && !seen.has(r.unique_name)) {
        items.push({ uniqueName: r.unique_name, name: r.name })
        seen.add(r.unique_name)
      }
      for (const rew of (r.rewards ?? [])) {
        if (!seen.has(rew.uniqueName)) {
          items.push({ uniqueName: rew.uniqueName, name: rew.name })
          seen.add(rew.uniqueName)
        }
      }
    }
    if (items.length > 0) {
      setIsPriceLoading(true)
      setPriceFetchProgress({ current: 0, total: items.filter(i => i.name && !/\bForma\b/.test(i.name)).length })
      const onProgress = (p) => setPriceFetchProgress(p)
      return getPricesBatch(items, onProgress).then(({ results }) => {
        setAllPrices(results)
        setIsPriceLoading(false)
        setPriceFetchProgress(null)
        priceFetchRef.current = false
        const now = Date.now()
        setPriceLastUpdated(now)
        localStorage.setItem('wfm_price_last_updated', String(now))
      }).catch(() => { setAllPrices({}); setIsPriceLoading(false); setPriceFetchProgress(null); priceFetchRef.current = false })
    } else {
      priceFetchRef.current = false
      return Promise.resolve()
    }
  }, [inventoryData])

  const value = useMemo(() => ({
    exportData, isMonitoring, monitorResult, autoStart, lastUpdate,
    rawInventory, inventoryData, isInventoryLoading,
    allPrices, isPriceLoading, priceFetchProgress, priceLastUpdated,
    worldState, statusText, spIncursions, arbys, archonModifiers, arbitrationModifiers,
    cardImagesPath, fixProgress,
    dict, suppDict, archimedeaMap, EC, ERg, ES, ENW, ENWRawRewards,
    ExportImages, ExportTextIcons, masteryProgress,
    EI, nameToImage, uniqueNameToName, globalRewardPool, dropIndex,
    arbyTiers: ARBY_TIERS,
    setAutoStart, startMonitoring: startMonitoringFn,
    stopMonitoring: stopMonitoringFn, manualRefresh: async () => {
      const wasMonitoring = intervalRef.current !== null
      const result = await callApiHelperFn()
      if (!wasMonitoring) {
        setMonitorResult('idle')
        setStatusText('Not syncing')
      }
      return result
    },
    nextRetryAt, callApiHelper: callApiHelperFn, refreshPrices,
    retryCardImages: () => Promise.resolve(), setWorldState,
  }), [exportData, isMonitoring, monitorResult, autoStart, lastUpdate, nextRetryAt, rawInventory,
    inventoryData, isInventoryLoading, worldState, statusText,
    spIncursions, arbys, archonModifiers, arbitrationModifiers,
    dict, suppDict, archimedeaMap, EC, ERg, ES, ENW, ENWRawRewards,
    ExportImages, ExportTextIcons, masteryProgress,
    EI, nameToImage, uniqueNameToName, globalRewardPool, dropIndex,
    allPrices, isPriceLoading, priceFetchProgress, priceLastUpdated, refreshPrices])

  return (
    <MonitoringContext.Provider value={value}>
      {children}
    </MonitoringContext.Provider>
  )
}
