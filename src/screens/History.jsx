/**
 * History.jsx
 *
 * Inventory History screen with a multi-series chart showing absolute values,
 * a draggable time scrubber, metric toggles, and a summary for the selected
 * timeframe.
 *
 * LAYOUT:
 *   - Left: Multi-series chart + scrubber + metric/timeframe toggles
 *   - Right: Summary for selected timespan only
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useUi } from '../contexts/UiContext'
import { useMonitoring } from '../contexts/MonitoringContext'
import { PageLayout, Card } from '../components/UI'
import { resolveItemName } from '../lib/warframeUtils'
import { relicNameFromPath } from '../lib/inventoryParser'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

const METRICS = [
  { key: 'credit', label: 'history.metric_credit', color: '#3ABFF8', category: 'currency' },
  { key: 'platinum', label: 'history.metric_platinum', color: '#9333EA', category: 'currency' },
  { key: 'endo', label: 'history.metric_endo', color: '#34D399', category: 'currency' },
  { key: 'ducats', label: 'history.metric_ducats', color: '#FBBF24', category: 'currency' },
  { key: 'mods', label: 'history.metric_mods', color: '#EC4899', category: 'group' },
  { key: 'items', label: 'history.metric_items', color: '#8B5CF6', category: 'group' },
]

const RANGES = [
  { key: '24h', label: 'history.range_24h', ms: 86400000 },
  { key: '7d', label: 'history.range_7d', ms: 7 * 86400000 },
  { key: '1m', label: 'history.range_1m', ms: 30 * 86400000 },
  { key: '1y', label: 'history.range_1y', ms: 365 * 86400000 },
  { key: 'all', label: 'history.range_all', ms: Infinity },
]

const SCALAR_MAP = {
  credit: ['RegularCredits'],
  platinum: ['PremiumCredits'],
  endo: ['FusionPoints'],
  ducats: ['PrimeBucks'],
}

// Group metrics: read absolute totals from diff.totals (computed at write-time in Rust).
// Old history entries without .totals are skipped (gap accepted).
function getGroupAbsoluteValue(diff, metricKey) {
  if (!diff?.totals) return null
  return typeof diff.totals[metricKey] === 'number' ? diff.totals[metricKey] : null
}

// Items the user has requested to hide from history diffs.
// museumdogtag is a donation counter for Drusus' Leverian (not a real inventory item).
const HIDDEN_ITEM_PATHS = [
  '/Lotus/Types/Items/SyndicateDogTags/MuseumDogTag',
]
function isHiddenItem(key) {
  return HIDDEN_ITEM_PATHS.some(p => key === p || key.includes(p))
}

function getAbsoluteScalarValue(diff, metricKey) {
  if (!diff) return null
  const scalars = diff.scalars || {}
  const fields = SCALAR_MAP[metricKey]
  if (!fields || fields.length === 0) return null
  for (const k of fields) {
    const entry = scalars[k]
    if (entry && typeof entry.to === 'number') return entry.to
  }
  return null
}

function formatCompact(n) {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString()
}

function formatDateShort(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatDateFull(ts) {
  return new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function formatXTick(ts, span) {
  const d = new Date(ts)
  if (span < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  if (span < 604800000) return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
}

function formatYTick(v) {
  return formatCompact(Math.round(v))
}

// ─── Chart (Recharts) ──────────────────────────────────────────────
function Chart({ allData, activeMetrics, trackedItems = [], startTime, endTime }) {
  const { t } = useUi()

  // Merge all series into a single array keyed by timestamp for Recharts
  const { chartData, span } = useMemo(() => {
    const span = (endTime - startTime) || 1
    const byTs = new Map()
    for (const mk of activeMetrics) {
      const data = allData[mk] || []
      for (const d of data) {
        if (d.ts < startTime || d.ts > endTime) continue
        let row = byTs.get(d.ts)
        if (!row) { row = { ts: d.ts }; byTs.set(d.ts, row) }
        row[mk] = d.value
      }
    }
    return { chartData: [...byTs.values()].sort((a, b) => a.ts - b.ts), span }
  }, [allData, activeMetrics, startTime, endTime])

  const hasHistory = Object.values(allData).some(arr => arr && arr.length > 0)
  if (!hasHistory && activeMetrics.length === 0) {
    return <div className="text-center py-16 text-kronos-dim">{t('history.no_data')}</div>
  }

  // Resolve color for each active metric key
  const getColor = (mk) => {
    const tracked = mk.startsWith('item:') ? trackedItems.find(ti => `item:${ti.key}` === mk) : null
    return tracked?.color || METRICS.find(m => m.key === mk)?.color || '#9CA3AF'
  }

  const tickFormatter = (ts) => formatXTick(ts, span)

  return (
    <div className="w-full" style={{ height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="ts"
            type="number"
            domain={[startTime, endTime]}
            tickFormatter={tickFormatter}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
            scale="time"
          />
          <YAxis
            tickFormatter={formatYTick}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          <Tooltip
            content={<CustomTooltip span={span} activeMetrics={activeMetrics} trackedItems={trackedItems} />}
          />
          {activeMetrics.map(mk => (
            <Area
              key={mk}
              type="monotone"
              dataKey={mk}
              stroke={getColor(mk)}
              fill={getColor(mk)}
              fillOpacity={0.08}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function CustomTooltip({ active, payload, label, span, activeMetrics, trackedItems }) {
  if (!active || !payload?.length) return null
  const getColor = (mk) => {
    const tracked = mk.startsWith('item:') ? trackedItems.find(ti => `item:${ti.key}` === mk) : null
    return tracked?.color || METRICS.find(m => m.key === mk)?.color || '#9CA3AF'
  }
  const getName = (mk) => {
    const tracked = mk.startsWith('item:') ? trackedItems.find(ti => `item:${ti.key}` === mk) : null
    if (tracked) return tracked.name
    const m = METRICS.find(m => m.key === mk)
    return m ? m.key.charAt(0).toUpperCase() + m.key.slice(1) : mk
  }
  return (
    <div className="bg-kronos-panel border border-white/10 rounded-lg p-2.5 text-xs shadow-lg">
      <p className="text-kronos-dim mb-1">{formatDateFull(label)}</p>
      {payload.filter(p => p.value != null).map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getColor(p.dataKey) }} />
          <span className="text-kronos-dim">{getName(p.dataKey)}</span>
          <span className="font-black ml-auto" style={{ color: getColor(p.dataKey) }}>
            {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Scrubber ───────────────────────────────────────────────────────
function Scrubber({ data, trackMin, trackMax, startTime, endTime, onChange }) {
  const trackRef = useRef(null)
  const [dragging, setDragging] = useState(null)

  const minTs = trackMin || 0
  const maxTs = trackMax || Date.now()
  const span = maxTs - minTs || 1

  function tsToPct(ts) { return ((ts - minTs) / span) * 100 }
  function pctToTs(pct) { return minTs + (pct / 100) * span }

  const startPct = Math.max(0, Math.min(100, tsToPct(startTime)))
  const endPct = Math.max(0, Math.min(100, tsToPct(endTime)))

  const handleMouseDown = useCallback((which) => (e) => {
    e.preventDefault()
    setDragging(which)
  }, [])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e) => {
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect) return
      const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
      const ts = pctToTs(pct)
      if (dragging === 'start') {
        onChange(Math.min(ts, endTime - 60000), endTime)
      } else if (dragging === 'end') {
        onChange(startTime, Math.max(ts, startTime + 60000))
      }
    }
    const onUp = () => setDragging(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [dragging, startTime, endTime, minTs, maxTs, onChange])

  // Pre-compute sparkline max to avoid spreading huge arrays into Math.max()
  const sparklineMax = useMemo(() => {
    let max = 1
    for (const d of data) { const v = Math.abs(d.value); if (v > max) max = v }
    return max
  }, [data])

  return (
    <div className="w-full select-none flex items-center gap-2">
      <span className="text-[10px] text-kronos-dim whitespace-nowrap flex-shrink-0">{formatDateShort(minTs)}</span>
      <div className="relative flex-1">
        {/* Handle dates above track */}
        <div className="absolute -top-4 h-4" style={{ left: 0, right: 0, pointerEvents: 'none' }}>
          {startPct > 0 && (
            <div className="absolute text-[10px] text-kronos-dim whitespace-nowrap -translate-x-1/2"
              style={{ left: `${startPct}%` }}>{formatDateShort(startTime)}</div>
          )}
          {endPct < 100 && (
            <div className="absolute text-[10px] text-kronos-dim whitespace-nowrap -translate-x-1/2"
              style={{ left: `${endPct}%` }}>{formatDateShort(endTime)}</div>
          )}
        </div>
        <div ref={trackRef} className="relative h-6 bg-white/5 rounded cursor-pointer">
          {/* Selected region */}
          <div className="absolute top-0 bottom-0 bg-kronos-accent/25 rounded"
            style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }} />

          {/* Mini sparkline */}
          {data.length > 1 && (
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <polyline
                points={data.map(d => {
                  const y = 6 + (1 - Math.abs(d.value) / sparklineMax) * 18
                  return `${tsToPct(d.ts)},${y}`
                }).join(' ')}
                fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            </svg>
          )}

          {/* Left handle */}
          <div className="absolute z-10 cursor-ew-resize"
            style={{ left: `${startPct}%`, top: 0, bottom: 0, width: 0 }}
            onMouseDown={handleMouseDown('start')}>
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-kronos-accent rounded-full hover:scale-125 transition-shadow shadow-lg shadow-kronos-accent/50" />
          </div>
          {/* Right handle */}
          <div className="absolute z-10 cursor-ew-resize"
            style={{ left: `${endPct}%`, top: 0, bottom: 0, width: 0 }}
            onMouseDown={handleMouseDown('end')}>
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-kronos-accent rounded-full hover:scale-125 transition-shadow shadow-lg shadow-kronos-accent/50" />
          </div>
        </div>
      </div>
      <span className="text-[10px] text-kronos-dim whitespace-nowrap flex-shrink-0">{formatDateShort(maxTs)}</span>
    </div>
  )
}

