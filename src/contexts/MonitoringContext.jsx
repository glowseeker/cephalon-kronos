import { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import { parseInventory } from '../lib/inventoryParser'
import { parseWorldstate } from '../lib/worldstateParser'
import { getRelicRewards, getAllRelicRewards, getRewardInventoryContext, parseRelicName } from '../lib/relicParser'
import { listen, emit } from '@tauri-apps/api/event'
import { getPrice } from '../lib/wfmCache'

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
    setIsUpdating(true)
    try {
      const raw = await invoke('call_api_helper')
      if (raw) applyRaw(raw, Date.now())
    } finally {
      busyRef.current = false
      setIsUpdating(false)
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
  }, [])

  const manualRefresh = useCallback(() => callApiHelper(), [callApiHelper])

  const fissureStateRef = useRef({ squad_relics: [] })
  const ocrActiveRef = useRef(false)

  const termLog = (msg) => {
    console.log(msg)
    invoke('log_terminal', { message: msg }).catch(() => { })
  }

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
      // With squad relics known we have at most 24 candidates — a tiny, precise
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
          termLog(`[MonitoringContext] write_ocr_wordlist failed: ${err}`)
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
            const n = item.name.toUpperCase();
            return n.includes('PRIME') || n.includes('BLUEPRINT') || n === 'FORMA BLUEPRINT';
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
              if (bestWordSim < 0.8) {
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

            // 3. Penalty: zero the score only if the first word is a complete miss.
            // Also check if candWords[0] appears *inside* an OCR word, which handles
            // merged tokens like "MIRAGPRIIE" where "MIRAGE" and "PRIME" got glued.
            const firstName = candWords[0];
            const ocrContainsName = ocrWords.some(ow =>
              ow.includes(firstName) ||
              firstName.includes(ow) ||
              wordSimilarity(ow, firstName) > 0.6
            ) || cleanOcrNoSpace.includes(firstName);
            if (!ocrContainsName && score < 1.0) score = 0;
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
          termLog(`[MonitoringContext] Slot ${res.slot} MATCHED: "${ocrText}" -> ${bestMatch.name} (Score: ${bestScore.toFixed(3)})`);
        } else {
          termLog(`[MonitoringContext] Slot ${res.slot} failed match: "${ocrText}" (Best: ${bestMatch?.name || 'None'}, Score: ${bestScore.toFixed(3)})`);
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
      startMonitoring, stopMonitoring, manualRefresh, callApiHelper
    }}>
      {children}
    </MonitoringContext.Provider>
  )
}

export const useMonitoring = () => useContext(MonitoringContext)