/**
 * Inventory.jsx
 *
 * Displays the user's full collection of items, including equipment, mods,
 * arcanes and resources.  Provides categorised tabs and multi-column
 * filtering (e.g., "Owned + Unmastered").
 */
import { useState, useMemo, useEffect } from 'react'
import { Search, Filter, ArrowUpDown, AlertCircle, Check, Box, Zap, Gem, Clock, X, Hammer, Package } from 'lucide-react'
import { PageLayout, Card, Input, Button, Tabs, MonitorState, Tooltip } from '../components/UI'
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
  const { isInventoryLoading } = useMonitoring()
  const [width, setWidth] = useState(600)
  const [isResizing, setIsResizing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(24)
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      // Small delay to ensure DOM is ready for entry animation
      requestAnimationFrame(() => setIsAnimating(true))
    } else {
      setIsAnimating(false)
      const timer = setTimeout(() => setShouldRender(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isResizing) return
    const handleMouseMove = (e) => {
      window.requestAnimationFrame(() => {
        const newWidth = window.innerWidth - e.clientX
        // Limit to window width minus sidebar (80px)
        if (newWidth > 320 && newWidth < window.innerWidth - 80) setWidth(newWidth)
      })
    }
    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  const craftingItems = useMemo(() => {
    return inventoryData?.foundry ?? []
  }, [inventoryData])

  const craftableItems = useMemo(() => {
    return inventoryData?.craftable ?? []
  }, [inventoryData])

  useEffect(() => { setVisibleCount(24) }, [searchQuery, foundryFilters])

  const formatFoundryTime = (seconds) => {
    if (seconds <= 0) return 'READY'
    const d = Math.floor(seconds / (24 * 3600))
    const h = Math.floor((seconds % (24 * 3600)) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)

    if (d > 0) return `${d}d ${h}h`
    return h > 0 ? `${h}h ${m}m` : (m > 0 ? `${m}m ${s}s` : `${s}s`)
  }

  const filteredCrafting = useMemo(() => {
    let items = craftingItems
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter(i => (i.name ?? '').toLowerCase().includes(q) || (i.parentName ?? '').toLowerCase().includes(q))
    }
    return items
  }, [craftingItems, searchQuery])

  const filteredCraftable = useMemo(() => {
    let items = craftableItems

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      // Search everything - owned BPs and component-based warframe BPs
      items = items.filter(i =>
        i.bpName.toLowerCase().includes(q) ||
        i.baseName.toLowerCase().includes(q) ||
        i.ingredients.some(ing => ing.name.toLowerCase().includes(q))
      )
    } else {
      // Without search, show BPs player owns OR component-based ones they have parts for
      items = items.filter(i => i.bpCount > 0 || i.componentBased)
    }

    // Apply other filters
    if (foundryFilters.unmastered) {
      items = items.filter(i => i.hasMastery && !i.isMastered)
    }
    if (foundryFilters.owned) {
      items = items.filter(i => !i.fullItemOwned)
    }
    if (foundryFilters.ready) {
      items = items.filter(i => i.allIngredientsMet)
    }

    return items
  }, [craftableItems, searchQuery, foundryFilters])

  if (!shouldRender) return null

  const hasData = !!inventoryData
  const isLarge = width > 850
  const isMedium = width > 500

  return (
    <div className={`fixed inset-0 z-[100] flex justify-end transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isAnimating ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative h-full bg-kronos-bg border-l border-white/5 shadow-2xl flex flex-col transform transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]`}
        style={{
          width: `${width}px`,
          transform: isAnimating ? 'translateX(0)' : 'translateX(100%)',
          transition: isResizing ? 'none' : 'width 500ms cubic-bezier(0.16, 1, 0.3, 1), transform 500ms cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div
          className={`absolute left-0 top-0 w-2 h-full cursor-ew-resize hover:bg-kronos-accent/30 transition-colors z-50 flex items-center justify-center ${isResizing ? 'bg-kronos-accent/20' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
        >
          <div className={`w-[1px] h-12 rounded-full transition-colors ${isResizing ? 'bg-kronos-accent shadow-[0_0_8px_rgba(var(--kronos-accent-rgb),0.8)]' : 'bg-white/10'}`} />
        </div>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div><h3 className="text-2xl font-bold uppercase tracking-tight">Foundry</h3></div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X size={22} /></button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-white/5">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-kronos-dim group-focus-within:text-kronos-accent transition-colors" size={16} />
            <Input placeholder="Search blueprints..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 py-3 text-sm" />
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-white/5 flex gap-3">
          <button
            onClick={() => setFoundryFilters(prev => ({ ...prev, crafting: !prev.crafting }))}
            className={`flex-1 flex items-center justify-center py-3 rounded-xl border text-[11px] font-black uppercase transition-all ${foundryFilters.crafting ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-kronos-panel/20 border-white/5 text-kronos-dim'}`}
          >
            Crafting
          </button>
          <button
            onClick={() => setFoundryFilters(prev => ({ ...prev, ready: !prev.ready }))}
            className={`flex-1 flex items-center justify-center py-3 rounded-xl border text-[11px] font-black uppercase transition-all ${foundryFilters.ready ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-kronos-panel/20 border-white/5 text-kronos-dim'}`}
          >
            Ready
          </button>
          <button
            onClick={() => setFoundryFilters(prev => ({ ...prev, owned: !prev.owned }))}
            className={`flex-1 flex items-center justify-center py-3 rounded-xl border text-[11px] font-black uppercase transition-all ${foundryFilters.owned ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-kronos-panel/20 border-white/5 text-kronos-dim'}`}
          >
            Unowned
          </button>
          <button
            onClick={() => setFoundryFilters(prev => ({ ...prev, unmastered: !prev.unmastered }))}
            className={`flex-1 flex items-center justify-center py-3 rounded-xl border text-[11px] font-black uppercase transition-all ${foundryFilters.unmastered ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-kronos-panel/20 border-white/5 text-kronos-dim'}`}
          >
            Unmastered
          </button>

        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          {isInventoryLoading ? (
            <MonitorState isLoading className="h-full" />
          ) : inventoryData === null ? (
            <MonitorState className="h-full" />
          ) : (
            <>
              {/* Currently Crafting */}
              {foundryFilters.crafting && (
                <>
                  {filteredCrafting.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3">Currently Crafting</h4>
                      <div className="space-y-2">
                        {filteredCrafting.map((item, idx) => {
                          const duration = item.startTime ? (item.finishTime - item.startTime) : (item.buildTime || 12 * 3600);
                          const now = Date.now() / 1000;
                          const elapsed = item.startTime ? (now - item.startTime) : (now - (item.finishTime - (item.buildTime || 12 * 3600)));
                          const progress = Math.min(100, Math.max(0, (elapsed / duration) * 100));
                          const timeLeft = Math.max(0, item.finishTime - now);
                          return (
                            <div key={item.unique_name + idx} className="flex gap-3 items-center bg-kronos-panel/30 p-2 rounded-lg border border-orange-500/20">
                              <div className="w-11 h-11 flex items-center justify-center flex-shrink-0">
                                {item.image && <img src={item.image} alt="" className="max-w-full max-h-full object-contain" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-bold text-kronos-text truncate">{item.name}</span>
                                  {item.ready ? (
                                    <span className="text-[9px] font-black text-green-500 uppercase flex items-center gap-1"><Check size={10} /> READY</span>
                                  ) : (
                                    <span className="text-[9px] font-mono text-orange-400">{formatFoundryTime(timeLeft)}</span>
                                  )}
                                </div>
                                {!item.ready && (
                                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} />
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Craftable Blueprints - show when Crafting is OFF */}
              {!foundryFilters.crafting && (
                <>
                  {filteredCraftable.length === 0 ? (
                    <div className="text-center py-12 text-kronos-dim text-sm italic">No blueprints match your filters.</div>
                  ) : (
                    <>
                      <div className={`grid gap-4 ${isLarge ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {filteredCraftable.slice(0, visibleCount).map((item, idx) => (
                          <div key={item.uniqueName + idx} className={`rounded-xl border border-white/5 overflow-hidden flex flex-col bg-kronos-panel/20`}>
                            {/* Header: BP image + name + badges */}
                            <div className={`flex items-center gap-4 px-4 py-5 border-b border-white/5 relative ${item.bpCount > 0 ? 'bg-green-500/5' : ''}`}>
                              <div className="w-28 h-28 flex items-center justify-center flex-shrink-0">
                                {item.image
                                  ? <img src={item.image} alt="" className="max-w-full max-h-full object-contain" />
                                  : <div className="w-14 h-14 rounded bg-white/5" />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xl font-black text-kronos-text uppercase whitespace-normal leading-tight">{item.baseName}</p>
                                    {(item.buildTime > 0 || item.buildPrice > 0) && (
                                      <div className="flex gap-3 mt-1">
                                        {item.buildPrice > 0 && <span className="text-[10px] font-black text-yellow-500/80 uppercase">Credit cost: {item.buildPrice.toLocaleString()}</span>}
                                        {item.buildTime > 0 && <span className="text-[10px] font-black text-kronos-dim uppercase">Build time: {formatFoundryTime(item.buildTime)}</span>}
                                      </div>
                                    )}
                                  </div>
                                  {item.allIngredientsMet && item.bpCount > 0 && (
                                    <div className="px-2 py-1 bg-green-500 text-black text-[10px] font-black uppercase rounded flex items-center gap-1 shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                                      <Check size={12} /> Ready
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-2 mt-4">
                                  {/* Blueprint Status */}
                                  <div className={`flex items-center px-3 py-1.5 rounded-lg border transition-colors ${item.bpCount > 0 ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                    <div className={`${item.bpCount > 0 ? 'bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.5)]' : 'bg-red-400'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Blueprint: {item.bpCount}</span>
                                  </div>

                                  {/* Crafted Status */}
                                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${item.fullItemOwned ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/5 text-kronos-dim'}`}>
                                    <span className="text-[10px] font-black uppercase tracking-wider">Crafted: {item.ownedCount || 0}</span>
                                  </div>

                                  {/* Mastery Status */}
                                  {item.hasMastery && (
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${item.isMastered ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-white/5 border-white/5 text-kronos-dim'}`}>
                                      <span className="text-[10px] font-black uppercase tracking-wider">{item.isMastered ? 'Mastered' : 'Unmastered'}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Ingredients grid */}
                            {item.ingredients.length > 0 && (
                              <div
                                className={`grid gap-px flex-1 border-t border-white/5`}
                                style={{
                                  gridTemplateColumns: `repeat(${isMedium ? Math.min(item.ingredients.length, 4) : 2}, 1fr)`
                                }}
                              >
                                {item.ingredients.map((ing, i) => {
                                  const met = ing.have >= ing.need
                                  const hasSubIngredients = ing.isComponent && ing.bpOwned > 0 && ing.subIngredients && ing.subIngredients.length > 0;
                                  
                                  const ingredientContent = (
                                    <div 
                                      className={`flex flex-col items-center justify-center gap-1.5 p-3 h-full ${met ? 'bg-green-500/5' : 'bg-black/20'} relative group ${hasSubIngredients ? 'cursor-help' : ''}`}
                                    >
                                      <div className="w-14 h-14 flex items-center justify-center flex-shrink-0 relative">
                                        {ing.image
                                          ? <img src={ing.image} alt="" className="max-w-full max-h-full object-contain" />
                                          : <div className="w-7 h-7 rounded bg-white/5" />
                                        }
                                        {ing.isComponent && ing.bpOwned > 0 && (
                                          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${ing.bpReady ? 'bg-green-500' : 'bg-red-500'}`}>
                                            {ing.bpReady ? <Check size={10} className="text-black" /> : <X size={10} className="text-white" />}
                                          </div>
                                        )}
                                      </div>
                                      <p className="text-[14px] font-medium text-kronos-dim text-center leading-tight w-full px-1">{ing.name}</p>
                                      <span className={`text-[12px] font-black font-mono ${met ? 'text-green-400' : 'text-red-400'}`}>
                                        {ing.have}/{ing.need}{ing.isComponent && ing.bpOwned > 0 && ` (${ing.bpOwned} BP${ing.bpOwned > 1 ? 's' : ''})`}
                                      </span>
                                    </div>
                                  );

                                  if (hasSubIngredients) {
                                    return (
                                      <Tooltip 
                                        key={i} 
                                        position="top"
                                        content={
                                          <div className="min-w-[200px]">
                                            <p className="text-[10px] font-black text-kronos-accent uppercase mb-2">Requires:</p>
                                            <div className="space-y-1">
                                              {ing.subIngredients.map((sub, si) => {
                                                const subMet = sub.have >= sub.need;
                                                return (
                                                  <div key={si} className="flex items-center gap-2 text-[10px]">
                                                    <div className="w-6 h-6 flex-shrink-0">
                                                      {sub.image ? <img src={sub.image} alt="" className="max-w-full max-h-full object-contain" /> : <div className="w-4 h-4 bg-white/10 rounded" />}
                                                    </div>
                                                    <span className={`flex-1 ${subMet ? 'text-green-400' : 'text-red-400'}`}>{sub.name}</span>
                                                    <span className="font-mono">{sub.have}/{sub.need}</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        }
                                      >
                                        {ingredientContent}
                                      </Tooltip>
                                    );
                                  }

                                  return <div key={i} className="h-full">{ingredientContent}</div>;
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {visibleCount < filteredCraftable.length && (
                        <div className="flex justify-center pt-8 pb-12">
                          <Button
                            variant="secondary"
                            onClick={() => setVisibleCount(prev => prev + 24)}
                            className="w-full py-4 text-[11px] font-black uppercase tracking-[0.2em] border border-white/5 bg-kronos-panel/10 hover:bg-kronos-panel/30 transition-all text-kronos-accent"
                          >
                            Load More Blueprints ({filteredCraftable.length - visibleCount} remaining)
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
export default function Inventory() {
  const { inventoryData, isInventoryLoading } = useMonitoring()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilterSortPanel, setShowFilterSortPanel] = useState(false)
  const [currentFilters, setCurrentFilters] = useState({})
  const [sortCriteria, setSortCriteria] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
  const [showFoundry, setShowFoundry] = useState(false)
  const [foundryFilters, setFoundryFilters] = useState({ crafting: true, ready: false, owned: false, unmastered: false })

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
          <Tooltip content="Filters">
            <Button variant="secondary" onClick={() => setShowFilterSortPanel(v => !v)}><Filter size={20} className={showFilterSortPanel ? 'text-kronos-accent' : ''} /></Button>
          </Tooltip>
          <Tooltip content="Foundry">
            <Button variant="secondary" onClick={() => setShowFoundry(true)} className="relative">
              <img src="/IconFoundry.png" alt="Foundry" className="w-6 h-6 object-contain" />
              {inventoryData?.foundry?.some(i => i.ready) && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-kronos-bg" />}
            </Button>
          </Tooltip>
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
        {isInventoryLoading ? (
          <MonitorState isLoading className="py-20" />
        ) : inventoryData === null ? (
          <MonitorState className="py-20" />
        ) : (
          filteredItems.length === 0 ? (
            <div className="text-center py-20 text-kronos-dim">No items found in {tabLabel.toLowerCase()}.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 pb-4">
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
        </div>)
        )}
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