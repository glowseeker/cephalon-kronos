/**
 * History.jsx
 *
 * Inventory History screen - visualizes gains/losses over time from the
 * rolling inventory diff log maintained by the Rust backend.
 *
 * DATA FLOW:
 *   - Rust call_api_helper() diffs each scan and appends to inventory_history.json
 *   - load_inventory_history(range, filter, search) returns filtered entries
 *   - Frontend renders a lightweight inline-SVG bar chart (no charting deps)
 *
 * FLASH FIX:
 *   - We keep `prevHistory` so the chart does not go blank while a new
 *     filter/range query is in flight. The content stays visible (dimmed
 *     with a spinner overlay) until the new data arrives, eliminating the
 *     "ugly flash" of empty / stale content when cycling filters.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useUi } from '../contexts/UiContext'
import { useMonitoring } from '../contexts/MonitoringContext'
import { PageLayout, Card, Input, Button } from '../components/UI'

const RANGE_TABS = ['1d', '1m', '1y', 'all']
const FILTER_TABS = ['all', 'credits', 'plat', 'endo', 'mods', 'resources', 'items']

// SVG color palette matching Kronos dark theme
const CHART_COLORS = {
  credit: '#3ABFF8',   // blue
  plat: '#9333EA',     // purple
  endo: '#34D399',     // teal/green
  focus: '#F59E0B',    // amber
  modbin: '#F97316',   // orange
  mods: '#EC4899',     // pink
  resources: '#10B981', // emerald
  items: '#8B5CF6',    // violet
  misc: '#60A5FA',     // light blue
  recipes: '#FBBF24', // yellow
}

function getCategoryColor(key) {
  if (key.includes('Credit') || key === 'RegularCredits') return CHART_COLORS.credit
  if (key.includes('Premium')) return CHART_COLORS.plat
  if (key.includes('Endo')) return CHART_COLORS.endo
  if (key.includes('Focus')) return CHART_COLORS.focus
  if (key.includes('ModBin') || key.includes('RandomModBin')) return CHART_COLORS.modbin
  if (key === 'Upgrades' || key.includes('Upgrade')) return CHART_COLORS.mods
  if (key === 'Resources') return CHART_COLORS.resources
  if (key === 'MiscItems') return CHART_COLORS.misc
  if (key === 'Recipes') return CHART_COLORS.recipes
  if (key.includes('Consumable')) return CHART_COLORS.items
  return '#9CA3AF' // gray for unknown
}

// Map raw diff keys to i18n scalar label keys
function getScalarLabelKey(key) {
  if (key === 'RegularCredits' || key === 'credit') return 'scalar_credit'
  if (key === 'PremiumCredits' || key === 'plat') return 'scalar_platinum'
  if (key === 'Endo' || key === 'endo') return 'scalar_endo'
  if (key === 'DailyFocus' || key === 'focus') return 'scalar_focus'
  if (key === 'RandomModBin' || key === 'modbin') return 'scalar_modbin'
  if (key === 'Upgrades' || key === 'mods') return 'scalar_mods'
  if (key === 'Resources' || key === 'resources') return 'scalar_resources'
  if (key === 'MiscItems' || key === 'items' || key === 'Consumables' || key === 'Recipes') return 'scalar_items'
  return null // unknown key, caller should fall back
}

// Build a flat list of item deltas from history entries for chart rendering
function useChartData(history, filter) {
  return useMemo(() => {
    if (!history || history.length === 0) return []

    const items = []
    for (const entry of history) {
      const ts = entry.timestamp || 0
      const diff = entry.diff || null
      if (!diff) continue

      const inc = diff.increases || {}
      const dec = diff.decreases || {}
      const scalars = diff.scalars || {}

      // Add scalar deltas
      for (const [key, val] of Object.entries(scalars)) {
        if (!val || typeof val.delta !== 'number') continue
        const delta = val.delta
        if (delta === 0) continue
        items.push({
          key,
          delta,
          color: getCategoryColor(key),
          ts,
          label: key.replace(/([A-Z])/g, ' $1').trim(),
        })
      }

      // Add item increases
      for (const [key, val] of Object.entries(inc)) {
        if (!val || typeof val.delta !== 'number') continue
        items.push({
          key,
          delta: val.delta,
          color: getCategoryColor(key),
          ts,
          label: key,
        })
      }

      // Add item decreases
      for (const [key, val] of Object.entries(dec)) {
        if (!val || typeof val.delta !== 'number') continue
        items.push({
          key,
          delta: val.delta,
          color: getCategoryColor(key),
          ts,
          label: key,
        })
      }
    }

    // If a filter is active, filter by category
    if (filter !== 'all') {
      const filterMap = {
        credits: ['RegularCredits', 'PremiumCredits'],
        plat: ['PremiumCredits'],
        endo: ['Endo'],
        mods: ['Upgrades'],
        resources: ['Resources', 'MiscItems'],
        items: ['MiscItems', 'Consumables', 'Recipes'],
      }
      const allowed = filterMap[filter]
      if (allowed) {
        return items.filter(item => {
          return allowed.some(a => item.key.includes(a) || item.label.toLowerCase().includes(a.toLowerCase()))
        })
      }
    }

    return items.sort((a, b) => a.ts - b.ts)
  }, [history, filter])
}

// Group deltas by timestamp
function useScanGroups(chartData) {
  return useMemo(() => {
    const groups = {}
    for (const d of chartData) {
      if (!groups[d.ts]) groups[d.ts] = []
      groups[d.ts].push(d)
    }
    return Object.entries(groups)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([ts, items]) => ({ ts: Number(ts), items }))
  }, [chartData])
}

// Inline SVG bar chart
function BarChart({ data, width = 800, height = 240 }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-kronos-dim">
        No data to display.
      </div>
    )
  }

  // Group by timestamp
  const groups = {}
  for (const d of data) {
    if (!groups[d.ts]) groups[d.ts] = 0
    groups[d.ts] += d.delta
  }

  const groupEntries = Object.entries(groups).sort((a, b) => Number(a[0]) - Number(b[0]))
  if (groupEntries.length === 0) return null

  const maxAbsTotal = Math.max(1, ...groupEntries.map(([_, total]) => Math.abs(Number(total))))
  const groupWidth = Math.min(60, (width - 60) / groupEntries.length)
  const gap = 8
  const barMaxHeight = height - 60
  const xAxisY = height - 20

  // Format timestamp
  function formatTime(ts) {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="w-full h-auto">
        {/* Grid lines */}
        <line x1={36} y1={xAxisY} x2={width} y2={xAxisY} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
        <line x1={36} y1={xAxisY - barMaxHeight} x2={width} y2={xAxisY - barMaxHeight} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
        <line x1={36} y1={(xAxisY + xAxisY - barMaxHeight) / 2} x2={width} y2={(xAxisY + xAxisY - barMaxHeight) / 2} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />

        {/* Bars */}
        {groupEntries.map(([ts, total], gi) => {
          const numTotal = Number(total)
          const x = 40 + gi * (groupWidth + gap)
          const barHeight = (Math.abs(numTotal) / maxAbsTotal) * barMaxHeight * 0.9
          const y = numTotal >= 0 ? xAxisY - barHeight : xAxisY
          const color = numTotal >= 0 ? '#34D399' : '#F87171'

          return (
            <g key={ts}>
              <rect
                x={x}
                y={y}
                width={Math.max(groupWidth - 2, 4)}
                height={barHeight}
                fill={color}
                rx={2}
              />
              <text
                x={x + (groupWidth - 2) / 2}
                y={xAxisY + 14}
                textAnchor="middle"
                className="fill-kronos-dim text-[8px]"
              >
                {formatTime(Number(ts))}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// Timeline (cumulative) chart
function TimelineChart({ data, width = 800, height = 200 }) {
  if (!data || data.length === 0) return null

  // Build cumulative net per group
  const groups = {}
  for (const d of data) {
    if (!groups[d.ts]) groups[d.ts] = 0
    groups[d.ts] += d.delta
  }

  const groupEntries = Object.entries(groups).sort((a, b) => Number(a[0]) - Number(b[0]))
  if (groupEntries.length === 0) return null

  const cumulative = []
  let running = 0
  for (const [ts, total] of groupEntries) {
    running += Number(total)
    cumulative.push({ ts: Number(ts), value: running })
  }

  const maxVal = Math.max(0.1, ...cumulative.map(c => Math.abs(c.value)))
  const midY = height / 2
  const halfHeight = height / 2 - 30

  function xForIndex(i) {
    if (cumulative.length === 1) return 40
    return 40 + (i / (cumulative.length - 1)) * (width - 60)
  }

  function yForValue(val) {
    return midY - (val / maxVal) * halfHeight
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="w-full h-auto">
        {/* Zero line */}
        <line x1={36} y1={midY} x2={width} y2={midY} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

        {/* Cumulative line */}
        <polyline
          points={cumulative.map((c, i) => `${xForIndex(i)},${yForValue(c.value)}`).join(' ')}
          fill="none"
          stroke="#3ABFF8"
          strokeWidth={2}
        />

        {/* Data points */}
        {cumulative.map((c, i) => (
          <circle
            key={c.ts}
            cx={xForIndex(i)}
            cy={yForValue(c.value)}
            r={3}
            fill="#3ABFF8"
          />
        ))}

        {/* Y axis labels */}
        <text x={8} y={midY - halfHeight + 4} textAnchor="middle" className="fill-kronos-dim text-[9px]">
          +{maxVal.toLocaleString()}
        </text>
        <text x={8} y={midY + halfHeight - 4} textAnchor="middle" className="fill-kronos-dim text-[9px]">
          -{maxVal.toLocaleString()}
        </text>
      </svg>
    </div>
  )
}

function HistoryScreen() {
  const { t } = useUi()
  const {
    loadInventoryHistory,
    historyRange,
    setHistoryRange,
    historyFilter,
    setHistoryFilter,
    historySearch,
    setHistorySearch,
  } = useMonitoring()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  // Keep previous history so we don't flash empty while loading new data
  const [prevHistory, setPrevHistory] = useState([])
  // Use a ref to track the latest history so we can capture it for prevHistory
  // without causing a useEffect -> setState -> useCallback -> useEffect loop
  const historyRef = useRef(history)
  historyRef.current = history

  const loadHistory = useCallback(async () => {
    // Capture current history before loading so we can keep it visible
    // during the transition (eliminates the flash when cycling filters)
    setPrevHistory(historyRef.current)
    setLoading(true)
    try {
      const result = await loadInventoryHistory({
        range: historyRange,
        filter: historyFilter,
        search: historySearch,
      })
      setHistory(result || [])
    } catch (e) {
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [loadInventoryHistory, historyRange, historyFilter, historySearch])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const chartData = useChartData(history, historyFilter)
  const prevChartData = useChartData(prevHistory, historyFilter)
  // Use previous data while loading to avoid flash, but recompute when new data arrives
  const displayData = loading ? prevChartData : chartData

  // Compute totals from the data currently displayed
  const totals = useMemo(() => {
    const inc = { credit: 0, platinum: 0, endo: 0, focus: 0, modbin: 0, mods: 0, resources: 0, items: 0 }
    const dec = { credit: 0, platinum: 0, endo: 0, focus: 0, modbin: 0, mods: 0, resources: 0, items: 0 }

    for (const item of displayData) {
      const cat = item.key
      if (cat === 'RegularCredits') { inc.credit += item.delta > 0 ? item.delta : 0; dec.credit += item.delta < 0 ? -item.delta : 0 }
      else if (cat === 'PremiumCredits') { inc.platinum += item.delta > 0 ? item.delta : 0; dec.platinum += item.delta < 0 ? -item.delta : 0 }
      else if (cat === 'Endo') { inc.endo += item.delta > 0 ? item.delta : 0; dec.endo += item.delta < 0 ? -item.delta : 0 }
      else if (cat === 'DailyFocus') { inc.focus += item.delta > 0 ? item.delta : 0; dec.focus += item.delta < 0 ? -item.delta : 0 }
      else if (cat === 'RandomModBin') { inc.modbin += item.delta > 0 ? item.delta : 0; dec.modbin += item.delta < 0 ? -item.delta : 0 }
      else if (cat === 'Upgrades') { inc.mods += item.delta > 0 ? item.delta : 0; dec.mods += item.delta < 0 ? -item.delta : 0 }
      else if (cat === 'Resources') { inc.resources += item.delta > 0 ? item.delta : 0; dec.resources += item.delta < 0 ? -item.delta : 0 }
      else if (cat === 'MiscItems' || cat === 'Consumables' || cat === 'Recipes') { inc.items += item.delta > 0 ? item.delta : 0; dec.items += item.delta < 0 ? -item.delta : 0 }
    }

    return { inc, dec }
  }, [displayData])

  const netTotal = displayData.reduce((sum, d) => sum + d.delta, 0)

  return (
    <PageLayout title={t('history.title')} titleKey="history.title">
      {/* Range Tabs */}
      <div className="flex gap-2 mb-4">
        {RANGE_TABS.map(r => (
          <Button
            key={r}
            onClick={() => setHistoryRange(r)}
            className={`px-3 py-1 text-xs font-black uppercase ${historyRange === r ? 'bg-kronos-accent text-kronos-bg' : 'bg-white/5 text-kronos-dim'}`}
          >
            {t(`history.range_${r}`)}
          </Button>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTER_TABS.map(f => (
          <Button
            key={f}
            onClick={() => setHistoryFilter(f)}
            className={`px-3 py-1 text-xs font-black uppercase ${historyFilter === f ? 'bg-kronos-accent text-kronos-bg' : 'bg-white/5 text-kronos-dim'}`}
          >
            {t(`history.filter_${f}`)}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder={t('history.search_placeholder')}
          value={historySearch}
          onChange={(e) => setHistorySearch(e.target.value)}
          className="w-full max-w-md"
        />
      </div>

      {!loading && (history.length === 0 || chartData.length === 0) ? (
        <Card className="p-8 text-center">
          <p className="text-kronos-dim">{t('history.no_data')}</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Bar chart: net gain per scan - key changes on filter/range so React
              doesn't attempt to diff between incompatible datasets (prevents flash) */}
          <Card className="p-4 relative">
            <h3 className="text-sm font-black uppercase tracking-tight text-kronos-accent mb-2">
              {t('history.bar_chart_title')}
            </h3>
            {loading && prevChartData.length > 0 && (
              <div className="absolute inset-0 bg-kronos-bg/80 flex items-center justify-center z-10 rounded-lg">
                <div className="w-6 h-6 border-2 border-kronos-accent/20 border-t-kronos-accent rounded-full animate-spin" />
              </div>
            )}
            <BarChart
              key={`bar-${historyRange}-${historyFilter}-${historySearch}`}
              data={displayData}
            />
          </Card>

          {/* Timeline chart: cumulative net */}
          <Card className="p-4 relative">
            <h3 className="text-sm font-black uppercase tracking-tight text-kronos-accent mb-2">
              {t('history.timeline_chart_title')}
            </h3>
            {loading && prevChartData.length > 0 && (
              <div className="absolute inset-0 bg-kronos-bg/80 flex items-center justify-center z-10 rounded-lg">
                <div className="w-6 h-6 border-2 border-kronos-accent/20 border-t-kronos-accent rounded-full animate-spin" />
              </div>
            )}
            <TimelineChart
              key={`timeline-${historyRange}-${historyFilter}-${historySearch}`}
              data={displayData}
            />
          </Card>

          {/* Totals summary */}
          <Card className="p-4">
            <h3 className="text-sm font-black uppercase tracking-tight text-kronos-accent mb-3">
              {t('history.summary_title')}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(totals.inc).map(([key, val]) => {
                const decVal = totals.dec[key]
                const net = val - decVal
                if (val === 0 && decVal === 0) return null
                return (
                  <div key={key} className="flex flex-col gap-1">
                    <span className="text-xs text-kronos-dim">{t(`history.scalar_${key}`)}</span>
                    <div className="flex gap-2 text-sm">
                      {val > 0 && <span className="text-green-400">+{val.toLocaleString()}</span>}
                      {decVal > 0 && <span className="text-red-400">-{decVal.toLocaleString()}</span>}
                      <span className={`font-black ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {net >= 0 ? '+' : ''}{net.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Detailed log: individual entries */}
          <Card className="p-4">
            <h3 className="text-sm font-black uppercase tracking-tight text-kronos-accent mb-3">
              {t('history.log_title')}
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {history.map((entry, i) => {
                const ts = entry.timestamp || 0
                const date = new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                const time = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                const diff = entry.diff

                if (!diff) return null

                const incKeys = Object.keys(diff.increases || {})
                const decKeys = Object.keys(diff.decreases || {})
                const scalarKeys = Object.keys(diff.scalars || {})

                return (
                  <div key={i} className="flex items-center gap-3 text-sm border-b border-white/5 pb-2">
                    <span className="text-xs text-kronos-dim min-w-[100px]">{date} {time}</span>
                    <div className="flex-1 flex flex-wrap gap-2">
                      {scalarKeys.map(k => {
                        const v = diff.scalars[k]
                        const delta = v.delta
                        if (delta === 0) return null
                        return (
                          <span key={k} className="flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getCategoryColor(k) }}
                            />
                            <span className={delta > 0 ? 'text-green-400' : 'text-red-400'}>
                              {(() => { const labelKey = getScalarLabelKey(k); return labelKey ? t(`history.scalar_${labelKey}`) : t(`history.scalar_${k}`) })()}: {delta > 0 ? '+' : ''}{delta.toLocaleString()}
                            </span>
                          </span>
                        )
                      })}
                      {incKeys.map(k => {
                        const v = diff.increases[k]
                        return (
                          <span key={`inc-${k}`} className="flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getCategoryColor(k) }}
                            />
                            <span className="text-green-400">
                              {k}: +{v.delta.toLocaleString()}
                            </span>
                          </span>
                        )
                      })}
                      {decKeys.map(k => {
                        const v = diff.decreases[k]
                        return (
                          <span key={`dec-${k}`} className="flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getCategoryColor(k) }}
                            />
                            <span className="text-red-400">
                              {k}: -{Math.abs(v.delta).toLocaleString()}
                            </span>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}
    </PageLayout>
  )
}

export default HistoryScreen