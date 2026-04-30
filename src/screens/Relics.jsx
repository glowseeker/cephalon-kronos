/**
 * Relics.jsx
 *
 * Displays owned Void Relics and their reward pools.
 *
 * DATA FLOW
 * ─────────────────────────────────────────
 * 1. MonitoringContext provides the parsed inventory (including relics).
 * 2. This file groups and filters the relics by Era (Lith, Meso, Neo, Axi, Requiem)
 *    and refinement quality.
 *
 * FEATURES
 * ─────────────────────────────────────────
 * - Search by relic name or reward name (e.g., "Glaive prime").
 * - Filter by Era and refinement status.
 * - Displays all four refinement tiers for each relic in a single card.
 */
import { useState, useEffect, useMemo } from 'react'
import { Search, AlertCircle, Users, Zap, TrendingUp, Coins } from 'lucide-react'
import { PageLayout, Input, Card, Tabs, MonitorState } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'
import { getRelicEV } from '../lib/relicParser'
import { getPricesBatch } from '../lib/wfmCache'

const ERA_ORDER = ['Lith', 'Meso', 'Neo', 'Axi', 'Requiem']
const QUALITY_ORDER = ['Intact', 'Exceptional', 'Flawless', 'Radiant']

export default function Relics() {
  const { inventoryData, isInventoryLoading, exportData } = useMonitoring()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeEra, setActiveEra] = useState('All')
  const [activeQuality, setActiveQuality] = useState('All')
  const [squadSize, setSquadSize] = useState(1)
  const [prices, setPrices] = useState({})
  const [isPricing, setIsPricing] = useState(false)

  const relics = inventoryData?.relics ?? []

  // Fetch prices for all unique rewards in current relic set
  useEffect(() => {
    if (!relics.length) return
    
    const uniqueRewards = []
    const seen = new Set()
    
    relics.forEach(r => {
      r.rewards?.forEach(rew => {
        if (!seen.has(rew.uniqueName)) {
          uniqueRewards.push(rew)
          seen.add(rew.uniqueName)
        }
      })
    })

    if (uniqueRewards.length > 0) {
      setIsPricing(true)
      getPricesBatch(uniqueRewards).then(res => {
        setPrices(prev => ({ ...prev, ...res }))
        setIsPricing(false)
      }).catch(() => setIsPricing(false))
    }
  }, [relics.length])

  const baseFiltered = relics.filter(r => {
    const matchEra = activeEra === 'All' || r.era === activeEra
    if (!matchEra) return false

    const matchQuality = activeQuality === 'All' || (r.refinements && r.refinements[activeQuality] > 0)
    if (!matchQuality) return false

    const search = searchQuery.toLowerCase()
    if (!search) return true

    const matchName = r.name.toLowerCase().includes(search)
    const matchRewards = r.rewards?.some(rw => rw.name.toLowerCase().includes(search))

    return matchName || matchRewards
  })

  const grouped = baseFiltered.reduce((acc, relic) => {
    const era = relic.era || 'Other'
    if (!acc[era]) acc[era] = []
    acc[era].push(relic)
    return acc
  }, {})

  const totalFilteredGroups = baseFiltered.length;
  const totalFilteredItems = baseFiltered.reduce((s, r) => s + Object.values(r.refinements || {}).reduce((a, b) => a + b, 0), 0);

  const eraTabs = ['All', ...ERA_ORDER, 'Other']
    .filter(e => e === 'All' || relics.some(r => r.era === e))
    .map(e => ({ id: e, label: e }))

  const qualityTabs = ['All', ...QUALITY_ORDER].map(q => ({ id: q, label: q }))

  return (
    <PageLayout title="Void Relics">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-kronos-dim" size={20} />
            <Input
              placeholder="Search relics or rewards…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-12"
            />
          </div>
          
          <div className="flex items-center gap-2 bg-kronos-panel/30 border border-white/5 p-1 rounded-xl">
             <div className="px-3 flex items-center gap-2 border-r border-white/5">
                <Users size={14} className="text-kronos-dim" />
                <span className="text-[10px] font-black uppercase text-kronos-dim tracking-wider">Squad</span>
             </div>
             {[1, 2, 3, 4].map(size => (
               <button
                 key={size}
                 onClick={() => setSquadSize(size)}
                 className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${squadSize === size ? 'bg-kronos-accent text-kronos-bg' : 'text-kronos-dim hover:text-white'}`}
               >
                 {size}
               </button>
             ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-8">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-kronos-accent uppercase tracking-widest px-1">Era</p>
            <Tabs tabs={eraTabs} activeTab={activeEra} onChange={setActiveEra} />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-kronos-accent uppercase tracking-widest px-1">Refinement</p>
            <Tabs tabs={qualityTabs} activeTab={activeQuality} onChange={setActiveQuality} />
          </div>
        </div>

        {isInventoryLoading ? (
          <MonitorState isLoading className="py-20" />
        ) : !inventoryData ? (
          <MonitorState className="py-20" />
        ) : totalFilteredGroups === 0 ? (
          <Card glow>
            <div className="text-center py-12">
              <p className="text-kronos-dim">
                {relics.length === 0 ? 'No relics found in inventory' : 'No relics match your search'}
              </p>
            </div>
          </Card>
        ) : (
          <>
            <div className="flex justify-between items-end px-1">
              <div className="flex items-center gap-4">
                <p className="text-sm text-kronos-dim">
                  Showing {totalFilteredGroups} relic types · {totalFilteredItems} total
                </p>
                {isPricing && (
                  <span className="text-[10px] font-black uppercase text-kronos-accent animate-pulse flex items-center gap-1">
                    <TrendingUp size={10} /> Fetching Prices...
                  </span>
                )}
              </div>
              {inventoryData?.account && (
                <div className="text-right">
                  <p className="text-[10px] font-black text-kronos-accent uppercase tracking-widest mb-1">Void Traces</p>
                  <p className="text-sm font-black text-kronos-text">
                    {inventoryData.account.void_traces}
                    <span className="text-kronos-dim mx-1">/</span>
                    <span className="text-kronos-dim text-xs">{inventoryData.account.void_traces_max}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-12 pb-12">
              {Object.entries(grouped).sort(([a], [b]) => ERA_ORDER.indexOf(a) - ERA_ORDER.indexOf(b)).map(([era, eraRelics]) => (
                <div key={era} className="space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-[0.2em] text-kronos-accent border-b border-kronos-accent/20 pb-1 ml-1">{era} Era</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                    {eraRelics.map((item, idx) => {
                      const refinements = item.refinements || {};
                      const activeLevels = ['Intact', 'Exceptional', 'Flawless', 'Radiant'].filter(q => (refinements[q] || 0) > 0);

                      let countLabel = '';
                      if (activeLevels.length === 1) {
                        countLabel = `${activeLevels[0]} ${refinements[activeLevels[0]]}`;
                      } else if (activeLevels.length === 2) {
                        countLabel = `${activeLevels[0]} ${refinements[activeLevels[0]]} | ${activeLevels[1]} ${refinements[activeLevels[1]]}`;
                      } else {
                        countLabel = ['Intact', 'Exceptional', 'Flawless', 'Radiant'].map(q => refinements[q] || 0).join(' | ');
                      }

                      // SORTED REWARDS WITH PRICES
                      const sortedRewards = [...(item.rewards || [])].sort((a, b) => a.tier - b.tier).map(r => ({
                        ...r,
                        plat: prices[r.uniqueName] ?? 0
                      }));

                      // Calculate EV for the highest available refinement or current active filter
                      const evRefinement = activeQuality !== 'All' ? activeQuality : (activeLevels[activeLevels.length-1] || 'Intact');
                      const evPlat = getRelicEV(sortedRewards, evRefinement, squadSize, 'plat');
                      const evDucats = getRelicEV(sortedRewards, evRefinement, squadSize, 'ducats');

                      return (
                        <Card
                          key={item.unique_name + idx}
                          glow
                          className="flex group p-1 transition-all duration-300 relative overflow-hidden"
                        >
                          {/* Left: Metadata Stack*/}
                          <div className="w-24 flex-shrink-0 flex flex-col items-center text-center mr-4 py-1">
                            <h4 className="font-black text-[11px] uppercase tracking-tight text-kronos-accent mb-1 truncate w-full px-1">
                              {item.name.replace(' Relic', '')}
                            </h4>

                            <div className="flex-1 flex items-center justify-center p-1 min-h-0 min-w-0">
                              {item.image && (
                                <img src={item.image} alt="" className="max-w-full max-h-[80px] object-contain grayscale-[0.2] transition-all duration-500 group-hover:grayscale-0 group-hover:scale-110" loading="lazy" />
                              )}
                            </div>

                            <p className="font-black text-[9px] uppercase text-kronos-dim mt-1 whitespace-nowrap">
                              {countLabel}
                            </p>
                          </div>

                          {/* Divider (Minimal) */}
                          <div className="w-px bg-white/5 ml-0 mr-2 self-stretch" />

                          {/* Right: Rewards + EV Footer */}
                          <div className="flex-1 flex flex-col min-w-0 pr-1 pl-1">
                            <div className="flex-1 flex flex-col justify-center gap-0.5">
                              {sortedRewards.map((reward, ridx) => {
                                const isMatch = searchQuery && reward.name.toLowerCase().includes(searchQuery.toLowerCase());
                                const rarityColor = reward.rarity === 'COMMON' ? 'text-gray-400/80' : (reward.rarity === 'UNCOMMON' ? 'text-white/90' : 'text-orange-400');
                                const plat = prices[reward.uniqueName];
                                
                                return (
                                  <div key={ridx} className="flex items-center justify-between gap-2 min-w-0">
                                    <p className={`text-[10px] font-bold leading-tight truncate uppercase ${rarityColor} group-hover:brightness-110 transition-all flex-1`}>
                                      {isMatch && <span className="text-kronos-accent mr-0.5">[</span>}
                                      {reward.name}
                                      {isMatch && <span className="text-kronos-accent ml-0.5">]</span>}
                                    </p>
                                    {plat !== undefined && (
                                      <span className="text-[9px] font-black text-white/40 group-hover:text-white/60 transition-colors">
                                        {plat}P
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Expected Value Footer */}
                            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                               <div className="flex items-center gap-1.5" title={`Expected Ducats (${evRefinement}, Squad of ${squadSize})`}>
                                  <Coins size={10} className="text-blue-400" />
                                  <span className="text-[10px] font-black text-blue-200">{Math.round(evDucats)}</span>
                               </div>
                               <div className="flex items-center gap-1.5" title={`Expected Platinum (${evRefinement}, Squad of ${squadSize})`}>
                                  <Zap size={10} className="text-kronos-accent" />
                                  <span className="text-[10px] font-black text-kronos-accent">{evPlat.toFixed(1)}P</span>
                               </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </PageLayout>
  )
}
