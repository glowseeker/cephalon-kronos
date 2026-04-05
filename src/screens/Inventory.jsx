/**
 * Inventory.jsx
 *
 * Displays the user's full collection of items, including equipment, mods,
 * arcanes and resources.  Provides categorised tabs and multi-column
 * filtering (e.g., "Owned + Unmastered").
 */
import { useState, useMemo, useEffect } from 'react'
import { Search, Filter, ArrowUpDown, AlertCircle, CheckCircle2, Box, Zap, Gem, Clock, X } from 'lucide-react'
import { PageLayout, Card, Input, Button, Tabs, MonitorState } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'

const INVENTORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'warframes', label: 'Warframes' },
  { id: 'weapons', label: 'Weapons' },
  { id: 'companions', label: 'Companions' },
  { id: 'companion_weapons', label: 'Companion Weapons' },
  { id: 'archweapons', label: 'Archweapons' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'necramechs', label: 'Necramechs' },
  { id: 'amps', label: 'Amps' },
  { id: 'arcanes', label: 'Arcanes' },
  { id: 'mods', label: 'Mods' },
  { id: 'prime_parts', label: 'Prime Parts' },
  { id: 'resources', label: 'Resources' },
]

const FILTER_CONFIG = {
  all: ['owned', 'unowned', 'mastered', 'unmastered'],
  warframes: ['owned', 'unowned', 'mastered', 'unmastered', 'subsumed'],
  weapons: ['owned', 'unowned', 'mastered', 'unmastered', 'primary', 'secondary', 'melee', 'incarnon'],
  companions: ['owned', 'unowned', 'mastered', 'unmastered'],
  companion_weapons: ['owned', 'unowned', 'mastered', 'unmastered'],
  archweapons: ['owned', 'unowned', 'mastered', 'unmastered'],
  vehicles: ['owned', 'unowned', 'mastered', 'unmastered', 'archwing', 'kdrive'],
  necramechs: ['owned', 'unowned', 'mastered', 'unmastered'],
  amps: ['owned', 'unowned', 'mastered', 'unmastered'],
  arcanes: ['owned', 'unowned'],
  mods: ['owned', 'unowned'],
  prime_parts: ['owned', 'unowned'],
  resources: ['owned', 'unowned'],
}

const ITEMS_PER_PAGE = 48

