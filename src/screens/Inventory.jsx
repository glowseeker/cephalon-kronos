import { useState, useMemo, useEffect } from 'react'
import { Search, Filter, ArrowUpDown, AlertCircle, CheckCircle2, Box, Zap, Gem, Clock, Pyramid, X } from 'lucide-react'
import { PageLayout, Card, Input, Button, Tabs } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'
import { formatLastUpdate } from '../lib/warframeUtils'

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

export default function Inventory() {
  const { inventoryData, lastUpdate, statusText } = useMonitoring()

  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilterSortPanel, setShowFilterSortPanel] = useState(false)
  const [currentFilters, setCurrentFilters] = useState({})
  const [sortCriteria, setSortCriteria] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
  const [showFoundry, setShowFoundry] = useState(false)

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE)
  }, [activeTab, searchQuery, currentFilters])

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
      let av = a[sortCriteria] ?? ''
      let bv = b[sortCriteria] ?? ''
      if (typeof av === 'boolean') av = av ? 1 : 0
      if (typeof bv === 'boolean') bv = bv ? 1 : 0
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      const res = av < bv ? -1 : av > bv ? 1 : 0
      return sortDirection === 'asc' ? res : -res
    })
    return items
  }, [tabItems, searchQuery, currentFilters, activeTab, sortCriteria, sortDirection])

  const visibleItems = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount])

  const toggleFilter = f => setCurrentFilters(prev => ({ ...prev, [f]: !prev[f] }))
  const handleSort = c => {
    if (sortCriteria === c) setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCriteria(c); setSortDirection('asc') }
  }

  const tabLabel = INVENTORY_TABS.find(t => t.id === activeTab)?.label ?? activeTab
  const showQuantitySort = ['mods', 'prime_parts', 'resources'].includes(activeTab)

  const formatFoundryTime = (seconds) => {
    if (seconds <= 0) return 'READY'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  const renderFoundry = () => {
    const items = inventoryData?.foundry ?? []
    if (items.length === 0) {
      return (
        <div className="text-center py-20 text-kronos-dim">
          No items currently crafting in the Foundry.
        </div>
      )
    }

    return (
      <div className="space-y-4 max-h-full overflow-y-auto custom-scrollbar pr-2">
        {items.map((item, idx) => {
          const duration = item.startTime ? (item.finishTime - item.startTime) : (12 * 3600); // Default 12h for recipes if unknown
          const now = Date.now() / 1000;
          const elapsed = item.startTime ? (now - item.startTime) : (now - (item.finishTime - (12 * 3600))); 
          const progress = Math.min(100, Math.max(0, (elapsed / duration) * 100));
          const timeLeft = Math.max(0, item.finishTime - now);
          const isReallyReady = timeLeft <= 0 || item.ready;

          return (
            <Card key={item.unique_name + idx} className="p-4 border-kronos-accent/20">
              <div className="flex gap-4 items-start">
                <div className="w-16 h-16 bg-kronos-panel/40 rounded flex items-center justify-center p-2 flex-shrink-0 relative overflow-hidden">
                  <Box className="text-kronos-panel absolute w-10 h-10 opacity-20" />
                  {item.image && <img src={item.image} alt="" className="max-w-full max-h-full object-contain relative z-10" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm uppercase truncate text-kronos-text" title={item.name}>{item.name}</h4>
                  <p className="text-[10px] text-kronos-accent font-black uppercase mb-2 tracking-widest">
                    {item.ready ? 'Construction Complete' : 'In Progress'}
                  </p>

                  {!item.ready && item.startTime ? (
                    <>
                      <div className="w-full bg-kronos-panel/60 h-1.5 rounded-full overflow-hidden mb-1 relative border border-white/5">
                        <div
                          className="h-full bg-kronos-accent shadow-[0_0_8px_rgba(var(--kronos-accent-rgb),0.5)] transition-all duration-1000"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-kronos-accent">{Math.floor(progress)}%</span>
                        <span className="text-kronos-dim uppercase tracking-tighter">
                          <Clock size={12} className="inline mr-1" />
                          {formatFoundryTime(timeLeft)}
                        </span>
                      </div>
                    </>
                  ) : item.ready ? (
                    <div className="flex items-center gap-1.5 text-green-500 font-bold text-[10px] uppercase">
                      <CheckCircle2 size={12} />
                      <span>Ready to Claim</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-kronos-dim font-bold text-[10px] uppercase">
                      <Clock size={12} />
                      <span>Building...</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <PageLayout
      title="Inventory"
      subtitle={lastUpdate ? `Last synced: ${formatLastUpdate(lastUpdate)}` : statusText}
    >
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-kronos-dim" size={20} />
            <Input
              placeholder={`Search ${tabLabel.toLowerCase()}…`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-12"
            />
          </div>
          <Button variant="secondary" onClick={() => setShowFilterSortPanel(v => !v)}>
            <Filter size={20} className={showFilterSortPanel ? 'text-kronos-accent' : ''} />
          </Button>
          <Button variant="secondary" onClick={() => setShowFoundry(true)} className="relative">
            <Pyramid size={20} className={showFoundry ? 'text-kronos-accent' : ''} />
            {inventoryData?.foundry?.filter(i => i.ready).length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-kronos-bg" />
            )}
          </Button>
        </div>

        {showFilterSortPanel && (
          <Card glow className="p-4 bg-kronos-panel/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-kronos-accent uppercase tracking-widest mb-3">Filters</p>
                <div className="flex flex-wrap gap-2">
                  <Tabs 
                    tabs={(FILTER_CONFIG[activeTab] ?? []).map(f => ({ id: f, label: f.replace(/_/g, ' ') }))}
                    activeTab={Object.keys(currentFilters).filter(k => currentFilters[k])}
                    onChange={toggleFilter}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-kronos-accent uppercase tracking-widest mb-3">Sort By</p>
                <Tabs 
                  tabs={['name', 'rank', 'xp', ...(showQuantitySort ? ['quantity'] : [])].map(opt => ({ 
                    id: opt, 
                    label: (
                      <div className="flex items-center gap-1.5">
                        <span className={opt === 'xp' ? 'uppercase' : 'capitalize'}>{opt}</span>
                        {sortCriteria === opt && (
                          <ArrowUpDown 
                            size={12} 
                            className={`transition-transform duration-300 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} 
                          />
                        )}
                      </div>
                    )
                  }))} 
                  activeTab={sortCriteria} 
                  onChange={handleSort} 
                />
              </div>
            </div>
          </Card>
        )}

        <Tabs 
          tabs={INVENTORY_TABS} 
          activeTab={activeTab} 
          onChange={(id) => { setActiveTab(id); setCurrentFilters({}) }} 
        />

        {inventoryData && (
          <p className="text-xs text-kronos-dim">
            Showing {visibleItems.length} of {filteredItems.length} items
          </p>
        )}

        {!inventoryData ? (
          <Card glow className="py-20 text-center">
            <AlertCircle className="w-16 h-16 text-kronos-accent mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2">No Inventory Data</h3>
            <p className="text-kronos-dim">Start monitoring in Settings to sync your inventory.</p>
          </Card>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 text-kronos-dim">
            No items found in {tabLabel.toLowerCase()}.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 pb-4">
              {visibleItems.map((item, idx) => {
                const isPrimePart = item.category === 'prime_parts'
                const isModOrResource = ['mods', 'resources', 'arcanes'].includes(item.category)
                const isUnowned = !item.owned

                return (
                  <Card
                    key={item.unique_name + idx}
                    glow={!isUnowned}
                    className={`relative p-0 overflow-hidden flex h-40 group transition-all duration-300 ${isUnowned
                      ? 'bg-kronos-panel/10 border-2 border-dashed border-kronos-accent opacity-100'
                      : 'border-kronos-panel/40'
                      }`}
                  >
                    {/* Left: Image */}
                    <div className="w-28 bg-kronos-panel/30 flex-shrink-0 p-2 flex items-center justify-center relative overflow-hidden">
                      <Box className="text-kronos-panel absolute w-16 h-16 opacity-20" />
                      {item.image && (
                        <img
                          src={item.image}
                          alt=""
                          className={`w-full h-full object-contain relative z-10 transition-transform duration-500 group-hover:scale-110 ${isUnowned ? 'opacity-40 grayscale-[0.5]' : ''
                            }`}
                          loading="lazy"
                        />
                      )}
                    </div>

                    {/* Right: Info Stack */}
                    <div className="flex-1 p-3 flex flex-col justify-center min-w-0 gap-0.5">
                      {/* Line 1: Name */}
                      <h4 className={`font-black text-sm uppercase leading-tight truncate ${isUnowned ? 'text-kronos-dim' : 'text-kronos-text'}`} title={item.name}>
                        {item.name}
                      </h4>

                      {/* Line 2: Category / Type */}
                      <p className="text-[10px] text-kronos-accent font-bold uppercase tracking-widest truncate">
                        {item.weapon_type || item.vehicle_type || item.category.replace('_', ' ')}
                      </p>

                      {/* Line 3: Ownership / Rank */}
                      {!isUnowned && !isPrimePart && (item.rank !== undefined) && (
                        <div className="text-[10px] flex items-center gap-1.5 font-bold uppercase">
                          <span className="text-kronos-text/80 tracking-tighter">Rank {item.rank}</span>
                        </div>
                      )}

                      {/* Line 4: Mastery Status */}
                      {!isPrimePart && !isModOrResource && (
                        <div className="text-[10px] flex items-center gap-1.5 font-bold uppercase">
                          {item.mastered ? (
                            <div className="flex items-center gap-1 text-blue-400">
                              <Gem size={10} />
                              <span>Mastered</span>
                            </div>
                          ) : (
                            <div className={`flex items-center gap-1 ${isUnowned ? 'text-kronos-dim/20' : 'text-kronos-dim'}`}>
                              <Gem size={10} />
                              <span>{item.owned ? 'Unmastered' : 'Unowned'}</span>
                            </div>
                          )}                        </div>
                      )}

                      {/* Line 5: Forma Count */}
                      {!isUnowned && item.formas > 0 && (
                        <div className="text-[10px] flex items-center gap-1 text-kronos-accent font-black uppercase">
                          <span className="text-xs">★</span>
                          <span>{item.formas} Forma</span>
                        </div>
                      )}

                      {/* Line 6: Subsumed Status (Frames only) */}
                      {item.subsumed && (
                        <div className="text-[10px] flex items-center gap-1 text-purple-400 font-bold uppercase">
                          <span className="text-xs">⚗</span>
                          <span>Subsumed</span>
                        </div>
                      )}

                      {/* Line 7: Components (Modular only) */}
                      {item.components?.length > 0 && (
                        <p className="text-[10px] text-kronos-dim truncate mt-0.5 font-medium italic border-t border-white/5 pt-1" title={item.components.join(' · ')}>
                          {item.components.join(' · ')}
                        </p>
                      )}

                      {/* Special: Quantity (Resources/Parts/Arcanes/Veiled) */}
                      {(isModOrResource || isPrimePart || item.veiled) && (
                        <div className="text-[10px] font-black uppercase text-kronos-accent mt-1">
                          {item.quantity > 0 ? `${item.quantity} In Stock` : 'Unowned'}
                        </div>
                      )}

                      {/* Special: Incarnon Badge */}
                      {item.is_incarnon && (
                        <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                          <Zap size={10} className="text-orange-400" />
                          <span className="text-[8px] font-black text-orange-400 uppercase">Incarnon</span>
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
            {visibleCount < filteredItems.length && (
              <div className="flex justify-center py-8">
                <Button onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}>Load More Items</Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Foundry Side Panel */}
      {showFoundry && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFoundry(false)} />
          <div className="relative w-full max-w-md h-full bg-kronos-bg border-l border-white/5 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold uppercase tracking-tight">Foundry</h3>
                <p className="text-xs text-kronos-dim">Track active construction</p>
              </div>
              <button
                onClick={() => setShowFoundry(false)}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 p-4 min-h-0">
              {renderFoundry()}
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
