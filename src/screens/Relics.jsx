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
import { useState } from 'react'
import { Search, AlertCircle } from 'lucide-react'
import { PageLayout, Input, Card, Tabs } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'

const ERA_ORDER = ['Lith', 'Meso', 'Neo', 'Axi', 'Requiem']
const QUALITY_ORDER = ['Intact', 'Exceptional', 'Flawless', 'Radiant']

export default function Relics() {
  const { inventoryData } = useMonitoring()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeEra, setActiveEra] = useState('All')
  const [activeQuality, setActiveQuality] = useState('All')

  const relics = inventoryData?.relics ?? []
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
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-kronos-dim" size={20} />
            <Input
              placeholder="Search relics or rewards…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-12"
            />
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

        {!inventoryData ? (
          <Card glow>
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-kronos-accent mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold mb-2">No Data</h3>
              <p className="text-kronos-dim">Start monitoring to load relics</p>
            </div>
          </Card>
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
              <p className="text-sm text-kronos-dim">
                Showing {totalFilteredGroups} relic types · {totalFilteredItems} total
              </p>
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

            <div className="space-y-12">
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

                      // Sort rewards: Common (tier 0) -> Uncommon (1) -> Rare (2)
                      const sortedRewards = [...(item.rewards || [])].sort((a, b) => a.tier - b.tier);

                      return (
                        <Card
                          key={item.unique_name + idx}
                          glow
                          className="flex h-44 group p-1 transition-all duration-300"
                        >
                          {/* Left: Metadata Stack*/}
                          <div className="w-24 flex-shrink-0 flex flex-col items-center text-center mr-4">
                            <h4 className="font-black text-xs uppercase tracking-tight text-kronos-accent mb-1 truncate w-full">
                              {item.name.replace(' Relic', '')}
                            </h4>

                            <div className="flex-1 flex items-center justify-center p-1 min-h-0">
                              {item.image && (
                                <img src={item.image} alt="" className="max-w-full max-h-full object-contain grayscale-[0.2] transition-all duration-500 group-hover:grayscale-0 group-hover:scale-110" loading="lazy" />
                              )}
                            </div>

                            <p className="font-black text-[10px] uppercase text-kronos-dim mt-1 whitespace-nowrap">
                              {countLabel}
                            </p>
                          </div>

                          {/* Divider (Minimal) */}
                          <div className="w-px bg-white/5 ml-0 mr-4 self-stretch" />

                          {/* Right: Rewards (Simplified + Highlighted) */}
                          <div className="flex-1 flex flex-col justify-center min-w-0 pr-1 pl-2">
                            {sortedRewards.map((reward, ridx) => {
                              const isMatch = searchQuery && reward.name.toLowerCase().includes(searchQuery.toLowerCase());
                              const rarityColor = reward.rarity === 'COMMON' ? 'text-gray-400/80' : (reward.rarity === 'UNCOMMON' ? 'text-white/90' : 'text-orange-400');
                              return (
                                <div key={ridx} className="flex items-center gap-2 min-w-0 py-0.5">
                                  <p className={`text-[11px] font-bold leading-tight truncate uppercase ${rarityColor} group-hover:brightness-110 transition-all`}>
                                    {isMatch && <span className="text-kronos-accent mr-0.5">[</span>}
                                    {reward.name}
                                    {isMatch && <span className="text-kronos-accent ml-0.5">]</span>}
                                  </p>
                                </div>
                              );
                            })}
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