function FoundryPanel({ isOpen, onClose, inventoryData, foundryFilters, setFoundryFilters }) {
  const [width, setWidth] = useState(480)
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    if (!isResizing) return
    const handleMouseMove = (e) => {
      window.requestAnimationFrame(() => {
        const newWidth = window.innerWidth - e.clientX
        if (newWidth > 320 && newWidth < 1200) setWidth(newWidth)
      })
    }
    const handleMouseUp = () => setIsResizing(false)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  const groupList = useMemo(() => {
    const rawItems = inventoryData?.foundry ?? []
    if (rawItems.length === 0) return []
    const groups = {}
    rawItems.forEach(item => {
      const p = item.parentName || item.name;
      if (!groups[p]) groups[p] = { name: p, items: [], owned: item.parentOwned, mastered: item.parentMastered }
      groups[p].items.push(item)
    })
    let list = Object.values(groups)
    if (foundryFilters.ready) list = list.filter(g => g.items.some(i => i.ready))
    if (foundryFilters.owned) list = list.filter(g => g.owned)
    if (foundryFilters.mastered) list = list.filter(g => g.mastered)
    return list
  }, [inventoryData, foundryFilters])

  if (!isOpen) return null

  const formatFoundryTime = (seconds) => {
    if (seconds <= 0) return 'READY'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    return h > 0 ? `${h}h ${m}m` : (m > 0 ? `${m}m ${s}s` : `${s}s`)
  }

  const hasData = !!inventoryData
  const rawItems = inventoryData?.foundry ?? []

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full bg-kronos-bg border-l border-white/5 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300" style={{ width: `${width}px`, maxWidth: '90vw' }}>
        <div
          className={`absolute left-0 top-0 w-2 h-full cursor-ew-resize hover:bg-kronos-accent/30 transition-colors z-50 flex items-center justify-center ${isResizing ? 'bg-kronos-accent/20' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
        >
          <div className={`w-[1px] h-12 rounded-full transition-colors ${isResizing ? 'bg-kronos-accent shadow-[0_0_8px_rgba(var(--kronos-accent-rgb),0.8)]' : 'bg-white/10'}`} />
        </div>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div><h3 className="text-xl font-bold uppercase tracking-tight">Foundry</h3><p className="text-xs text-kronos-dim">Track active construction</p></div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="flex-1 p-4 min-h-0 flex flex-col">
          <div className="flex gap-2 mb-4 px-1">
            {[
              { id: 'ready', label: 'Ready', icon: CheckCircle2 },
              { id: 'owned', label: 'Owned', icon: Box },
              { id: 'mastered', label: 'Mastered', icon: Zap },
            ].map(f => (
              <button key={f.id} onClick={() => setFoundryFilters(prev => ({ ...prev, [f.id]: !prev[f.id] }))} className={`flex-1 flex flex-col items-center py-2 rounded-lg border transition-all ${foundryFilters[f.id] ? 'bg-kronos-accent/20 border-kronos-accent text-kronos-accent' : 'bg-kronos-panel/20 border-white/5 text-kronos-dim'}`}>
                <f.icon size={14} className="mb-1" /><span className="text-[9px] font-black uppercase tracking-tighter">{f.label}</span>
              </button>
            ))}
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar-slim pr-2 pb-10">
            {!hasData ? <MonitorState className="h-full" /> : (groupList.length === 0 ? <div className="text-center py-20 text-kronos-dim italic text-sm">{rawItems.length === 0 ? 'No items currently crafting.' : 'No matching items.'}</div> : groupList.map((group, idx) => (
              <Card key={group.name + idx} className="p-3 border-white/5 bg-kronos-panel/20">
                <div className="flex justify-between items-start mb-3 border-b border-white/5 pb-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-xs uppercase truncate text-kronos-text leading-tight">{group.name}</h4>
                    <div className="flex gap-2 mt-1">
                      {group.owned && <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">Owned</span>}
                      {group.mastered && <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 border border-green-500/20">Mastered</span>}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {group.items.map((item, iidx) => {
                    const duration = item.startTime ? (item.finishTime - item.startTime) : (item.buildTime || 12 * 3600);
                    const now = Date.now() / 1000;
                    const elapsed = item.startTime ? (now - item.startTime) : (now - (item.finishTime - (item.buildTime || 12 * 3600)));
                    const progress = Math.min(100, Math.max(0, (elapsed / duration) * 100));
                    const timeLeft = Math.max(0, item.finishTime - now);
                    return (
                      <div key={item.unique_name + iidx} className="flex gap-3 items-center">
                        <div className="w-10 h-10 bg-black/40 rounded flex items-center justify-center p-1.5 flex-shrink-0 relative border border-white/5">{item.image && <img src={item.image} alt="" className="max-w-full max-h-full object-contain z-10" />}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1"><span className="text-[10px] font-bold text-kronos-dim truncate uppercase flex-1 mr-2">{item.name}</span>{item.ready ? <span className="text-[9px] font-black text-green-500 uppercase flex items-center gap-1"><CheckCircle2 size={10} /> READY</span> : <span className="text-[9px] font-mono text-kronos-accent uppercase">{formatFoundryTime(timeLeft)}</span>}</div>
                          {!item.ready && <div className="w-full bg-black/40 h-1 rounded-full overflow-hidden relative border border-white/5"><div className="h-full bg-kronos-accent shadow-[0_0_5px_rgba(var(--kronos-accent-rgb),0.5)] transition-all duration-1000" style={{ width: `${progress}%` }} /></div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Inventory() {
  const { inventoryData } = useMonitoring()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilterSortPanel, setShowFilterSortPanel] = useState(false)
  const [currentFilters, setCurrentFilters] = useState({})
  const [sortCriteria, setSortCriteria] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
  const [showFoundry, setShowFoundry] = useState(false)
  const [foundryFilters, setFoundryFilters] = useState({ ready: false, owned: false, mastered: false })

  useEffect(() => { setVisibleCount(ITEMS_PER_PAGE) }, [activeTab, searchQuery, currentFilters])

  const tabItems = useMemo(() => {
    if (!inventoryData) return []
    return inventoryData[activeTab] ?? []
  }, [inventoryData, activeTab])

  const filteredItems = useMemo(() => {
    let items = tabItems
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter(item => (item.name ?? '').toLowerCase().includes(q))
    }
    const filters = FILTER_CONFIG[activeTab] ?? []
    const activeF = filters.filter(f => currentFilters[f])
    if (activeF.length > 0) {
      items = items.filter(item => {
        for (const f of activeF) {
          if (f === 'owned' && !item.owned) return false
          if (f === 'unowned' && item.owned) return false
          if (f === 'mastered' && !item.mastered) return false
          if (f === 'unmastered' && item.mastered) return false
          if (f === 'subsumed' && !item.subsumed) return false
          if (f === 'incarnon' && !item.is_incarnon) return false
          if (f === 'primary' && item.weapon_type !== 'primary') return false
          if (f === 'secondary' && item.weapon_type !== 'secondary') return false
          if (f === 'melee' && item.weapon_type !== 'melee') return false
          if (f === 'archwing' && item.vehicle_type !== 'archwing') return false
          if (f === 'kdrive' && item.vehicle_type !== 'kdrive') return false
        }
        return true
      })
    }
    items = [...items].sort((a, b) => {
      let av = a[sortCriteria] ?? ''; let bv = b[sortCriteria] ?? ''
      if (typeof av === 'boolean') av = av ? 1 : 0
      if (typeof bv === 'boolean') bv = bv ? 1 : 0
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      return sortDirection === 'asc' ? (av < bv ? -1 : (av > bv ? 1 : 0)) : (av < bv ? 1 : (av > bv ? -1 : 0))
    })
    return items
  }, [tabItems, searchQuery, currentFilters, activeTab, sortCriteria, sortDirection])

  const visibleItems = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount])

  const tabLabel = INVENTORY_TABS.find(t => t.id === activeTab)?.label ?? activeTab

  return (
    <PageLayout title="Inventory" extra={renderHeaderStats(inventoryData)}>
      <div className="space-y-6">
        <div className="flex gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-kronos-dim group-focus-within:text-kronos-accent transition-colors" size={20} />
            <Input placeholder={`Search in ${tabLabel}...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-12" />
          </div>
          <Button variant="secondary" onClick={() => setShowFilterSortPanel(v => !v)}><Filter size={20} className={showFilterSortPanel ? 'text-kronos-accent' : ''} /></Button>
          <Button variant="secondary" onClick={() => setShowFoundry(true)} className="relative">
            <img src="/IconFoundry.png" alt="Foundry" className="w-6 h-6 object-contain" />
            {inventoryData?.foundry?.some(i => i.ready) && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-kronos-bg" />}
          </Button>
        </div>
        {showFilterSortPanel && (
          <Card glow className="p-4 border-kronos-accent/30 animate-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col gap-6">
              <div><p className="text-[10px] font-black text-kronos-accent uppercase tracking-widest mb-3">Filters</p>
                <div className="flex flex-wrap gap-2">{(FILTER_CONFIG[activeTab] ?? []).map(f => <button key={f} onClick={() => setCurrentFilters(prev => ({ ...prev, [f]: !prev[f] }))} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${currentFilters[f] ? 'bg-kronos-accent text-kronos-bg' : 'bg-white/5 text-kronos-dim hover:text-white'}`}>{f.replace(/_/g, ' ')}</button>)}</div>
              </div>
              <div><p className="text-[10px] font-black text-kronos-accent uppercase tracking-widest mb-3">Sort By</p>
                <div className="flex flex-wrap gap-2">{[{ id: 'name', label: 'Name' }, { id: 'owned', label: 'Ownership' }, { id: 'mastered', label: 'Mastery' }].map(c => <button key={c.id} onClick={() => { if (sortCriteria === c.id) setSortDirection(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCriteria(c.id); setSortDirection('asc') } }} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-2 ${sortCriteria === c.id ? 'bg-kronos-accent text-kronos-bg' : 'bg-white/5 text-kronos-dim hover:text-white'}`}>{c.label}{sortCriteria === c.id && <ArrowUpDown size={12} className={sortDirection === 'desc' ? 'rotate-180' : ''} />}</button>)}</div>
              </div>
            </div>
          </Card>
        )}
        <Tabs tabs={INVENTORY_TABS} activeTab={activeTab} onChange={(id) => { setActiveTab(id); setCurrentFilters({}) }} />
        {inventoryData && <p className="text-xs text-kronos-dim">Showing {visibleItems.length} of {filteredItems.length} items</p>}
        {!inventoryData ? <MonitorState className="py-20" /> : (filteredItems.length === 0 ? <div className="text-center py-20 text-kronos-dim">No items found in {tabLabel.toLowerCase()}.</div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 pb-4">
          {visibleItems.map((item, idx) => {
            const isUnowned = !item.owned
            const isPrimePart = item.category === 'prime_parts'
            const isModOrResource = ['mods', 'resources', 'arcanes'].includes(item.category)
            return (
              <Card key={item.unique_name + idx} glow={!isUnowned} className={`relative p-0 overflow-hidden flex h-40 group transition-all duration-300 ${isUnowned ? 'bg-kronos-panel/10 border-2 border-dashed border-kronos-accent opacity-100' : 'border-kronos-panel/40'}`}>
                {!isUnowned && item.formas > 0 && <div className="absolute top-2 left-2 z-20 flex items-center gap-0.5 bg-kronos-accent text-kronos-bg px-1.5 py-0.5 rounded-full shadow-lg border border-white/20"><span className="text-[10px] font-black">{item.formas}</span><span className="text-[8px]">★</span></div>}
                <div className="w-32 bg-kronos-panel/30 flex-shrink-0 p-4 flex items-center justify-center relative overflow-hidden border-r border-white/5">
                  <Box className="text-kronos-panel absolute w-20 h-20 opacity-10" />
                  {item.image && <img src={item.image} alt="" className={`max-w-full max-h-full object-contain relative z-10 transition-all duration-500 group-hover:scale-110 ${isUnowned ? 'grayscale opacity-40' : ''}`} loading="lazy" />}
                </div>
                <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                  <div><div className="flex justify-between items-start mb-1"><span className="text-[10px] font-black text-kronos-accent uppercase tracking-widest truncate mr-2">{item.weapon_type || item.vehicle_type || (isPrimePart ? 'Prime' : item.category)}</span></div><h4 className="font-bold text-sm uppercase truncate text-kronos-text leading-tight" title={item.name}>{item.name}</h4></div>
                  {!isModOrResource && <div className="flex flex-col gap-1.5">{item.mastered ? <div className="flex items-center gap-1 text-blue-400"><Gem size={10} /><span className="text-[10px] font-bold uppercase tracking-tighter">Mastered</span></div> : <div className={`flex items-center gap-1 ${isUnowned ? 'text-kronos-dim/20' : 'text-kronos-dim'}`}><Gem size={10} /><span className="text-[10px] font-bold uppercase tracking-tighter">{item.owned ? 'Unmastered' : 'Unowned'}</span></div>}</div>}
                  {item.subsumed && <div className="text-[10px] flex items-center gap-1 text-purple-400 font-bold uppercase"><span className="text-xs">⚗</span><span>Subsumed</span></div>}
                  {(isModOrResource || isPrimePart || item.veiled) && item.quantity !== undefined && <div className="text-[10px] font-black uppercase text-kronos-accent mt-1">{item.quantity > 0 ? `${item.quantity} In Stock` : 'Unowned'}</div>}
                  {item.is_incarnon && <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20"><Zap size={10} className="text-orange-400" /><span className="text-[8px] font-black text-orange-400 uppercase">Incarnon</span></div>}
                </div>
              </Card>
            )
          })}
        </div>)}
        {visibleCount < filteredItems.length && <div className="flex justify-center py-8"><Button onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}>Load More Items</Button></div>}
      </div>
      <FoundryPanel isOpen={showFoundry} onClose={() => setShowFoundry(false)} inventoryData={inventoryData} foundryFilters={foundryFilters} setFoundryFilters={setFoundryFilters} />
    </PageLayout>
  )
}