// ─── Log ────────────────────────────────────────────────────────────
const LOG_MAX = 200

function Log({ history, startTime, endTime, t, dict, uniqueNameToName, exportData }) {
  const entries = useMemo(() => {
    return history
      .filter(e => e.timestamp >= startTime && e.timestamp <= endTime && e.diff)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, LOG_MAX)
  }, [history, startTime, endTime])

  const nameCache = useRef({})
  const ERel = exportData?.ExportRelics || {}
  function resolveName(key) {
    if (nameCache.current[key]) return nameCache.current[key]
    let resolved = null
    // Relics: ExportRelics has era/category/quality but no locTag — use dedicated parser first
    if (key.includes('/Projections/')) {
      const full = relicNameFromPath(key, ERel)
      resolved = full.replace(/\s*\((Intact|Exceptional|Flawless|Radiant)\)$/, '').replace(/\s*Relic$/, '').trim()
    }
    if (!resolved) resolved = resolveItemName(key, dict, uniqueNameToName)
    if (!resolved) resolved = key.split('/').pop() || key
    nameCache.current[key] = resolved
    return resolved
  }

  function flattenDiffs(diff) {
    const items = []
    const scalars = diff?.scalars || {}
    for (const [k, v] of Object.entries(scalars)) {
      if (v.delta === 0) continue
      const metric = METRICS.find(m => SCALAR_MAP[m.key]?.includes(k))
      if (!metric) continue
      items.push({ type: 'scalar', key: k, display: t(metric.label), delta: v.delta })
    }
    const inc = diff?.increases || {}
    for (const [k, v] of Object.entries(inc)) {
      if (!v || v.delta === 0) continue
      if (isHiddenItem(k)) continue
      items.push({ type: 'increase', key: k, display: resolveName(k), delta: v.delta })
    }
    const dec = diff?.decreases || {}
    for (const [k, v] of Object.entries(dec)) {
      if (!v || v.delta === 0) continue
      if (isHiddenItem(k)) continue
      items.push({ type: 'decrease', key: k, display: resolveName(k), delta: v.delta })
    }
    return items
  }

  const allChanges = useMemo(() => {
    const changeMap = {}
    for (const entry of entries) {
      const changes = flattenDiffs(entry.diff)
      for (const c of changes) {
        const key = `${c.type}:${c.key}`
        if (!changeMap[key]) changeMap[key] = { ...c, delta: 0 }
        changeMap[key].delta += c.delta
      }
    }
    return Object.values(changeMap).filter(c => c.delta !== 0).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  }, [entries])

  return (
    <div className="flex flex-col h-full">
      <h4 className="text-xs font-black uppercase text-kronos-accent tracking-widest mb-2">
        {t('history.timespan_summary')}
      </h4>
      <div className="space-y-1 flex-1 overflow-y-auto custom-scrollbar">
        {allChanges.length === 0 && (
          <p className="text-xs text-kronos-dim">{t('history.no_changes')}</p>
        )}
        {allChanges.map((c, i) => (
          <div key={`${c.key}-${i}`} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: c.delta > 0 ? '#34D399' : '#F87171' }} />
            <span className="text-xs text-kronos-dim truncate flex-1">{c.display}</span>
            <span className={`text-xs font-black ${c.delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {c.delta > 0 ? '+' : ''}{c.delta.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Screen ────────────────────────────────────────────────────
function HistoryScreen() {
  const { t } = useUi()
  const { loadInventoryHistory, dict, uniqueNameToName, exportData } = useMonitoring()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeMetrics, setActiveMetrics] = useState(new Set(['credit']))
  const [range, setRange] = useState('all')
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(Date.now())

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadInventoryHistory({ range: 'all', filter: 'all', search: '' })
      .then(result => { if (!cancelled) setHistory(result || []) })
      .catch(() => { if (!cancelled) setHistory([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [loadInventoryHistory])

  const [trackedItems, setTrackedItems] = useState([]) // [{key, name, color}]
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const searchRef = useRef(null)
  const searchTimerRef = useRef(null)

  // Resolve display names lazily for search
  const resolveSearchName = useCallback((key) => {
    if (key.includes('/Projections/')) {
      const ERel = exportData?.ExportRelics || {}
      const full = relicNameFromPath(key, ERel)
      return full.replace(/\s*\((Intact|Exceptional|Flawless|Radiant)\)$/, '').replace(/\s*Relic$/, '').trim()
    }
    return resolveItemName(key, dict, uniqueNameToName) || key.split('/').pop() || key
  }, [dict, uniqueNameToName, exportData])

  // Collect all unique item keys from history diffs for search.
  // Names are pre-resolved so the search loop only does string matching.
  const allItemKeys = useMemo(() => {
    const keys = new Map() // key -> display name
    for (const e of history) {
      const diff = e.diff
      if (!diff) continue
      for (const k of Object.keys(diff.increases || {})) {
        if (!isHiddenItem(k) && !keys.has(k)) keys.set(k, resolveSearchName(k))
      }
      for (const k of Object.keys(diff.decreases || {})) {
        if (!isHiddenItem(k) && !keys.has(k)) keys.set(k, resolveSearchName(k))
      }
    }
    return keys
  }, [history, resolveSearchName])

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    const results = []
    for (const [key, name] of allItemKeys) {
      if (name.toLowerCase().includes(q)) {
        results.push({ key, name })
        if (results.length >= 20) break
      }
    }
    return results
  }, [searchQuery, allItemKeys])

  // Colors for tracked items
  const TRACKED_COLORS = ['#F472B6', '#38BDF8', '#A3E635', '#FB923C', '#C084FC', '#22D3EE', '#FBBF24']

  const addTrackedItem = useCallback((item) => {
    if (trackedItems.some(t => t.key === item.key)) return
    const color = TRACKED_COLORS[trackedItems.length % TRACKED_COLORS.length]
    setTrackedItems(prev => [...prev, { key: item.key, name: item.name, color }])
    setSearchInput('')
    setSearchQuery('')
    setShowSearch(false)
  }, [trackedItems])

  const removeTrackedItem = useCallback((key) => {
    setTrackedItems(prev => prev.filter(t => t.key !== key))
  }, [])

  // Close search dropdown on outside click
  useEffect(() => {
    if (!showSearch) return
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSearch])

  // Persistent cache: once a metric is computed, it stays cached even when toggled off,
  // avoiding expensive recomputation when toggling metrics on/off. Must be invalidated
  // whenever `history` actually changes (new sync data), not just when this memo re-runs —
  // otherwise new inventory syncs never reach the chart.
  const dataCacheRef = useRef({ fingerprint: null, data: {} })
  const historyFingerprint = history.length
    ? `${history.length}:${history[history.length - 1].timestamp}`
    : '0'
  if (dataCacheRef.current.fingerprint !== historyFingerprint) {
    dataCacheRef.current = { fingerprint: historyFingerprint, data: {} }
  }
  const allData = useMemo(() => {
    const cache = dataCacheRef.current.data
    const sorted = [...history].filter(e => e.timestamp && e.diff).sort((a, b) => a.timestamp - b.timestamp)
    const result = {}
    // Built-in metrics
    for (const m of METRICS) {
      if (cache[m.key]) { result[m.key] = cache[m.key]; continue }
      if (!activeMetrics.has(m.key)) { result[m.key] = []; continue }
      let series
      if (SCALAR_MAP[m.key] && SCALAR_MAP[m.key].length > 0) {
        series = []
        for (const entry of sorted) {
          const absVal = getAbsoluteScalarValue(entry.diff, m.key)
          if (absVal !== null) {
            series.push({ ts: entry.timestamp, value: absVal })
          } else {
            const lastValue = series.length > 0 ? series[series.length - 1].value : 0
            series.push({ ts: entry.timestamp, value: lastValue })
          }
        }
      } else {
        series = []
        for (const entry of sorted) {
          const absVal = getGroupAbsoluteValue(entry.diff, m.key)
          if (absVal !== null) {
            series.push({ ts: entry.timestamp, value: absVal })
          }
        }
      }
      cache[m.key] = series
      result[m.key] = series
    }
    // Tracked item metrics: read the 'to' value from diff.increases/diff.decreases
    for (const t of trackedItems) {
      const cacheKey = `item:${t.key}`
      if (cache[cacheKey]) { result[cacheKey] = cache[cacheKey]; continue }
      const series = []
      let lastVal = null
      for (const entry of sorted) {
        const diff = entry.diff
        const inc = diff?.increases?.[t.key]
        const dec = diff?.decreases?.[t.key]
        const entry_ = inc || dec
        if (entry_ && typeof entry_.to === 'number') {
          lastVal = entry_.to
        }
        if (lastVal !== null) {
          series.push({ ts: entry.timestamp, value: lastVal })
        }
      }
      cache[cacheKey] = series
      result[cacheKey] = series
    }
    return result
  }, [history, activeMetrics, trackedItems])

  // Downsample chart data to at most MAX_CHART_POINTS using LTTB-like decimation
  const downsampledData = useMemo(() => {
    const result = {}
    const MAX = 500
    for (const mk of Object.keys(allData)) {
      const d = allData[mk]
      if (!d || d.length <= MAX) { result[mk] = d; continue }
      const step = (d.length - 2) / (MAX - 2)
      const out = [d[0]]
      let prevIndex = 0
      for (let i = 1; i < MAX - 1; i++) {
        const nextIndex = Math.round(1 + i * step)
        // Pick the point with the largest absolute delta from neighbors
        let bestIdx = prevIndex + 1
        let bestArea = 0
        const a = d[prevIndex]
        const c = d[Math.min(nextIndex, d.length - 1)]
        for (let j = prevIndex + 1; j < nextIndex && j < d.length; j++) {
          const b = d[j]
          const area = Math.abs((a.ts - c.ts) * (b.value - a.value) - (a.ts - b.ts) * (c.value - a.value))
          if (area > bestArea) { bestArea = area; bestIdx = j }
        }
        out.push(d[bestIdx])
        prevIndex = bestIdx
      }
      out.push(d[d.length - 1])
      result[mk] = out
    }
    return result
  }, [allData])

  const allTimestamps = useMemo(() => {
    return history.filter(e => e.timestamp).map(e => e.timestamp).sort((a, b) => a - b)
  }, [history])

  const initializedRef = useRef(false)
  useEffect(() => {
    if (!initializedRef.current && allTimestamps.length > 0) {
      initializedRef.current = true
      setStartTime(allTimestamps[0])
      setEndTime(allTimestamps[allTimestamps.length - 1])
    }
  }, [allTimestamps])

  const applyRange = useCallback((rangeKey) => {
    setRange(rangeKey)
    const r = RANGES.find(r => r.key === rangeKey)
    if (!r) return
    if (r.ms === Infinity) {
      setStartTime(allTimestamps[0] || 0)
      setEndTime(allTimestamps[allTimestamps.length - 1] || Date.now())
    } else {
      const now = Date.now()
      setStartTime(now - r.ms)
      setEndTime(now)
    }
  }, [allTimestamps])

  const presetBounds = useMemo(() => {
    const dataMin = allTimestamps[0] || 0
    const dataMax = allTimestamps[allTimestamps.length - 1] || Date.now()
    const r = RANGES.find(r => r.key === range)
    if (!r || r.ms === Infinity) return { min: dataMin, max: dataMax }
    const now = Date.now()
    return { min: now - r.ms, max: now }
  }, [range, allTimestamps])

  const toggleMetric = useCallback((key) => {
    setActiveMetrics(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  return (
    <PageLayout title={t('history.title')} titleKey="history.title">
      <div className="flex flex-col lg:flex-row gap-4 h-full">
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* Chart card */}
          <Card className="p-4 flex-1 relative min-h-[400px] flex flex-col">
            {loading && (
              <div className="absolute inset-0 bg-kronos-bg/80 flex items-center justify-center z-10 rounded-lg">
                <div className="w-6 h-6 border-2 border-kronos-accent/20 border-t-kronos-accent rounded-full animate-spin" />
              </div>
            )}
            {/* Metric toggles + search inside card */}
            <div className="flex gap-1 mb-2">
              {METRICS.map(m => (
                <button key={m.key} onClick={() => toggleMetric(m.key)}
                  className={`flex-1 px-2 py-1.5 text-[11px] font-bold uppercase rounded text-center transition-all ${activeMetrics.has(m.key) ? 'text-kronos-bg' : 'bg-white/5 text-kronos-dim hover:bg-white/10'}`}
                  style={activeMetrics.has(m.key) ? { backgroundColor: m.color } : {}}>
                  {t(m.label)}
                </button>
              ))}
            </div>
            {/* Tracked items tags */}
            {trackedItems.length > 0 && (
              <div className="flex gap-1 flex-wrap mb-2">
                {trackedItems.map(t => (
                  <span key={t.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-kronos-bg" style={{ backgroundColor: t.color }}>
                    {t.name}
                    <button onClick={() => removeTrackedItem(t.key)} className="opacity-70 hover:opacity-100 ml-0.5">&times;</button>
                  </span>
                ))}
              </div>
            )}
            {/* Search bar */}
            <div className="relative mb-3" ref={searchRef}>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  const val = e.target.value
                  setSearchInput(val)
                  setShowSearch(true)
                  clearTimeout(searchTimerRef.current)
                  searchTimerRef.current = setTimeout(() => setSearchQuery(val), 150)
                }}
                onFocus={() => setShowSearch(true)}
                placeholder={t('history.search_placeholder')}
                className="w-full px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded text-kronos-text placeholder:text-kronos-dim/50 focus:outline-none focus:border-kronos-accent/50"
              />
              {showSearch && searchResults.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-kronos-panel border border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                  {searchResults.map(r => (
                    <button key={r.key} onClick={() => addTrackedItem(r)}
                      className="w-full px-3 py-1.5 text-xs text-left text-kronos-text hover:bg-white/10 transition-colors truncate">
                      {r.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Chart allData={downsampledData} activeMetrics={[...activeMetrics, ...trackedItems.map(t => `item:${t.key}`)]}
              trackedItems={trackedItems} startTime={startTime} endTime={endTime} />
            <div className="mt-3">
              <Scrubber data={(downsampledData.credit?.length ? downsampledData.credit : downsampledData[activeMetrics.values().next().value]) || []} trackMin={presetBounds.min} trackMax={presetBounds.max} startTime={startTime} endTime={endTime}
                onChange={(s, e) => { setStartTime(s); setEndTime(e); setRange('custom') }} />
            </div>
            {/* Timeframe toggles under scrubber */}
            <div className="flex gap-1 mt-2">
              {RANGES.map(r => (
                <button key={r.key} onClick={() => applyRange(r.key)}
                  className={`flex-1 px-2 py-1 text-[11px] font-bold uppercase rounded text-center transition-all ${range === r.key ? 'bg-kronos-accent text-kronos-bg' : 'bg-white/5 text-kronos-dim hover:bg-white/10'}`}>
                  {t(r.label)}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:w-[380px] xl:w-[440px] flex-shrink-0">
          <Card className="p-4 lg:h-[calc(100vh-8rem)] flex flex-col">
            <Log history={history} startTime={startTime} endTime={endTime}
              t={t} dict={dict} uniqueNameToName={uniqueNameToName} exportData={exportData} />
          </Card>
        </div>
      </div>
    </PageLayout>
  )
}

export default HistoryScreen