function renderHeaderStats(inventoryData) {
  if (!inventoryData?.account) return null
  const { credits, platinum, forma, aura_forma, stance_forma, umbra_forma, orokin_reactor, orokin_catalyst } = inventoryData.account
  return (
    <div className="flex items-center gap-6">
      <div className="flex flex-col items-end"><span className="text-[10px] text-kronos-dim uppercase font-black tracking-widest leading-none mb-1">Credits</span><span className="text-sm font-bold text-kronos-text leading-none">{credits.toLocaleString()}</span></div>
      <div className="flex flex-col items-end"><span className="text-[10px] text-kronos-accent uppercase font-black tracking-widest leading-none mb-1">Platinum</span><span className="text-sm font-bold text-kronos-text leading-none">{platinum.toLocaleString()}</span></div>
      <div className="h-8 w-px bg-white/10" />
      <div className="flex flex-col items-end group relative cursor-help">
        <span className="text-[10px] text-kronos-accent uppercase font-black tracking-widest leading-none mb-1">Forma</span><span className="text-sm font-bold text-kronos-text leading-none">{forma + aura_forma + stance_forma + umbra_forma}</span>
        <div className="absolute top-full right-0 mt-2 p-3 bg-kronos-bg border border-white/10 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[110] min-w-[140px] glass-panel">
          <div className="space-y-2">
            <div className="flex justify-between gap-4"><span className="text-[10px] text-kronos-dim uppercase font-bold">Standard</span><span className="text-xs font-bold text-kronos-text">{forma}</span></div>
            {aura_forma > 0 && <div className="flex justify-between gap-4"><span className="text-[10px] text-blue-300 uppercase font-bold">Aura</span><span className="text-xs font-bold text-kronos-text">{aura_forma}</span></div>}
            {stance_forma > 0 && <div className="flex justify-between gap-4"><span className="text-[10px] text-green-300 uppercase font-bold">Stance</span><span className="text-xs font-bold text-kronos-text">{stance_forma}</span></div>}
            {umbra_forma > 0 && <div className="flex justify-between gap-4"><span className="text-[10px] text-purple-400 uppercase font-bold">Umbra</span><span className="text-xs font-bold text-kronos-text">{umbra_forma}</span></div>}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end"><span className="text-[10px] text-yellow-500 uppercase font-black tracking-widest leading-none mb-1">Reactors</span><span className="text-sm font-bold text-kronos-text leading-none">{orokin_reactor}</span></div>
      <div className="flex flex-col items-end"><span className="text-[10px] text-blue-400 uppercase font-black tracking-widest leading-none mb-1">Catalysts</span><span className="text-sm font-bold text-kronos-text leading-none">{orokin_catalyst}</span></div>
    </div>
  )
}
